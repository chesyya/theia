# Theia 插件系统回调机制实现指南

## 概述

在 Theia 插件系统中，由于插件运行在独立的进程中，与主进程通过 RPC (Remote Procedure Call) 通信，**函数无法直接跨进程传递**。本文档介绍如何在插件系统中实现回调函数。

## 核心原理

### RPC 限制

- ✅ **可以传递**: 基本类型、对象、数组（可序列化的数据）
- ❌ **不能传递**: 函数（无法序列化）

### 解决方案

使用 **ID 映射 + RPC 调用** 模式：
1. 将函数保存在本地 Map 中
2. 使用 ID 标识函数
3. 通过 RPC 传递 ID
4. 对方进程根据 ID 找到函数并调用

---

## 两种回调方向

### 1. 插件提供回调给主进程（Provider ID 模式）

**场景**: 主进程需要调用插件的回调函数

**例子**: `registerCompletionItemProvider`, `registerHoverProvider`

```typescript
// 插件注册 provider
const provider = {
    provideCompletionItems(document, position) {
        return [/* completions */];
    }
};
vscode.languages.registerCompletionItemProvider('typescript', provider);
```

**实现流程**:
```
插件进程                                主进程
────────                                ──────
register(provider)
  ↓
生成 provider ID
  ↓
保存到 Map<ID, provider>
  ↓
通过 RPC 发送 ID  ──────────────────→  保存 provider ID
                                         ↓
                                      需要调用时
                                         ↓
接收 RPC 调用  ←──────────────────  通过 RPC 调用插件
  ↓                                   传入 provider ID
根据 ID 找到 provider
  ↓
调用 provider.provideXxx()
  ↓
返回结果  ─────────────────────────→  接收结果
```

### 2. 主进程提供回调给插件（Handler/Object 模式）

**场景**: 插件需要调用主进程的回调函数

**例子**: `createTerminal`, `createOutputChannel`

```typescript
// 插件创建 terminal
const terminal = vscode.window.createTerminal('MyTerminal');
terminal.sendText('echo hello');  // 调用主进程
```

**实现流程**:
```
插件进程                                主进程
────────                                ──────
createTerminal()
  ↓
生成 terminal ID
  ↓
创建 TerminalExtImpl 对象
保存到 Map<ID, object>
  ↓
通过 RPC 通知主进程  ───────────────→  创建实际的 Terminal
  ↓                                   保存到 Map<ID, terminal>
返回对象给插件
  ↓
插件调用: terminal.sendText('hi')
  ↓
对象方法内部:
  proxy.$sendText(ID, 'hi')  ────────→  根据 ID 找到 terminal
                                         ↓
                                      terminal.sendText('hi')
                                         ↓
                                      执行实际操作
```

---

## 实现方案选择

### 方案 A: 返回对象（推荐用于需要多个方法或资源管理）

**适用场景**:
- 需要多个相关方法
- 需要 `dispose()` 清理资源
- 需要状态管理

**优点**:
- 可扩展性强
- 语义清晰
- 易于维护

**缺点**:
- API 稍微复杂

### 方案 B: 返回函数（推荐用于单一函数场景）

**适用场景**:
- 真的只需要一个函数
- 不需要资源清理
- 追求简洁的 API

**优点**:
- API 简洁直观
- 使用体验好

**缺点**:
- 难以扩展
- 没有内置的资源管理

---

## 完整实现示例

### 示例 1: 返回对象（Logger 示例）

#### 1. TypeScript 类型定义 (`packages/plugin/src/theia.d.ts`)

```typescript
export interface Logger {
    /**
     * 记录日志
     */
    log(message: string): void;

    /**
     * 清理资源
     */
    dispose(): void;
}

export namespace window {
    /**
     * 创建一个 logger
     */
    export function createLogger(name: string): Logger;
}
```

#### 2. 插件 API 层 (`packages/plugin-ext/src/plugin/plugin-context.ts`)

```typescript
const window: typeof theia.window = {
    // ... 其他方法

    createLogger(name: string): theia.Logger {
        return terminalExt.createLogger(name);
    },
}
```

#### 3. TerminalExt 实现 (`packages/plugin-ext/src/plugin/terminal-ext.ts`)

```typescript
export class TerminalServiceExtImpl implements TerminalServiceExt {
    // 保存所有 logger 对象
    private readonly _loggers = new Map<string, LoggerExtImpl>();

    createLogger(name: string): theia.Logger {
        // 生成唯一 ID
        const id = `logger-${UUID.uuid4()}`;

        // 通知主进程创建 logger
        this.proxy.$createLogger(id, name);

        // 创建 logger 对象
        const logger = new LoggerExtImpl(id, this.proxy);
        this._loggers.set(id, logger);

        return logger;
    }
}

/**
 * Logger 实现类
 */
export class LoggerExtImpl implements theia.Logger {
    constructor(
        private readonly id: string,
        private readonly proxy: TerminalServiceMain
    ) {}

    log(message: string): void {
        // 通过 RPC 调用主进程
        this.proxy.$loggerLog(this.id, message);
    }

    dispose(): void {
        // 通知主进程清理资源
        this.proxy.$disposeLogger(this.id);
    }
}
```

#### 4. RPC 接口定义 (`packages/plugin-ext/src/common/plugin-api-rpc.ts`)

```typescript
export interface TerminalServiceMain {
    // ... 现有方法

    /**
     * 创建 logger
     */
    $createLogger(id: string, name: string): void;

    /**
     * 记录日志
     */
    $loggerLog(id: string, message: string): void;

    /**
     * 销毁 logger
     */
    $disposeLogger(id: string): void;
}
```

#### 5. TerminalMain 实现 (`packages/plugin-ext/src/main/browser/terminal-main.ts`)

```typescript
export class TerminalServiceMainImpl implements TerminalServiceMain {
    // 保存所有 logger
    private readonly loggers = new Map<string, { name: string }>();

    $createLogger(id: string, name: string): void {
        console.log(`[Main] Creating logger: ${name} with id: ${id}`);
        this.loggers.set(id, { name });

        // 如果需要，调用主进程注入的服务
        // const actualLogger = this.someMainService.createLogger(name);
    }

    $loggerLog(id: string, message: string): void {
        const logger = this.loggers.get(id);
        if (!logger) {
            console.error(`Logger ${id} not found`);
            return;
        }

        // 实际执行日志记录
        console.log(`[${logger.name}] ${message}`);

        // 如果需要，调用主进程的服务
        // this.someMainService.log(id, message);
    }

    $disposeLogger(id: string): void {
        console.log(`[Main] Disposing logger: ${id}`);
        this.loggers.delete(id);
    }
}
```

#### 6. 插件使用

```typescript
import * as vscode from '@theia/plugin';

export function activate(context: vscode.ExtensionContext) {
    // 创建 logger
    const logger = vscode.window.createLogger('MyPlugin');

    // 使用 logger
    logger.log('Plugin activated');
    logger.log('Doing something...');
    logger.log('Task completed');

    // 清理资源
    context.subscriptions.push({
        dispose: () => logger.dispose()
    });
}
```

---

### 示例 2: 返回函数（Callback 示例）

#### 1. TypeScript 类型定义 (`packages/plugin/src/theia.d.ts`)

```typescript
export namespace window {
    /**
     * 获取一个回调函数
     */
    export function getSomeCallback(): Promise<(data: string) => Promise<void>>;
}
```

#### 2. 插件 API 层 (`packages/plugin-ext/src/plugin/plugin-context.ts`)

```typescript
const window: typeof theia.window = {
    // ... 其他方法

    getSomeCallback(): Promise<(data: string) => Promise<void>> {
        return terminalExt.getSomeCallback();
    },
}
```

#### 3. TerminalExt 实现 (`packages/plugin-ext/src/plugin/terminal-ext.ts`)

```typescript
export class TerminalServiceExtImpl implements TerminalServiceExt {

    async getSomeCallback(): Promise<(data: string) => Promise<void>> {
        // 通过 RPC 创建回调，获取 ID
        const callbackId = await this.proxy.$createCallback();

        // 返回一个闭包函数，捕获 callbackId
        return (data: string): Promise<void> => {
            return this.proxy.$invokeCallback(callbackId, data);
        };
    }
}
```

#### 4. RPC 接口定义 (`packages/plugin-ext/src/common/plugin-api-rpc.ts`)

```typescript
export interface TerminalServiceMain {
    // ... 现有方法

    /**
     * 创建回调，返回回调 ID
     */
    $createCallback(): Promise<number>;

    /**
     * 调用回调
     */
    $invokeCallback(callbackId: number, data: string): Promise<void>;
}
```

#### 5. TerminalMain 实现 (`packages/plugin-ext/src/main/browser/terminal-main.ts`)

```typescript
export class TerminalServiceMainImpl implements TerminalServiceMain {
    private callbackCounter = 0;
    private callbacks = new Map<number, (data: string) => Promise<void>>();

    async $createCallback(): Promise<number> {
        const callbackId = this.callbackCounter++;

        // 从主进程服务获取实际的回调函数
        const actualCallback = await this.someMainService.getCallback();

        // 保存回调
        this.callbacks.set(callbackId, actualCallback);

        return callbackId;
    }

    async $invokeCallback(callbackId: number, data: string): Promise<void> {
        const callback = this.callbacks.get(callbackId);
        if (!callback) {
            throw new Error(`Callback ${callbackId} not found`);
        }

        // 调用实际的回调函数
        return callback(data);
    }
}
```

#### 6. 插件使用

```typescript
import * as vscode from '@theia/plugin';

export async function activate(context: vscode.ExtensionContext) {
    // 获取回调函数
    const callback = await vscode.window.getSomeCallback();

    // 直接当函数使用
    await callback('hello');
    await callback('world');
}
```

---

## 文件修改清单

实现新的插件 API 需要修改以下文件：

| 文件路径 | 作用 | 需要添加的内容 |
|---------|------|---------------|
| `packages/plugin/src/theia.d.ts` | TypeScript 类型定义 | 接口定义、namespace 方法声明 |
| `packages/plugin-ext/src/plugin/plugin-context.ts` | 插件 API 入口 | 在 `window` 对象中添加方法 |
| `packages/plugin-ext/src/plugin/terminal-ext.ts` | 插件端实现 | 实现类、对象类 |
| `packages/plugin-ext/src/common/plugin-api-rpc.ts` | RPC 接口定义 | 在 `TerminalServiceMain` 接口添加方法 |
| `packages/plugin-ext/src/main/browser/terminal-main.ts` | 主进程端实现 | 实现 RPC 方法 |

---

## 最佳实践

### 1. 命名规范

- **RPC 方法**: 使用 `$` 前缀，如 `$createLogger`, `$loggerLog`
- **对象 ID**: 使用描述性前缀 + UUID，如 `logger-${UUID.uuid4()}`
- **实现类**: 使用 `XxxExtImpl` 命名，如 `LoggerExtImpl`

### 2. 资源管理

- 所有创建的对象都应该提供 `dispose()` 方法
- 在 dispose 时清理主进程的资源
- 使用 Map 保存对象引用，便于查找和清理

### 3. 错误处理

```typescript
$loggerLog(id: string, message: string): void {
    const logger = this.loggers.get(id);
    if (!logger) {
        console.error(`Logger ${id} not found`);
        return;
    }
    // ... 执行操作
}
```

### 4. 异步处理

- 创建操作通常是异步的，返回 `Promise`
- 调用操作可以是同步或异步，根据实际需求

### 5. ID 生成策略

```typescript
// 方案 1: UUID（推荐，保证唯一性）
const id = `logger-${UUID.uuid4()}`;

// 方案 2: 递增计数器（简单场景）
private counter = 0;
const id = this.counter++;
```

---

## 调试技巧

### 1. 添加日志

```typescript
$createLogger(id: string, name: string): void {
    console.log(`[TerminalMain] createLogger called: id=${id}, name=${name}`);
    // ...
}
```

### 2. 检查 Map 状态

```typescript
console.log(`Current loggers:`, Array.from(this.loggers.keys()));
```

### 3. 验证 RPC 调用

在浏览器控制台查看 RPC 消息：
```javascript
// 在浏览器 DevTools Console 中
localStorage.setItem('theia:rpc:log', 'true');
```

---

## 常见问题

### Q1: 为什么不能直接传递函数？

**A**: RPC 通信需要序列化数据，函数无法序列化。必须使用 ID 映射的方式。

### Q2: 什么时候用对象，什么时候用函数？

**A**:
- 需要多个方法或资源管理 → 返回对象
- 只需要单一函数调用 → 返回函数

### Q3: 如何处理回调中的异常？

**A**:
```typescript
async $invokeCallback(callbackId: number, data: string): Promise<void> {
    const callback = this.callbacks.get(callbackId);
    if (!callback) {
        throw new Error(`Callback ${callbackId} not found`);
    }

    try {
        return await callback(data);
    } catch (error) {
        console.error(`Callback ${callbackId} failed:`, error);
        throw error;
    }
}
```

### Q4: ID 会不会冲突？

**A**: 使用 UUID 可以避免冲突。如果使用计数器，确保在单一服务内递增即可。

---

## 参考现有实现

在 Theia 代码库中，可以参考以下现有实现：

| 功能 | 文件路径 | 模式 |
|------|---------|------|
| Terminal | `packages/plugin-ext/src/plugin/terminal-ext.ts` | 返回对象 |
| QuickPick | `packages/plugin-ext/src/plugin/quick-open.ts` | 返回对象 |
| OutputChannel | `packages/plugin-ext/src/plugin/output-channel-registry.ts` | 返回对象 |
| StatusBarItem | `packages/plugin-ext/src/plugin/status-bar-message-registry.ts` | 返回对象 |

---

## 总结

Theia 插件系统中的回调机制核心是 **ID 映射 + RPC 调用**：

1. **插件提供回调给主进程**: Provider ID 模式
2. **主进程提供回调给插件**: Handler/Object 模式

选择合适的模式，按照本文档的示例实现，就能在插件系统中正确处理回调函数。

---

**文档版本**: 1.0
**最后更新**: 2025-01-25

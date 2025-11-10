# @theia/plugin API 文档模板

## API 概览

### API 完整路径
**`namespace.methodName`**

例如: `window.showInformationMessage`

---

## 详细信息

### 1. 基本信息

| 项目 | 内容 |
|------|------|
| **API 名称** | `methodName` |
| **所属命名空间** | `namespace` (例如: `window`, `commands`, `workspace`, `languages` 等) |
| **完整调用路径** | `namespace.methodName()` |
| **API 类型** | 函数 / 类 / 接口 / 枚举 |
| **源文件位置** | `packages/plugin/src/theia.d.ts:行号` |

### 2. 功能描述

简要描述该 API 的功能和用途。

**功能说明**:
- 主要功能点1
- 主要功能点2
- 适用场景

---

### 3. 方法签名

```typescript
export function methodName(
    param1: Type1,
    param2?: Type2,
    ...paramN: TypeN[]
): ReturnType;
```

如果有多个重载，列出所有重载：

```typescript
// 重载1
export function methodName(param1: Type1): ReturnType;

// 重载2
export function methodName(param1: Type1, param2: Type2): ReturnType;
```

---

### 4. 参数说明

#### 参数列表

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `param1` | `string` | 是 | - | 参数1的说明 |
| `param2` | `MessageOptions` | 否 | - | 参数2的说明 |
| `items` | `T[]` | 否 | `[]` | 可选项数组 |

#### 参数获取方式

详细说明每个参数如何获取：

**param1: string**
- ✅ **可直接传入**: 硬编码字符串
- ✅ **可通过用户输入获取**: `window.showInputBox()`
- ✅ **可从配置读取**: `workspace.getConfiguration().get('key')`
- ❌ **无直接获取方式**: 需要自行处理

**param2: MessageOptions**
- ✅ **可直接构造**:
  ```typescript
  const options: MessageOptions = {
      modal: true
  };
  ```
- ✅ **可通过接口获取**: 接口定义在 `theia.d.ts:行号`
- 📝 **接口定义**:
  ```typescript
  export interface MessageOptions {
      modal?: boolean;
      detail?: string;
  }
  ```

**items: T[]**
- ✅ **可直接传入**: 字符串数组 `['选项1', '选项2']`
- ✅ **可通过接口构造**:
  ```typescript
  const items: MessageItem[] = [
      { title: '是', isCloseAffordance: false },
      { title: '否', isCloseAffordance: true }
  ];
  ```
- ✅ **可从其他 API 获取**:
  - `workspace.findFiles()` 返回文件URI数组
  - `commands.getCommands()` 返回命令ID数组

---

### 5. 返回值

| 返回类型 | 说明 |
|----------|------|
| `Thenable<T \| undefined>` | Promise 类型，返回用户选择的项或 undefined |

**返回值处理**:

```typescript
const result = await window.showInformationMessage('消息', '选项1', '选项2');
if (result === '选项1') {
    // 处理选项1
} else if (result === '选项2') {
    // 处理选项2
} else {
    // 用户取消了选择 (result === undefined)
}
```

---

### 6. 类型依赖

列出该 API 依赖的所有自定义类型：

| 类型名称 | 定义位置 | 说明 | 获取方式 |
|---------|---------|------|---------|
| `MessageOptions` | `theia.d.ts:行号` | 消息选项配置 | 直接构造对象 |
| `MessageItem` | `theia.d.ts:行号` | 消息按钮项 | 直接构造对象 |
| `Uri` | `theia.d.ts:行号` | 资源标识符 | `Uri.parse()` 或 `Uri.file()` |
| `Position` | `theia.d.ts:行号` | 文本位置 | `new Position(line, char)` |

---

### 7. 使用示例

#### 示例 1: 基本用法

```typescript
import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {
    const disposable = theia.commands.registerCommand('extension.demo', async () => {
        // 基本调用
        await theia.window.showInformationMessage('这是一条信息');
    });

    context.subscriptions.push(disposable);
}
```

#### 示例 2: 带选项的用法

```typescript
const choice = await theia.window.showInformationMessage(
    '是否保存文件？',
    { modal: true },
    '保存',
    '不保存',
    '取消'
);

if (choice === '保存') {
    // 保存逻辑
}
```

#### 示例 3: 参数从其他 API 获取

```typescript
// 从配置中读取消息
const config = theia.workspace.getConfiguration('myExtension');
const message = config.get<string>('welcomeMessage', '欢迎使用');

// 从用户输入获取
const userInput = await theia.window.showInputBox({
    prompt: '请输入要显示的消息'
});

if (userInput) {
    await theia.window.showInformationMessage(userInput);
}
```

#### 示例 4: 复杂参数构造

```typescript
// 构造 MessageItem 类型的选项
const items: theia.MessageItem[] = [
    {
        title: '确认',
        isCloseAffordance: false
    },
    {
        title: '取消',
        isCloseAffordance: true
    }
];

const result = await theia.window.showInformationMessage(
    '确认执行操作？',
    { modal: true, detail: '此操作不可撤销' },
    ...items
);

if (result?.title === '确认') {
    // 执行操作
}
```

---

### 8. 相关 API

列出与该 API 相关的其他 API：

| 相关 API | 命名空间 | 关系说明 |
|----------|----------|----------|
| `showWarningMessage` | `window` | 同类型的警告消息 API |
| `showErrorMessage` | `window` | 同类型的错误消息 API |
| `showInputBox` | `window` | 获取用户输入，可作为参数来源 |
| `showQuickPick` | `window` | 显示选择列表，功能类似 |
| `getConfiguration` | `workspace` | 可获取配置值作为参数 |

---

### 9. 参数获取策略总结

| 参数来源类型 | 获取方式 | 示例 API |
|-------------|---------|----------|
| **直接传入** | 硬编码常量、字面量 | `'消息文本'`, `true`, `42` |
| **用户交互** | 通过 window 命名空间的交互 API | `showInputBox()`, `showQuickPick()` |
| **配置读取** | 通过 workspace 配置 API | `workspace.getConfiguration()` |
| **文件系统** | 通过 workspace 文件 API | `workspace.findFiles()`, `workspace.openTextDocument()` |
| **编辑器状态** | 通过 window.activeTextEditor | `window.activeTextEditor.document`, `window.activeTextEditor.selection` |
| **语言服务** | 通过 languages 命名空间 | `languages.getDiagnostics()` |
| **命令系统** | 通过 commands 命名空间 | `commands.getCommands()`, `commands.executeCommand()` |
| **类型构造** | 使用 new 或工厂方法 | `new Position()`, `Uri.parse()`, `new Range()` |

---

### 10. 注意事项

- ⚠️ **线程安全**: 该 API 是否线程安全
- ⚠️ **性能考虑**: 高频调用时的性能影响
- ⚠️ **兼容性**: Theia 版本要求
- ⚠️ **权限要求**: 是否需要特定权限或激活事件
- ⚠️ **已知问题**: 已知的 bug 或限制

---

### 11. 实现原理（可选）

如果需要了解内部实现，可以参考：

- **主端实现**: `packages/plugin-ext/src/main/browser/xxx-main.ts`
- **插件端实现**: `packages/plugin-ext/src/plugin/xxx.ts`
- **RPC 通信**: 使用的 RPC 协议和消息类型

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────┐
│ window.showInformationMessage                       │
├─────────────────────────────────────────────────────┤
│ 参数:                                               │
│   • message: string (必填, 可直接传入)              │
│   • options?: MessageOptions (可选, 可构造)         │
│   • items: T[] (可选, 可直接传入或构造)             │
│                                                     │
│ 返回: Thenable<T | undefined>                      │
│                                                     │
│ 示例:                                               │
│   const result = await window.showInformationMessage│
│     ('消息', '选项1', '选项2');                     │
└─────────────────────────────────────────────────────┘
```

---

## 修订历史

| 日期 | 版本 | 修改内容 | 修改人 |
|------|------|---------|--------|
| 2025-11-10 | 1.0 | 初始版本 | - |


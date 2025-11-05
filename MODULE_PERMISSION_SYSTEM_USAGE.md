# 模块权限拦截系统 - 使用文档

## 📋 概述

基于 Theia 插件系统实现的**通用模块拦截与权限管理系统**，用于拦截插件对敏感 Node.js 模块的访问，并在运行时通过弹窗提示用户授权。

## 🎯 核心功能

### 1. 拦截的敏感模块

系统会拦截以下敏感模块：

#### 文件系统模块 (HIGH)
- `fs`, `fs/promises`, `node:fs`, `node:fs/promises`
- `fs-extra`, `graceful-fs`

#### 进程管理模块 (CRITICAL) ⚠️
- `child_process`, `node:child_process`
- `worker_threads`, `node:worker_threads`

#### 网络通信模块 (HIGH)
- `net`, `node:net`
- `http`, `node:http`, `https`, `node:https`
- `dgram`, `node:dgram`

#### 系统信息模块 (MEDIUM)
- `os`, `node:os`

#### 加密模块 (MEDIUM)
- `crypto`, `node:crypto`

### 2. 白名单模块（不拦截）

以下模块不会被拦截：
- `@theia/*` - Theia 官方模块
- `vscode` - VSCode API
- `@types/*` - TypeScript 类型定义
- `path`, `util`, `events`, `stream`, `buffer` - 安全的 Node.js 核心模块

## 🔧 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Browser)                     │
│  ┌─────────────────────────────────────────────┐        │
│  │  ModulePermissionService                     │        │
│  │  - 显示权限请求对话框                         │        │
│  │  - 管理权限缓存                              │        │
│  │  - 避免重复弹窗                              │        │
│  └──────────────────┬──────────────────────────┘        │
│                     │ RPC                                │
└─────────────────────┼────────────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────────────┐
│                   Backend (Node)                         │
│  ┌─────────────────▼──────────────────────────┐         │
│  │      ModuleInterceptor                      │         │
│  │  - 拦截 require/import                     │         │
│  │  - 创建模块代理 (Proxy)                    │         │
│  │  - 运行时 API 拦截                         │         │
│  └────────────────────────────────────────────┘         │
│           ▲                                               │
│           │ 拦截                                          │
│  ┌────────┴─────────────────────────────────┐           │
│  │  Plugin Code                              │           │
│  │  const fs = require('fs')                 │           │
│  │  const cp = require('child_process')      │           │
│  │  fs.readFile(...) ← 此时弹窗询问用户      │           │
│  └───────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────┘
```

## 📝 实现文件

### 1. 核心接口定义
- **`packages/plugin-ext/src/common/module-permission-service.ts`**
  - 定义 `ModuleOperation`, `PermissionDecision` 等接口
  - 定义敏感模块配置 `SENSITIVE_MODULES`
  - 白名单配置 `WHITELIST_MODULES`

### 2. 后端拦截器
- **`packages/plugin-ext/src/hosted/node/module-interceptor.ts`**
  - 拦截 `Module.prototype.require`
  - 创建模块代理 (Proxy)
  - 在函数调用时进行权限检查

### 3. 前端权限服务
- **`packages/plugin-ext/src/main/browser/module-permission-service.ts`**
  - 显示权限请求对话框
  - 管理权限缓存
  - 避免重复弹窗

### 4. RPC 集成
- **`packages/plugin-ext/src/common/plugin-api-rpc.ts`**
  - 添加 `MODULE_PERMISSION_MAIN` RPC 标识符

- **`packages/plugin-ext/src/main/browser/main-context.ts`**
  - 注册 RPC 服务

- **`packages/plugin-ext/src/hosted/node/plugin-host-rpc.ts`**
  - 在插件加载时启用拦截器

### 5. 依赖注入配置
- **`packages/plugin-ext/src/main/browser/plugin-ext-frontend-module.ts`**
  - 注册 `ModulePermissionService`

## 🚀 使用示例

### 测试插件

已创建测试插件：`/root/theia/plugins/module-permission-test`

该插件提供三个测试命令：

1. **`modulePermTest.testFs`** - 测试 FS 模块拦截
2. **`modulePermTest.testChildProcess`** - 测试 child_process 模块拦截
3. **`modulePermTest.testHttp`** - 测试 HTTP 模块拦截

### 插件代码示例

```typescript
import * as theia from '@theia/plugin';

export function start(context: theia.PluginContext) {
    const testCmd = theia.commands.registerCommand('test.fs', async () => {
        try {
            // ✅ import 时不会弹窗
            const fs = require('fs');

            // 🔥 调用时会弹窗询问用户
            const content = fs.readFileSync('/tmp/test.txt', 'utf-8');
            theia.window.showInformationMessage(`File content: ${content}`);
        } catch (error: any) {
            // ❌ 用户拒绝后会抛出异常
            theia.window.showErrorMessage(`Permission denied: ${error.message}`);
        }
    });

    context.subscriptions.push(testCmd);
}
```

## 🎨 权限对话框

当插件尝试调用敏感 API 时，会显示如下对话框：

```
⚠️ 插件权限请求 - Help Documentation Plugin

插件 "Help Documentation Plugin" 正在尝试使用敏感功能：

⚠️ 模块: fs
📋 功能: readFileSync("/tmp/test.txt", ...)

⚠️ 此操作可能：
• 读取或修改文件
• 可能泄露敏感信息
• 可能破坏系统文件

是否允许此操作？

[✅ 允许]  [❌ 拒绝]
```

## 🔒 权限缓存机制

- **缓存策略**：用户授权后，决策会被缓存
- **缓存粒度**：`pluginId : moduleId . functionName`
- **避免重复弹窗**：相同操作不会重复询问
- **清除缓存**：插件卸载时自动清除

## 🛠️ 编译和运行

### 1. 编译 plugin-ext 包

```bash
cd /root/theia/packages/plugin-ext
npm run compile
```

### 2. 编译测试插件

```bash
cd /root/theia/plugins/module-permission-test
npx tsc
```

### 3. 运行 Theia

```bash
cd /root/theia
yarn start
```

### 4. 测试

1. 打开 Theia IDE
2. 按 `F1` 或 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Test:" 查看测试命令
4. 执行测试命令，观察权限对话框

## 📊 日志输出

### 后端日志
```
[Module Interceptor] 🔒 Starting interception for plugin: module-permission-test
[Module Interceptor] 🚨 Intercepting module 'fs' for plugin module-permission-test
[Module Interceptor] ✅ Created proxy for module-permission-test:fs
[Module Interceptor] 🔍 Checking permission for module-permission-test - fs.readFileSync(...)
[Module Interceptor] ✅ Permission granted for module-permission-test - fs.readFileSync
```

### 前端日志
```
[Module Permission] 🔔 Requesting user permission for module-permission-test - fs.readFileSync
[Module Permission] ✅ Cached decision for module-permission-test:fs.readFileSync = true
```

## 🔧 配置和扩展

### 添加新的敏感模块

编辑 `packages/plugin-ext/src/common/module-permission-service.ts`：

```typescript
export const SENSITIVE_MODULES: Record<string, SensitiveModuleConfig> = {
    // ... 现有配置

    // 添加新的敏感模块
    database: {
        modules: ['mysql', 'mongodb', 'pg'],
        level: ModuleSensitivityLevel.HIGH,
        description: '数据库访问',
        securityWarning: '• 访问数据库\n• 可能泄露或修改数据'
    }
};
```

### 添加白名单模块

```typescript
export const WHITELIST_MODULES = [
    '@theia/',
    'vscode',
    '@types/',
    // 添加新的白名单
    'lodash',
    'moment'
];
```

## 🎯 关键特性

1. **非侵入式**：不需要修改插件代码
2. **运行时拦截**：在 API 调用时才触发权限检查
3. **用户可控**：用户决定是否授权
4. **权限缓存**：避免重复弹窗
5. **审计日志**：所有操作都有详细日志
6. **灵活配置**：可以自定义敏感模块和白名单

## 🐛 故障排查

### 1. 拦截器未生效

**检查点**：
- 确保 `ModuleInterceptor.startInterception(plugin)` 在插件加载时被调用
- 检查 `setupModuleInterception()` 是否成功获取 RPC 代理

### 2. 权限对话框未显示

**检查点**：
- 检查 `ModulePermissionService` 是否正确注册到前端容器
- 检查 RPC 通信是否正常
- 查看浏览器控制台是否有错误

### 3. 白名单模块被拦截

**检查点**：
- 确认模块 ID 在 `WHITELIST_MODULES` 中
- 检查 `isWhitelistedModule()` 逻辑

## 📈 性能考虑

- **代理缓存**：每个 `pluginId:moduleId` 组合只创建一次代理
- **权限缓存**：授权决策被缓存，避免重复检查
- **请求去重**：同时进行的相同请求会共享一个权限对话框

## 🔐 安全建议

1. **默认拒绝**：对于不信任的插件，建议拒绝敏感操作
2. **审计日志**：定期检查审计日志
3. **权限审查**：定期审查已授予的权限
4. **最小权限**：插件应该只请求必要的权限

## 📚 相关文档

- [Theia Plugin System](https://theia-ide.org/docs/authoring_plugins/)
- [Node.js Module System](https://nodejs.org/api/modules.html)
- [JavaScript Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

## ✅ 完成状态

- ✅ 核心接口定义
- ✅ 后端模块拦截器
- ✅ 前端权限服务
- ✅ RPC 集成
- ✅ 依赖注入配置
- ✅ 测试插件
- ✅ 文档完善

## 🎉 总结

该系统提供了一个完整的、非侵入式的插件权限管理解决方案，能够有效拦截和控制插件对敏感 Node.js 模块的访问，大大提升了 Theia IDE 的安全性。

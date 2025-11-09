# @theia/plugin API 权限拦截实现指南

## 概述

本指南说明如何为 `@theia/plugin` API 添加权限拦截功能，让用户可以控制插件调用 Theia API 的权限。

## 类别（Category）层次说明

### 当前实现的类别

| Category 值 | 拦截层级 | 包含内容 | 已实现 |
|------------|---------|---------|-------|
| `'module'` | Node.js 模块层 | fs, http, https, net, child_process, os, crypto 等所有敏感 Node.js 模块 | ✅ |
| `'api:workspace'` | Theia API - 工作区 | workspace.fs.*, workspace.find*, etc. | ❌ 待实现 |
| `'api:commands'` | Theia API - 命令 | commands.executeCommand | ❌ 待实现 |
| `'api:terminal'` | Theia API - 终端 | window.createTerminal, terminal.sendText | ❌ 待实现 |
| `'api:window'` | Theia API - 窗口 | window.showInputBox, window.showQuickPick | ❌ 待实现 |

**重要说明**：
- `SENSITIVE_MODULES` 中的 `network`、`filesystem` 等只是**内部配置分组**（用于管理不同敏感级别）
- 所有 Node.js 模块实际上都使用统一的 `category: 'module'`
- API 层的拦截需要使用不同的 category（如 `'api:terminal'`、`'api:workspace'` 等）

---

## 实现步骤

### 第 1 步：在 Main 端注入 PermissionRequestService

修改目标 `*MainImpl` 类（例如 `TerminalServiceMainImpl`）：

```typescript
// terminal-main.ts

import { PermissionRequestService, PermissionSeverity } from '../../common/permission-request-service';

export class TerminalServiceMainImpl implements TerminalServiceMain, Disposable {

    // ✅ 注入权限请求服务
    private readonly permissionRequestService: PermissionRequestService;

    // 存储当前插件上下文
    private currentPluginId: string = 'unknown-plugin';
    private currentPluginName: string = 'Unknown Plugin';

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.terminals = container.get(TerminalService);
        // ...其他依赖

        // ✅ 获取权限请求服务
        this.permissionRequestService = container.get(PermissionRequestService);
    }

    // ✅ 设置当前插件上下文（需要在调用时传递）
    setPluginContext(pluginId: string, pluginName: string): void {
        this.currentPluginId = pluginId;
        this.currentPluginName = pluginName;
    }
}
```

### 第 2 步：在 RPC 方法中添加权限检查

以 `window.createTerminal` API 为例：

```typescript
// terminal-main.ts

async $createTerminal(options: TerminalOptions): Promise<string> {
    // ✅ 权限检查：创建终端
    await this.permissionRequestService.$requestPermission({
        title: '终端创建权限',
        message: `插件 **${this.currentPluginName}** 正在尝试创建终端：\n\n` +
                 `**名称:** ${options.name || '(默认)'}\n` +
                 `**Shell 路径:** ${options.shellPath || '(默认 shell)'}\n\n` +
                 `**警告:** 此操作可能：\n` +
                 `• 创建新的终端实例\n` +
                 `• 执行 shell 命令\n` +
                 `• 访问系统环境变量`,
        severity: PermissionSeverity.HIGH,
        pluginId: this.currentPluginId,
        pluginName: this.currentPluginName,
        operationId: 'window.createTerminal',
        category: 'api:terminal', // ✅ 使用 api:terminal 类别
        metadata: {
            terminalName: options.name,
            shellPath: options.shellPath,
            cwd: options.cwd
        }
    });

    // 执行实际的终端创建
    const terminal = await this.terminals.newTerminal(options);
    return terminal.id;
}
```

### 第 3 步：处理不同严重级别的操作

根据操作的危险程度设置不同的 `severity`：

```typescript
// 示例：终端发送文本（高危操作）
async $sendText(terminalId: string, text: string, addNewLine: boolean): Promise<void> {
    // ✅ 高危操作：向终端发送文本
    await this.permissionRequestService.$requestPermission({
        title: '终端命令执行权限',
        message: `插件 **${this.currentPluginName}** 正在尝试向终端发送命令：\n\n` +
                 `**命令内容:** \`${text}\`\n\n` +
                 `**警告:** 此操作可能：\n` +
                 `• 执行任意 shell 命令\n` +
                 `• 修改文件系统\n` +
                 `• 带来严重安全风险`,
        severity: PermissionSeverity.CRITICAL, // ✅ 严重级别
        pluginId: this.currentPluginId,
        pluginName: this.currentPluginName,
        operationId: 'terminal.sendText',
        category: 'api:terminal',
        metadata: {
            terminalId,
            command: text.substring(0, 100) // 只显示前100个字符
        }
    });

    const terminal = this.terminals.getById(terminalId);
    terminal.sendText(text, addNewLine);
}

// 示例：读取终端状态（低危操作）
async $getTerminalState(terminalId: string): Promise<any> {
    // ✅ 低危操作：读取终端状态
    await this.permissionRequestService.$requestPermission({
        title: '终端状态访问权限',
        message: `插件 **${this.currentPluginName}** 正在尝试读取终端状态`,
        severity: PermissionSeverity.INFO, // ✅ 信息级别
        pluginId: this.currentPluginId,
        pluginName: this.currentPluginName,
        operationId: 'terminal.getState',
        category: 'api:terminal',
        metadata: { terminalId }
    });

    const terminal = this.terminals.getById(terminalId);
    return { name: terminal.title, processId: terminal.processId };
}
```

---

## 完整示例：为 Workspace API 添加权限拦截

```typescript
// workspace-main.ts

import { PermissionRequestService, PermissionSeverity } from '../../common/permission-request-service';

export class WorkspaceMainImpl implements WorkspaceMain, Disposable {

    private readonly permissionRequestService: PermissionRequestService;
    private currentPluginId: string = 'unknown-plugin';
    private currentPluginName: string = 'Unknown Plugin';

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        // ...其他初始化
        this.permissionRequestService = container.get(PermissionRequestService);
    }

    // ✅ 拦截文件查找操作
    async $findFiles(
        include: string,
        exclude?: string,
        maxResults?: number,
        extensionId?: string,
        token?: CancellationToken
    ): Promise<UriComponents[]> {
        // 权限检查
        await this.permissionRequestService.$requestPermission({
            title: '工作区文件搜索权限',
            message: `插件 **${this.currentPluginName}** 正在尝试搜索工作区文件：\n\n` +
                     `**搜索模式:** ${include}\n` +
                     `**排除模式:** ${exclude || '(无)'}\n` +
                     `**最大结果数:** ${maxResults || '(无限制)'}\n\n` +
                     `**警告:** 此操作可能：\n` +
                     `• 扫描整个工作区\n` +
                     `• 访问所有文件路径\n` +
                     `• 泄露项目结构信息`,
            severity: PermissionSeverity.WARNING,
            pluginId: this.currentPluginId,
            pluginName: this.currentPluginName,
            operationId: 'workspace.findFiles',
            category: 'api:workspace', // ✅ 使用 api:workspace 类别
            metadata: {
                include,
                exclude,
                maxResults
            }
        });

        // 执行实际的文件搜索
        return this.fileSearchService.find(include, {
            exclude,
            limit: maxResults,
            rootUris: this.roots
        }, token);
    }

    // ✅ 拦截工作区配置修改
    async $updateWorkspaceFolders(
        start: number,
        deleteCount: number,
        ...workspaceFoldersToAdd: ({ uri: UriComponents; name?: string })[]
    ): Promise<void> {
        await this.permissionRequestService.$requestPermission({
            title: '工作区修改权限',
            message: `插件 **${this.currentPluginName}** 正在尝试修改工作区文件夹：\n\n` +
                     `**删除数量:** ${deleteCount}\n` +
                     `**添加数量:** ${workspaceFoldersToAdd.length}\n\n` +
                     `**警告:** 此操作可能：\n` +
                     `• 改变工作区结构\n` +
                     `• 影响其他插件行为\n` +
                     `• 添加不受信任的文件夹`,
            severity: PermissionSeverity.CRITICAL, // 修改工作区是严重操作
            pluginId: this.currentPluginId,
            pluginName: this.currentPluginName,
            operationId: 'workspace.updateWorkspaceFolders',
            category: 'api:workspace',
            metadata: {
                deleteCount,
                addCount: workspaceFoldersToAdd.length,
                folders: workspaceFoldersToAdd.map(f => Uri.revive(f.uri).toString())
            }
        });

        // 执行实际的工作区更新
        // ... 实现逻辑
    }
}
```

---

## 第 4 步：在 RPC 调用时传递插件上下文

需要修改 RPC 协议，确保每次调用时都能知道是哪个插件在调用 API。

### 方案 A：在 RPC 层添加插件上下文（推荐）

```typescript
// plugin-api-rpc.ts

export interface TerminalServiceMain {
    // 修改方法签名，添加 pluginId 参数
    $createTerminal(pluginId: string, options: TerminalOptions): Promise<string>;
    $sendText(pluginId: string, terminalId: string, text: string, addNewLine: boolean): Promise<void>;
}
```

然后在 plugin 端调用时传递：

```typescript
// terminal-ext.ts

export class TerminalExtImpl {
    private readonly pluginId: string;

    constructor(rpc: RPCProtocol, pluginModel: PluginModel) {
        this.pluginId = pluginModel.id;
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.TERMINAL_MAIN);
    }

    async createTerminal(options: TerminalOptions): Promise<Terminal> {
        // ✅ 传递插件 ID
        const id = await this.proxy.$createTerminal(this.pluginId, options);
        return new TerminalImpl(id, this.proxy, this.pluginId);
    }
}
```

---

## 严重级别（Severity）使用指南

| Severity | 颜色 | 适用场景 | 示例操作 |
|----------|-----|---------|---------|
| `INFO` | 蓝色 📘 | 读取操作、查询操作 | 获取终端状态、读取配置 |
| `WARNING` | 黄色 ⚠️ | 可能泄露信息的操作 | 搜索文件、读取环境变量 |
| `HIGH` | 橙色 🔶 | 修改操作、创建资源 | 创建终端、写文件、修改配置 |
| `CRITICAL` | 红色 🔴 | 执行命令、删除资源 | 终端发送命令、删除文件、修改工作区 |

---

## 类别（Category）命名建议

| Category | 用途 | 记住范围说明 |
|----------|-----|------------|
| `'module'` | Node.js 模块拦截 | 记住所有 fs、http、child_process 等模块操作 |
| `'api:workspace'` | 工作区 API | 记住所有 workspace.* API 调用 |
| `'api:terminal'` | 终端 API | 记住所有终端相关 API 调用 |
| `'api:commands'` | 命令 API | 记住所有 commands.* API 调用 |
| `'api:window'` | 窗口 API | 记住所有 window.* API 调用 |
| `'api:debug'` | 调试 API | 记住所有 debug.* API 调用 |

当用户选择"记住此类别的所有操作"时：
- 选择 `'module'` → 记住所有 Node.js 模块操作
- 选择 `'api:terminal'` → 记住所有终端 API，但不影响其他 API

---

## 完整的工作流程

```
插件调用 API
    ↓
Plugin Ext (插件端)
    ↓
RPC 调用（传递 pluginId）
    ↓
Main Impl (主进程端)
    ↓
PermissionRequestService.$requestPermission()
    ↓
检查缓存
    ↓
显示权限对话框（如果未缓存）
    ↓
用户选择：允许/拒绝 + 记住范围
    ↓
缓存决策（根据范围）
    ↓
返回决策结果
    ↓
Main Impl 执行实际操作或抛出错误
```

---

## 注意事项

1. **性能考虑**：
   - 权限检查是异步的，会有弹窗延迟
   - 建议对高频操作（如文本编辑）不添加拦截
   - 仅对敏感操作（文件操作、命令执行）添加拦截

2. **用户体验**：
   - 提供清晰的权限说明
   - 使用合适的严重级别
   - 允许用户记住决策，避免重复弹窗

3. **安全性**：
   - 不要相信客户端传来的 pluginId，需要在服务端验证
   - 对于 CRITICAL 级别操作，考虑默认拒绝
   - 记录所有权限请求，便于审计

---

## 下一步

1. 为核心 API 添加权限拦截：
   - ✅ Node.js 模块（已完成）
   - ❌ Workspace API（待实现）
   - ❌ Terminal API（待实现）
   - ❌ Commands API（待实现）

2. 添加权限管理界面：
   - 查看所有已授予的权限
   - 撤销特定权限
   - 导出/导入权限配置

3. 添加权限审计功能：
   - 记录所有权限请求日志
   - 提供权限使用报告
   - 检测异常权限请求

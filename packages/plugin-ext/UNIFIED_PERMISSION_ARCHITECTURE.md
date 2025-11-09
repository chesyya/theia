# 统一插件权限管理架构设计

## 🎯 设计目标

1. **统一拦截点**：在 `plugin-host-rpc.ts` 的 `loadPlugin` 中一次性设置全局拦截
2. **覆盖所有插件**：Theia 插件、VSCode 插件、Headless 插件都受保护
3. **覆盖所有加载方式**：import、require、动态 require 都能拦截
4. **简化 init 文件**：backend-init-theia.ts 和 plugin-vscode-init.ts 只负责 API 注入

## 📐 新架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                   Plugin Host Process                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  plugin-host-rpc.ts (loadPlugin)                     │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  🔥 ONE-TIME Global Setup (First Plugin)     │  │   │
│  │  │  UnifiedModuleInterceptor.setupGlobalHook()  │  │   │
│  │  │  ↓                                             │  │   │
│  │  │  Override module._load ONCE                   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  📦 Per-Plugin Setup                          │  │   │
│  │  │  UnifiedModuleInterceptor.registerPlugin()   │  │   │
│  │  │  ↓                                             │  │   │
│  │  │  Store plugin info for identification        │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  module._load (Global Hook)                         │   │
│  │  ↓                                                   │   │
│  │  1. Identify plugin by parent.filename              │   │
│  │  2. Check if module is sensitive                    │   │
│  │  3. Return proxied module                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Proxied Module (fs, child_process, etc.)           │   │
│  │  ↓                                                   │   │
│  │  On function call:                                  │   │
│  │  1. Build operation info                            │   │
│  │  2. Ask permission service (RPC to frontend)        │   │
│  │  3. Show dialog: Deny / Allow / Always Allow        │   │
│  │  4. Execute or reject                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  backend-init-theia.ts                               │   │
│  │  ✅ Only handles: @theia/plugin API injection       │   │
│  │  ❌ No longer handles: module interception          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  plugin-vscode-init.ts                               │   │
│  │  ✅ Only handles: vscode API injection              │   │
│  │  ❌ No longer handles: module interception          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

         │ RPC
         ↓

┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ModulePermissionService                             │   │
│  │  ↓                                                   │   │
│  │  1. Receive permission request                      │   │
│  │  2. Check policy cache                              │   │
│  │  3. Show dialog if needed                           │   │
│  │  4. Update policy cache                             │   │
│  │  5. Return decision                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Permission Dialog                                   │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ ⚠️  Permission Request                        │  │   │
│  │  │                                               │  │   │
│  │  │ Plugin "my-plugin" wants to:                 │  │   │
│  │  │ • Access: fs.readFileSync                    │  │   │
│  │  │ • Path: /home/user/file.txt                  │  │   │
│  │  │                                               │  │   │
│  │  │ [Deny]  [Allow Once]  [Always Allow]         │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 实现要点

### 1. UnifiedModuleInterceptor (统一拦截器)

**职责：**
- 管理全局 `module._load` 劫持（只设置一次）
- 维护已加载插件列表（用于识别插件）
- 创建模块代理（fs, child_process, http, net, etc.）
- 调用权限服务进行检查

**关键方法：**
```typescript
class UnifiedModuleInterceptor {
    // 一次性设置全局 hook（第一个插件加载时）
    static setupGlobalHook(permissionService: ModulePermissionChecker): void

    // 注册插件信息（每个插件加载时）
    static registerPlugin(plugin: Plugin): void

    // 识别是哪个插件在加载模块
    private static identifyPlugin(parentFilename: string): Plugin | null

    // 判断是否需要拦截
    private static shouldIntercept(moduleId: string): boolean

    // 创建代理模块
    private static createProxy(module: any, moduleId: string, plugin: Plugin): any
}
```

### 2. 修改 plugin-host-rpc.ts

```typescript
loadPlugin(plugin: Plugin): any {
    // 🔥 第一次加载插件时，设置全局拦截
    if (!UnifiedModuleInterceptor.isInitialized()) {
        UnifiedModuleInterceptor.setupGlobalHook(this.permissionService);
    }

    // 🔥 注册插件信息
    UnifiedModuleInterceptor.registerPlugin(plugin);

    // ❌ 删除这些调用：
    // FileSystemInterceptor.interceptFsModule(plugin);
    // ModuleInterceptor.startInterception(plugin);

    // 加载插件主文件
    return dynamicRequire(plugin.pluginPath);
}
```

### 3. 简化 backend-init-theia.ts

```typescript
function overrideInternalLoad(): void {
    const module = require('module');
    const internalLoad = module._load;

    module._load = function (request: string, parent: any, isMain: {}): any {
        // ✅ 只处理 @theia/plugin API 注入
        if (request === '@theia/plugin') {
            const plugin = findPlugin(parent.filename);
            if (plugin) {
                return pluginsApiImpl.get(plugin.model.id);
            }
            return defaultApi;
        }

        // ❌ 删除所有 ModuleInterceptor 相关代码
        // ❌ 删除所有敏感模块拦截逻辑

        // ✅ 其他模块正常加载（拦截已在 UnifiedModuleInterceptor 中统一处理）
        return internalLoad.apply(this, arguments);
    };
}
```

### 4. 简化 plugin-vscode-init.ts

```typescript
function overrideInternalLoad(): void {
    const module = require('module');
    const internalLoad = module._load;

    module._load = function (request: string, parent: any, isMain: {}): any {
        // ✅ 只处理 vscode / @theia/plugin API 注入
        if (request === 'vscode' || request === '@theia/plugin') {
            const plugin = findPlugin(parent.filename);
            if (plugin) {
                return pluginsApiImpl.get(plugin.model.id);
            }
            return defaultApi;
        }

        // ✅ 其他模块正常加载（拦截已在 UnifiedModuleInterceptor 中统一处理）
        return internalLoad.apply(this, arguments);
    };
}
```

## 🎨 权限对话框 UI

### 对话框内容：
```
┌─────────────────────────────────────────────────┐
│ ⚠️  Plugin Permission Request                   │
├─────────────────────────────────────────────────┤
│                                                  │
│ Plugin: "GitHub Copilot" (v1.2.3)              │
│                                                  │
│ Wants to perform:                               │
│ • Module: child_process.exec                    │
│ • Command: git status                           │
│                                                  │
│ ⚠️  This operation can execute system commands  │
│                                                  │
│ [ ] Remember my decision for this plugin        │
│                                                  │
│    [Deny]    [Allow Once]    [Always Allow]     │
└─────────────────────────────────────────────────┘
```

### 选项说明：
- **Deny**: 拒绝本次操作，插件会收到权限错误
- **Allow Once**: 允许本次操作，下次还会询问
- **Always Allow**: 始终允许该插件的此类操作，不再询问

## 📊 权限策略存储

```typescript
interface PermissionPolicy {
    pluginId: string;
    moduleId: string;
    decision: 'allow' | 'deny' | 'ask';
    timestamp: number;
}
```

策略存储位置：
- 前端：`ModulePermissionService` 维护运行时缓存
- 持久化：保存到用户配置文件（如 `~/.theia/plugin-permissions.json`）

## ✅ 优势

1. **统一管理**：所有拦截逻辑集中在一个地方
2. **覆盖全面**：所有插件类型、所有加载方式都被保护
3. **代码简化**：init 文件职责单一，易于维护
4. **性能优化**：全局 hook 只设置一次
5. **用户友好**：统一的权限对话框体验

## 🔄 迁移步骤

1. 创建 `UnifiedModuleInterceptor`
2. 修改 `plugin-host-rpc.ts` 调用统一拦截器
3. 简化 `backend-init-theia.ts`（删除拦截逻辑）
4. 简化 `plugin-vscode-init.ts`（删除拦截逻辑）
5. 删除或废弃 `FileSystemInterceptor`（功能并入统一拦截器）
6. 测试所有插件类型

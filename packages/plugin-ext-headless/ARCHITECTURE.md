# plugin-ext-headless 包架构文档

## 目录

1. [概述](#1-概述)
2. [包结构](#2-包结构)
3. [核心概念](#3-核心概念)
4. [与 plugin-ext 的关系](#4-与-plugin-ext-的关系)
5. [插件部署激活完整流程](#5-插件部署激活完整流程)
6. [关键组件详解](#6-关键组件详解)
7. [RPC 通信机制](#7-rpc-通信机制)
8. [使用示例](#8-使用示例)

---

## 1. 概述

### 1.1 什么是 plugin-ext-headless？

`plugin-ext-headless` 是 Theia 插件系统的一个扩展包，专门用于支持 **无头插件（Headless Plugins）**。与传统的前端/后端插件不同，headless 插件：

- **全局生命周期**：不依赖于任何客户端连接，在服务器启动时激活，服务器关闭时停用
- **无 UI 依赖**：不访问编辑器、视图、工作区等 UI 相关 API
- **后台服务**：适用于运行后台任务、定时服务、全局状态管理等场景

### 1.2 为什么需要 Headless 插件？

| 插件类型 | 作用域 | 生命周期 | 典型用途 |
|---------|--------|---------|---------|
| **Frontend** | 连接特定 | 随客户端连接 | UI 交互、编辑器功能 |
| **Backend** | 连接特定 | 随客户端连接 | 文件操作、语言服务 |
| **Headless** | 全局 | 随服务器运行 | 后台服务、定时任务、全局缓存 |

### 1.3 核心设计目标

1. **隔离性**：通过子容器隔离 headless 插件，避免与连接特定插件冲突
2. **兼容性**：支持适配 vscode/theiaPlugin 风格插件为 headless 风格
3. **最小化**：提供精简的 API 集合，仅包含 headless 场景必需的功能
4. **可扩展性**：通过 API 贡献机制允许其他包扩展 headless 功能

---

## 2. 包结构

```
packages/plugin-ext-headless/
├── src/
│   ├── common/                               # 通用定义（协议、接口、类型）
│   │   ├── headless-plugin-container.ts      # IoC 容器标识符
│   │   ├── headless-plugin-protocol.ts       # 协议扩展（激活事件等）
│   │   ├── headless-plugin-rpc.ts            # RPC 上下文定义
│   │   ├── plugin-ext-headless-api-contribution.ts  # API 贡献接口
│   │   └── index.ts
│   │
│   ├── hosted/                               # 托管插件支持
│   │   ├── node/                             # Node.js 环境实现
│   │   │   ├── headless-hosted-plugin.ts     # 托管支持核心类
│   │   │   ├── headless-plugin-service.ts    # 插件服务器实现
│   │   │   ├── plugin-ext-headless-hosted-module.ts  # 托管模块绑定
│   │   │   ├── plugin-host-headless.ts       # 子进程入口
│   │   │   ├── plugin-host-headless-module.ts # 子进程 IoC 配置
│   │   │   ├── plugin-host-headless-rpc.ts   # 子进程 RPC 处理
│   │   │   └── scanners/
│   │   │       └── scanner-theia-headless.ts # Headless 插件扫描器
│   │   └── node-electron/
│   │       └── plugin-ext-headless-hosted-electron-module.ts
│   │
│   ├── main/                                 # 主进程实现
│   │   └── node/
│   │       ├── plugin-ext-headless-main-module.ts  # 主模块绑定
│   │       ├── main-context.ts               # RPC API 初始化
│   │       ├── headless-progress-client.ts   # 进度客户端
│   │       └── handlers/
│   │           └── plugin-theia-headless-directory-handler.ts  # 目录处理器
│   │
│   ├── plugin/                               # 插件端实现
│   │   └── headless-plugin-manager.ts        # 插件管理器
│   │
│   ├── plugin-ext-headless-module.ts         # 后端模块导出
│   ├── plugin-ext-headless-electron-module.ts # Electron 模块导出
│   └── index.ts
│
├── package.json
└── README.md
```

---

## 3. 核心概念

### 3.1 Headless 插件标识

Headless 插件的识别**不是基于引擎类型**，而是基于 `headless` 入口点字段。只要 `package.json` 中存在 `headless` 字段，就会被识别为 headless 插件。

**方式一：VSCode 风格（推荐）**
```json
{
  "name": "my-headless-plugin",
  "engines": {
    "vscode": "^1.84.0"
  },
  "headless": "./dist/headless.js",
  "activationEvents": ["*"]
}
```

**方式二：Theia 风格**
```json
{
  "name": "my-headless-plugin",
  "engines": {
    "theiaPlugin": "next"
  },
  "theiaPlugin": {
    "headless": "./dist/headless.js"
  },
  "activationEvents": ["*"]
}
```

**方式三：原生 Headless 引擎**
```json
{
  "name": "my-headless-plugin",
  "engines": {
    "theiaHeadlessPlugin": "^1.50.0"
  },
  "main": "./dist/extension.js",
  "activationEvents": ["*"]
}
```

> **重要说明**：判断是否为 headless 插件的关键逻辑是 `isHeadlessPlugin()` 函数：
> ```typescript
> export function isHeadlessPlugin(plugin: DeployedPlugin): boolean {
>     return !!plugin.metadata.model.entryPoint.headless;
> }
> ```
> 只要解析出的 `entryPoint.headless` 存在，就是 headless 插件，与引擎类型无关。

### 3.2 插件入口点类型

```typescript
interface PluginEntryPoint {
    frontend?: string;   // 前端插件入口（浏览器 Worker）
    backend?: string;    // 后端插件入口（连接特定的 Node 进程）
    headless?: string;   // Headless 插件入口（全局 Node 进程）
}
```

### 3.3 容器隔离架构

```
┌─────────────────────────────────────────────────────────────┐
│                    全局主容器 (Main Container)                │
│     包含所有核心服务：PluginDeployer, HostedPluginServer...   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────────┐
    │ 连接容器1 │   │ 连接容器2 │   │ Headless 子容器  │
    │(前/后端) │   │(前/后端) │   │   (全局单例)     │
    └──────────┘   └──────────┘   └──────────────────┘
         │              │                  │
    用户连接1      用户连接2         全局 Headless 插件
```

### 3.4 支持的激活事件

```typescript
// 当前支持的激活事件
const SupportedHeadlessActivationEvents = ['*', 'onStartupFinished'];

// '*' - 立即激活
// 'onStartupFinished' - 服务器启动完成后激活
```

---

## 4. 与 plugin-ext 的关系

### 4.1 依赖关系

`plugin-ext-headless` 是 `plugin-ext` 的扩展，继承并复用其核心功能：

```
plugin-ext-headless
       │
       │ 继承
       ▼
   plugin-ext
```

**关键继承关系：**

| plugin-ext-headless 类 | 继承自 plugin-ext |
|----------------------|------------------|
| `HeadlessHostedPluginSupport` | `AbstractHostedPluginSupport` |
| `HeadlessHostedPluginServerImpl` | `HostedPluginServerImpl` |
| `HeadlessPluginManagerExtImpl` | `AbstractPluginManagerExtImpl` |
| `HeadlessPluginHostRPC` | `AbstractPluginHostRPC` |
| `PluginTheiaHeadlessDirectoryHandler` | `AbstractPluginDirectoryHandler` |

### 4.2 协作方式

```
                 plugin-ext                          plugin-ext-headless
            ┌─────────────────┐                   ┌─────────────────────┐
            │                 │                   │                     │
            │ PluginDeployer  │◀──────────────────│ Headless Handler    │
            │   (部署核心)    │    注册处理器      │                     │
            │                 │                   │                     │
            └────────┬────────┘                   └──────────┬──────────┘
                     │                                       │
                     │ 触发                                  │ 继承
                     ▼                                       ▼
            ┌─────────────────┐                   ┌─────────────────────┐
            │ Abstract        │                   │ Headless            │
            │ HostedPlugin    │◀──────────────────│ HostedPlugin        │
            │ Support (基类)  │                   │ Support             │
            └────────┬────────┘                   └──────────┬──────────┘
                     │                                       │
                     │ 定义                                  │ 实现
                     ▼                                       ▼
            ┌─────────────────┐                   ┌─────────────────────┐
            │ Abstract        │                   │ Headless            │
            │ PluginManager   │◀──────────────────│ PluginManager       │
            │ Ext (基类)      │                   │ ExtImpl             │
            └─────────────────┘                   └─────────────────────┘
```

---

## 5. 插件部署激活完整流程

### 5.1 流程总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                          主进程 (Main Process)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  阶段1: 插件扫描                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ PluginDeployerImpl.start()                                     │ │
│  │   └─ 读取 THEIA_PLUGINS 环境变量                                │ │
│  │   └─ 扫描 plugins 目录                                         │ │
│  │   └─ 调用各 Resolver 解析插件位置                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  阶段2: 插件处理                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ PluginTheiaHeadlessDirectoryHandler.handle()                   │ │
│  │   └─ 检查 engines.theiaHeadlessPlugin                          │ │
│  │   └─ 复制插件到部署目录                                         │ │
│  │   └─ 标记为 PluginDeployerEntryType.HEADLESS                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  阶段3: 托管支持初始化                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ HeadlessHostedPluginSupport.onStart()                          │ │
│  │   └─ 创建隔离的子容器 (headlessPluginsContainer)                │ │
│  │   └─ 等待部署完成 (onDidDeploy)                                 │ │
│  │   └─ 同步插件信息 (syncPlugins)                                 │ │
│  │   └─ 启动插件 (startPlugins)                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  阶段4: 创建子进程                                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ HostedPluginProcess.fork('plugin-host-headless.ts')            │ │
│  │   └─ 建立 IPC 通信管道                                          │ │
│  │   └─ 初始化 RPC 协议                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                │
                           IPC 通信
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      子进程 (Plugin Host Headless)                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  阶段5: 子进程初始化                                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ plugin-host-headless.ts                                        │ │
│  │   └─ 创建 IoC 容器                                              │ │
│  │   └─ 初始化 HeadlessPluginHostRPC                              │ │
│  │   └─ 建立 RPC 代理连接                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼                                          │
│  阶段6: 插件激活                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ HeadlessPluginManagerExtImpl.$init()                           │ │
│  │   └─ 初始化支持的激活事件                                       │ │
│  │   └─ 设置全局存储                                               │ │
│  │   └─ 初始化环境                                                 │ │
│  │                                                                 │ │
│  │ HeadlessPluginManagerExtImpl.$activatePlugin()                 │ │
│  │   └─ 加载插件代码 (require)                                     │ │
│  │   └─ 调用插件 activate() 函数                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 详细流程说明

#### 阶段1: 插件扫描

**入口文件**: `plugin-ext/src/main/node/plugin-deployer-impl.ts`

```typescript
// PluginDeployerImpl.start()
async start(): Promise<void> {
    // 1. 从环境变量获取插件路径
    const defaultPluginsPath = process.env.THEIA_DEFAULT_PLUGINS;
    const pluginsPath = process.env.THEIA_PLUGINS;

    // 2. 解析所有插件位置
    for (const resolver of this.pluginResolvers.getContributions()) {
        await resolver.resolve(pluginPath, context);
    }
}
```

#### 阶段2: 插件处理

**入口文件**: `plugin-ext-headless/src/main/node/handlers/plugin-theia-headless-directory-handler.ts`

```typescript
@injectable()
export class PluginTheiaHeadlessDirectoryHandler extends AbstractPluginDirectoryHandler {

    // 判断是否为 Headless 插件
    protected acceptManifest(plugin: PluginPackage): boolean {
        return plugin?.engines?.theiaPlugin === undefined
            && 'theiaHeadlessPlugin' in plugin.engines;
    }

    // 处理 Headless 插件
    async handle(context: PluginDeployerDirectoryHandlerContext): Promise<void> {
        // 复制到部署目录
        await this.copyDirectory(context);

        // 标记类型为 HEADLESS
        const types: PluginDeployerEntryType[] = [PluginDeployerEntryType.HEADLESS];
        context.pluginEntry().accept(...types);
    }
}
```

#### 阶段3: 托管支持初始化

**入口文件**: `plugin-ext-headless/src/hosted/node/plugin-ext-headless-hosted-module.ts`

```typescript
export function bindHeadlessHosted(bind: interfaces.Bind): void {
    // 绑定扫描器
    bind(TheiaHeadlessPluginScanner).toSelf().inSingletonScope();
    bind(PluginScanner).toService(TheiaHeadlessPluginScanner);

    // 绑定支持的激活事件
    bind(SupportedHeadlessActivationEvents).toConstantValue(['*', 'onStartupFinished']);

    // 绑定后端应用贡献
    bind(BackendApplicationContribution).toDynamicValue(({container}) => {
        let hostedPluginSupport: HeadlessHostedPluginSupport | undefined;
        return {
            onStart(): MaybePromise<void> {
                // 创建隔离的子容器
                const headlessPluginsContainer = container.createChild();
                const modules = container.getAll<ContainerModule>(HeadlessPluginContainerModule);
                headlessPluginsContainer.load(...modules);

                // 获取托管支持实例并启动
                hostedPluginSupport = headlessPluginsContainer.get(HeadlessHostedPluginSupport);
                hostedPluginSupport.onStart(headlessPluginsContainer);
            },
            onStop(): void {
                hostedPluginSupport?.shutDown();
            }
        };
    });
}
```

**入口文件**: `plugin-ext-headless/src/hosted/node/headless-hosted-plugin.ts`

```typescript
@injectable()
export class HeadlessHostedPluginSupport extends AbstractHostedPluginSupport {

    // 等待插件部署完成
    protected override async beforeSyncPlugins(toDisconnect: DisposableCollection): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.pluginDeployer.onDidDeploy(resolve);
            toDisconnect.push(Disposable.create(reject));
        });
    }

    // 过滤并接受 Headless 插件
    protected acceptPlugin(plugin: DeployedPlugin): boolean | DeployedPlugin {
        if (!isHeadlessPlugin(plugin)) {
            return false;  // 只接受 headless 插件
        }

        if (plugin.metadata.model.engine.type === this.scanner.apiType) {
            return true;   // 原生 headless 插件
        }

        // 为 vscode/theiaPlugin 适配为 headless
        return this.scanner.adaptForHeadless(plugin);
    }
}

// 判断是否为 Headless 插件
export function isHeadlessPlugin(plugin: DeployedPlugin): boolean {
    return !!plugin.metadata.model.entryPoint.headless;
}
```

#### 阶段4: 创建子进程

主进程通过 `HostedPluginProcess` 创建一个独立的子进程来运行 headless 插件。

#### 阶段5: 子进程初始化

**入口文件**: `plugin-ext-headless/src/hosted/node/plugin-host-headless.ts`

```typescript
// 子进程入口点
const container = new Container();
container.load(pluginHostModule);  // 加载 IoC 配置

const rpc: RPCProtocol = container.get(RPCProtocol);
const pluginHostRPC = container.get(HeadlessPluginHostRPC);

// 监听来自主进程的消息
process.on('message', async (message: string) => {
    const msg = JSON.parse(message);
    if (ProcessTerminateMessage.is(msg)) {
        await pluginHostRPC.terminate();
        // 清理并响应
    }
});
```

**入口文件**: `plugin-ext-headless/src/hosted/node/plugin-host-headless-module.ts`

```typescript
export const pluginHostModule = new ContainerModule(bind => {
    // 绑定 RPC 协议
    bind(RPCProtocol).toDynamicValue(ctx => {
        const parentPort = ctx.container.get(IPCChannel);
        return new RPCProtocolImpl(parentPort);
    }).inSingletonScope();

    // 绑定 Headless 插件管理器
    bind(HeadlessPluginManagerExtImpl).toSelf().inSingletonScope();
    bind(AbstractPluginManagerExtImpl).toService(HeadlessPluginManagerExtImpl);

    // 绑定 RPC 处理器
    bind(HeadlessPluginHostRPC).toSelf().inSingletonScope();

    // 绑定其他服务...
});
```

#### 阶段6: 插件激活

**入口文件**: `plugin-ext-headless/src/plugin/headless-plugin-manager.ts`

```typescript
@injectable()
export class HeadlessPluginManagerExtImpl
    extends AbstractPluginManagerExtImpl<HeadlessPluginManagerInitializeParams>
    implements HeadlessPluginManagerExt {

    private readonly supportedActivationEvents = new Set<string>();

    // 初始化
    async $init(params: HeadlessPluginManagerInitializeParams): Promise<void> {
        // 设置支持的激活事件
        params.activationEvents?.forEach(event =>
            this.supportedActivationEvents.add(event)
        );

        // 初始化全局存储
        this.storage.init(params.globalState, {});

        // 设置环境
        this.envExt.setLanguage(params.env.language);
        this.envExt.setApplicationName(params.env.appName);
        this.envExt.setAppHost(params.env.appHost);

        // 初始化扩展 API
        if (params.extApi) {
            this.host.initExtApi(params.extApi);
        }
    }

    // 获取插件的激活事件
    protected getActivationEvents(plugin: Plugin): string[] | undefined {
        const result = plugin.rawModel?.activationEvents;
        return Array.isArray(result) ? result : undefined;
    }

    // 判断是否为支持的激活事件
    protected isSupportedActivationEvent(activationEvent: string): boolean {
        return this.supportedActivationEvents.has(
            activationEvent.split(':')[0]
        );
    }
}
```

---

## 6. 关键组件详解

### 6.1 HeadlessHostedPluginSupport

**位置**: `src/hosted/node/headless-hosted-plugin.ts`

**职责**:
- 管理 headless 插件的完整生命周期
- 创建和管理与子进程的 RPC 连接
- 同步部署的插件信息
- 协调插件的启动和停止

**关键方法**:

```typescript
export class HeadlessHostedPluginSupport extends AbstractHostedPluginSupport {

    // 初始化 RPC 连接
    protected initRpc(host: HeadlessPluginHost, pluginId: string): RPCProtocol {
        const rpc = this.createServerRpc(host);
        this.container.bind(RPCProtocol).toConstantValue(rpc);

        // 设置主端 API
        setUpPluginApi(rpc, this.container);

        // 允许扩展 API
        this.mainPluginApiProviders.getContributions()
            .forEach(p => p.initialize(rpc, this.container));

        return rpc;
    }

    // 获取插件管理器
    protected obtainManager(
        host: HeadlessPluginHost,
        contributions: PluginContributions[]
    ): Promise<HeadlessPluginManagerExt> {
        // 初始化 RPC
        const rpc = this.initRpc(host, contributions[0].plugin.metadata.model.id);

        // 获取管理器代理
        return rpc.getProxy(HEADLESSMAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT);
    }
}
```

### 6.2 HeadlessPluginManagerExtImpl

**位置**: `src/plugin/headless-plugin-manager.ts`

**职责**:
- 在子进程中管理插件实例
- 处理插件初始化和激活
- 管理全局存储
- 处理激活事件

**关键特性**:

```typescript
export class HeadlessPluginManagerExtImpl
    extends AbstractPluginManagerExtImpl<HeadlessPluginManagerInitializeParams> {

    // 支持 VSCode 风格的根级 activationEvents
    protected getActivationEvents(plugin: Plugin): string[] | undefined {
        const result = plugin.rawModel?.activationEvents;
        return Array.isArray(result) ? result : undefined;
    }

    // 只支持有限的激活事件
    protected isSupportedActivationEvent(activationEvent: string): boolean {
        return this.supportedActivationEvents.has(
            activationEvent.split(':')[0]
        );
    }
}
```

### 6.3 TheiaHeadlessPluginScanner

**位置**: `src/hosted/node/scanners/scanner-theia-headless.ts`

**职责**:
- 扫描和识别 headless 插件
- 适配 vscode/theiaPlugin 格式为 headless 格式

**适配逻辑**:

```typescript
export class TheiaHeadlessPluginScanner implements PluginScanner {

    // 将非原生 headless 插件适配为 headless 格式
    adaptForHeadless(plugin: DeployedPlugin): DeployedPlugin {
        return {
            type: plugin.type,
            metadata: this.adaptMetadataForHeadless(plugin),
            contributes: this.adaptContributesForHeadless(plugin)
        };
    }

    protected adaptMetadataForHeadless(plugin: DeployedPlugin): PluginMetadata {
        const result = deepClone(plugin.metadata);
        const lifecycle = result.lifecycle;

        // 移除不适用的入口点
        delete lifecycle.frontendInitPath;
        delete lifecycle.backendInitPath;

        // 设置 VS Code 命名约定
        lifecycle.startMethod = 'activate';
        lifecycle.stopMethod = 'deactivate';

        return result;
    }

    protected adaptContributesForHeadless(plugin: DeployedPlugin): PluginContributions | undefined {
        // Headless 插件暂不支持贡献点
        return undefined;
    }
}
```

### 6.4 PluginTheiaHeadlessDirectoryHandler

**位置**: `src/main/node/handlers/plugin-theia-headless-directory-handler.ts`

**职责**:
- 识别 headless 类型的插件目录
- 处理插件的复制和部署
- 标记插件类型

---

## 7. RPC 通信机制

### 7.1 RPC 上下文定义

**位置**: `src/common/headless-plugin-rpc.ts`

```typescript
// 主进程 → 子进程 的代理标识
export const HEADLESSMAIN_RPC_CONTEXT = {
    HOSTED_PLUGIN_MANAGER_EXT: createProxyIdentifier<HeadlessPluginManagerExt>('HeadlessPluginManagerExt'),
    NOTIFICATION_EXT: MAIN_RPC_CONTEXT.NOTIFICATION_EXT
};

// 子进程 → 主进程 的代理标识
export const HEADLESSPLUGIN_RPC_CONTEXT = {
    MESSAGE_REGISTRY_MAIN: PLUGIN_RPC_CONTEXT.MESSAGE_REGISTRY_MAIN,
    ENV_MAIN: PLUGIN_RPC_CONTEXT.ENV_MAIN,
    NOTIFICATION_MAIN: PLUGIN_RPC_CONTEXT.NOTIFICATION_MAIN,
    LOCALIZATION_MAIN: PLUGIN_RPC_CONTEXT.LOCALIZATION_MAIN
};
```

### 7.2 API 初始化

**位置**: `src/main/node/main-context.ts`

```typescript
export function setUpPluginApi(rpc: RPCProtocol, container: interfaces.Container): void {
    // 环境 API
    const envMain = new EnvMainImpl(rpc, container);
    rpc.set(HEADLESSPLUGIN_RPC_CONTEXT.ENV_MAIN, envMain);

    // 消息 API
    const messageRegistryMain = new BasicMessageRegistryMainImpl(container);
    rpc.set(HEADLESSPLUGIN_RPC_CONTEXT.MESSAGE_REGISTRY_MAIN, messageRegistryMain);

    // 通知 API
    const notificationMain = new BasicNotificationMainImpl(
        rpc, container, HEADLESSMAIN_RPC_CONTEXT.NOTIFICATION_EXT
    );
    rpc.set(HEADLESSPLUGIN_RPC_CONTEXT.NOTIFICATION_MAIN, notificationMain);
}
```

### 7.3 通信流程图

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│       主进程 (Main Process)      │         │    子进程 (Plugin Host)          │
├─────────────────────────────────┤         ├─────────────────────────────────┤
│                                 │         │                                 │
│  HeadlessHostedPluginSupport   │  IPC    │  HeadlessPluginHostRPC         │
│         │                       │ ◀═════▶ │         │                       │
│         ▼                       │         │         ▼                       │
│  ┌─────────────────┐           │         │  ┌─────────────────┐           │
│  │  RPCProtocol    │           │         │  │  RPCProtocol    │           │
│  │ (主端实现)       │           │         │  │ (插件端实现)     │           │
│  └────────┬────────┘           │         │  └────────┬────────┘           │
│           │                     │         │           │                     │
│           ▼                     │         │           ▼                     │
│  ┌─────────────────┐           │         │  ┌─────────────────┐           │
│  │ HEADLESSPLUGIN_ │           │         │  │ HEADLESSMAIN_   │           │
│  │ RPC_CONTEXT     │           │         │  │ RPC_CONTEXT     │           │
│  │ - ENV_MAIN      │──────────────────────│ - PLUGIN_MANAGER │           │
│  │ - MESSAGE_MAIN  │           │         │  │ - NOTIFICATION  │           │
│  │ - NOTIFICATION  │           │         │  │                 │           │
│  └─────────────────┘           │         │  └─────────────────┘           │
│                                 │         │                                 │
└─────────────────────────────────┘         └─────────────────────────────────┘
```

---

## 8. 使用示例

### 8.1 创建 Headless 插件

Headless 插件有两种创建方式：

**方式一：VSCode 风格（推荐）**

**package.json**:
```json
{
  "name": "my-headless-plugin",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.84.0"
  },
  "headless": "./dist/headless.js",
  "activationEvents": ["*"]
}
```

**方式二：原生 Theia Headless 引擎**

**package.json**:
```json
{
  "name": "my-headless-plugin",
  "version": "1.0.0",
  "engines": {
    "theiaHeadlessPlugin": "^1.50.0"
  },
  "main": "./dist/extension.js",
  "activationEvents": ["*"]
}
```

**headless.js / extension.js**:
```javascript
// 注意：headless 插件默认没有 theia namespace！
// 需要使用扩展 API 或直接使用 Node.js API

async function activate() {
    console.log('Headless plugin activated!');

    // 使用扩展 API（如果可用）
    let headlessService;
    try {
        headlessService = require('@theia/headless-service');
        const sysInfo = await headlessService.getSystemInfo();
        console.log('Running on:', sysInfo.platform);
    } catch (e) {
        console.log('Headless service not available, using fallback');
    }

    // 启动后台服务
    startBackgroundService();
}

function deactivate() {
    console.log('Headless plugin deactivated!');
    stopBackgroundService();
}

module.exports = { activate, deactivate };
```

### 8.2 扩展 Headless API（完整示例）

为 headless 插件提供自定义 API 需要以下步骤：

#### 步骤 1：定义 RPC 协议

**common/my-service-api-rpc.ts**:
```typescript
import { createProxyIdentifier } from '@theia/plugin-ext/lib/common/rpc-protocol';

// Main 端接口（插件调用，主进程实现）
export const MyServiceMain = Symbol('MyServiceMain');
export interface MyServiceMain {
    $getData(): Promise<string>;
    $setData(value: string): Promise<void>;
}

// Ext 端接口（主进程调用，插件端实现）
export const MyServiceExt = Symbol('MyServiceExt');
export interface MyServiceExt {
    $onDataChanged(value: string): Promise<void>;
}

// RPC 上下文
export const MY_SERVICE_PLUGIN_RPC_CONTEXT = {
    MY_SERVICE_MAIN: createProxyIdentifier<MyServiceMain>('MyServiceMain')
};

export const MY_SERVICE_MAIN_RPC_CONTEXT = {
    MY_SERVICE_EXT: createProxyIdentifier<MyServiceExt>('MyServiceExt')
};
```

#### 步骤 2：实现主端（Main Side）

**main/node/my-service-main-impl.ts**:
```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { MyServiceMain, MyServiceExt, MY_SERVICE_MAIN_RPC_CONTEXT } from '../../common/my-service-api-rpc';

@injectable()
export class MyServiceMainImpl implements MyServiceMain {
    @inject(ILogger) protected readonly logger: ILogger;

    protected rpc: RPCProtocol;
    protected proxy: MyServiceExt;
    private data: string = '';

    initialize(rpc: RPCProtocol): void {
        this.rpc = rpc;
        this.proxy = rpc.getProxy(MY_SERVICE_MAIN_RPC_CONTEXT.MY_SERVICE_EXT);
    }

    async $getData(): Promise<string> {
        return this.data;
    }

    async $setData(value: string): Promise<void> {
        this.data = value;
        // 通知插件端数据变化
        if (this.proxy) {
            await this.proxy.$onDataChanged(value);
        }
    }
}
```

#### 步骤 3：实现插件端（Ext Side）

**plugin/my-service-ext-impl.ts**:
```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { MyServiceMain, MyServiceExt, MY_SERVICE_PLUGIN_RPC_CONTEXT } from '../common/my-service-api-rpc';

@injectable()
export class MyServiceExtImpl implements MyServiceExt {
    private proxy: MyServiceMain;
    private readonly onDataChangedEmitter = new Emitter<string>();

    constructor(@inject(RPCProtocol) rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(MY_SERVICE_PLUGIN_RPC_CONTEXT.MY_SERVICE_MAIN);
    }

    // 被主端调用
    async $onDataChanged(value: string): Promise<void> {
        this.onDataChangedEmitter.fire(value);
    }

    // 公开给插件的 API
    getData(): Promise<string> {
        return this.proxy.$getData();
    }

    setData(value: string): Promise<void> {
        return this.proxy.$setData(value);
    }

    get onDataChanged(): Event<string> {
        return this.onDataChangedEmitter.event;
    }
}
```

#### 步骤 4：创建 API 初始化脚本

**plugin/my-service-init.ts**:
```typescript
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { Plugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { PluginContainerModule } from '@theia/plugin-ext/lib/plugin/node/plugin-container-module';
import { MyServiceExtImpl } from './my-service-ext-impl';
import { MyServiceExt, MY_SERVICE_MAIN_RPC_CONTEXT } from '../common/my-service-api-rpc';

// 定义 API 接口
export interface MyServiceAPI {
    getData(): Promise<string>;
    setData(value: string): Promise<void>;
    onDataChanged(listener: (value: string) => void): { dispose(): void };
}

const MyServiceApiFactory = Symbol('MyServiceApiFactory');

@injectable()
class MyServiceApiFactoryImpl {
    @inject(RPCProtocol) protected readonly rpc: RPCProtocol;
    @inject(MyServiceExtImpl) protected readonly serviceExt: MyServiceExtImpl;

    @postConstruct()
    initialize(): void {
        // 注册 Ext 实现到 RPC
        this.rpc.set(MY_SERVICE_MAIN_RPC_CONTEXT.MY_SERVICE_EXT, this.serviceExt);
    }

    // 为每个插件创建 API 对象
    createApi(plugin: Plugin): MyServiceAPI {
        const ext = this.serviceExt;
        return {
            getData: () => ext.getData(),
            setData: (value) => ext.setData(value),
            onDataChanged: (listener) => ext.onDataChanged(listener)
        };
    }
}

// 导出容器模块
export const containerModule = PluginContainerModule.create(({ bind, bindApiFactory }) => {
    bind(MyServiceExtImpl).toSelf().inSingletonScope();
    bind(MyServiceExt).toService(MyServiceExtImpl);

    // 绑定 API 工厂到模块名
    // 插件可以通过 require('@my/service') 获取 API
    bindApiFactory('@my/service', MyServiceApiFactory, MyServiceApiFactoryImpl);
});
```

#### 步骤 5：注册 API 提供者

**main/node/my-service-api-provider.ts**:
```typescript
import * as path from 'path';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ExtPluginApiProvider, ExtPluginApi, MainPluginApiProvider } from '@theia/plugin-ext';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { MyServiceMainImpl } from './my-service-main-impl';
import { MY_SERVICE_PLUGIN_RPC_CONTEXT } from '../../common/my-service-api-rpc';

@injectable()
export class MyServiceExtPluginApiProvider implements ExtPluginApiProvider {
    provideApi(): ExtPluginApi {
        return {
            headlessInitPath: path.join(__dirname, '../../plugin/my-service-init')
        };
    }
}

@injectable()
export class MyServiceMainPluginApiProvider implements MainPluginApiProvider {
    @inject(MyServiceMainImpl) protected readonly myServiceMain: MyServiceMainImpl;

    initialize(rpc: RPCProtocol): void {
        this.myServiceMain.initialize(rpc);
        rpc.set(MY_SERVICE_PLUGIN_RPC_CONTEXT.MY_SERVICE_MAIN, this.myServiceMain);
    }
}
```

#### 步骤 6：在模块中绑定

**module.ts**:
```typescript
import { ContainerModule } from '@theia/core/shared/inversify';
import { ExtPluginApiProvider, MainPluginApiProvider } from '@theia/plugin-ext';
import { MyServiceMainImpl } from './my-service-main-impl';
import { MyServiceExtPluginApiProvider, MyServiceMainPluginApiProvider } from './my-service-api-provider';

export default new ContainerModule(bind => {
    bind(MyServiceMainImpl).toSelf().inSingletonScope();
    bind(MyServiceExtPluginApiProvider).toSelf().inSingletonScope();
    bind(Symbol.for(ExtPluginApiProvider)).toService(MyServiceExtPluginApiProvider);
    bind(MyServiceMainPluginApiProvider).toSelf().inSingletonScope();
    bind(MainPluginApiProvider).toService(MyServiceMainPluginApiProvider);
});
```

#### 步骤 7：在插件中使用

**headless-plugin/extension.js**:
```javascript
let myService;
try {
    myService = require('@my/service');
} catch (e) {
    console.log('My service not available');
}

async function activate() {
    if (myService) {
        // 获取数据
        const data = await myService.getData();
        console.log('Current data:', data);

        // 设置数据
        await myService.setData('Hello from headless plugin!');

        // 监听变化
        myService.onDataChanged((value) => {
            console.log('Data changed:', value);
        });
    }
}

module.exports = { activate, deactivate: () => {} };
```

### 8.3 内置的 @theia/headless-service API

`plugin-ext-headless` 包内置了一个示例扩展 API：`@theia/headless-service`。

**可用功能**：

| API | 描述 |
|-----|------|
| `getSystemInfo()` | 获取系统信息（平台、内存、CPU等） |
| `setGlobalState(key, value)` | 设置全局状态 |
| `getGlobalState(key)` | 获取全局状态 |
| `log(level, message)` | 通过主进程记录日志 |
| `scheduleTask(id, delay, callback)` | 调度定时任务 |
| `cancelTask(id)` | 取消定时任务 |
| `onTaskTriggered(listener)` | 监听任务触发 |
| `onGlobalStateChanged(listener)` | 监听状态变化 |

**使用示例**：
```javascript
const headlessService = require('@theia/headless-service');

async function activate() {
    // 获取系统信息
    const info = await headlessService.getSystemInfo();
    console.log(`Platform: ${info.platform}, CPUs: ${info.cpuCount}`);

    // 使用全局状态
    await headlessService.setGlobalState('myPlugin:counter', 0);
    const counter = await headlessService.getGlobalState('myPlugin:counter');

    // 调度任务
    await headlessService.scheduleTask('cleanup', 60000, async () => {
        await headlessService.log('info', 'Running cleanup task');
    });

    // 监听状态变化
    headlessService.onGlobalStateChanged((event) => {
        console.log(`State changed: ${event.key} = ${event.value}`);
    });
}

module.exports = { activate, deactivate: () => {} };
```

---

## 9. 总结

### plugin-ext-headless 的核心价值

1. **全局后台服务支持**：允许插件在服务器级别运行，不依赖客户端连接
2. **隔离架构**：通过子容器和独立子进程确保 headless 插件与其他插件互不影响
3. **最小化 API**：只暴露 headless 场景必需的 API，保持轻量级
4. **兼容性**：支持适配现有 vscode/theiaPlugin 格式插件

### 与 plugin-ext 的协作方式

- **继承基类**：复用 `plugin-ext` 的核心抽象类和接口
- **注册处理器**：向 `PluginDeployer` 注册 headless 目录处理器
- **扩展协议**：在 `plugin-ext` 协议基础上添加 headless 特定的 RPC 上下文
- **共享基础设施**：复用 `plugin-ext` 的子进程管理、RPC 通信等基础设施

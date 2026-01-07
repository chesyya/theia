# 插件对象注册与回调函数实现文档

## 概述

本文档描述如何在 Theia 插件系统中实现对象注册机制，支持 Main 端调用插件注册对象的方法，并传入回调函数作为参数。

参考实现：`packages/plugin-ext/src/plugin/notebook/notebook-kernels.ts` 中的 `createNotebookController`

---

## 1. 需求定义

### 1.1 插件端接口定义

```typescript
// packages/plugin/src/theia.d.ts

export interface Demo {
    /**
     * 获取配置信息
     */
    func1(): Promise<any>;

    /**
     * Demo 对象名称
     */
    readonly name: string;

    /**
     * 执行操作，接受回调函数作为参数
     * @param fun3 Main 端传入的回调函数
     */
    fun2(fun3: (object1: any) => void): Promise<void>;

    /**
     * 释放资源
     */
    dispose(): void;
}

export namespace demo {
    /**
     * 注册 Demo 对象
     * @param id Demo 的唯一标识符
     * @param name Demo 对象的名称
     * @returns Disposable 对象，用于取消注册
     */
    export function registerA(id: string, name: string): Demo;
}
```

---

## 2. RPC 接口定义

### 2.1 定义数据传输对象

```typescript
// packages/plugin-ext/src/common/plugin-api-rpc.ts

/**
 * Demo 对象的 DTO
 */
export interface DemoDto {
    id: string;
    name: string;
    extensionId: string;
}

/**
 * 插件端接口（运行在插件进程）
 */
export interface DemoExt {
    /**
     * Main 端调用插件端的 func1
     */
    $func1(handle: number): Promise<any>;

    /**
     * Main 端调用插件端的 fun2
     * @param handle Demo 对象的句柄
     * @param callbackHandle 回调函数的句柄
     */
    $fun2(handle: number, callbackHandle: number): Promise<void>;
}

/**
 * Main 端接口（运行在主进程）
 */
export interface DemoMain {
    /**
     * 添加 Demo 对象
     */
    $addDemo(handle: number, data: DemoDto): Promise<void>;

    /**
     * 移除 Demo 对象
     */
    $removeDemo(handle: number): Promise<void>;

    /**
     * 插件端调用 Main 端注册的回调函数
     * @param callbackHandle 回调函数句柄
     * @param object1 回调参数
     */
    $invokeCallback(callbackHandle: number, object1: any): Promise<void>;
}
```

### 2.2 注册 RPC 上下文

```typescript
// packages/plugin-ext/src/common/plugin-api-rpc.ts

export const PLUGIN_RPC_CONTEXT = {
    // ... 其他上下文
    DEMO_MAIN: createProxyIdentifier<DemoMain>('DemoMain'),
};

export const MAIN_RPC_CONTEXT = {
    // ... 其他上下文
    DEMO_EXT: createProxyIdentifier<DemoExt>('DemoExt'),
};
```

---

## 3. 插件端实现

### 3.1 实现 DemoExt

```typescript
// packages/plugin-ext/src/plugin/demo-ext.ts

import { DemoExt, DemoMain, DemoDto, PLUGIN_RPC_CONTEXT, PluginModel } from '../common';
import { RPCProtocol } from '../common/rpc-protocol';
import { Disposable, Emitter } from '@theia/core';
import * as theia from '@theia/plugin';

interface DemoData {
    extensionId: string;
    demo: theia.Demo;
    // 存储 Main 端传入的回调函数句柄
    callbacks: Map<number, (object1: any) => void>;
}

export class DemoExtImpl implements DemoExt {

    private readonly demoData = new Map<number, DemoData>();
    private readonly proxy: DemoMain;
    private currentHandle = 0;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.DEMO_MAIN);
    }

    /**
     * 创建并注册 Demo 对象
     */
    registerA(extension: PluginModel, id: string, name: string): theia.Demo {
        // 检查是否已存在相同 id 的 Demo
        for (const demoData of this.demoData.values()) {
            if (demoData.demo.id === id && extension.id === demoData.extensionId) {
                throw new Error(`Demo with id '${id}' already exists`);
            }
        }

        const handle = this.currentHandle++;
        const that = this;
        let isDisposed = false;

        // 创建 DTO 对象
        const data: DemoDto = {
            id,
            name,
            extensionId: extension.id
        };

        // 通知 Main 端注册
        this.proxy.$addDemo(handle, data).catch(err => {
            console.error('Failed to register demo:', err);
            isDisposed = true;
        });

        // 创建 Demo 对象
        const demo: theia.Demo = {
            get id(): string {
                return id;
            },

            get name(): string {
                return name;
            },

            async func1(): Promise<any> {
                if (isDisposed) {
                    throw new Error('Demo is disposed');
                }
                // 插件端的实现逻辑
                return { message: 'func1 result from plugin' };
            },

            async fun2(fun3: (object1: any) => void): Promise<void> {
                if (isDisposed) {
                    throw new Error('Demo is disposed');
                }

                // 这是一个特殊情况：插件端主动调用，并接收 Main 端的回调
                // 在这种情况下，fun3 是插件端传入的回调
                // 我们需要执行插件端的逻辑

                // 示例：执行某些操作，然后调用回调
                const result = { data: 'some result' };
                fun3(result);
            },

            dispose(): void {
                if (!isDisposed) {
                    isDisposed = true;
                    that.demoData.delete(handle);
                    that.proxy.$removeDemo(handle);
                }
            }
        };

        // 保存数据
        this.demoData.set(handle, {
            extensionId: extension.id,
            demo,
            callbacks: new Map()
        });

        return demo;
    }

    /**
     * Main 端调用插件端的 func1
     */
    async $func1(handle: number): Promise<any> {
        const data = this.demoData.get(handle);
        if (!data) {
            throw new Error('Demo not found');
        }
        return data.demo.func1();
    }

    /**
     * Main 端调用插件端的 fun2，并传入回调函数句柄
     */
    async $fun2(handle: number, callbackHandle: number): Promise<void> {
        const data = this.demoData.get(handle);
        if (!data) {
            throw new Error('Demo not found');
        }

        // 创建一个包装回调函数，它会通过 RPC 调用 Main 端的回调
        const callbackWrapper = (object1: any) => {
            // 调用 Main 端的回调函数
            this.proxy.$invokeCallback(callbackHandle, object1);
        };

        // 保存回调引用（可选，用于清理）
        data.callbacks.set(callbackHandle, callbackWrapper);

        // 调用插件端的 fun2
        await data.demo.fun2(callbackWrapper);

        // 清理回调引用（可选）
        data.callbacks.delete(callbackHandle);
    }
}
```

### 3.2 在 Plugin Context 中导出 API

```typescript
// packages/plugin-ext/src/plugin/plugin-context.ts

export function createAPIFactory(
    rpc: RPCProtocol,
    pluginManager: PluginManager,
    envExt: EnvExtImpl,
    // ... 其他参数
    demoExt: DemoExtImpl,
): PluginAPIFactory {

    // ... 其他代码

    const demo: typeof theia.demo = {
        registerA(id: string, name: string): theia.Demo {
            const plugin = pluginManager.getPluginById(pluginInfo.id);
            if (!plugin) {
                throw new Error('Plugin not found');
            }
            return demoExt.registerA(plugin.rawModel, id, name);
        }
    };

    return <any>{
        // ... 其他 API
        demo,
    };
}
```

---

## 4. Main 端实现

### 4.1 实现 DemoMain

```typescript
// packages/plugin-ext/src/main/browser/demo-main.ts

import { DemoMain, DemoExt, DemoDto, MAIN_RPC_CONTEXT } from '../../common';
import { RPCProtocol } from '../../common/rpc-protocol';
import { Disposable } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';

export interface DemoService {
    /**
     * 注册的 Demo 对象
     */
    readonly demos: ReadonlyMap<number, DemoInfo>;

    /**
     * 调用 Demo 的 func1
     */
    callFunc1(handle: number): Promise<any>;

    /**
     * 调用 Demo 的 fun2，并传入回调函数
     */
    callFun2(handle: number, callback: (object1: any) => void): Promise<void>;
}

export interface DemoInfo {
    readonly id: string;
    readonly name: string;
    readonly extensionId: string;
}

@injectable()
export class DemoMainImpl implements DemoMain, DemoService {

    private readonly proxy: DemoExt;
    private readonly demos = new Map<number, DemoInfo>();
    private readonly callbacks = new Map<number, (object1: any) => void>();
    private currentCallbackHandle = 0;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.DEMO_EXT);
    }

    get demos(): ReadonlyMap<number, DemoInfo> {
        return this.demos;
    }

    /**
     * 插件端注册 Demo
     */
    async $addDemo(handle: number, data: DemoDto): Promise<void> {
        if (this.demos.has(handle)) {
            throw new Error(`Demo with handle ${handle} already exists`);
        }

        this.demos.set(handle, {
            id: data.id,
            name: data.name,
            extensionId: data.extensionId
        });

        console.log(`Demo registered: ${data.name} (${data.id})`);
    }

    /**
     * 插件端注销 Demo
     */
    async $removeDemo(handle: number): Promise<void> {
        this.demos.delete(handle);
        console.log(`Demo unregistered: ${handle}`);
    }

    /**
     * 插件端调用 Main 端的回调函数
     */
    async $invokeCallback(callbackHandle: number, object1: any): Promise<void> {
        const callback = this.callbacks.get(callbackHandle);
        if (!callback) {
            throw new Error(`Callback with handle ${callbackHandle} not found`);
        }

        // 调用回调函数
        callback(object1);
    }

    /**
     * Main 端调用插件端的 func1
     */
    async callFunc1(handle: number): Promise<any> {
        if (!this.demos.has(handle)) {
            throw new Error(`Demo with handle ${handle} not found`);
        }
        return this.proxy.$func1(handle);
    }

    /**
     * Main 端调用插件端的 fun2，并传入回调函数
     */
    async callFun2(handle: number, callback: (object1: any) => void): Promise<void> {
        if (!this.demos.has(handle)) {
            throw new Error(`Demo with handle ${handle} not found`);
        }

        // 生成回调函数句柄
        const callbackHandle = this.currentCallbackHandle++;

        // 保存回调函数
        this.callbacks.set(callbackHandle, callback);

        try {
            // 通过 RPC 调用插件端的 fun2，传入回调句柄
            await this.proxy.$fun2(handle, callbackHandle);
        } finally {
            // 清理回调引用
            this.callbacks.delete(callbackHandle);
        }
    }
}
```

### 4.2 注册到 Main Context

```typescript
// packages/plugin-ext/src/main/browser/main-context.ts

import { DemoMainImpl } from './demo-main';

export function setUpPluginApi(rpc: RPCProtocol, container: interfaces.Container): void {
    // ... 其他服务

    const demoMain = new DemoMainImpl(rpc);
    rpc.set(MAIN_RPC_CONTEXT.DEMO_EXT, demoMain);

    // 如果需要在容器中使用，可以绑定
    container.bind(DemoService).toConstantValue(demoMain);
}
```

---

## 5. 使用示例

### 5.1 插件端使用

```typescript
// 在插件的 activate 函数中

import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {
    // 注册 Demo 对象
    const demo = theia.demo.registerA('my-demo-id', 'My Demo');

    // 添加到 subscriptions 以便自动清理
    context.subscriptions.push(demo);

    console.log('Demo registered:', demo.name);
}
```

### 5.2 Main 端使用

```typescript
// 在 Main 端的某个服务中

@injectable()
export class SomeMainService {

    @inject(DemoService)
    protected readonly demoService: DemoService;

    async useDemoFeature(): Promise<void> {
        // 获取所有注册的 Demo
        for (const [handle, info] of this.demoService.demos) {
            console.log(`Found demo: ${info.name}`);

            // 调用 func1
            const result1 = await this.demoService.callFunc1(handle);
            console.log('func1 result:', result1);

            // 调用 fun2，传入回调函数
            await this.demoService.callFun2(handle, (object1) => {
                // 这个回调会在插件端执行 fun2 时被调用
                console.log('Callback received from plugin:', object1);
            });
        }
    }
}
```

---

## 6. 关键点说明

### 6.1 Handle 管理
- 使用递增的数字作为 handle 来标识每个注册的对象
- Plugin 端和 Main 端都维护 handle 到对象的映射

### 6.2 回调函数传递
有两种场景：

**场景 1：插件端主动调用，接受参数中的回调**
```typescript
// 插件端
demo.fun2((result) => {
    console.log('Callback executed', result);
});
```

**场景 2：Main 端调用插件端方法，传入回调**
```typescript
// Main 端
demoService.callFun2(handle, (object1) => {
    console.log('Callback from plugin', object1);
});

// 实现流程：
// 1. Main 端生成 callbackHandle
// 2. Main 端通过 RPC 调用 $fun2(handle, callbackHandle)
// 3. 插件端创建回调包装器，包装器内部调用 $invokeCallback(callbackHandle, object1)
// 4. Main 端收到 $invokeCallback，执行原始回调函数
```

### 6.3 资源清理
- 使用 `Disposable` 模式管理资源
- 调用 `dispose()` 时清理 handle 映射和回调引用
- 支持添加到 `context.subscriptions` 自动清理

### 6.4 错误处理
- 检查对象是否已注册
- 检查对象是否已释放
- RPC 调用失败时的错误处理

---

## 7. 流程图

### 7.1 注册流程

```
插件端                          Main 端
  |                               |
  |--- registerA() --------------->|
  |                               |
  |--- $addDemo(handle, dto) ---->|
  |                               |
  |<-- void --------------------|
  |                               |
返回 Demo 对象                     |
```

### 7.2 Main 端调用插件端 fun2 的流程

```
Main 端                          插件端
  |                               |
  |--- callFun2(handle, callback) >|
  |    生成 callbackHandle          |
  |                               |
  |--- $fun2(handle, callbackHandle) >|
  |                               |
  |                               创建回调包装器
  |                               调用 demo.fun2(wrapper)
  |                               |
  |<-- $invokeCallback(callbackHandle, object1) --|
  |                               |
执行原始 callback(object1)         |
  |                               |
  |--- void -------------------->|
  |<-- void --------------------|
```

---

## 8. 扩展建议

### 8.1 支持多个回调参数
如果方法需要接受多个回调函数：
```typescript
fun3(callback1: (data: any) => void, callback2: (error: any) => void): Promise<void>;
```

实现时为每个回调生成独立的 handle。

### 8.2 支持回调返回值
如果回调函数需要返回值：
```typescript
async $invokeCallback(callbackHandle: number, object1: any): Promise<any> {
    const callback = this.callbacks.get(callbackHandle);
    if (!callback) {
        throw new Error(`Callback not found`);
    }
    return callback(object1);
}
```

### 8.3 事件监听
参考 `NotebookController` 的 `onDidChangeSelection`，可以添加事件：
```typescript
export interface Demo {
    onDidChange: Event<DemoChangeEvent>;
}
```

---

## 9. 测试建议

### 9.1 单元测试
- 测试 Demo 对象的注册和注销
- 测试方法调用和回调函数执行
- 测试错误情况（重复注册、对象已释放等）

### 9.2 集成测试
- 测试跨进程的 RPC 通信
- 测试回调函数的异步执行
- 测试资源清理

---

## 10. 参考文件

- `packages/plugin-ext/src/plugin/notebook/notebook-kernels.ts` - 插件端实现
- `packages/plugin-ext/src/main/browser/notebooks/notebook-kernels-main.ts` - Main 端实现
- `packages/plugin-ext/src/common/plugin-api-rpc.ts` - RPC 接口定义
- `packages/plugin/src/theia.d.ts` - API 类型定义

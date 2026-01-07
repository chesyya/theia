# 插件端调用 Main 端服务并提供回调函数实现文档

## 概述

本文档描述插件端主动调用 Main 端服务，并由插件端提供回调函数的实现方式。在这种场景下：
- **插件端**发起调用，传入回调函数
- **Main 端**执行操作，在适当时机调用插件端提供的回调函数

参考实现：Theia 插件框架的事件监听和异步操作模式

---

## 1. 需求定义

### 1.1 使用场景示例

```typescript
// 插件端代码
import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {
    // 场景1: 监听 Main 端的事件
    theia.mainService.onDataChanged((data) => {
        console.log('Data changed:', data);
    });

    // 场景2: 调用 Main 端服务，提供完成回调
    theia.mainService.processData(
        { input: 'some data' },
        (result) => {
            console.log('Processing completed:', result);
        }
    );

    // 场景3: 异步操作，提供进度回调
    theia.mainService.executeTask(
        'task-id',
        (progress) => {
            console.log('Progress:', progress);
        },
        (error) => {
            console.error('Error:', error);
        }
    );
}
```

---

## 2. API 接口定义

### 2.1 插件端 API 定义

```typescript
// packages/plugin/src/theia.d.ts

export interface MainServiceData {
    input: string;
    metadata?: any;
}

export interface MainServiceResult {
    output: string;
    status: string;
}

export interface TaskProgress {
    percentage: number;
    message: string;
}

export namespace mainService {
    /**
     * 监听 Main 端的数据变化事件
     * @param callback 数据变化时的回调函数
     * @returns Disposable 对象，用于取消监听
     */
    export function onDataChanged(callback: (data: any) => void): Disposable;

    /**
     * 调用 Main 端处理数据，并提供完成回调
     * @param data 要处理的数据
     * @param callback 处理完成时的回调函数
     * @returns Promise，完成时 resolve
     */
    export function processData(
        data: MainServiceData,
        callback: (result: MainServiceResult) => void
    ): Promise<void>;

    /**
     * 执行任务，提供进度和错误回调
     * @param taskId 任务ID
     * @param onProgress 进度回调
     * @param onError 错误回调
     * @returns Disposable 对象，用于取消任务
     */
    export function executeTask(
        taskId: string,
        onProgress: (progress: TaskProgress) => void,
        onError: (error: Error) => void
    ): Disposable;
}
```

---

## 3. RPC 接口定义

### 3.1 定义数据传输对象

```typescript
// packages/plugin-ext/src/common/plugin-api-rpc.ts

export interface MainServiceDataDto {
    input: string;
    metadata?: any;
}

export interface MainServiceResultDto {
    output: string;
    status: string;
}

export interface TaskProgressDto {
    percentage: number;
    message: string;
}

/**
 * 插件端接口（运行在插件进程）
 */
export interface MainServiceExt {
    /**
     * Main 端调用插件端注册的数据变化回调
     * @param callbackHandle 回调函数句柄
     * @param data 变化的数据
     */
    $onDataChanged(callbackHandle: number, data: any): void;

    /**
     * Main 端调用插件端注册的处理完成回调
     * @param callbackHandle 回调函数句柄
     * @param result 处理结果
     */
    $onProcessCompleted(callbackHandle: number, result: MainServiceResultDto): void;

    /**
     * Main 端调用插件端注册的进度回调
     * @param callbackHandle 回调函数句柄
     * @param progress 进度信息
     */
    $onTaskProgress(callbackHandle: number, progress: TaskProgressDto): void;

    /**
     * Main 端调用插件端注册的错误回调
     * @param callbackHandle 回调函数句柄
     * @param error 错误信息
     */
    $onTaskError(callbackHandle: number, error: string): void;
}

/**
 * Main 端接口（运行在主进程）
 */
export interface MainServiceMain {
    /**
     * 注册数据变化监听器
     * @param callbackHandle 插件端提供的回调句柄
     */
    $registerDataChangeListener(callbackHandle: number): Promise<void>;

    /**
     * 取消注册数据变化监听器
     * @param callbackHandle 回调句柄
     */
    $unregisterDataChangeListener(callbackHandle: number): Promise<void>;

    /**
     * 处理数据
     * @param data 要处理的数据
     * @param callbackHandle 插件端提供的完成回调句柄
     */
    $processData(data: MainServiceDataDto, callbackHandle: number): Promise<void>;

    /**
     * 执行任务
     * @param taskId 任务ID
     * @param progressCallbackHandle 进度回调句柄
     * @param errorCallbackHandle 错误回调句柄
     */
    $executeTask(
        taskId: string,
        progressCallbackHandle: number,
        errorCallbackHandle: number
    ): Promise<void>;

    /**
     * 取消任务
     * @param taskId 任务ID
     */
    $cancelTask(taskId: string): Promise<void>;
}
```

### 3.2 注册 RPC 上下文

```typescript
// packages/plugin-ext/src/common/plugin-api-rpc.ts

export const PLUGIN_RPC_CONTEXT = {
    // ... 其他上下文
    MAIN_SERVICE_MAIN: createProxyIdentifier<MainServiceMain>('MainServiceMain'),
};

export const MAIN_RPC_CONTEXT = {
    // ... 其他上下文
    MAIN_SERVICE_EXT: createProxyIdentifier<MainServiceExt>('MainServiceExt'),
};
```

---

## 4. 插件端实现

### 4.1 实现 MainServiceExt

```typescript
// packages/plugin-ext/src/plugin/main-service-ext.ts

import { MainServiceExt, MainServiceMain, MainServiceDataDto, PLUGIN_RPC_CONTEXT } from '../common';
import { RPCProtocol } from '../common/rpc-protocol';
import { Disposable } from '@theia/core';
import * as theia from '@theia/plugin';

export class MainServiceExtImpl implements MainServiceExt {

    private readonly proxy: MainServiceMain;

    // 存储插件端注册的回调函数
    // Key: callbackHandle, Value: 回调函数
    private readonly dataChangeCallbacks = new Map<number, (data: any) => void>();
    private readonly processCallbacks = new Map<number, (result: any) => void>();
    private readonly progressCallbacks = new Map<number, (progress: any) => void>();
    private readonly errorCallbacks = new Map<number, (error: Error) => void>();

    private currentCallbackHandle = 0;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.MAIN_SERVICE_MAIN);
    }

    /**
     * 生成新的回调句柄
     */
    private generateCallbackHandle(): number {
        return this.currentCallbackHandle++;
    }

    /**
     * 注册数据变化监听器
     */
    onDataChanged(callback: (data: any) => void): Disposable {
        const callbackHandle = this.generateCallbackHandle();

        // 保存回调函数
        this.dataChangeCallbacks.set(callbackHandle, callback);

        // 通知 Main 端注册监听器
        this.proxy.$registerDataChangeListener(callbackHandle);

        // 返回 Disposable，用于取消监听
        return {
            dispose: () => {
                this.dataChangeCallbacks.delete(callbackHandle);
                this.proxy.$unregisterDataChangeListener(callbackHandle);
            }
        };
    }

    /**
     * 处理数据，提供完成回调
     */
    async processData(
        data: theia.MainServiceData,
        callback: (result: theia.MainServiceResult) => void
    ): Promise<void> {
        const callbackHandle = this.generateCallbackHandle();

        // 保存回调函数
        this.processCallbacks.set(callbackHandle, callback);

        try {
            // 调用 Main 端处理数据
            await this.proxy.$processData(
                { input: data.input, metadata: data.metadata },
                callbackHandle
            );
        } catch (error) {
            // 如果出错，清理回调
            this.processCallbacks.delete(callbackHandle);
            throw error;
        }
    }

    /**
     * 执行任务，提供进度和错误回调
     */
    executeTask(
        taskId: string,
        onProgress: (progress: theia.TaskProgress) => void,
        onError: (error: Error) => void
    ): Disposable {
        const progressCallbackHandle = this.generateCallbackHandle();
        const errorCallbackHandle = this.generateCallbackHandle();

        // 保存回调函数
        this.progressCallbacks.set(progressCallbackHandle, onProgress);
        this.errorCallbacks.set(errorCallbackHandle, onError);

        // 通知 Main 端执行任务
        this.proxy.$executeTask(taskId, progressCallbackHandle, errorCallbackHandle);

        // 返回 Disposable，用于取消任务
        return {
            dispose: () => {
                this.progressCallbacks.delete(progressCallbackHandle);
                this.errorCallbacks.delete(errorCallbackHandle);
                this.proxy.$cancelTask(taskId);
            }
        };
    }

    // ========== RPC 方法：Main 端调用插件端的回调 ==========

    /**
     * Main 端触发数据变化回调
     */
    $onDataChanged(callbackHandle: number, data: any): void {
        const callback = this.dataChangeCallbacks.get(callbackHandle);
        if (callback) {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in data change callback:', error);
            }
        } else {
            console.warn(`Data change callback not found: ${callbackHandle}`);
        }
    }

    /**
     * Main 端触发处理完成回调
     */
    $onProcessCompleted(callbackHandle: number, result: any): void {
        const callback = this.processCallbacks.get(callbackHandle);
        if (callback) {
            try {
                callback(result);
            } catch (error) {
                console.error('Error in process completion callback:', error);
            } finally {
                // 处理完成后清理回调（一次性回调）
                this.processCallbacks.delete(callbackHandle);
            }
        } else {
            console.warn(`Process completion callback not found: ${callbackHandle}`);
        }
    }

    /**
     * Main 端触发进度回调
     */
    $onTaskProgress(callbackHandle: number, progress: any): void {
        const callback = this.progressCallbacks.get(callbackHandle);
        if (callback) {
            try {
                callback(progress);
            } catch (error) {
                console.error('Error in progress callback:', error);
            }
        }
    }

    /**
     * Main 端触发错误回调
     */
    $onTaskError(callbackHandle: number, errorMessage: string): void {
        const callback = this.errorCallbacks.get(callbackHandle);
        if (callback) {
            try {
                const error = new Error(errorMessage);
                callback(error);
            } catch (error) {
                console.error('Error in error callback:', error);
            } finally {
                // 错误发生后清理回调
                this.errorCallbacks.delete(callbackHandle);
                // 同时清理进度回调
                this.progressCallbacks.delete(callbackHandle - 1); // 假设进度回调handle在错误回调handle之前
            }
        }
    }
}
```

### 4.2 在 Plugin Context 中导出 API

```typescript
// packages/plugin-ext/src/plugin/plugin-context.ts

export function createAPIFactory(
    rpc: RPCProtocol,
    pluginManager: PluginManager,
    // ... 其他参数
    mainServiceExt: MainServiceExtImpl,
): PluginAPIFactory {

    // ... 其他代码

    const mainService: typeof theia.mainService = {
        onDataChanged(callback: (data: any) => void): theia.Disposable {
            return mainServiceExt.onDataChanged(callback);
        },

        processData(
            data: theia.MainServiceData,
            callback: (result: theia.MainServiceResult) => void
        ): Promise<void> {
            return mainServiceExt.processData(data, callback);
        },

        executeTask(
            taskId: string,
            onProgress: (progress: theia.TaskProgress) => void,
            onError: (error: Error) => void
        ): theia.Disposable {
            return mainServiceExt.executeTask(taskId, onProgress, onError);
        }
    };

    return <any>{
        // ... 其他 API
        mainService,
    };
}
```

---

## 5. Main 端实现

### 5.1 实现 MainServiceMain

```typescript
// packages/plugin-ext/src/main/browser/main-service-main.ts

import { MainServiceMain, MainServiceExt, MainServiceDataDto, MAIN_RPC_CONTEXT } from '../../common';
import { RPCProtocol } from '../../common/rpc-protocol';
import { injectable } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core';

interface TaskInfo {
    taskId: string;
    progressCallbackHandle: number;
    errorCallbackHandle: number;
    canceled: boolean;
}

@injectable()
export class MainServiceMainImpl implements MainServiceMain {

    private readonly proxy: MainServiceExt;

    // 存储插件端注册的数据变化监听器
    private readonly dataChangeListeners = new Set<number>();

    // 存储正在执行的任务
    private readonly runningTasks = new Map<string, TaskInfo>();

    // 模拟数据源
    private readonly onDataChangedEmitter = new Emitter<any>();
    readonly onDataChanged: Event<any> = this.onDataChangedEmitter.event;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.MAIN_SERVICE_EXT);

        // 监听数据变化，通知所有注册的监听器
        this.onDataChanged(data => {
            this.notifyDataChangeListeners(data);
        });
    }

    /**
     * 注册数据变化监听器
     */
    async $registerDataChangeListener(callbackHandle: number): Promise<void> {
        this.dataChangeListeners.add(callbackHandle);
        console.log(`Data change listener registered: ${callbackHandle}`);
    }

    /**
     * 取消注册数据变化监听器
     */
    async $unregisterDataChangeListener(callbackHandle: number): Promise<void> {
        this.dataChangeListeners.delete(callbackHandle);
        console.log(`Data change listener unregistered: ${callbackHandle}`);
    }

    /**
     * 通知所有监听器数据已变化
     */
    private notifyDataChangeListeners(data: any): void {
        for (const callbackHandle of this.dataChangeListeners) {
            // 通过 RPC 调用插件端的回调
            this.proxy.$onDataChanged(callbackHandle, data);
        }
    }

    /**
     * 处理数据
     */
    async $processData(data: MainServiceDataDto, callbackHandle: number): Promise<void> {
        console.log(`Processing data:`, data);

        // 模拟异步处理
        setTimeout(() => {
            const result = {
                output: `Processed: ${data.input}`,
                status: 'success'
            };

            // 处理完成，调用插件端的回调
            this.proxy.$onProcessCompleted(callbackHandle, result);
        }, 1000);
    }

    /**
     * 执行任务
     */
    async $executeTask(
        taskId: string,
        progressCallbackHandle: number,
        errorCallbackHandle: number
    ): Promise<void> {
        console.log(`Executing task: ${taskId}`);

        // 保存任务信息
        const taskInfo: TaskInfo = {
            taskId,
            progressCallbackHandle,
            errorCallbackHandle,
            canceled: false
        };
        this.runningTasks.set(taskId, taskInfo);

        // 模拟任务执行
        this.simulateTaskExecution(taskInfo);
    }

    /**
     * 取消任务
     */
    async $cancelTask(taskId: string): Promise<void> {
        const taskInfo = this.runningTasks.get(taskId);
        if (taskInfo) {
            taskInfo.canceled = true;
            this.runningTasks.delete(taskId);
            console.log(`Task canceled: ${taskId}`);
        }
    }

    /**
     * 模拟任务执行
     */
    private async simulateTaskExecution(taskInfo: TaskInfo): Promise<void> {
        const { taskId, progressCallbackHandle, errorCallbackHandle } = taskInfo;

        try {
            // 模拟多步骤任务
            for (let i = 0; i <= 100; i += 10) {
                // 检查是否已取消
                if (taskInfo.canceled) {
                    console.log(`Task ${taskId} was canceled`);
                    return;
                }

                // 报告进度
                this.proxy.$onTaskProgress(progressCallbackHandle, {
                    percentage: i,
                    message: `Processing step ${i}...`
                });

                // 模拟处理延迟
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 任务完成，报告最终进度
            this.proxy.$onTaskProgress(progressCallbackHandle, {
                percentage: 100,
                message: 'Task completed successfully'
            });

        } catch (error) {
            // 任务出错，调用错误回调
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.proxy.$onTaskError(errorCallbackHandle, errorMessage);
        } finally {
            // 清理任务信息
            this.runningTasks.delete(taskId);
        }
    }

    // ========== 公共方法：供 Main 端其他服务调用 ==========

    /**
     * 触发数据变化事件（供其他服务调用）
     */
    triggerDataChange(data: any): void {
        this.onDataChangedEmitter.fire(data);
    }
}
```

### 5.2 注册到 Main Context

```typescript
// packages/plugin-ext/src/main/browser/main-context.ts

import { MainServiceMainImpl } from './main-service-main';

export function setUpPluginApi(rpc: RPCProtocol, container: interfaces.Container): void {
    // ... 其他服务

    const mainServiceMain = new MainServiceMainImpl(rpc);
    rpc.set(PLUGIN_RPC_CONTEXT.MAIN_SERVICE_EXT, mainServiceMain);

    // 绑定到容器供其他服务使用
    container.bind(MainServiceMainImpl).toConstantValue(mainServiceMain);
}
```

---

## 6. 使用示例

### 6.1 插件端使用示例

```typescript
// 在插件的 activate 函数中

import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {

    // ========== 示例 1: 监听数据变化 ==========
    const dataListener = theia.mainService.onDataChanged((data) => {
        console.log('Data changed in main side:', data);
        // 处理数据变化
    });
    context.subscriptions.push(dataListener);

    // ========== 示例 2: 处理数据并接收结果 ==========
    theia.mainService.processData(
        { input: 'Hello from plugin' },
        (result) => {
            console.log('Processing result:', result.output);
            console.log('Status:', result.status);
        }
    ).catch(error => {
        console.error('Failed to process data:', error);
    });

    // ========== 示例 3: 执行任务并监听进度 ==========
    const taskDisposable = theia.mainService.executeTask(
        'my-task-' + Date.now(),
        (progress) => {
            console.log(`Progress: ${progress.percentage}% - ${progress.message}`);

            // 在 UI 中显示进度
            if (progress.percentage === 100) {
                theia.window.showInformationMessage('Task completed!');
            }
        },
        (error) => {
            console.error('Task failed:', error.message);
            theia.window.showErrorMessage(`Task failed: ${error.message}`);
        }
    );

    // 可以取消任务
    // taskDisposable.dispose();

    context.subscriptions.push(taskDisposable);

    // ========== 示例 4: 在用户操作时触发 ==========
    const command = theia.commands.registerCommand('myext.processData', async () => {
        await theia.mainService.processData(
            { input: 'User triggered data' },
            (result) => {
                theia.window.showInformationMessage(result.output);
            }
        );
    });
    context.subscriptions.push(command);
}
```

### 6.2 Main 端触发数据变化

```typescript
// 在 Main 端的某个服务中

@injectable()
export class SomeMainService {

    @inject(MainServiceMainImpl)
    protected readonly mainService: MainServiceMainImpl;

    // 当数据发生变化时，通知所有插件端监听器
    private onSomeDataChanged(newData: any): void {
        this.mainService.triggerDataChange(newData);
    }
}
```

---

## 7. 流程图

### 7.1 插件端注册监听器流程

```
插件端                                Main 端
  |                                     |
  |--- onDataChanged(callback) -------->|
  |    生成 callbackHandle               |
  |    保存 callback 到 Map              |
  |                                     |
  |--- $registerDataChangeListener(handle) ->|
  |                                     |
  |                                   保存 handle
  |<-- void --------------------------|
  |                                     |
返回 Disposable                         |
  |                                     |
  |                                     |
  |                               数据变化发生
  |                                     |
  |<-- $onDataChanged(handle, data) ---|
  |                                     |
从 Map 取出 callback 执行                |
  |--- void -------------------------->|
```

### 7.2 插件端调用并提供回调流程

```
插件端                                Main 端
  |                                     |
  |--- processData(data, callback) ---->|
  |    生成 callbackHandle               |
  |    保存 callback 到 Map              |
  |                                     |
  |--- $processData(data, handle) ----->|
  |                                     |
  |                                   开始处理数据
  |                                   (异步操作)
  |<-- void --------------------------|
  |                                     |
Promise resolved                        |
  |                                     |
  |                                   处理完成
  |                                     |
  |<-- $onProcessCompleted(handle, result) --|
  |                                     |
从 Map 取出 callback 执行                |
清理 callback                            |
  |--- void -------------------------->|
```

### 7.3 任务执行流程

```
插件端                                Main 端
  |                                     |
  |--- executeTask(taskId, onProgress, onError) ->|
  |    生成 progressHandle               |
  |    生成 errorHandle                  |
  |    保存回调到 Map                    |
  |                                     |
  |--- $executeTask(taskId, progressHandle, errorHandle) ->|
  |                                     |
  |                                   启动任务
  |<-- void --------------------------|
  |                                     |
返回 Disposable                         |
  |                                     |
  |                                   任务执行中...
  |                                     |
  |<-- $onTaskProgress(progressHandle, {10%}) --|
执行 onProgress(10%)                    |
  |--- void -------------------------->|
  |                                     |
  |<-- $onTaskProgress(progressHandle, {20%}) --|
执行 onProgress(20%)                    |
  |--- void -------------------------->|
  |                                     |
  |                                   ... 继续执行
  |                                     |
  |<-- $onTaskProgress(progressHandle, {100%}) --|
执行 onProgress(100%)                   |
清理回调                                 |
  |--- void -------------------------->|
```

---

## 8. 与 Main 端提供回调的区别对比

| 特性 | Main 端提供回调 | 插件端提供回调 |
|------|----------------|---------------|
| **调用方向** | Main → Plugin | Plugin → Main |
| **回调持有方** | Main 端 | Plugin 端 |
| **callbackHandle 生成** | Main 端 | Plugin 端 |
| **callback 存储位置** | Main 端 Map | Plugin 端 Map |
| **回调触发** | Plugin 通过 `$invokeCallback` 触发 Main 端 | Main 通过 `$onXxx` 触发 Plugin 端 |
| **典型场景** | Main 调用 Plugin 的方法，需要获取结果 | Plugin 监听 Main 的事件或异步操作 |
| **生命周期** | 通常是一次性的 | 可以是长期监听 |

### 8.1 回调流转对比

**Main 端提供回调**：
```
Main(持有callback) --调用--> Plugin
Plugin(持有handle) --执行完--> 调用$invokeCallback(handle) --> Main
Main --从Map取出callback--> 执行callback
```

**Plugin 端提供回调**：
```
Plugin(持有callback) --调用--> Main
Main(持有handle) --执行完--> 调用$onXxx(handle) --> Plugin
Plugin --从Map取出callback--> 执行callback
```

---

## 9. 关键要点

### 9.1 回调生命周期管理

**一次性回调**（如 processData）：
```typescript
$onProcessCompleted(callbackHandle: number, result: any): void {
    const callback = this.processCallbacks.get(callbackHandle);
    if (callback) {
        callback(result);
        // 执行后立即清理
        this.processCallbacks.delete(callbackHandle);
    }
}
```

**持续性回调**（如 onDataChanged）：
```typescript
// 不自动清理，直到调用 dispose
onDataChanged(callback: (data: any) => void): Disposable {
    const callbackHandle = this.generateCallbackHandle();
    this.dataChangeCallbacks.set(callbackHandle, callback);

    return {
        dispose: () => {
            // 用户主动清理
            this.dataChangeCallbacks.delete(callbackHandle);
            this.proxy.$unregisterDataChangeListener(callbackHandle);
        }
    };
}
```

### 9.2 错误处理

```typescript
$onDataChanged(callbackHandle: number, data: any): void {
    const callback = this.dataChangeCallbacks.get(callbackHandle);
    if (callback) {
        try {
            callback(data);
        } catch (error) {
            // 捕获回调中的错误，避免影响其他回调
            console.error('Error in data change callback:', error);
        }
    } else {
        // 回调不存在的警告（可能已被清理）
        console.warn(`Callback not found: ${callbackHandle}`);
    }
}
```

### 9.3 多个回调参数

当一个方法需要多个回调时：
```typescript
executeTask(
    taskId: string,
    onProgress: (progress: TaskProgress) => void,
    onError: (error: Error) => void
): Disposable {
    // 为每个回调生成独立的 handle
    const progressHandle = this.generateCallbackHandle();
    const errorHandle = this.generateCallbackHandle();

    this.progressCallbacks.set(progressHandle, onProgress);
    this.errorCallbacks.set(errorHandle, onError);

    this.proxy.$executeTask(taskId, progressHandle, errorHandle);

    return {
        dispose: () => {
            this.progressCallbacks.delete(progressHandle);
            this.errorCallbacks.delete(errorHandle);
        }
    };
}
```

---

## 10. 最佳实践

### 10.1 使用 Disposable 模式

```typescript
export function activate(context: theia.PluginContext) {
    // 所有返回 Disposable 的注册都添加到 subscriptions
    context.subscriptions.push(
        theia.mainService.onDataChanged(data => {
            console.log('Data:', data);
        }),

        theia.mainService.executeTask('task1',
            progress => console.log('Progress:', progress),
            error => console.error('Error:', error)
        )
    );

    // 插件卸载时会自动清理
}
```

### 10.2 避免内存泄漏

```typescript
// ❌ 错误：没有清理监听器
function badExample() {
    theia.mainService.onDataChanged(data => {
        console.log(data);
    });
    // 监听器永远不会被清理！
}

// ✅ 正确：保存 Disposable 并在适当时机清理
function goodExample() {
    const disposable = theia.mainService.onDataChanged(data => {
        console.log(data);
    });

    // 在某个时机清理
    setTimeout(() => {
        disposable.dispose();
    }, 60000);
}
```

### 10.3 处理异步错误

```typescript
// processData 返回 Promise，要处理拒绝情况
await theia.mainService.processData(
    { input: 'data' },
    result => console.log(result)
).catch(error => {
    console.error('Failed to process:', error);
    theia.window.showErrorMessage('Processing failed');
});
```

---

## 11. 测试建议

### 11.1 单元测试

```typescript
describe('MainServiceExt', () => {
    it('should register and trigger data change callback', async () => {
        const mockRpc = createMockRpc();
        const mainServiceExt = new MainServiceExtImpl(mockRpc);

        let receivedData: any;
        const disposable = mainServiceExt.onDataChanged(data => {
            receivedData = data;
        });

        // 模拟 Main 端触发回调
        mainServiceExt.$onDataChanged(0, { test: 'data' });

        expect(receivedData).toEqual({ test: 'data' });

        disposable.dispose();
    });
});
```

### 11.2 集成测试

测试完整的 RPC 通信流程，确保：
- 回调正确注册和触发
- Disposable 正确清理资源
- 错误情况正确处理

---

## 12. 参考资源

### 12.1 相关文件
- `packages/plugin-ext/src/plugin/languages.ts` - 语言服务的回调模式
- `packages/plugin-ext/src/plugin/workspace.ts` - 工作空间事件监听
- `packages/plugin-ext/src/plugin/window-state.ts` - 窗口状态变化监听

### 12.2 核心概念
- **RPC Protocol**: 跨进程通信协议
- **Proxy Pattern**: 代理模式实现远程调用
- **Disposable Pattern**: 资源管理模式
- **Event Emitter**: 事件发射器模式

// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Plugin } from '../../common/plugin-api-rpc';
import {
    ModulePermissionChecker,
    ModuleOperation,
    isWhitelistedModule,
    isSensitiveModule
} from '../../common/module-permission-service';

/**
 * 通用模块拦截器 - 拦截所有敏感模块的 require/import 并在运行时进行权限检查
 */
export class ModuleInterceptor {
    private static moduleProxies = new Map<string, any>();
    private static isIntercepting = false;
    private static permissionService: ModulePermissionChecker | null = null;
    private static currentPlugin: Plugin | null = null;

    /**
     * 设置权限服务（连接前端）
     */
    static setPermissionService(service: ModulePermissionChecker): void {
        this.permissionService = service;
        console.log('[Module Interceptor] Permission service registered');
    }

    /**
     * 拦截模块加载（从 backend-init-theia.ts 的 module._load 中调用）
     *
     * @param request 模块名称
     * @param plugin 当前插件
     * @param originalLoad 原始的 _load 函数
     * @param context this 上下文
     * @param parent 父模块
     * @param isMain 是否是主模块
     * @returns 如果拦截了，返回代理模块；否则返回 null
     */
    static interceptModuleLoad(
        request: string,
        plugin: Plugin,
        originalLoad: Function,
        context: any,
        parent: any,
        isMain: any
    ): any | null {
        // 🔍 调试日志
        if (request.includes('child_process') || request.includes('fs') || request.includes('http')) {
            console.log(`[Module Interceptor] 🔍 interceptModuleLoad('${request}') for plugin: ${plugin.model.id}`);
        }

        // 检查是否需要拦截
        if (!this.shouldIntercept(request)) {
            return null; // 不拦截，让调用者继续正常加载
        }

        console.log(`[Module Interceptor] 🚨 Intercepting module '${request}' for plugin ${plugin.model.id}`);

        // 检查缓存
        const cacheKey = `${plugin.model.id}:${request}`;
        if (this.moduleProxies.has(cacheKey)) {
            console.log(`[Module Interceptor] ✅ Using cached proxy for ${cacheKey}`);
            return this.moduleProxies.get(cacheKey);
        }

        // 加载原始模块
        const originalModule = originalLoad.call(context, request, parent, isMain);

        // 创建并缓存代理
        const proxiedModule = this.createModuleProxy(request, originalModule, plugin);
        this.moduleProxies.set(cacheKey, proxiedModule);
        console.log(`[Module Interceptor] ✅ Created and cached proxy for ${cacheKey}`);

        return proxiedModule;
    }

    /**
     * 开始拦截指定插件的模块加载（废弃，保留用于向后兼容）
     *
     * 注意：实际拦截逻辑已移至 backend-init-theia.ts 的 overrideInternalLoad()
     * 这里只设置 currentPlugin（已不再使用）
     */
    static startInterception(plugin: Plugin): void {
        this.currentPlugin = plugin;
        console.log(`[Module Interceptor] 🔒 Ready for interception (plugin: ${plugin.model.id})`);
    }

    /**
     * 判断是否需要拦截该模块
     */
    private static shouldIntercept(moduleId: string): boolean {
        // 白名单检查
        if (isWhitelistedModule(moduleId)) {
            return false;
        }

        // 敏感模块检查
        return isSensitiveModule(moduleId);
    }

    /**
     * 创建模块代理 - 核心：在运行时拦截 API 调用
     */
    private static createModuleProxy(moduleId: string, originalModule: any, plugin: Plugin): any {
        console.log(`[Module Interceptor] 🎭 Creating proxy for module '${moduleId}'`);

        return new Proxy(originalModule, {
            get(target, prop: string | symbol) {
                // 🔍 调试日志：显示属性访问
                if (typeof prop === 'string' && (prop === 'exec' || prop === 'readFileSync' || prop === 'get')) {
                    console.log(`[Module Interceptor] 🔍 Accessing property '${String(prop)}' on module '${moduleId}'`);
                }

                const original = Reflect.get(target, prop);

                // 只拦截函数调用
                if (typeof original === 'function' && typeof prop === 'string') {
                    console.log(`[Module Interceptor] ✅ Wrapping function '${prop}' from module '${moduleId}'`);

                    return function (this: any, ...args: any[]) {
                        console.log(`[Module Interceptor] 🔥 Function '${moduleId}.${prop}' is being called!`);

                        // 🔥 关键点：在调用时进行权限检查
                        return ModuleInterceptor.interceptFunctionCall(
                            moduleId,
                            prop,
                            args,
                            plugin,
                            original,
                            this
                        );
                    };
                }

                // 对于嵌套对象（如 fs.promises），递归创建代理
                if (original && typeof original === 'object' && prop === 'promises') {
                    return ModuleInterceptor.createModuleProxy(`${moduleId}/promises`, original, plugin);
                }

                return original;
            }
        });
    }

    /**
     * 拦截函数调用并进行权限检查
     */
    private static interceptFunctionCall(
        moduleId: string,
        functionName: string,
        args: any[],
        plugin: Plugin,
        originalFunction: Function,
        thisArg: any
    ): any {
        // 构造操作信息
        const operation: ModuleOperation = {
            moduleId,
            functionName,
            args: this.sanitizeArgs(args),
            pluginId: plugin.model.id,
            pluginName: plugin.rawModel.displayName || plugin.model.id,
        };

        console.log(`[Module Interceptor] 🔍 Checking permission for ${plugin.model.id} - ${moduleId}.${functionName}(...)`);

        // 检查权限服务是否可用
        if (!this.permissionService) {
            console.error('[Module Interceptor] ❌ Permission service not initialized!');
            throw new Error('Module permission service not initialized');
        }

        // Async permission check (will trigger frontend dialog)
        const permissionPromise = this.permissionService.$checkModulePermission(operation);

        // 判断原始函数是异步还是同步
        const lastArg = args[args.length - 1];
        const isCallbackStyle = typeof lastArg === 'function';

        if (isCallbackStyle) {
            // Callback 风格的异步函数
            const callback = lastArg;
            permissionPromise
                .then(() => {
                    console.log(`[Module Interceptor] ✅ Permission granted for ${plugin.model.id} - ${moduleId}.${functionName}`);
                    // 执行原始函数
                    originalFunction.apply(thisArg, args);
                })
                .catch((error: Error) => {
                    console.error(`[Module Interceptor] Permission denied for ${plugin.model.id} - ${moduleId}.${functionName}`);
                    // 调用 callback 并传递错误
                    const permissionError = new Error(
                        `Permission denied: Plugin ${plugin.model.id} is not allowed to use ${moduleId}.${functionName}`
                    );
                    (permissionError as any).code = 'EPERM';
                    callback(permissionError);
                });
            return;
        }

        // Promise 风格或同步函数
        // 返回一个 Promise
        return permissionPromise.then(() => {
            console.log(`[Module Interceptor] ✅ Permission granted for ${plugin.model.id} - ${moduleId}.${functionName}`);
            // 执行原始函数
            const result = originalFunction.apply(thisArg, args);

            // 如果结果是 Promise，直接返回
            if (result && typeof result.then === 'function') {
                return result;
            }

            // 同步函数，返回结果
            return result;
        }).catch((error: Error) => {
            console.error(`[Module Interceptor] Permission denied for ${plugin.model.id} - ${moduleId}.${functionName}`, error);
            throw new Error(
                `Permission denied: Plugin ${plugin.model.id} is not allowed to use ${moduleId}.${functionName}`
            );
        });
    }

    /**
     * 清理敏感参数（用于显示）
     */
    private static sanitizeArgs(args: any[]): any[] {
        return args.map((arg, index) => {
            // 对于文件路径（通常是第一个参数）
            if (index === 0 && typeof arg === 'string') {
                return arg;
            }

            // 对于长字符串
            if (typeof arg === 'string' && arg.length > 100) {
                return arg.substring(0, 100) + '...';
            }

            // 对于函数
            if (typeof arg === 'function') {
                return '[Function]';
            }

            // 对于对象
            if (arg && typeof arg === 'object') {
                return '[Object]';
            }

            return arg;
        });
    }

    /**
     * 停止拦截（用于插件卸载）
     */
    static stopInterception(plugin: Plugin): void {
        console.log(`[Module Interceptor] Stopping interception for plugin: ${plugin.model.id}`);

        // 清理该插件的代理缓存
        const keysToDelete: string[] = [];
        this.moduleProxies.forEach((_, key) => {
            if (key.startsWith(`${plugin.model.id}:`)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.moduleProxies.delete(key));

        // 如果是当前插件，清空引用
        if (this.currentPlugin?.model.id === plugin.model.id) {
            this.currentPlugin = null;
        }
    }

    /**
     * 重置拦截器（主要用于测试）
     * 注意：由于我们重写的是 module._load，重置比较困难
     * 建议重启插件进程而不是调用 reset
     */
    static reset(): void {
        if (this.isIntercepting) {
            this.isIntercepting = false;
            this.moduleProxies.clear();
            this.currentPlugin = null;
            console.log('[Module Interceptor] Reset completed (note: module._load override remains)');
        }
    }

    /**
     * 获取拦截状态（用于调试）
     */
    static getStatus(): {
        isIntercepting: boolean;
        currentPlugin: string | null;
        proxiesCount: number;
    } {
        return {
            isIntercepting: this.isIntercepting,
            currentPlugin: this.currentPlugin?.model.id || null,
            proxiesCount: this.moduleProxies.size
        };
    }
}

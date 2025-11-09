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
 * Unified Module Interceptor - Manage all plugin module loading in one place
 *
 * Design Philosophy:
 * 1. 全局 module._load 只劫持一次（首次加载插件时）
 * 2. 通过 parent.filename 识别是哪个插件在加载模块
 * 3. 统一处理所有敏感模块（fs, child_process, http, net, etc.）
 * 4. 不再需要在各个 init 文件中重复配置
 */
export class UnifiedModuleInterceptor {
    private static initialized = false;
    private static originalModuleLoad: Function | null = null;
    private static permissionService: ModulePermissionChecker | null = null;

    // 已注册的插件列表（用于通过文件路径识别插件）
    private static plugins = new Map<string, Plugin>(); // pluginFolder -> Plugin

    // 模块代理缓存
    private static moduleProxies = new Map<string, any>(); // pluginId:moduleId -> Proxy

    /**
     * 检查是否已初始化
     */
    static isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * One-time setup of global interception (called when first plugin loads)
     *
     * @param permissionService Permission check service (RPC proxy to frontend)
     */
    static setupGlobalHook(permissionService: ModulePermissionChecker): void {
        if (this.initialized) {
            console.warn('[UnifiedModuleInterceptor] Global hook already set up, skipping');
            return;
        }

        console.log('[UnifiedModuleInterceptor] Setting up GLOBAL module interception');

        this.permissionService = permissionService;

        // 保存原始的 module._load
        const module = require('module');
        this.originalModuleLoad = module._load;

        // Global hijack of module._load
        const self = this;
        module._load = function (request: string, parent: any, isMain: any): any {
            // 1️⃣ 识别是哪个插件在加载模块
            const plugin = self.identifyPlugin(parent?.filename);

            // 2. If not from a plugin, or not a sensitive module, load normally
            if (!plugin || !self.shouldIntercept(request)) {
                return self.originalModuleLoad!.call(this, request, parent, isMain);
            }

            // 3. Sensitive module + plugin loading = intercept
            console.log(`[UnifiedModuleInterceptor] Intercepting module '${request}' for plugin ${plugin.model.id}`);

            // Check cache
            const cacheKey = `${plugin.model.id}:${request}`;
            if (self.moduleProxies.has(cacheKey)) {
                console.log(`[UnifiedModuleInterceptor] Using cached proxy for ${cacheKey}`);
                return self.moduleProxies.get(cacheKey);
            }

            // Load original module
            const originalModule = self.originalModuleLoad!.call(this, request, parent, isMain);

            // Create and cache proxy
            const proxiedModule = self.createModuleProxy(request, originalModule, plugin);
            self.moduleProxies.set(cacheKey, proxiedModule);
            console.log(`[UnifiedModuleInterceptor] Created and cached proxy for ${cacheKey}`);

            return proxiedModule;
        };

        this.initialized = true;
        console.log('[UnifiedModuleInterceptor] Global hook setup complete');
    }

    /**
     * Register plugin (called once per plugin load)
     *
     * @param plugin Plugin information
     */
    static registerPlugin(plugin: Plugin): void {
        console.log(`[UnifiedModuleInterceptor] Registering plugin: ${plugin.model.id} at ${plugin.pluginFolder}`);
        this.plugins.set(plugin.pluginFolder, plugin);
    }

    /**
     * Unregister plugin (called when plugin is unloaded)
     *
     * @param plugin Plugin information
     */
    static unregisterPlugin(plugin: Plugin): void {
        console.log(`[UnifiedModuleInterceptor] Unregistering plugin: ${plugin.model.id}`);
        this.plugins.delete(plugin.pluginFolder);

        // 清理该插件的代理缓存
        const keysToDelete: string[] = [];
        this.moduleProxies.forEach((_, key) => {
            if (key.startsWith(`${plugin.model.id}:`)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.moduleProxies.delete(key));
    }

    /**
     * Identify which plugin is loading the module
     *
     * @param parentFilename 父模块的文件路径
     * @returns 插件信息，如果不是插件加载则返回 null
     */
    private static identifyPlugin(parentFilename: string): Plugin | null {
        if (!parentFilename) {
            return null;
        }

        // 遍历所有已注册的插件，找到匹配的
        for (const [pluginFolder, plugin] of this.plugins.entries()) {
            if (parentFilename.startsWith(pluginFolder)) {
                return plugin;
            }
        }

        return null;
    }

    /**
     * Check if module should be intercepted
     *
     * @param moduleId 模块 ID (如 'fs', 'child_process')
     * @returns 是否需要拦截
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
     * Create module proxy - intercept API calls at runtime
     *
     * @param moduleId 模块 ID
     * @param originalModule 原始模块
     * @param plugin 插件信息
     * @returns 代理模块
     */
    private static createModuleProxy(moduleId: string, originalModule: any, plugin: Plugin): any {
        console.log(`[UnifiedModuleInterceptor] 🎭 Creating proxy for module '${moduleId}'`);

        const self = this;

        return new Proxy(originalModule, {
            get(target, prop: string | symbol) {
                const original = Reflect.get(target, prop);

                // Only intercept function calls
                if (typeof original === 'function' && typeof prop === 'string') {
                    return function (this: any, ...args: any[]) {
                        // Key point: check permission at call time
                        return self.interceptFunctionCall(
                            moduleId,
                            prop,
                            args,
                            plugin,
                            original,
                            this
                        );
                    };
                }

                // For nested objects (e.g. fs.promises), recursively create proxy
                if (original && typeof original === 'object') {
                    // Common nested modules
                    if (prop === 'promises' || prop === 'promisify') {
                        return self.createModuleProxy(`${moduleId}/${String(prop)}`, original, plugin);
                    }
                }

                return original;
            }
        });
    }

    /**
     * Intercept function call and perform permission check
     *
     * @param moduleId 模块 ID
     * @param functionName 函数名
     * @param args 参数
     * @param plugin 插件信息
     * @param originalFunction 原始函数
     * @param thisArg this 上下文
     * @returns 函数执行结果或 Promise
     */
    private static interceptFunctionCall(
        moduleId: string,
        functionName: string,
        args: any[],
        plugin: Plugin,
        originalFunction: Function,
        thisArg: any
    ): any {
        // Build operation information
        const operation: ModuleOperation = {
            moduleId,
            functionName,
            args: this.sanitizeArgs(args),
            pluginId: plugin.model.id,
            pluginName: plugin.rawModel.displayName || plugin.model.id,
        };

        console.log(`[UnifiedModuleInterceptor] Checking permission for ${plugin.model.id} - ${moduleId}.${functionName}(...)`);

        // Check if permission service is available
        if (!this.permissionService) {
            console.error('[UnifiedModuleInterceptor] ERROR: Permission service not initialized!');
            throw new Error('Module permission service not initialized');
        }

        // Debug logging
        console.log('[UnifiedModuleInterceptor] 🔬 DEBUG: permissionService type:', typeof this.permissionService);
        console.log('[UnifiedModuleInterceptor] 🔬 DEBUG: permissionService is null?', this.permissionService === null);
        console.log('[UnifiedModuleInterceptor] 🔬 DEBUG: $checkModulePermission type:', typeof this.permissionService.$checkModulePermission);
        console.log('[UnifiedModuleInterceptor] 🔬 DEBUG: $checkModulePermission exists?', '$checkModulePermission' in this.permissionService);

        // Async permission check (will trigger frontend dialog)
        const permissionPromise = this.permissionService.$checkModulePermission(operation);

        // Determine the original function's call style
        const lastArg = args[args.length - 1];
        const isCallbackStyle = typeof lastArg === 'function';

        if (isCallbackStyle) {
            // Callback-style async function (e.g. fs.readFile(path, callback))
            const callback = lastArg;
            permissionPromise
                .then(() => {
                    console.log(`[UnifiedModuleInterceptor] Permission granted for ${plugin.model.id} - ${moduleId}.${functionName}`);
                    // Execute original function
                    originalFunction.apply(thisArg, args);
                })
                .catch(error => {
                    console.error(`[UnifiedModuleInterceptor] Permission denied for ${plugin.model.id} - ${moduleId}.${functionName}`);
                    // Call callback with error
                    const permissionError = new Error(
                        `Permission denied: Plugin ${plugin.model.id} is not allowed to use ${moduleId}.${functionName}`
                    );
                    (permissionError as any).code = 'EPERM';
                    callback(permissionError);
                });
            return; // Callback-style functions have no return value
        }

        // Promise-style or synchronous function
        return permissionPromise.then(() => {
            console.log(`[UnifiedModuleInterceptor] Permission granted for ${plugin.model.id} - ${moduleId}.${functionName}`);

            // Execute original function
            const result = originalFunction.apply(thisArg, args);

            // If result is a Promise, return it directly
            if (result && typeof result.then === 'function') {
                return result;
            }

            // Synchronous function, return result
            return result;
        }).catch(error => {
            console.error(`[UnifiedModuleInterceptor] Permission denied for ${plugin.model.id} - ${moduleId}.${functionName}`, error);
            throw new Error(
                `Permission denied: Plugin ${plugin.model.id} is not allowed to use ${moduleId}.${functionName}`
            );
        });
    }

    /**
     * Sanitize sensitive arguments (for display to user)
     *
     * @param args 原始参数
     * @returns 清理后的参数
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

            // 对于 Buffer
            if (Buffer.isBuffer(arg)) {
                return `[Buffer ${arg.length} bytes]`;
            }

            // 对于对象
            if (arg && typeof arg === 'object') {
                return '[Object]';
            }

            return arg;
        });
    }

    /**
     * Reset interceptor (mainly for testing)
     */
    static reset(): void {
        if (this.initialized && this.originalModuleLoad) {
            const module = require('module');
            module._load = this.originalModuleLoad;
            this.originalModuleLoad = null;
        }

        this.initialized = false;
        this.plugins.clear();
        this.moduleProxies.clear();
        this.permissionService = null;

        console.log('[UnifiedModuleInterceptor] Reset completed');
    }

    /**
     * Get status information (for debugging)
     */
    static getStatus(): {
        initialized: boolean;
        pluginsCount: number;
        proxiesCount: number;
        plugins: string[];
    } {
        return {
            initialized: this.initialized,
            pluginsCount: this.plugins.size,
            proxiesCount: this.moduleProxies.size,
            plugins: Array.from(this.plugins.values()).map(p => p.model.id)
        };
    }
}

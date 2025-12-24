/* eslint-disable @typescript-eslint/no-explicit-any */
import { PluginApiScope } from '../../../common';
import { isSensitiveModule, ModuleOperation, ModulePermissionService } from '../../../common/file-system/module-permission-service';
import { Plugin } from '../../../common/plugin-api-rpc';


/**
 * 模块拦截器
 * @date 2025/11/10 - 13:06:00 PM
 * @author wubing
 *
 * @export
 * @class ModuleInterceptor
 * @typedef {ModuleInterceptor}
 */
export class ModuleInterceptor {
    private static initialized = false;
    private static originalModuleLoad: Function | null = null;
    private static permissionService: ModulePermissionService | null = null;
    private static permissionCache: Map<string, { allowed: boolean; lastCheck: number }> = new Map();

    // 已注册的插件列表（用于通过文件路径识别插件）
    private static plugins = new Map<string, Plugin>(); // pluginFolder -> Plugin

    // 模块代理缓存
    private static moduleProxies = new Map<string, any>(); // pluginId:moduleId -> Proxy

    static isInitialized(): boolean {
        return this.initialized;
    }

    // 设置全局模块加载钩子
    static setupGlobalHook(permissionService: ModulePermissionService): void {
        if (this.initialized) {
            return;
        }

        this.permissionService = permissionService;

        const module = require('module');
        this.originalModuleLoad = module._load;

        const self = this;
        module._load = function (request: string, parent: any, isMain: any): any {
            const plugin = self.identifyPlugin(parent?.filename);

            // 判断是否应该拦截
            if (!plugin || !self.shouldIntercept(request, plugin)) {
                return self.originalModuleLoad!.call(this, request, parent, isMain);
            }

            // 检查代理模块缓存
            const cacheKey = `${plugin.model.id}:${request}`;
            if (self.moduleProxies.has(cacheKey)) {
                return self.moduleProxies.get(cacheKey);
            }

            const originalModule = self.originalModuleLoad!.call(this, request, parent, isMain);

            const proxiedModule = self.createModuleProxy(request as PluginApiScope, originalModule, plugin);
            self.moduleProxies.set(cacheKey, proxiedModule);

            return proxiedModule;
        };

        this.initialized = true;
        console.warn('[PLUGIN] 模块全局拦截器钩子已设置');
    }

    // 注册插件，用于后续创建代理时识别
    static registerPlugin(plugin: Plugin): void {
        this.plugins.set(plugin.pluginFolder, plugin);
    }


    /**
     * 清理插件的代理缓存
     * @date 2025/11/10 - 13:46:01 PM
     * @author wubing
     *
     * @static
     * @param {Plugin} plugin
     */
    static unregisterPlugin(plugin: Plugin): void {
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

    // 识别插件
    private static identifyPlugin(parentFilename: string): Plugin | null {
        if (!parentFilename) {
            return null;
        }

        for (const [pluginFolder, plugin] of this.plugins.entries()) {
            if (parentFilename.startsWith(pluginFolder)) {
                return plugin;
            }
        }

        return null;
    }



    /**
     * 检查是否拦截
     * @date 2025/11/10 - 13:10:13 PM
     * @author wubing
     *
     * @private
     * @static
     * @param {string} moduleId
     * @returns {boolean}
     */
    private static shouldIntercept(moduleId: string, plugin: Plugin): boolean {
        //内置插件检查
        if(plugin.pluginFolder.toLowerCase().includes('/plugins/') && plugin.model.id !== 'ES.baosky-filesystem-sample'){
            return false;
        }

        // 敏感模块检查
        return isSensitiveModule(moduleId);
    }


    /**
     * 创建模块代理，函数调用时进行权限检查
     * @date 2025/11/10 - 13:29:17 PM
     * @author wubing
     *
     * @private
     * @static
     * @param {string} moduleId
     * @param {*} originalModule
     * @param {Plugin} plugin
     * @returns {*}
     */
    private static createModuleProxy(moduleId: string, originalModule: any, plugin: Plugin): any {
        const self = this;

        return new Proxy(originalModule, {
            get(target, prop: string | symbol) {
                const original = Reflect.get(target, prop);

                // 拦截模块的函数调用
                if (typeof original === 'function' && typeof prop === 'string') {
                    return function (this: any, ...args: any[]) {
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

                // 如果是嵌套模块，递归创建代理
                if (original && typeof original === 'object') {
                    if (prop === 'promises' || prop === 'promisify') {
                        return self.createModuleProxy(`${moduleId}/${String(prop)}`, original, plugin);
                    }
                }

                return original;
            }
        });
    }


    /**
     * 对函数调用进行权限检查
     * @date 2025/11/10 - 13:31:21 PM
     * @author wubing
     *
     * @private
     * @static
     * @param {string} moduleId
     * @param {string} functionName
     * @param {any[]} args
     * @param {Plugin} plugin
     * @param {Function} originalFunction
     * @param {*} thisArg
     * @returns {*}
     */

    private static interceptFunctionCall(
        rawModuleId: string,
        functionName: string,
        args: any[],
        plugin: Plugin,
        originalFunction: Function,
        thisArg: any
    ): any {
        const moduleId: PluginApiScope = rawModuleId as PluginApiScope;
        const operation: ModuleOperation = {
            moduleId,
            functionName,
            args: args,
            pluginId: plugin.model.id,
            pluginName: plugin.rawModel.displayName || plugin.model.id,
        };

        const key = `${plugin.model.id}:${moduleId}:${functionName}`;
        const cache = this.permissionCache.get(key);

        const EXPIRE = 24 * 60 * 60 * 1000;

        if (cache && cache.allowed && (Date.now() - cache.lastCheck < EXPIRE)) {
            return originalFunction.apply(thisArg, args);
        }

        const permissionPromise = this.permissionService!.$checkModulePermission(operation, plugin);

        const lastArg = args[args.length - 1];
        const isCallbackStyle = typeof lastArg === 'function';

        if (isCallbackStyle) {
            const callback = lastArg;
            permissionPromise
                .then(() => {
                    this.permissionCache.set(key, { allowed: true, lastCheck: Date.now() });
                    originalFunction.apply(thisArg, args);
                })
                .catch(error => {
                    this.permissionCache.set(key, { allowed: false, lastCheck: Date.now() });
                    callback(error);
                });
            return;
        }

        return permissionPromise.then(() => {
            this.permissionCache.set(key, { allowed: true, lastCheck: Date.now() });

            const result = originalFunction.apply(thisArg, args);
            return result;
        }).catch(error => {
            this.permissionCache.set(key, { allowed: false, lastCheck: Date.now() });
            return Promise.reject(error);
        });
    }
}

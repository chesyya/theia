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

import * as fs from 'fs';
import * as Module from 'module';
import { Plugin } from '../../common/plugin-api-rpc';
import URI from '@theia/core/lib/common/uri';
import { FileSystemPermissionChecker, FileSystemOperation, FileSystemPermissionContext } from '../../common/file-system-permission-service';

/**
 * @deprecated Use UnifiedModuleInterceptor instead.
 *
 * This interceptor has been superseded by UnifiedModuleInterceptor which provides:
 * - Unified permission management for all modules (fs, child_process, http, etc.)
 * - Better coverage (all module loading methods)
 * - Simplified architecture (single interception point)
 *
 * See: unified-module-interceptor.ts
 * Migration guide: file-system-interceptor.DEPRECATED.md
 *
 * Interceptor for Node.js file system module to control plugin file system access.
 * This intercepts direct fs module usage by plugins running in the backend.
 */
export class FileSystemInterceptor {
    private static originalRequire = Module.prototype.require;
    private static fsProxy: typeof fs | null = null;
    private static fsPromisesProxy: typeof fs.promises | null = null;
    private static isIntercepting = false;
    private static permissionService: FileSystemPermissionChecker | null = null;

    /**
     * Set the permission service to use for checking file system access.
     * @param service The FileSystemPermissionChecker instance
     */
    static setPermissionService(service: FileSystemPermissionChecker): void {
        this.permissionService = service;
    }

    /**
     * Start intercepting fs module for a specific plugin.
     * @param plugin The plugin to intercept fs calls for
     */
    static interceptFsModule(plugin: Plugin): void {
        if (this.isIntercepting) {
            return; // Already intercepting
        }

        console.log(`[FS Interceptor] Setting up fs interception for plugin: ${plugin.model.id}`);

        // Create proxies if not already created
        if (!this.fsProxy) {
            this.fsProxy = this.createFsProxy(plugin);
        }
        if (!this.fsPromisesProxy) {
            this.fsPromisesProxy = this.createFsPromisesProxy(plugin);
        }

        // Override Module.prototype.require
        const originalRequire = Module.prototype.require;
        Module.prototype.require = function (this: NodeModule, id: string) {
            // ✅ 拦截所有文件系统相关模块

            // 1. 原生 fs 模块
            if (id === 'fs' || id === 'node:fs') {
                console.log(`[FS Interceptor] Plugin ${plugin.model.id} is requiring 'fs' module`);
                return FileSystemInterceptor.fsProxy!;
            }
            if (id === 'fs/promises' || id === 'node:fs/promises') {
                console.log(`[FS Interceptor] Plugin ${plugin.model.id} is requiring 'fs/promises' module`);
                return FileSystemInterceptor.fsPromisesProxy!;
            }

            // 2. fs-extra - 拦截并返回基于我们代理的 fs 的包装版本
            if (id === 'fs-extra') {
                console.log(`[FS Interceptor] Plugin ${plugin.model.id} is requiring 'fs-extra' module`);
                const fsExtra = originalRequire.apply(this, ['fs-extra']);
                // fs-extra 内部使用 fs，由于我们已经代理了 fs，所以 fs-extra 会自动使用我们的代理
                return fsExtra;
            }

            // 3. graceful-fs - 同样拦截
            if (id === 'graceful-fs') {
                console.log(`[FS Interceptor] Plugin ${plugin.model.id} is requiring 'graceful-fs' module`);
                // 直接返回我们的 fs 代理，因为 graceful-fs 只是 fs 的增强版
                return FileSystemInterceptor.fsProxy!;
            }

            // 4. child_process - 需要特别注意，可以执行任意命令
            if (id === 'child_process' || id === 'node:child_process') {
                console.warn(`[FS Interceptor] ⚠️  Plugin ${plugin.model.id} is requiring 'child_process' - potential security risk!`);
                // TODO: 实现 child_process 代理，拦截文件系统相关命令
                // 暂时允许，但记录警告
            }

            // For all other modules, use the original require
            return originalRequire.apply(this, arguments as any);
        } as typeof Module.prototype.require;

        this.isIntercepting = true;
    }

    /**
     * Create a proxy for the fs module that intercepts all method calls.
     */
    private static createFsProxy(plugin: Plugin): typeof fs {
        const originalFs = fs;

        return new Proxy(originalFs, {
            get(target, prop: string | symbol) {
                const original = Reflect.get(target, prop);

                // Only intercept function calls
                if (typeof original === 'function' && typeof prop === 'string') {
                    return function (this: any, ...args: any[]) {
                        const path = args[0]; // First argument is usually the path

                        try {
                            // Check permission before executing
                            FileSystemInterceptor.checkPermission(plugin, prop, path);
                        } catch (error) {
                            // If permission check fails, handle based on whether it's a callback or sync function
                            const lastArg = args[args.length - 1];
                            if (typeof lastArg === 'function') {
                                // Async callback style - call the callback with error
                                setImmediate(() => lastArg(error));
                                return;
                            } else {
                                // Sync function - throw the error
                                throw error;
                            }
                        }

                        // Permission granted, execute the original function
                        return original.apply(target, args);
                    };
                }

                return original;
            }
        });
    }

    /**
     * Create a proxy for the fs.promises module that intercepts all method calls.
     */
    private static createFsPromisesProxy(plugin: Plugin): typeof fs.promises {
        const originalFsPromises = fs.promises;

        return new Proxy(originalFsPromises, {
            get(target, prop: string | symbol) {
                const original = Reflect.get(target, prop);

                // Only intercept function calls
                if (typeof original === 'function' && typeof prop === 'string') {
                    return async function (this: any, ...args: any[]) {
                        const path = args[0]; // First argument is usually the path

                        try {
                            // Check permission before executing
                            await FileSystemInterceptor.checkPermissionAsync(plugin, prop, path);
                        } catch (error) {
                            // Return rejected promise
                            return Promise.reject(error);
                        }

                        // Permission granted, execute the original function
                        return original.apply(target, args);
                    };
                }

                return original;
            }
        });
    }

    /**
     * Check if the file system operation is allowed (synchronous version).
     */
    private static checkPermission(plugin: Plugin, operation: string, path: any): void {
        console.log(`[FS Interceptor] Plugin ${plugin.model.id} - Operation: ${operation}, Path: ${path}`);

        // Convert path to string if it's not already
        const pathStr = this.getPathString(path);
        if (!pathStr) {
            return; // Not a path operation
        }

        // Create plugin context
        const context = this.createPluginContext(plugin);

        // ✅ 统一使用权限服务,移除 fallback 逻辑
        if (!this.permissionService) {
            throw new Error('[FS Interceptor] Permission service not initialized! This should never happen.');
        }

        const uri = new URI(pathStr);
        const fsOperation = this.mapToFileSystemOperation(operation);

        // Note: We can't use async in sync context, so we'll do a basic check
        // For comprehensive async checks, use checkPermissionAsync
        if (!this.permissionService.isPathAllowed(uri, context)) {
            throw new Error(`Permission denied: Plugin ${plugin.model.id} cannot access path: ${pathStr}`);
        }

        // Log the operation for audit
        this.logOperation(plugin, operation, pathStr, fsOperation);
    }

    /**
     * Check if the file system operation is allowed (asynchronous version).
     */
    private static async checkPermissionAsync(plugin: Plugin, operation: string, path: any): Promise<void> {
        console.log(`[FS Interceptor] Plugin ${plugin.model.id} - Operation: ${operation}, Path: ${path}`);

        const pathStr = this.getPathString(path);
        if (!pathStr) {
            return;
        }

        // Create plugin context
        const context = this.createPluginContext(plugin);

        // ✅ 统一使用权限服务,移除 fallback 逻辑
        if (!this.permissionService) {
            throw new Error('[FS Interceptor] Permission service not initialized! This should never happen.');
        }

        const uri = new URI(pathStr);
        const fsOperation = this.mapToFileSystemOperation(operation);

        // ✅ 使用完整的异步权限检查
        await this.permissionService.checkPermission(fsOperation, uri, context);

        // Log the operation for audit
        this.logOperation(plugin, operation, pathStr, fsOperation);
    }

    /**
     * Map Node.js fs operation name to FileSystemOperation type.
     */
    private static mapToFileSystemOperation(operation: string): FileSystemOperation {
        // Read operations
        if (operation.includes('read') || operation.includes('stat') || operation.includes('access')) {
            return 'read';
        }
        // Write operations
        if (operation.includes('write') || operation.includes('append')) {
            return 'write';
        }
        // Delete operations
        if (operation.includes('unlink') || operation.includes('rm')) {
            return 'delete';
        }
        // Directory operations
        if (operation === 'mkdir' || operation === 'mkdirSync') {
            return 'mkdir';
        }
        if (operation === 'rename' || operation === 'renameSync') {
            return 'rename';
        }
        if (operation === 'readdir' || operation === 'readdirSync') {
            return 'readdir';
        }

        // Default to read for stat-like operations
        return 'stat';
    }

    /**
     * Extract path string from various argument types.
     */
    private static getPathString(path: any): string | null {
        if (typeof path === 'string') {
            return path;
        }
        if (Buffer.isBuffer(path)) {
            return path.toString();
        }
        if (path && typeof path === 'object' && 'pathname' in path) {
            return path.pathname;
        }
        return null;
    }

    /**
     * Log file system operations for audit purposes.
     */
    private static logOperation(plugin: Plugin, operation: string, path: string, fsOperation: FileSystemOperation): void {
        const timestamp = new Date().toISOString();
        console.log(`[FS Audit] ${timestamp} - Plugin: ${plugin.model.id}, FS Operation: ${fsOperation}, Node.js API: ${operation}, Path: ${path}`);

        // TODO: Send to audit logging service
    }

    /**
     * Create a FileSystemPermissionContext from a Plugin object.
     */
    private static createPluginContext(plugin: Plugin): FileSystemPermissionContext {
        // Check if plugin is builtin by checking if it's published by 'vscode' or in system paths
        const isBuiltin = plugin.model.publisher === 'vscode' ||
                          plugin.pluginFolder.includes('/builtin/') ||
                          plugin.pluginFolder.includes('/system/');

        return {
            pluginId: plugin.model.id,
            pluginMetadata: {
                version: plugin.model.version,
                displayName: plugin.rawModel.displayName,
                isBuiltin: isBuiltin
            }
        };
    }

    /**
     * Reset the interceptor (mainly for testing).
     */
    static reset(): void {
        if (this.isIntercepting) {
            Module.prototype.require = this.originalRequire;
            this.isIntercepting = false;
            this.fsProxy = null;
            this.fsPromisesProxy = null;
        }
    }
}

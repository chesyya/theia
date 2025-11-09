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

import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ModulePermissionChecker,
    ModuleOperation,
    PermissionDecision,
    getSensitiveModuleConfig,
    ModuleSensitivityLevel
} from '../../common/module-permission-service';
import {
    PermissionRequest,
    PermissionSeverity,
    PermissionCacheKey,
    PermissionDecision as BasePermissionDecision
} from '../../common/permission-request-service';
import { PermissionRequestServiceImpl } from './permission-request-service-impl';

/**
 * 前端模块权限服务 - 使用通用权限请求服务
 */
@injectable()
export class ModulePermissionService implements ModulePermissionChecker {
    @inject(PermissionRequestServiceImpl)
    protected readonly permissionRequestService: PermissionRequestServiceImpl;

    // 兼容性：保留原有缓存结构作为快速查找
    private legacyCache = new Map<string, Map<string, Map<string, PermissionDecision>>>();

    async $checkModulePermission(operation: ModuleOperation): Promise<void> {
        console.log(`[Module Permission] Checking permission for ${operation.pluginId} - ${operation.moduleId}.${operation.functionName}`);

        // 构建通用权限请求
        const config = getSensitiveModuleConfig(operation.moduleId);
        const severity = this.mapSensitivityToSeverity(config?.level || ModuleSensitivityLevel.MEDIUM);

        // 构建参数显示
        const argsDisplay = operation.args.length > 0
            ? operation.args.slice(0, 3).map(arg => {
                if (typeof arg === 'string') {
                    return `"${arg}"`;
                }
                return String(arg);
            }).join(', ') + (operation.args.length > 3 ? ', ...' : '')
            : '(no arguments)';

        const request: PermissionRequest = {
            title: `模块权限请求 - ${operation.pluginName}`,
            message: `插件 **${operation.pluginName}** 正在尝试使用敏感模块功能：\n\n` +
                     `**模块:** ${operation.moduleId}\n` +
                     `**函数:** ${operation.functionName}(${argsDisplay})\n\n` +
                     `**警告:** 此操作可能：\n${config?.securityWarning || '• 访问系统底层功能'}`,
            severity,
            pluginId: operation.pluginId,
            pluginName: operation.pluginName,
            operationId: `${operation.moduleId}.${operation.functionName}`,
            metadata: {
                moduleId: operation.moduleId,
                functionName: operation.functionName,
                args: operation.args
            }
        };

        // 使用通用权限请求服务
        try {
            const decision = await this.permissionRequestService.$requestPermission(request);

            // 同步到 legacy cache（用于快速查找）
            this.syncToLegacyCache(operation, decision);

            if (!decision.allowed) {
                throw new Error(`Permission denied: ${operation.moduleId}.${operation.functionName}`);
            }
        } catch (error) {
            console.error(`[Module Permission] Permission denied for ${operation.pluginId} - ${operation.moduleId}.${operation.functionName}`);
            throw error;
        }
    }

    /**
     * 映射模块敏感级别到通用严重级别
     */
    private mapSensitivityToSeverity(level: ModuleSensitivityLevel): PermissionSeverity {
        switch (level) {
            case ModuleSensitivityLevel.CRITICAL:
                return PermissionSeverity.CRITICAL;
            case ModuleSensitivityLevel.HIGH:
                return PermissionSeverity.HIGH;
            case ModuleSensitivityLevel.MEDIUM:
                return PermissionSeverity.WARNING;
            case ModuleSensitivityLevel.LOW:
                return PermissionSeverity.INFO;
            default:
                return PermissionSeverity.WARNING;
        }
    }

    /**
     * 同步决策到 legacy cache
     */
    private syncToLegacyCache(operation: ModuleOperation, decision: BasePermissionDecision): void {
        if (!this.legacyCache.has(operation.pluginId)) {
            this.legacyCache.set(operation.pluginId, new Map());
        }
        const pluginCache = this.legacyCache.get(operation.pluginId)!;

        if (!pluginCache.has(operation.moduleId)) {
            pluginCache.set(operation.moduleId, new Map());
        }
        const moduleCache = pluginCache.get(operation.moduleId)!;

        moduleCache.set(operation.functionName, {
            allowed: decision.allowed,
            remember: decision.remember,
            reason: decision.reason
        });
    }


    $getCachedPermission(pluginId: string, moduleId: string, functionName: string): PermissionDecision | null {
        const decision = this.legacyCache.get(pluginId)?.get(moduleId)?.get(functionName);
        return decision || null;
    }

    $cachePermission(pluginId: string, moduleId: string, functionName: string, decision: PermissionDecision): void {
        // 委托给通用服务
        const cacheKey: PermissionCacheKey = {
            pluginId,
            operationId: `${moduleId}.${functionName}`
        };

        const baseDecision: BasePermissionDecision = {
            allowed: decision.allowed,
            remember: decision.remember,
            reason: decision.reason,
            timestamp: Date.now()
        };

        this.permissionRequestService.$cachePermission(cacheKey, baseDecision);

        // 同步到 legacy cache
        if (!this.legacyCache.has(pluginId)) {
            this.legacyCache.set(pluginId, new Map());
        }
        const pluginCache = this.legacyCache.get(pluginId)!;

        if (!pluginCache.has(moduleId)) {
            pluginCache.set(moduleId, new Map());
        }
        const moduleCache = pluginCache.get(moduleId)!;

        moduleCache.set(functionName, decision);
    }

    $clearPluginPermissions(pluginId: string): void {
        this.legacyCache.delete(pluginId);
        this.permissionRequestService.$clearPluginPermissions(pluginId);
        console.log(`[Module Permission] Cleared all permissions for plugin: ${pluginId}`);
    }

    /**
     * 获取所有权限缓存（用于调试）
     */
    getAllCachedPermissions(): Map<string, Map<string, Map<string, PermissionDecision>>> {
        return this.legacyCache;
    }
}

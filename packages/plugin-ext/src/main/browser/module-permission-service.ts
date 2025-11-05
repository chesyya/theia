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

import { injectable } from '@theia/core/shared/inversify';
import { ConfirmDialog } from '@theia/core/lib/browser/dialogs';
import {
    ModulePermissionChecker,
    ModuleOperation,
    PermissionDecision,
    getSensitiveModuleConfig,
    ModuleSensitivityLevel
} from '../../common/module-permission-service';

/**
 * 前端模块权限服务 - 负责显示权限请求对话框并管理权限缓存
 */
@injectable()
export class ModulePermissionService implements ModulePermissionChecker {
    // 权限缓存：pluginId -> moduleId -> functionName -> decision
    private permissionCache = new Map<string, Map<string, Map<string, PermissionDecision>>>();

    // 正在进行的权限请求（避免重复弹窗）
    private pendingRequests = new Map<string, Promise<void>>();

    async checkModulePermission(operation: ModuleOperation): Promise<void> {
        // 1. 检查缓存
        const cached = this.getCachedPermission(operation.pluginId, operation.moduleId, operation.functionName);
        if (cached) {
            console.log(`[Module Permission] Using cached decision for ${operation.pluginId}:${operation.moduleId}.${operation.functionName} = ${cached.allowed}`);
            if (!cached.allowed) {
                throw new Error(`Permission denied (cached): ${operation.moduleId}.${operation.functionName}`);
            }
            return; // 允许
        }

        // 2. 检查是否有正在进行的请求（避免重复弹窗）
        const requestKey = `${operation.pluginId}:${operation.moduleId}.${operation.functionName}`;
        if (this.pendingRequests.has(requestKey)) {
            console.log(`[Module Permission] Waiting for existing permission request: ${requestKey}`);
            return this.pendingRequests.get(requestKey)!;
        }

        // 3. 创建新的权限请求
        const requestPromise = this.requestUserPermissionInternal(operation);
        this.pendingRequests.set(requestKey, requestPromise);

        try {
            await requestPromise;
        } finally {
            this.pendingRequests.delete(requestKey);
        }
    }

    /**
     * 内部方法：请求用户权限
     */
    private async requestUserPermissionInternal(operation: ModuleOperation): Promise<void> {
        console.log(`[Module Permission] 🔔 Requesting user permission for ${operation.pluginId} - ${operation.moduleId}.${operation.functionName}`);

        // 显示确认对话框
        const decision = await this.requestUserPermission(operation);

        // 缓存决策（如果用户选择记住）
        if (decision.remember) {
            this.cachePermission(operation.pluginId, operation.moduleId, operation.functionName, decision);
        }

        // 检查结果
        if (!decision.allowed) {
            throw new Error(`Permission denied by user: ${operation.moduleId}.${operation.functionName}`);
        }
    }

    /**
     * 显示权限请求对话框
     */
    private async requestUserPermission(operation: ModuleOperation): Promise<PermissionDecision> {
        const config = getSensitiveModuleConfig(operation.moduleId);
        const severityEmoji = this.getSeverityEmoji(operation.moduleId);

        // 构建参数显示字符串
        const argsDisplay = operation.args.length > 0
            ? operation.args.slice(0, 3).map(arg => {
                if (typeof arg === 'string') {
                    return `"${arg}"`;
                }
                return String(arg);
            }).join(', ') + (operation.args.length > 3 ? ', ...' : '')
            : '(no arguments)';

        const message = `
插件 "${operation.pluginName}" 正在尝试使用敏感功能：

${severityEmoji} 模块: ${operation.moduleId}
📋 功能: ${operation.functionName}(${argsDisplay})

⚠️ 此操作可能：
${config?.securityWarning || '• 访问系统底层功能'}

是否允许此操作？
        `.trim();

        const dialog = new ConfirmDialog({
            title: `⚠️ 插件权限请求 - ${operation.pluginName}`,
            msg: message,
            ok: '✅ 允许',
            cancel: '❌ 拒绝',
        });

        const result = await dialog.open();

        // 目前简化为：允许 = 记住，拒绝 = 不记住
        // TODO: 添加"记住我的选择"复选框
        return {
            allowed: !!result,
            remember: !!result, // 暂时只记住"允许"的决策
            reason: result ? 'User approved' : 'User denied'
        };
    }

    /**
     * 获取严重级别图标
     */
    private getSeverityEmoji(moduleId: string): string {
        const config = getSensitiveModuleConfig(moduleId);
        if (!config) {
            return 'ℹ️';
        }

        switch (config.level) {
            case ModuleSensitivityLevel.CRITICAL:
                return '🚨'; // 严重
            case ModuleSensitivityLevel.HIGH:
                return '⚠️'; // 高
            case ModuleSensitivityLevel.MEDIUM:
                return '⚡'; // 中
            default:
                return 'ℹ️'; // 低
        }
    }

    getCachedPermission(pluginId: string, moduleId: string, functionName: string): PermissionDecision | null {
        const decision = this.permissionCache.get(pluginId)?.get(moduleId)?.get(functionName);
        return decision || null;
    }

    cachePermission(pluginId: string, moduleId: string, functionName: string, decision: PermissionDecision): void {
        if (!this.permissionCache.has(pluginId)) {
            this.permissionCache.set(pluginId, new Map());
        }
        const pluginCache = this.permissionCache.get(pluginId)!;

        if (!pluginCache.has(moduleId)) {
            pluginCache.set(moduleId, new Map());
        }
        const moduleCache = pluginCache.get(moduleId)!;

        moduleCache.set(functionName, decision);

        console.log(`[Module Permission] ✅ Cached decision for ${pluginId}:${moduleId}.${functionName} = ${decision.allowed}`);
    }

    clearPluginPermissions(pluginId: string): void {
        this.permissionCache.delete(pluginId);
        console.log(`[Module Permission] Cleared all permissions for plugin: ${pluginId}`);
    }

    /**
     * 获取所有权限缓存（用于调试）
     */
    getAllCachedPermissions(): Map<string, Map<string, Map<string, PermissionDecision>>> {
        return this.permissionCache;
    }
}

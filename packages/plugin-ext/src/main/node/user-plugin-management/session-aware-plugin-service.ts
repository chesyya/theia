// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
import { ILogger } from '@theia/core/lib/common/logger';
import { PluginDeployerEntry, PluginModel } from '../../../common/plugin-protocol';
import { UserSessionService } from './user-session-service';
import { UserSessionPluginManager } from './user-session-plugin-manager';

/**
 * 插件查询选项
 */
export interface PluginQueryOptions {
    includeDisabled?: boolean;
    pluginType?: 'user' | 'shared' | 'all';
    namePattern?: string;
}

/**
 * 插件执行上下文
 */
export interface PluginExecutionContext {
    sessionId: string;
    userId: string;
    isAdmin: boolean;
    pluginId: string;
    command?: string;
    args?: any[];
}

/**
 * 插件执行结果
 */
export interface PluginExecutionResult {
    success: boolean;
    result?: any;
    error?: string;
    executedBy?: string;
}

/**
 * 会话感知的插件服务
 * 
 * 职责：
 * 1. 提供会话级的插件查询接口
 * 2. 执行会话相关的插件操作
 * 3. 管理插件权限和访问控制
 * 4. 提供插件生命周期管理
 */
@injectable()
export class SessionAwarePluginService {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserSessionService)
    protected readonly sessionService: UserSessionService;

    @inject(UserSessionPluginManager)
    protected readonly sessionPluginManager: UserSessionPluginManager;

    /**
     * 获取会话可见的所有插件
     */
    getPluginsForSession(sessionId: string, options: PluginQueryOptions = {}): PluginDeployerEntry[] {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            this.logger.warn(`[SESSION-PLUGIN-SERVICE] 会话不存在: ${sessionId}`);
            return [];
        }

        let plugins: PluginDeployerEntry[] = [];

        // 根据插件类型筛选
        switch (options.pluginType) {
            case 'user':
                plugins = this.sessionPluginManager.getSessionUserPlugins(sessionId);
                break;
            case 'shared':
                plugins = this.sessionPluginManager.getSessionSharedPlugins(sessionId);
                break;
            case 'all':
            default:
                plugins = this.sessionPluginManager.getSessionPlugins(sessionId);
                break;
        }

        // 应用名称模式过滤
        if (options.namePattern) {
            const pattern = new RegExp(options.namePattern, 'i');
            plugins = plugins.filter(plugin => {
                const id = plugin.id ? plugin.id() : '';
                const path = plugin.path ? plugin.path() : '';
                return pattern.test(id) || pattern.test(path);
            });
        }

        // 过滤禁用的插件
        if (!options.includeDisabled) {
            plugins = plugins.filter(plugin => plugin.isAccepted());
        }

        this.logger.debug(`[SESSION-PLUGIN-SERVICE] 为会话 ${sessionId} 返回 ${plugins.length} 个插件`);
        return plugins;
    }

    /**
     * 检查会话是否可以访问特定插件
     */
    canSessionAccessPlugin(sessionId: string, pluginId: string): boolean {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            return false;
        }

        return this.sessionPluginManager.hasSessionPlugin(sessionId, pluginId);
    }

    /**
     * 获取插件详细信息
     */
    getPluginInfo(sessionId: string, pluginId: string): PluginModel | undefined {
        if (!this.canSessionAccessPlugin(sessionId, pluginId)) {
            this.logger.warn(`[SESSION-PLUGIN-SERVICE] 会话 ${sessionId} 无权访问插件 ${pluginId}`);
            return undefined;
        }

        const plugins = this.getPluginsForSession(sessionId);
        const plugin = plugins.find(p => p.id && p.id() === pluginId);
        
        if (plugin && plugin.getValue) {
            try {
                const pluginValue = plugin.getValue<PluginModel>('plugin');
                return pluginValue;
            } catch (error) {
                this.logger.error(`[SESSION-PLUGIN-SERVICE] 获取插件信息失败: ${pluginId}`, error);
            }
        }

        return undefined;
    }

    /**
     * 执行插件命令
     */
    async executePluginCommand(context: PluginExecutionContext): Promise<PluginExecutionResult> {
        const { sessionId, userId, pluginId, command } = context;

        this.logger.info(`[SESSION-PLUGIN-SERVICE] 执行插件命令: 会话=${sessionId}, 用户=${userId}, 插件=${pluginId}, 命令=${command}`);

        // 检查会话权限
        if (!this.canSessionAccessPlugin(sessionId, pluginId)) {
            return {
                success: false,
                error: `会话无权访问插件: ${pluginId}`
            };
        }

        try {
            // 这里应该调用实际的插件执行逻辑
            // 目前先返回模拟结果
            const result = await this.executePluginCommandInternal(context);
            
            return {
                success: true,
                result,
                executedBy: userId
            };
        } catch (error) {
            this.logger.error(`[SESSION-PLUGIN-SERVICE] 插件命令执行失败`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 内部插件命令执行逻辑
     */
    private async executePluginCommandInternal(context: PluginExecutionContext): Promise<any> {
        // 这里应该实现实际的插件命令执行逻辑
        // 例如调用插件的API、发送RPC请求等
        this.logger.debug(`[SESSION-PLUGIN-SERVICE] 执行内部插件命令: ${context.command}`);
        
        // 模拟执行结果
        return {
            pluginId: context.pluginId,
            command: context.command,
            args: context.args,
            timestamp: new Date().toISOString(),
            executedBy: context.userId
        };
    }

    /**
     * 获取会话插件统计信息
     */
    getSessionPluginStats(sessionId: string): {
        totalPlugins: number;
        userPlugins: number;
        sharedPlugins: number;
        enabledPlugins: number;
        disabledPlugins: number;
    } {
        const allPlugins = this.getPluginsForSession(sessionId, { includeDisabled: true });
        const enabledPlugins = this.getPluginsForSession(sessionId, { includeDisabled: false });
        const userPlugins = this.getPluginsForSession(sessionId, { pluginType: 'user', includeDisabled: true });
        const sharedPlugins = this.getPluginsForSession(sessionId, { pluginType: 'shared', includeDisabled: true });

        return {
            totalPlugins: allPlugins.length,
            userPlugins: userPlugins.length,
            sharedPlugins: sharedPlugins.length,
            enabledPlugins: enabledPlugins.length,
            disabledPlugins: allPlugins.length - enabledPlugins.length
        };
    }

    /**
     * 搜索插件
     */
    searchPlugins(sessionId: string, query: string, options: PluginQueryOptions = {}): PluginDeployerEntry[] {
        const searchOptions = {
            ...options,
            namePattern: query
        };

        return this.getPluginsForSession(sessionId, searchOptions);
    }

    /**
     * 检查插件是否已启用
     */
    isPluginEnabled(sessionId: string, pluginId: string): boolean {
        if (!this.canSessionAccessPlugin(sessionId, pluginId)) {
            return false;
        }

        const plugins = this.getPluginsForSession(sessionId, { includeDisabled: true });
        const plugin = plugins.find(p => p.id && p.id() === pluginId);
        
        return plugin ? plugin.isAccepted() : false;
    }

    /**
     * 启用插件
     */
    async enablePlugin(sessionId: string, pluginId: string): Promise<boolean> {
        if (!this.canSessionAccessPlugin(sessionId, pluginId)) {
            this.logger.warn(`[SESSION-PLUGIN-SERVICE] 会话 ${sessionId} 无权启用插件 ${pluginId}`);
            return false;
        }

        const plugins = this.getPluginsForSession(sessionId, { includeDisabled: true });
        const plugin = plugins.find(p => p.id && p.id() === pluginId);
        
        if (plugin && !plugin.isAccepted()) {
            try {
                plugin.accept();
                this.logger.info(`[SESSION-PLUGIN-SERVICE] 已启用插件: ${pluginId}`);
                return true;
            } catch (error) {
                this.logger.error(`[SESSION-PLUGIN-SERVICE] 启用插件失败: ${pluginId}`, error);
            }
        }

        return false;
    }

    /**
     * 禁用插件
     */
    async disablePlugin(sessionId: string, pluginId: string): Promise<boolean> {
        if (!this.canSessionAccessPlugin(sessionId, pluginId)) {
            this.logger.warn(`[SESSION-PLUGIN-SERVICE] 会话 ${sessionId} 无权禁用插件 ${pluginId}`);
            return false;
        }

        // 注意：这里需要实现插件禁用逻辑
        // 目前的 PluginDeployerEntry 没有直接的禁用方法
        this.logger.warn(`[SESSION-PLUGIN-SERVICE] 插件禁用功能待实现: ${pluginId}`);
        return false;
    }

    /**
     * 获取插件依赖关系
     */
    getPluginDependencies(sessionId: string, pluginId: string): string[] {
        const pluginInfo = this.getPluginInfo(sessionId, pluginId);
        if (!pluginInfo) {
            return [];
        }

        // 尝试从插件模型中获取package.json信息
        const packageJson = (pluginInfo as any).packageJson;
        const dependencies: string[] = [];

        // 收集扩展依赖
        if (packageJson && packageJson.extensionDependencies) {
            dependencies.push(...packageJson.extensionDependencies);
        }

        // 收集扩展包
        if (packageJson && packageJson.extensionPack) {
            dependencies.push(...packageJson.extensionPack);
        }

        return dependencies;
    }

    /**
     * 检查插件冲突
     */
    checkPluginConflicts(sessionId: string): Array<{ pluginId: string; conflicts: string[]; reason: string }> {
        const plugins = this.getPluginsForSession(sessionId, { includeDisabled: true });
        const conflicts: Array<{ pluginId: string; conflicts: string[]; reason: string }> = [];

        // 简单的冲突检测逻辑
        // 例如检查同名插件、版本冲突等
        const pluginNames = new Map<string, string[]>();

        plugins.forEach(plugin => {
            if (plugin.id) {
                const id = plugin.id();
                const name = this.extractPluginName(id);
                
                if (!pluginNames.has(name)) {
                    pluginNames.set(name, []);
                }
                pluginNames.get(name)!.push(id);
            }
        });

        // 检查同名插件冲突
        pluginNames.forEach((pluginIds, name) => {
            if (pluginIds.length > 1) {
                pluginIds.forEach(pluginId => {
                    const otherPlugins = pluginIds.filter(id => id !== pluginId);
                    if (otherPlugins.length > 0) {
                        conflicts.push({
                            pluginId,
                            conflicts: otherPlugins,
                            reason: `同名插件冲突: ${name}`
                        });
                    }
                });
            }
        });

        return conflicts;
    }

    /**
     * 从插件ID中提取插件名称
     */
    private extractPluginName(pluginId: string): string {
        // 简单的名称提取逻辑，可以根据需要改进
        const parts = pluginId.split(':');
        const lastPart = parts[parts.length - 1];
        return lastPart.replace(/\.(vsix|tgz|tar\.gz)$/, '');
    }

    /**
     * 刷新会话插件状态
     */
    async refreshSessionPlugins(sessionId: string): Promise<boolean> {
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            return false;
        }

        try {
            // 重新加载用户插件
            await this.sessionPluginManager.reloadUserPlugins(session.userId);
            this.logger.info(`[SESSION-PLUGIN-SERVICE] 已刷新会话插件: ${sessionId}`);
            return true;
        } catch (error) {
            this.logger.error(`[SESSION-PLUGIN-SERVICE] 刷新会话插件失败: ${sessionId}`, error);
            return false;
        }
    }
}
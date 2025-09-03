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

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { PluginDeployerEntry, PluginDeployer } from '../../../common/plugin-protocol';
import { UserPluginDirectoryResolver } from './user-plugin-directory-resolver';
import { UserSessionService, UserSessionEvent } from './user-session-service';
import { UserPluginEnvironmentService } from '../../common/user-plugin-management/user-plugin-environment-service';

/**
 * 会话插件状态
 */
export interface SessionPluginState {
    sessionId: string;
    userId: string;
    sharedPlugins: PluginDeployerEntry[];
    userPlugins: PluginDeployerEntry[];
    allPlugins: PluginDeployerEntry[];
    loadedAt: Date;
}

/**
 * 用户会话插件管理器
 * 
 * 职责：
 * 1. 监听用户会话连接/断开事件
 * 2. 按需加载用户插件（用户连接时）
 * 3. 管理每个会话的插件状态
 * 4. 提供会话级的插件查询接口
 * 5. 处理插件的动态加载/卸载
 */
@injectable()
export class UserSessionPluginManager {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserSessionService)
    protected readonly sessionService: UserSessionService;

    @inject(UserPluginDirectoryResolver)
    protected readonly pluginResolver: UserPluginDirectoryResolver;

    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployer;

    @inject(UserPluginEnvironmentService)
    protected readonly userPluginEnvironment: UserPluginEnvironmentService;

    // 维护每个会话的插件状态
    private readonly sessionPlugins = new Map<string, SessionPluginState>();

    // 全局共享插件缓存（所有会话共享）
    private sharedPluginsCache: PluginDeployerEntry[] | undefined;

    /**
     * 初始化会话插件管理器
     */
    @postConstruct()
    protected initialize(): void {
        // 监听用户会话变化
        this.sessionService.onUserSessionChanged(event => {
            this.handleSessionEvent(event);
        });
    }

    /**
     * 处理用户会话事件
     */
    private async handleSessionEvent(event: UserSessionEvent): Promise<void> {
        const { session, type } = event;
        
        try {
            if (type === 'connected') {
                await this.onUserConnected(session.sessionId, session.userId);
            } else if (type === 'disconnected') {
                await this.onUserDisconnected(session.sessionId);
            }
        } catch (error) {
            this.logger.error(`[SESSION-PLUGIN-MANAGER] 处理会话事件失败: ${type}`, error);
        }
    }

    /**
     * 用户连接时加载其插件
     */
    async onUserConnected(sessionId: string, userId: string): Promise<void> {
        this.logger.info(`[SESSION-PLUGIN-MANAGER] 用户连接，开始加载插件: 用户=${userId}, 会话=${sessionId}`);

        try {
            // 获取共享插件（缓存）
            const sharedPlugins = await this.getSharedPlugins();
            
            // 获取用户专属插件
            const userPlugins = await this.getUserPlugins(userId);
            
            // 合并插件列表
            const allPlugins = [...sharedPlugins, ...userPlugins];
            
            // 为该用户部署插件
            await this.deployPluginsForSession(sessionId, userPlugins);

            // 保存会话插件状态
            const sessionState: SessionPluginState = {
                sessionId,
                userId,
                sharedPlugins,
                userPlugins,
                allPlugins,
                loadedAt: new Date()
            };
            
            this.sessionPlugins.set(sessionId, sessionState);

            this.logger.info(`[SESSION-PLUGIN-MANAGER] 为用户 ${userId} 加载了 ${userPlugins.length} 个用户插件，${sharedPlugins.length} 个共享插件`);
        } catch (error) {
            this.logger.error(`[SESSION-PLUGIN-MANAGER] 用户连接时加载插件失败: 用户=${userId}`, error);
        }
    }

    /**
     * 用户断开连接时清理插件
     */
    async onUserDisconnected(sessionId: string): Promise<void> {
        const sessionState = this.sessionPlugins.get(sessionId);
        if (!sessionState) {
            this.logger.debug(`[SESSION-PLUGIN-MANAGER] 会话 ${sessionId} 没有插件状态，无需清理`);
            return;
        }

        const { userId, userPlugins } = sessionState;
        
        this.logger.info(`[SESSION-PLUGIN-MANAGER] 用户断开连接，开始清理插件: 用户=${userId}, 会话=${sessionId}`);

        try {
            // 检查该用户是否还有其他活跃会话
            const otherSessions = this.sessionService.getUserSessions(userId)
                .filter(id => id !== sessionId);

            if (otherSessions.length === 0) {
                // 如果用户没有其他会话，卸载用户专属插件
                await this.undeployPluginsForUser(userId, userPlugins);
                this.logger.info(`[SESSION-PLUGIN-MANAGER] 用户 ${userId} 没有其他活跃会话，已卸载用户插件`);
            } else {
                this.logger.info(`[SESSION-PLUGIN-MANAGER] 用户 ${userId} 还有 ${otherSessions.length} 个活跃会话，保留用户插件`);
            }

            // 清除会话状态
            this.sessionPlugins.delete(sessionId);
        } catch (error) {
            this.logger.error(`[SESSION-PLUGIN-MANAGER] 用户断开连接时清理插件失败: 用户=${userId}`, error);
        }
    }

    /**
     * 获取共享插件（带缓存）
     */
    private async getSharedPlugins(): Promise<PluginDeployerEntry[]> {
        if (!this.sharedPluginsCache) {
            this.logger.info('[SESSION-PLUGIN-MANAGER] 首次加载共享插件');
            this.sharedPluginsCache = await this.pluginResolver.resolveSharedPluginsOnDemand();
        }
        return this.sharedPluginsCache;
    }

    /**
     * 获取用户专属插件
     */
    private async getUserPlugins(userId: string): Promise<PluginDeployerEntry[]> {
        this.logger.info(`[SESSION-PLUGIN-MANAGER] 扫描用户插件目录: ${userId}`);
        return await this.pluginResolver.resolveUserPluginsOnDemand(userId);
    }

    /**
     * 为会话部署插件
     */
    private async deployPluginsForSession(sessionId: string, plugins: PluginDeployerEntry[]): Promise<void> {
        if (plugins.length === 0) {
            this.logger.debug(`[SESSION-PLUGIN-MANAGER] 会话 ${sessionId} 没有需要部署的插件`);
            return;
        }

        this.logger.info(`[SESSION-PLUGIN-MANAGER] 为会话 ${sessionId} 部署 ${plugins.length} 个插件`);
        
        // 这里可以实现会话级的插件部署逻辑
        // 目前先简单标记插件为已接受状态
        plugins.forEach(plugin => {
            plugin.accept();
        });
    }

    /**
     * 为用户卸载插件
     */
    private async undeployPluginsForUser(userId: string, plugins: PluginDeployerEntry[]): Promise<void> {
        if (plugins.length === 0) {
            this.logger.debug(`[SESSION-PLUGIN-MANAGER] 用户 ${userId} 没有需要卸载的插件`);
            return;
        }

        this.logger.info(`[SESSION-PLUGIN-MANAGER] 为用户 ${userId} 卸载 ${plugins.length} 个插件`);
        
        // 这里可以实现插件卸载逻辑
        // 目前先简单处理
        for (const plugin of plugins) {
            try {
                // 如果插件有标识符，可以调用插件部署器的卸载方法
                if (plugin.id && plugin.id()) {
                    // await this.pluginDeployer.undeploy(plugin.id());
                    this.logger.debug(`[SESSION-PLUGIN-MANAGER] 卸载插件: ${plugin.id()}`);
                }
            } catch (error) {
                this.logger.error(`[SESSION-PLUGIN-MANAGER] 卸载插件失败: ${plugin.id()}`, error);
            }
        }
    }

    /**
     * 获取会话可见的插件列表
     */
    getSessionPlugins(sessionId: string): PluginDeployerEntry[] {
        const sessionState = this.sessionPlugins.get(sessionId);
        if (!sessionState) {
            this.logger.debug(`[SESSION-PLUGIN-MANAGER] 会话 ${sessionId} 没有插件状态，返回空列表`);
            return [];
        }
        
        return sessionState.allPlugins;
    }

    /**
     * 获取会话的用户插件
     */
    getSessionUserPlugins(sessionId: string): PluginDeployerEntry[] {
        const sessionState = this.sessionPlugins.get(sessionId);
        return sessionState?.userPlugins || [];
    }

    /**
     * 获取会话的共享插件
     */
    getSessionSharedPlugins(sessionId: string): PluginDeployerEntry[] {
        const sessionState = this.sessionPlugins.get(sessionId);
        return sessionState?.sharedPlugins || [];
    }

    /**
     * 检查会话是否有特定插件
     */
    hasSessionPlugin(sessionId: string, pluginId: string): boolean {
        const plugins = this.getSessionPlugins(sessionId);
        return plugins.some(plugin => plugin.id && plugin.id() === pluginId);
    }

    /**
     * 获取会话插件统计信息
     */
    getSessionPluginStats(sessionId: string): { totalPlugins: number; userPlugins: number; sharedPlugins: number } | undefined {
        const sessionState = this.sessionPlugins.get(sessionId);
        if (!sessionState) {
            return undefined;
        }

        return {
            totalPlugins: sessionState.allPlugins.length,
            userPlugins: sessionState.userPlugins.length,
            sharedPlugins: sessionState.sharedPlugins.length
        };
    }

    /**
     * 重新加载用户插件（用于插件安装后刷新）
     */
    async reloadUserPlugins(userId: string): Promise<void> {
        this.logger.info(`[SESSION-PLUGIN-MANAGER] 重新加载用户插件: ${userId}`);
        
        // 获取该用户的所有会话
        const userSessions = this.sessionService.getUserSessions(userId);
        
        for (const sessionId of userSessions) {
            try {
                // 先断开会话插件
                await this.onUserDisconnected(sessionId);
                
                // 再重新连接加载
                await this.onUserConnected(sessionId, userId);
                
                this.logger.info(`[SESSION-PLUGIN-MANAGER] 会话 ${sessionId} 插件重新加载完成`);
            } catch (error) {
                this.logger.error(`[SESSION-PLUGIN-MANAGER] 重新加载会话插件失败: ${sessionId}`, error);
            }
        }
    }

    /**
     * 重新加载共享插件（用于共享插件更新后刷新）
     */
    async reloadSharedPlugins(): Promise<void> {
        this.logger.info('[SESSION-PLUGIN-MANAGER] 重新加载共享插件');
        
        // 清除共享插件缓存
        this.sharedPluginsCache = undefined;
        
        // 重新加载所有会话的插件
        const allSessions = this.sessionService.getActiveSessions();
        
        for (const session of allSessions) {
            try {
                await this.onUserDisconnected(session.sessionId);
                await this.onUserConnected(session.sessionId, session.userId);
                
                this.logger.info(`[SESSION-PLUGIN-MANAGER] 会话 ${session.sessionId} 共享插件重新加载完成`);
            } catch (error) {
                this.logger.error(`[SESSION-PLUGIN-MANAGER] 重新加载会话共享插件失败: ${session.sessionId}`, error);
            }
        }
    }

    /**
     * 获取所有活跃会话的插件状态
     */
    getAllSessionPluginStates(): SessionPluginState[] {
        return Array.from(this.sessionPlugins.values());
    }

    /**
     * 清理所有会话插件状态（用于测试或重启）
     */
    clearAllSessionPluginStates(): void {
        this.sessionPlugins.clear();
        this.sharedPluginsCache = undefined;
        this.logger.info('[SESSION-PLUGIN-MANAGER] 已清理所有会话插件状态');
    }
}
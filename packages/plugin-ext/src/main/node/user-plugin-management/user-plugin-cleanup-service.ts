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
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ILogger } from '@theia/core/lib/common/logger';
import { FileUri } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import { UserPluginEnvironmentService } from '../../common/user-plugin-management/user-plugin-environment-service';
import { PluginDeployer, PluginIdentifiers } from '../../../common/plugin-protocol';
import { HostedPluginDeployerHandler } from '../../../hosted/node/hosted-plugin-deployer-handler';

/**
 * 用户删除事件
 */
interface UserDeletedEvent {
    userId: string;
    timestamp: Date;
}

/**
 * 用户事件服务接口
 * 注意：这个服务由外部系统提供，这里只是接口定义
 */
interface UserEventService {
    onUserDeleted(): import('@theia/core/lib/common/event').Event<UserDeletedEvent>;
}

/**
 * 用户插件清理服务
 * 
 * 职责：
 * 1. 监听用户删除事件
 * 2. 清理被删除用户的插件目录
 * 3. 取消部署用户的插件
 * 4. 清理相关配置和缓存
 */
@injectable()
export class UserPluginCleanupService implements BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserPluginEnvironmentService)
    protected readonly userPluginEnvironment: UserPluginEnvironmentService;

    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployer;

    @inject(HostedPluginDeployerHandler)
    protected readonly deployerHandler: HostedPluginDeployerHandler;

    private userEventService: UserEventService | undefined;

    @postConstruct()
    protected init(): void {
        this.logger.info('[USER-PLUGIN-CLEANUP] 初始化用户插件清理服务...');
    }

    async onStart(): Promise<void> {
        // 检查环境变量是否启用用户插件管理功能
        const enableUserPlugins = process.env.THEIA_USER_PLUGINS_ENABLED === 'true';
        
        this.logger.info(`[USER-PLUGIN-CLEANUP] 检查用户插件管理功能状态: THEIA_USER_PLUGINS_ENABLED=${process.env.THEIA_USER_PLUGINS_ENABLED || 'undefined'}`);
        
        if (!enableUserPlugins) {
            this.logger.info('[USER-PLUGIN-CLEANUP] 用户插件管理功能未启用，跳过用户插件清理服务');
            return;
        }

        this.logger.info('[USER-PLUGIN-CLEANUP] 用户插件管理功能已启用，启动用户插件清理服务...');
        
        try {
            // 尝试获取用户事件服务
            this.userEventService = this.getUserEventService();
            
            if (this.userEventService) {
                // 监听用户删除事件
                this.userEventService.onUserDeleted()(event => {
                    this.handleUserDeleted(event);
                });
                this.logger.info('[USER-PLUGIN-CLEANUP] 已监听用户删除事件');
            } else {
                this.logger.warn('[USER-PLUGIN-CLEANUP] 用户事件服务不可用，将跳过用户删除监听');
            }
        } catch (error) {
            this.logger.error('[USER-PLUGIN-CLEANUP] 启动用户插件清理服务失败:', error);
        }
    }

    /**
     * 处理用户删除事件
     */
    private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
        const { userId } = event;
        this.logger.info(`[USER-PLUGIN-CLEANUP] 处理用户删除事件: ${userId}`);

        try {
            // 1. 清理用户插件目录
            await this.cleanupUserPluginDirectory(userId);
            
            // 2. 取消部署用户插件
            await this.cleanupUserDeploymentCache(userId);
            
            // 3. 清理用户插件配置
            await this.cleanupUserPluginConfig(userId);

            this.logger.info(`[USER-PLUGIN-CLEANUP] 用户 ${userId} 的插件资源清理完成`);
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-CLEANUP] 清理用户 ${userId} 插件资源失败:`, error);
        }
    }

    /**
     * 清理用户插件目录
     */
    private async cleanupUserPluginDirectory(userId: string): Promise<void> {
        try {
            const userPluginDir = await this.userPluginEnvironment.getUserPluginsDirUri(userId);
            const userPluginPath = FileUri.fsPath(userPluginDir);

            if (await fs.pathExists(userPluginPath)) {
                this.logger.info(`[USER-PLUGIN-CLEANUP] 删除用户插件目录: ${userPluginPath}`);
                await fs.remove(userPluginPath);
            } else {
                this.logger.debug(`[USER-PLUGIN-CLEANUP] 用户插件目录不存在: ${userPluginPath}`);
            }
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-CLEANUP] 删除用户 ${userId} 插件目录失败:`, error);
            throw error;
        }
    }

    /**
     * 清理用户插件部署缓存
     */
    private async cleanupUserDeploymentCache(userId: string): Promise<void> {
        try {
            const deployedPlugins = await this.deployerHandler.getDeployedPlugins();

            for (const plugin of deployedPlugins) {
                if (this.isUserPlugin(plugin, userId)) {
                    const pluginId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                    this.logger.info(`[USER-PLUGIN-CLEANUP] 取消部署用户插件: ${pluginId}`);
                    
                    try {
                        await this.deployerHandler.undeployPlugin(pluginId);
                    } catch (error) {
                        this.logger.error(`[USER-PLUGIN-CLEANUP] 取消部署插件 ${pluginId} 失败:`, error);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-CLEANUP] 清理用户 ${userId} 部署缓存失败:`, error);
            throw error;
        }
    }

    /**
     * 清理用户插件配置
     */
    private async cleanupUserPluginConfig(userId: string): Promise<void> {
        try {
            // 这里可以扩展清理用户特定的插件配置
            // 比如用户的插件偏好设置等
            this.logger.debug(`[USER-PLUGIN-CLEANUP] 清理用户 ${userId} 插件配置`);
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-CLEANUP] 清理用户 ${userId} 插件配置失败:`, error);
            throw error;
        }
    }

    /**
     * 判断是否为用户插件
     */
    private isUserPlugin(plugin: any, userId: string): boolean {
        const backendPath = plugin.metadata?.model?.entryPoint?.backend;
        const frontendPath = plugin.metadata?.model?.entryPoint?.frontend;
        
        return this.userPluginEnvironment.isUserPluginPath(backendPath, userId) ||
               this.userPluginEnvironment.isUserPluginPath(frontendPath, userId);
    }

    /**
     * 获取用户事件服务
     * 注意：实际实现需要根据具体的用户管理系统来获取
     */
    private getUserEventService(): UserEventService | undefined {
        try {
            // TODO: 实际实现中需要从容器中获取用户事件服务
            // 这里暂时返回undefined，表示服务不可用
            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * 手动清理用户插件资源
     * 提供给管理员使用的手动清理接口
     */
    async manualCleanup(userId: string): Promise<void> {
        this.logger.info(`[USER-PLUGIN-CLEANUP] 手动清理用户 ${userId} 的插件资源`);
        await this.handleUserDeleted({
            userId,
            timestamp: new Date()
        });
    }

}
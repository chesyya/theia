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
import { PluginDeployerParticipant, PluginDeployerStartContext } from '../../../common/plugin-protocol';

/**
 * 用户插件部署参与者
 * 
 * 在插件部署流程开始时自动添加用户插件目录扫描任务
 * 集成到现有的插件部署系统中，确保用户插件被自动发现和部署
 */
@injectable()
export class UserPluginDeployerParticipant implements PluginDeployerParticipant {

    @inject(ILogger)
    protected readonly logger: ILogger;

    /**
     * 在插件部署开始时调用
     * 自动添加用户插件目录扫描到部署队列
     */
    async onWillStart(context: PluginDeployerStartContext): Promise<void> {
        // 检查环境变量是否启用用户插件管理功能
        const enableUserPlugins = process.env.THEIA_USER_PLUGINS_ENABLED === 'true';
        
        this.logger.info(`[USER-PLUGIN-PARTICIPANT] 检查用户插件管理功能状态: THEIA_USER_PLUGINS_ENABLED=${process.env.THEIA_USER_PLUGINS_ENABLED || 'undefined'}`);
        
        if (!enableUserPlugins) {
            this.logger.info('[USER-PLUGIN-PARTICIPANT] 用户插件管理功能未启用，使用原生插件管理模式');
            return;
        }

        this.logger.info('[USER-PLUGIN-PARTICIPANT] 用户插件管理功能已启用，开始注册用户插件目录扫描');

        try {
            // 添加用户插件目录扫描任务
            // 这会触发 UserPluginDirectoryResolver 来扫描所有用户插件目录
            this.addUserPluginScanTasks(context);

            this.logger.info(`[USER-PLUGIN-PARTICIPANT] 已添加 ${this.getAddedTasksCount(context)} 个用户插件扫描任务`);
        } catch (error) {
            this.logger.error('[USER-PLUGIN-PARTICIPANT] 注册用户插件目录扫描失败:', error);
        }
    }

    /**
     * 添加用户插件扫描任务到部署上下文
     */
    private addUserPluginScanTasks(context: PluginDeployerStartContext): void {
        const initialUserEntriesCount = context.userEntries.length;

        // 添加共享插件目录扫描
        context.userEntries.push('shared-plugins://');

        // 添加用户插件目录扫描
        // 这会扫描所有用户的插件目录
        context.userEntries.push('user-plugins://');

        this.logger.info('[USER-PLUGIN-PARTICIPANT] 已添加插件扫描任务:', {
            sharedPlugins: 'shared-plugins://',
            userPlugins: 'user-plugins://',
            totalUserEntries: context.userEntries.length,
            addedEntries: context.userEntries.length - initialUserEntriesCount
        });
        
        this.logger.info(`[USER-PLUGIN-PARTICIPANT] 当前所有userEntries: ${JSON.stringify(context.userEntries)}`);
    }

    /**
     * 获取添加的任务数量
     */
    private getAddedTasksCount(context: PluginDeployerStartContext): number {
        // 简单计算：我们添加了2个任务（shared-plugins:// 和 user-plugins://）
        return context.userEntries.filter(entry => 
            entry === 'shared-plugins://' || entry === 'user-plugins://'
        ).length;
    }

    /**
     * 支持特定用户插件目录扫描
     * 可以用于按需扫描特定用户的插件
     */
    async scanUserPlugins(userId: string): Promise<string[]> {
        this.logger.info(`[USER-PLUGIN-PARTICIPANT] 扫描用户插件: ${userId}`);
        
        // 返回用于扫描特定用户插件的ID
        return [`user-plugins://${userId}`];
    }

    /**
     * 支持仅扫描共享插件目录
     */
    async scanSharedPluginsOnly(): Promise<string[]> {
        this.logger.info('[USER-PLUGIN-PARTICIPANT] 仅扫描共享插件');
        
        return ['shared-plugins://'];
    }

}
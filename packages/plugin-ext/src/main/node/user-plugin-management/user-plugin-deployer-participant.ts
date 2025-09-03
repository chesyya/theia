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
import { BaoskyConfigService } from '../../common/baosky-config-service';

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

    @inject(BaoskyConfigService)
    protected readonly configService: BaoskyConfigService;

    /**
     * 在插件部署开始时调用
     * 只添加共享插件目录扫描，用户插件改为按需加载
     */
    async onWillStart(context: PluginDeployerStartContext): Promise<void> {
        // 从配置文件检查是否启用用户插件管理功能
        const enableUserPlugins = await this.configService.isUserPluginsEnabled();
        
        this.logger.info(`[USER-PLUGIN-PARTICIPANT] 从配置文件读取用户插件管理功能状态: ${enableUserPlugins}`);
        
        if (!enableUserPlugins) {
            this.logger.info('[USER-PLUGIN-PARTICIPANT] 用户插件管理功能未启用，使用原生插件管理模式');
            return;
        }

        this.logger.info('[USER-PLUGIN-PARTICIPANT] 用户插件管理功能已启用，开始注册共享插件目录扫描');

        try {
            // 只添加共享插件目录扫描任务，用户插件将按需加载
            this.addSharedPluginScanTask(context);

            const addedTasksCount = this.getAddedTasksCount(context);
            this.logger.info(`[USER-PLUGIN-PARTICIPANT] 已添加 ${addedTasksCount} 个共享插件扫描任务，用户插件将按需加载`);
        } catch (error) {
            this.logger.error('[USER-PLUGIN-PARTICIPANT] 注册共享插件目录扫描失败:', error);
        }
    }

    /**
     * 添加共享插件扫描任务到部署上下文
     */
    private addSharedPluginScanTask(context: PluginDeployerStartContext): void {
        const initialUserEntriesCount = context.userEntries.length;

        // 只添加共享插件目录扫描
        context.userEntries.push('shared-plugins://');

        this.logger.info('[USER-PLUGIN-PARTICIPANT] 已添加共享插件扫描任务:', {
            sharedPlugins: 'shared-plugins://',
            totalUserEntries: context.userEntries.length,
            addedEntries: context.userEntries.length - initialUserEntriesCount
        });
        
        this.logger.info(`[USER-PLUGIN-PARTICIPANT] 当前所有userEntries: ${JSON.stringify(context.userEntries)}`);
    }

    /**
     * 获取添加的任务数量
     */
    private getAddedTasksCount(context: PluginDeployerStartContext): number {
        // 现在只添加1个任务（shared-plugins://）
        return context.userEntries.filter(entry => 
            entry === 'shared-plugins://'
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
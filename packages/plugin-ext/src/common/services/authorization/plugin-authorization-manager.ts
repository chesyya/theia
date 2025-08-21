// ***************************************************************************** 
// Copyright (C) 2024 TypeFox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from './types';
import { IAuthorizationService } from './i-authorization-service';

/**
 * 插件授权管理器
 * 状态管理、事件通知
 */
@injectable()
export class PluginAuthorizationManager implements IAuthorizationService {

    private readonly authorizationMap = new Map<PluginIdentifier, AuthorizationStatus>();
    private readonly onDidUpdateAuthorizationStatusEmitter = new Emitter<IAuthorizationStatusChangeEvent>();
    private readonly logger: ILogger;

    constructor(@inject(ILogger) rootLogger: ILogger) {
        this.logger = rootLogger.child(`[PLUGIN] ${PluginAuthorizationManager.name}`);
        this.logger.info('🔗 PluginAuthorizationManager 创建完成 - 内存授权管理');

        // 初始化默认授权状态
        this.initializeDefaultStatuses();
    }

    @postConstruct()
    protected init(): void {
        this.logger.info('🔧 PluginAuthorizationManager 已初始化');
    }

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this.onDidUpdateAuthorizationStatusEmitter.event;
    }

    private initializeDefaultStatuses(): void {
        this.logger.info('📋 初始化默认插件授权状态');

        // 测试插件默认为未授权状态
        this.authorizationMap.set('<unpublished>.test-plugin', AuthorizationStatus.DENIED);

        this.logger.info(`✅ 默认状态初始化完成: ${JSON.stringify(Array.from(this.authorizationMap.entries()))}`);
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        const status = this.authorizationMap.get(pluginId) ?? AuthorizationStatus.GRANTED;
        this.logger.info(`🔍 查询插件 ${pluginId} 的授权状态: ${status}`);
        return status;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = await this.getAuthorizationStatus(pluginId);

        this.authorizationMap.set(pluginId, AuthorizationStatus.GRANTED);
        this.fireAuthorizationStatusChange(pluginId, AuthorizationStatus.GRANTED, previousStatus);

        this.logger.info(`🔓 已授予插件 ${pluginId} 授权`);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = await this.getAuthorizationStatus(pluginId);

        this.authorizationMap.set(pluginId, AuthorizationStatus.DENIED);
        this.fireAuthorizationStatusChange(pluginId, AuthorizationStatus.DENIED, previousStatus);

        this.logger.info(`🔒 已撤销插件 ${pluginId} 授权`);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        const result = new Map(this.authorizationMap);
        this.logger.info(`📋 获取所有插件授权状态: ${JSON.stringify(Array.from(result.entries()))}`);
        return result;
    }

    private fireAuthorizationStatusChange(
        pluginId: PluginIdentifier,
        newStatus: AuthorizationStatus,
        previousStatus: AuthorizationStatus
    ): void {
        if (newStatus !== previousStatus) {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId,
                status: newStatus,
                previousStatus,
                timestamp: new Date()
            };
            this.logger.info(`📡 触发授权状态变更事件: 插件=${pluginId}, 新状态=${newStatus}, 旧状态=${previousStatus}`);
            this.onDidUpdateAuthorizationStatusEmitter.fire(event);
        }
    }

    resetAllAuthorizations(): void {
        this.logger.info('🔄 重置所有插件授权状态');

        const previousStatuses = new Map(this.authorizationMap);
        this.authorizationMap.clear();
        this.initializeDefaultStatuses();

        for (const [pluginId, newStatus] of this.authorizationMap) {
            const previousStatus = previousStatuses.get(pluginId) ?? AuthorizationStatus.GRANTED;
            this.fireAuthorizationStatusChange(pluginId, newStatus, previousStatus);
        }

        this.logger.info('✅ 所有插件授权状态已重置为默认状态');
    }

    getAuthorizationStats(): {
        totalPlugins: number;
        authorizedPlugins: number;
        deniedPlugins: number;
    } {
        const totalPlugins = this.authorizationMap.size;
        const authorizedPlugins = Array.from(this.authorizationMap.values())
            .filter(status => status === AuthorizationStatus.GRANTED).length;
        const deniedPlugins = totalPlugins - authorizedPlugins;

        const stats = { totalPlugins, authorizedPlugins, deniedPlugins };
        this.logger.info(`📊 授权统计信息: ${JSON.stringify(stats)}`);
        return stats;
    }
}

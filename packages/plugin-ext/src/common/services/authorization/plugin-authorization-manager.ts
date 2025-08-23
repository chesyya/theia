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
import { Event, Emitter } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { 
    PluginIdentifier, 
    AuthorizationStatus, 
    IAuthorizationStatusChangeEvent,
    AuthorizationStats,
    PluginAuthorizationInfo
} from './types';
import { IAuthorizationService } from './i-authorization-service';

/**
 * 核心授权管理器 - 管理插件授权的核心业务逻辑
 */
@injectable()
export class PluginAuthorizationManager implements IAuthorizationService {
    @inject(ILogger)
    protected readonly logger: ILogger;

    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();
    private readonly authorizationStatuses = new Map<PluginIdentifier, AuthorizationStatus>();

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        const status = this.authorizationStatuses.get(pluginId);
        return status ?? AuthorizationStatus.PENDING;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = await this.getAuthorizationStatus(pluginId);
        this.authorizationStatuses.set(pluginId, AuthorizationStatus.GRANTED);
        
        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: AuthorizationStatus.GRANTED,
            previousStatus,
            timestamp: new Date()
        };

        this._onDidUpdateAuthorizationStatus.fire(event);
        this.logger.info(`[AUTH] 插件 ${pluginId} 授权状态变更: ${previousStatus} -> ${AuthorizationStatus.GRANTED}`);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = await this.getAuthorizationStatus(pluginId);
        this.authorizationStatuses.set(pluginId, AuthorizationStatus.DENIED);
        
        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: AuthorizationStatus.DENIED,
            previousStatus,
            timestamp: new Date()
        };

        this._onDidUpdateAuthorizationStatus.fire(event);
        this.logger.info(`[AUTH] 插件 ${pluginId} 授权状态变更: ${previousStatus} -> ${AuthorizationStatus.DENIED}`);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        return new Map(this.authorizationStatuses);
    }

    async resetToDefaults(): Promise<void> {
        this.logger.info('[AUTH] 重置所有插件授权状态为默认值');
        this.authorizationStatuses.clear();
    }

    getAuthorizationStats(): AuthorizationStats {
        let authorizedCount = 0;
        let deniedCount = 0;
        let pendingCount = 0;

        for (const status of this.authorizationStatuses.values()) {
            switch (status) {
                case AuthorizationStatus.GRANTED:
                    authorizedCount++;
                    break;
                case AuthorizationStatus.DENIED:
                    deniedCount++;
                    break;
                case AuthorizationStatus.PENDING:
                    pendingCount++;
                    break;
            }
        }

        return {
            totalPlugins: this.authorizationStatuses.size,
            authorizedPlugins: authorizedCount,
            deniedPlugins: deniedCount,
            pendingPlugins: pendingCount,
            dependencyRelations: 0 // TODO: 实现依赖关系计算
        };
    }

    async getPluginAuthorizationInfo(pluginId: PluginIdentifier): Promise<PluginAuthorizationInfo> {
        const status = await this.getAuthorizationStatus(pluginId);
        
        return {
            pluginId,
            status,
            dependencies: [], // TODO: 实现依赖关系查询
            dependents: [],   // TODO: 实现依赖关系查询
            lastStatusChange: new Date()
        };
    }

    resetAllAuthorizations(): void {
        const previousStatuses = new Map(this.authorizationStatuses);
        this.authorizationStatuses.clear();
        
        // 为每个插件触发状态变更事件
        for (const [pluginId, previousStatus] of previousStatuses) {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId,
                status: AuthorizationStatus.PENDING,
                previousStatus,
                timestamp: new Date()
            };
            this._onDidUpdateAuthorizationStatus.fire(event);
        }

        this.logger.warn('[AUTH] 已重置所有插件授权状态');
    }
}
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
import { AuthorizationStatus, IAuthorizationService, IAuthorizationStatusChangeEvent, PluginIdentifier } from './i-authorization-service';

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
        if (status !== undefined) {
            return status;
        }

        // Special case: Test Plugin starts as PENDING (unauthorized) for demonstration
        if (pluginId === 'test-plugin' || pluginId.startsWith('test-plugin@')) {
            return AuthorizationStatus.GRANTED;
        }

        // Default to GRANTED for normal operation - plugins are authorized by default
        // unless explicitly denied through the authorization system
        return AuthorizationStatus.GRANTED;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = await this.getAuthorizationStatus(pluginId);
        this.authorizationStatuses.set(pluginId, AuthorizationStatus.GRANTED);

        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: AuthorizationStatus.GRANTED,
            previousStatus
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
            previousStatus
        };

        this._onDidUpdateAuthorizationStatus.fire(event);
        this.logger.info(`[AUTH] 插件 ${pluginId} 授权状态变更: ${previousStatus} -> ${AuthorizationStatus.DENIED}`);

        // 状态变更会通过事件传播到 AuthorizationEnforcementService 执行实际的 undeploy
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        return new Map(this.authorizationStatuses);
    }

}

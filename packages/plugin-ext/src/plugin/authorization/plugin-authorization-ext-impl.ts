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

import { Event, Emitter } from '@theia/core/lib/common/event';
import { RPCProtocol } from '../../common/rpc-protocol';
import { PluginAuthorizationService } from '../../common/services/authorization';
import { PluginAuthorizationChangeEvent, PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from '../../common/services/authorization/types';
import { PluginAuthorizationExt, PluginAuthorizationMain, PLUGIN_RPC_CONTEXT } from '../../common/plugin-api-rpc';

/**
 * 简化的插件授权服务实现
 * 直接通过RPC调用backend，无需复杂的代理层
 */
export class PluginAuthorizationExtImpl implements PluginAuthorizationService, PluginAuthorizationExt {

    private readonly onAuthorizationChangedEmitter = new Emitter<PluginAuthorizationChangeEvent>();
    private readonly proxy: PluginAuthorizationMain;

    constructor(
        protected readonly rpc: RPCProtocol
    ) {
        this.proxy = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.PLUGIN_AUTHORIZATION_MAIN);
    }

    // PluginAuthorizationExt implementation - 接收来自backend的通知
    async $onDidChangeAuthorizationStatus(event: any): Promise<void> {
        console.log(`[AUTH-PLUGIN] 🎯 收到授权状态变更:`, event);

        // 处理不同格式的事件
        let legacyEvent: PluginAuthorizationChangeEvent;

        if (event.pluginId) {
            // 新格式，转换为旧格式
            legacyEvent = {
                pluginId: event.pluginId,
                status: event.status,
                previousStatus: event.previousStatus
            };
        } else {
            console.warn('[AUTH-PLUGIN] 未知的事件格式:', event);
            return;
        }

        this.onAuthorizationChangedEmitter.fire(legacyEvent);
    }

    // PluginAuthorizationService implementation - 提供给插件使用的接口
    async isAuthorized(pluginId: string): Promise<boolean> {
        return this.proxy.$isAuthorized(pluginId);
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return this.proxy.$getUnauthorizedPluginIds();
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        return this.proxy.$getAuthorizedPluginIds();
    }

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.onAuthorizationChangedEmitter.event;
    }

    async grantTestPluginAuthorization(): Promise<void> {
        return this.proxy.$grantTestPluginAuthorization();
    }

    async revokeTestPluginAuthorization(): Promise<void> {
        return this.proxy.$revokeTestPluginAuthorization();
    }

    // Missing PluginAuthorizationService interface methods
    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        // For now, create a dummy emitter - this should be properly implemented
        const emitter = new Emitter<IAuthorizationStatusChangeEvent>();
        return emitter.event;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        const status = await this.proxy.$getAuthorizationStatus(pluginId);
        return status === 'granted' ? AuthorizationStatus.GRANTED : AuthorizationStatus.DENIED;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        // This should be implemented through the authorization management system
        throw new Error('Method not implemented in plugin extension context');
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        // This should be implemented through the authorization management system
        throw new Error('Method not implemented in plugin extension context');
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        // This should be implemented through the authorization management system
        return new Map();
    }
}

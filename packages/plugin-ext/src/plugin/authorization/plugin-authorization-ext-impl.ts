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
import { PLUGIN_RPC_CONTEXT, PluginAuthorizationMain, PluginAuthorizationExt } from '../../common/plugin-api-rpc';
import { PluginAuthorizationService } from '../../common/plugin-authorization-service';
import { PluginAuthorizationChangeEvent } from '../../common/plugin-authorization';

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

        if (event.changedPluginIds) {
            // 已经是旧格式
            legacyEvent = event;
        } else if (event.pluginId) {
            // 新格式，转换为旧格式
            legacyEvent = {
                changedPluginIds: [event.pluginId],
                changeType: event.status === 'granted' ? 'granted' : 'revoked'
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
}

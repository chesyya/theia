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
import { Event, Emitter } from '@theia/core';
import { RPCProtocol } from '../common/rpc-protocol';
import { PluginAuthorizationService } from '../common/plugin-authorization-service';
import { PluginAuthorizationChangeEvent, PluginAuthorizationProvider } from '../common/plugin-authorization';
import { PLUGIN_RPC_CONTEXT, PluginAuthorizationExt } from '../common/plugin-api-rpc';

/**
 * Plugin-host implementation of PluginAuthorizationService that uses RPC to communicate with the main backend
 */
@injectable()
export class PluginAuthorizationServiceRPC implements PluginAuthorizationService, PluginAuthorizationExt {

    private readonly onAuthorizationChangedEmitter = new Emitter<PluginAuthorizationChangeEvent>();
    private proxy: PluginAuthorizationProvider;

    constructor(
        @inject(RPCProtocol) protected readonly rpc: RPCProtocol
    ) {
        this.proxy = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.PLUGIN_AUTHORIZATION_MAIN);
    }

    // PluginAuthorizationExt implementation
    async $onDidChangeAuthorizationStatus(event: PluginAuthorizationChangeEvent): Promise<void> {
        console.log(`[AUTH-PLUGIN-HOST] 🎯 Received authorization change event:`, event);
        try {
            this.onAuthorizationChangedEmitter.fire(event);
            console.log(`[AUTH-PLUGIN-HOST] ✅ Event fired to plugin host listeners successfully`);
        } catch (error) {
            console.error(`[AUTH-PLUGIN-HOST] ❌ Error firing event to plugin host:`, error);
        }
    }

    async isAuthorized(pluginId: string): Promise<boolean> {
        return this.proxy.$isAuthorized(pluginId);
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return this.proxy.getUnauthorizedPluginIds();
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        return this.proxy.getAuthorizedPluginIds();
    }

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.onAuthorizationChangedEmitter.event;
    }

    /**
     * 授权测试插件（仅用于测试）
     */
    async grantTestPluginAuthorization(): Promise<void> {
        const proxy = this.proxy as any;
        if (proxy.grantTestPluginAuthorization) {
            return proxy.grantTestPluginAuthorization();
        }
    }

    /**
     * 撤销测试插件授权（仅用于测试）
     */
    async revokeTestPluginAuthorization(): Promise<void> {
        const proxy = this.proxy as any;
        if (proxy.revokeTestPluginAuthorization) {
            return proxy.revokeTestPluginAuthorization();
        }
    }
}

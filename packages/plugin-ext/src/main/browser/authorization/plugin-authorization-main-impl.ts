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
import { RPCProtocol } from '../../../common/rpc-protocol';
import { PluginAuthorizationProvider } from '../../../common/authorization';
import { PluginAuthorizationMain, MAIN_RPC_CONTEXT } from '../../../common/plugin-api-rpc';

/**
 * 简化的插件授权Main实现，直接委托给现有的PluginAuthorizationProvider
 */
@injectable()
export class PluginAuthorizationMainImpl implements PluginAuthorizationMain {

    @inject(PluginAuthorizationProvider)
    protected readonly authorizationProvider: PluginAuthorizationProvider;

    constructor(
        @inject(RPCProtocol) private readonly rpc: RPCProtocol
    ) {
    }

    @postConstruct()
    protected init(): void {
        // 监听授权变化并通知插件端
        this.authorizationProvider.onAuthorizationChanged(event => {
            const proxy = this.rpc.getProxy(MAIN_RPC_CONTEXT.PLUGIN_AUTHORIZATION_EXT);
            proxy.$onDidChangeAuthorizationStatus({
                pluginId: event.pluginId,
                status: event.status,
                previousStatus: event.previousStatus || 'denied'
            });
        });
    }

    async $isAuthorized(pluginId: string): Promise<boolean> {
        return this.authorizationProvider.isAuthorized(pluginId);
    }

    async $getUnauthorizedPluginIds(): Promise<string[]> {
        return this.authorizationProvider.getUnauthorizedPluginIds();
    }

    async $getAuthorizedPluginIds(): Promise<string[]> {
        return this.authorizationProvider.getAuthorizedPluginIds();
    }

    async $manageTestPluginAuthorization(grant: boolean): Promise<void> {
        const provider = this.authorizationProvider as any;
        if (provider.manageTestPluginAuthorization) {
            await provider.manageTestPluginAuthorization(grant);
        }
    }

    async $grantTestPluginAuthorization(): Promise<void> {
        return this.$manageTestPluginAuthorization(true);
    }

    async $revokeTestPluginAuthorization(): Promise<void> {
        return this.$manageTestPluginAuthorization(false);
    }

    async $getAuthorizationStatus(pluginId: string): Promise<string> {
        const isAuthorized = await this.authorizationProvider.isAuthorized(pluginId);
        return isAuthorized ? 'granted' : 'denied';
    }
}

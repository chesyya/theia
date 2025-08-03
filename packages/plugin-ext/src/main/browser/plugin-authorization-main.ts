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

import { interfaces } from '@theia/core/shared/inversify';
import { Event } from '@theia/core';
import { PluginAuthorizationProvider, PluginAuthorizationChangeEvent } from '../../common/plugin-authorization';
import { RPCProtocol } from '../../common/rpc-protocol';
import { MAIN_RPC_CONTEXT, PluginAuthorizationExt } from '../../common/plugin-api-rpc';

export class PluginAuthorizationMainImpl implements PluginAuthorizationProvider {

    private authorizationProvider: PluginAuthorizationProvider;
    private proxy: PluginAuthorizationExt;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.authorizationProvider = container.get(PluginAuthorizationProvider);
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.PLUGIN_AUTHORIZATION_EXT);

        // Forward authorization change events to the plugin host
        this.authorizationProvider.onAuthorizationChanged(event => {
            try {
                console.log(`[AUTH-MAIN] Forwarding authorization event to plugin host:`, event);
                if (this.proxy && typeof this.proxy.$onDidChangeAuthorizationStatus === 'function') {
                    this.proxy.$onDidChangeAuthorizationStatus(event);
                    console.log(`[AUTH-MAIN] Event forwarded successfully`);
                } else {
                    console.error(`[AUTH-MAIN] Proxy is not properly initialized:`, this.proxy);
                }
            } catch (error) {
                console.error(`[AUTH-MAIN] Error forwarding authorization event:`, error);
            }
        });
    }

    async $isAuthorized(pluginId: string): Promise<boolean> {
        return this.authorizationProvider.$isAuthorized(pluginId);
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        return this.authorizationProvider.getAuthorizedPluginIds();
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return this.authorizationProvider.getUnauthorizedPluginIds();
    }

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.authorizationProvider.onAuthorizationChanged;
    }
}

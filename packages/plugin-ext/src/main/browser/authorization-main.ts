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

import { injectable, interfaces } from '@theia/core/shared/inversify';
import { RPCProtocol } from '../../common/rpc-protocol';
import { AuthorizationMain, AuthorizationExt, MAIN_RPC_CONTEXT } from '../../common/plugin-api-rpc';
import { PluginAuthorizationProvider } from '../../common/plugin-authorization';
import { Disposable } from '@theia/core/lib/common/disposable';

@injectable()
export class AuthorizationMainImpl implements AuthorizationMain {

    private readonly rpc: RPCProtocol;
    private readonly authorizationProvider: PluginAuthorizationProvider;
    private readonly authorizationExt: AuthorizationExt;
    private readonly disposables = new Array<Disposable>();

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.rpc = rpc;
        this.authorizationProvider = container.get(PluginAuthorizationProvider);
        this.authorizationExt = this.rpc.getProxy(MAIN_RPC_CONTEXT.AUTHORIZATION_EXT);
        this.setupAuthorizationListener();
    }

    async $getAuthorizationStatus(pluginId: string): Promise<string> {
        try {
            const isAuthorized = await this.authorizationProvider.$isAuthorized(pluginId);
            return isAuthorized ? 'granted' : 'denied';
        } catch (error) {
            console.warn(`Failed to get authorization status for plugin ${pluginId}:`, error);
            return 'denied';
        }
    }

    private setupAuthorizationListener(): void {
        // Listen for authorization changes and notify plugins
        if (this.authorizationProvider.onAuthorizationChanged) {
            const disposable = this.authorizationProvider.onAuthorizationChanged((event) => {
                console.log(`[AuthorizationMainImpl] 📢 Authorization changed:`, event);

                // For each changed plugin, determine the new authorization status and notify
                event.changedPluginIds.forEach(async (pluginId) => {
                    const isAuthorized = await this.authorizationProvider.$isAuthorized(pluginId);
                    const authEvent = {
                        status: isAuthorized ? 'granted' : 'denied',
                        previousStatus: isAuthorized ? 'denied' : 'granted', // Opposite of current status
                        timestamp: new Date()
                    };

                    // Notify the plugin extension about the authorization change
                    this.authorizationExt.$handleAuthorizationStatusChange(pluginId, authEvent);
                });
            });

            this.disposables.push(disposable);
        } else {
            console.warn('[AuthorizationMainImpl] ⚠️  PluginAuthorizationProvider does not support authorization change events');
        }
    }

    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables.length = 0;
    }
}
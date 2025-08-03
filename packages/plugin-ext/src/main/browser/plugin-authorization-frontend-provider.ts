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
import { Event } from '@theia/core';
import { PluginAuthorizationProvider, PluginAuthorizationChangeEvent, pluginAuthorizationPath } from '../../common/plugin-authorization';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';

/**
 * Frontend implementation of PluginAuthorizationProvider that communicates with backend via WebSocket
 */
@injectable()
export class PluginAuthorizationFrontendProvider implements PluginAuthorizationProvider {

    private backendProxy: PluginAuthorizationProvider;

    constructor(
        @inject(WebSocketConnectionProvider) protected readonly connectionProvider: WebSocketConnectionProvider
    ) {
        this.backendProxy = this.connectionProvider.createProxy<PluginAuthorizationProvider>(pluginAuthorizationPath);
    }

    async $isAuthorized(pluginId: string): Promise<boolean> {
        return this.backendProxy.$isAuthorized(pluginId);
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        return this.backendProxy.getAuthorizedPluginIds();
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return this.backendProxy.getUnauthorizedPluginIds();
    }

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.backendProxy.onAuthorizationChanged;
    }

    async grantTestPluginAuthorization(): Promise<void> {
        const proxy = this.backendProxy as any;
        if (proxy.grantTestPluginAuthorization) {
            return proxy.grantTestPluginAuthorization();
        }
    }

    async revokeTestPluginAuthorization(): Promise<void> {
        const proxy = this.backendProxy as any;
        if (proxy.revokeTestPluginAuthorization) {
            return proxy.revokeTestPluginAuthorization();
        }
    }
}

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
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { ILogger } from '@theia/core/lib/common/logger';
import {
    PluginAuthorizationProvider,
    pluginAuthorizationPath,
    PluginAuthorizationChangeEvent,
    PluginIdentifier,
    AuthorizationStatus,
    IAuthorizationStatusChangeEvent,
    IAuthorizationService
} from '../../../common/authorization';

/**
 * Frontend implementation of PluginAuthorizationProvider that communicates with backend via WebSocket
 */
@injectable()
export class PluginAuthorizationFrontendProvider implements PluginAuthorizationProvider {

    private backendProxy: PluginAuthorizationProvider;
    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();
    private readonly _onAuthorizationChanged = new Emitter<PluginAuthorizationChangeEvent>();

    constructor(
        @inject(WebSocketConnectionProvider) protected readonly connectionProvider: WebSocketConnectionProvider,
        @inject(IAuthorizationService) private readonly authorizationService: IAuthorizationService,
        @inject(ILogger) private readonly logger: ILogger
    ) {
        this.backendProxy = this.connectionProvider.createProxy<PluginAuthorizationProvider>(pluginAuthorizationPath);
        
        // Listen to authorization service events and bridge them to plugin authorization events
        this.authorizationService.onDidUpdateAuthorizationStatus(event => {
            this.logger.info(`[PLUGIN-AUTH] Bridging authorization event for ${event.pluginId}: ${event.previousStatus} -> ${event.status}`);
            
            // Fire the plugin authorization event
            this._onDidUpdateAuthorizationStatus.fire(event);
            
            // Also fire the legacy authorization changed event
            const legacyEvent: PluginAuthorizationChangeEvent = {
                pluginId: event.pluginId,
                authorized: event.status === AuthorizationStatus.GRANTED,
                status: event.status,
                previousStatus: event.previousStatus
            };
            this._onAuthorizationChanged.fire(legacyEvent);
        });
    }

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this._onAuthorizationChanged.event;
    }

    async isAuthorized(pluginId: string): Promise<boolean> {
        const status = await this.authorizationService.getAuthorizationStatus(pluginId);
        return status === AuthorizationStatus.GRANTED;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        return this.authorizationService.getAuthorizationStatus(pluginId);
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        this.logger.info(`[PLUGIN-AUTH] Granting authorization for ${pluginId}`);
        return this.authorizationService.grantAuthorization(pluginId);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        this.logger.info(`[PLUGIN-AUTH] Revoking authorization for ${pluginId}`);
        return this.authorizationService.revokeAuthorization(pluginId);
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        return this.backendProxy.getAuthorizedPluginIds();
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return this.backendProxy.getUnauthorizedPluginIds();
    }

    async resetAuthorizationState(): Promise<void> {
        const proxy = this.backendProxy as any;
        if (proxy.resetAllAuthorizations) {
            return proxy.resetAllAuthorizations();
        }
    }

    async manageTestPluginAuthorization(grant: boolean): Promise<void> {
        const proxy = this.backendProxy as any;
        if (proxy.manageTestPluginAuthorization) {
            return proxy.manageTestPluginAuthorization(grant);
        }
    }
}

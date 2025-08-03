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
import { Emitter } from '@theia/core/lib/common/event';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { 
    IAuthorizationService,
    IAuthorizationRPC,
    IAuthorizationClient,
    PluginIdentifier, 
    AuthorizationStatus,
    IAuthorizationStatusChangeEvent,
    authorizationServicePath
} from '../../common/services/authorization';

/**
 * Frontend proxy implementation of IAuthorizationService.
 * 
 * Responsibilities:
 * - Implements IAuthorizationService interface for frontend components
 * - Delegates all method calls to backend via RPC
 * - Implements IAuthorizationClient to receive events from backend
 * - Re-emits backend events locally for frontend consumers
 * - Completely hides RPC complexity from frontend consumers
 * - Creates the illusion that the authorization service is running locally
 */
@injectable()
export class AuthorizationFrontendProxy implements IAuthorizationService, IAuthorizationClient {

    private readonly disposables = new DisposableCollection();
    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();
    private readonly rpcProxy: IAuthorizationRPC;

    constructor(
        @inject(WebSocketConnectionProvider) protected readonly connectionProvider: WebSocketConnectionProvider
    ) {
        console.log(`[AUTH-PROXY] 🔗 AuthorizationFrontendProxy initializing...`);
        
        // Create RPC proxy connection to backend, passing this as the client for event callbacks
        this.rpcProxy = this.connectionProvider.createProxy<IAuthorizationRPC>(authorizationServicePath, this);
        
        console.log(`[AUTH-PROXY] ✅ AuthorizationFrontendProxy initialized`);
    }

    get onDidUpdateAuthorizationStatus() {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    // --- IAuthorizationClient implementation - receives events from backend ---

    $onDidUpdateAuthorizationStatus(event: IAuthorizationStatusChangeEvent): void {
        console.log(`[AUTH-PROXY] 🎉 [EVENT-RECEIVE] Received authorization change event from backend:`, event);
        
        // Re-fire the event locally for frontend components to listen to
        this._onDidUpdateAuthorizationStatus.fire(event);
        
        console.log(`[AUTH-PROXY] 📢 [EVENT-RECEIVE] Event re-fired to frontend listeners successfully`);
    }

    // --- IAuthorizationService implementation - pure delegation to RPC ---

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        console.log(`[AUTH-PROXY] 📞 Delegating getAuthorizationStatus(${pluginId}) to backend...`);
        try {
            const result = await this.rpcProxy.$getAuthorizationStatus(pluginId);
            console.log(`[AUTH-PROXY] ✅ getAuthorizationStatus result: ${result}`);
            return result;
        } catch (error) {
            console.error(`[AUTH-PROXY] ❌ Error in getAuthorizationStatus:`, error);
            throw error;
        }
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-PROXY] 📞 Delegating grantAuthorization(${pluginId}) to backend...`);
        try {
            await this.rpcProxy.$grantAuthorization(pluginId);
            console.log(`[AUTH-PROXY] ✅ grantAuthorization completed`);
        } catch (error) {
            console.error(`[AUTH-PROXY] ❌ Error in grantAuthorization:`, error);
            throw error;
        }
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-PROXY] 📞 Delegating revokeAuthorization(${pluginId}) to backend...`);
        try {
            await this.rpcProxy.$revokeAuthorization(pluginId);
            console.log(`[AUTH-PROXY] ✅ revokeAuthorization completed`);
        } catch (error) {
            console.error(`[AUTH-PROXY] ❌ Error in revokeAuthorization:`, error);
            throw error;
        }
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        console.log(`[AUTH-PROXY] 📞 Delegating getAllAuthorizationStatuses() to backend...`);
        try {
            const result = await this.rpcProxy.$getAllAuthorizationStatuses();
            console.log(`[AUTH-PROXY] ✅ getAllAuthorizationStatuses result: ${result.size} statuses`);
            return result;
        } catch (error) {
            console.error(`[AUTH-PROXY] ❌ Error in getAllAuthorizationStatuses:`, error);
            throw error;
        }
    }

    /**
     * Development/testing helper methods
     */
    async resetToDefaults(): Promise<void> {
        console.log(`[AUTH-PROXY] 📞 Delegating resetToDefaults() to backend...`);
        try {
            if ('$resetToDefaults' in this.rpcProxy) {
                await (this.rpcProxy as any).$resetToDefaults();
                console.log(`[AUTH-PROXY] ✅ resetToDefaults completed`);
            } else {
                console.warn(`[AUTH-PROXY] ⚠️  resetToDefaults not available on RPC proxy`);
            }
        } catch (error) {
            console.error(`[AUTH-PROXY] ❌ Error in resetToDefaults:`, error);
            throw error;
        }
    }

    dispose(): void {
        console.log(`[AUTH-PROXY] 🧹 Disposing AuthorizationFrontendProxy...`);
        this._onDidUpdateAuthorizationStatus.dispose();
        this.disposables.dispose();
    }
}
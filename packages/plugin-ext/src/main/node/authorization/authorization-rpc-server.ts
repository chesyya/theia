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
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { RpcServer } from '@theia/core/lib/common/messaging/proxy-factory';
import {
    IAuthorizationService,
    IAuthorizationRPC,
    IAuthorizationClient,
    PluginIdentifier,
    AuthorizationStatus
} from '../../../common/services/authorization';

/**
 * RPC server that exposes the AuthorizationService to remote processes.
 * 
 * Responsibilities:
 * - Receives RPC calls from frontend/plugin processes
 * - Delegates all calls to the core AuthorizationService
 * - Listens to service events and broadcasts them to RPC clients
 * - Contains NO business logic - pure delegation layer
 * - Method names use $ prefix to clearly indicate RPC interface
 */
@injectable()
export class AuthorizationRPCServer implements IAuthorizationRPC, RpcServer<IAuthorizationClient> {

    private readonly disposables = new DisposableCollection();
    private client: IAuthorizationClient | undefined;

    constructor(
        @inject(IAuthorizationService) private readonly authorizationService: IAuthorizationService
    ) {
        console.log(`[AUTH-RPC] 🌐 AuthorizationRPCServer initializing...`);
        this.setupEventForwarding();
        console.log(`[AUTH-RPC] ✅ AuthorizationRPCServer initialized with event forwarding`);
    }

    setClient(client: IAuthorizationClient | undefined): void {
        console.log(`[AUTH-RPC] 🔗 Setting client:`, !!client);
        this.client = client;
    }

    getClient(): IAuthorizationClient | undefined {
        return this.client;
    }

    private setupEventForwarding(): void {
        // Listen to the real service's events and broadcast them to RPC clients
        this.disposables.push(this.authorizationService.onDidUpdateAuthorizationStatus(event => {
            console.log(`[AUTH-RPC] 📡 [EVENT-SEND] Broadcasting authorization change event:`, event);
            try {
                if (this.client) {
                    this.client.$onDidUpdateAuthorizationStatus(event);
                    console.log(`[AUTH-RPC] ✅ [EVENT-SEND] Event sent to client successfully`);
                } else {
                    console.warn(`[AUTH-RPC] ⚠️  [EVENT-SEND] No client connected, cannot send event`);
                }
            } catch (error) {
                console.error(`[AUTH-RPC] ❌ [EVENT-SEND] Error sending event to client:`, error);
            }
        }));
    }

    dispose(): void {
        console.log(`[AUTH-RPC] 🧹 Disposing AuthorizationRPCServer...`);
        this.disposables.dispose();
    }

    async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        console.log(`[AUTH-RPC] 📞 RPC call: $getAuthorizationStatus(${pluginId})`);
        try {
            const result = await this.authorizationService.getAuthorizationStatus(pluginId);
            console.log(`[AUTH-RPC] ✅ RPC response: ${result}`);
            return result;
        } catch (error) {
            console.error(`[AUTH-RPC] ❌ RPC error in $getAuthorizationStatus:`, error);
            throw error;
        }
    }

    async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-RPC] 📞 RPC call: $grantAuthorization(${pluginId})`);
        try {
            await this.authorizationService.grantAuthorization(pluginId);
            console.log(`[AUTH-RPC] ✅ RPC completed: $grantAuthorization`);
        } catch (error) {
            console.error(`[AUTH-RPC] ❌ RPC error in $grantAuthorization:`, error);
            throw error;
        }
    }

    async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-RPC] 📞 RPC call: $revokeAuthorization(${pluginId})`);
        try {
            await this.authorizationService.revokeAuthorization(pluginId);
            console.log(`[AUTH-RPC] ✅ RPC completed: $revokeAuthorization`);
        } catch (error) {
            console.error(`[AUTH-RPC] ❌ RPC error in $revokeAuthorization:`, error);
            throw error;
        }
    }

    async $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        console.log(`[AUTH-RPC] 📞 RPC call: $getAllAuthorizationStatuses()`);
        try {
            const result = await this.authorizationService.getAllAuthorizationStatuses();
            console.log(`[AUTH-RPC] ✅ RPC response: ${result.size} statuses`);
            return result;
        } catch (error) {
            console.error(`[AUTH-RPC] ❌ RPC error in $getAllAuthorizationStatuses:`, error);
            throw error;
        }
    }

    /**
     * Development/testing helper methods - these are not part of the core RPC interface
     * but are useful for development and testing scenarios
     */
    async $resetToDefaults(): Promise<void> {
        console.log(`[AUTH-RPC] 📞 RPC call: $resetToDefaults()`);
        try {
            if ('resetToDefaults' in this.authorizationService) {
                await (this.authorizationService as any).resetToDefaults();
                console.log(`[AUTH-RPC] ✅ RPC completed: $resetToDefaults`);
            } else {
                console.warn(`[AUTH-RPC] ⚠️  resetToDefaults not available on service`);
            }
        } catch (error) {
            console.error(`[AUTH-RPC] ❌ RPC error in $resetToDefaults:`, error);
            throw error;
        }
    }
}

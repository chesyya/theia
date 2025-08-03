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

import { injectable } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { 
    IAuthorizationService, 
    PluginIdentifier, 
    AuthorizationStatus, 
    IAuthorizationStatusChangeEvent 
} from '../../common/services/authorization';

/**
 * Core authorization service implementation.
 * This is the single source of truth for plugin authorization state.
 * 
 * Responsibilities:
 * - Maintains the authoritative state of all plugin authorizations
 * - Implements business logic for granting/revoking access
 * - Fires events when state changes
 * - Provides query interface for current state
 */
@injectable()
export class AuthorizationService implements IAuthorizationService {

    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();
    
    // State storage: Map from plugin ID to authorization status
    private readonly authorizationStates = new Map<PluginIdentifier, AuthorizationStatus>();

    constructor() {
        console.log(`[AUTH-SERVICE] 🚀 Initializing AuthorizationService...`);
        this.initializeDefaultStates();
        console.log(`[AUTH-SERVICE] ✅ AuthorizationService initialized with ${this.authorizationStates.size} default states`);
    }

    get onDidUpdateAuthorizationStatus() {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        console.log(`[AUTH-SERVICE] 🔍 Getting authorization status for: ${pluginId}`);
        
        const status = this.authorizationStates.get(pluginId) ?? AuthorizationStatus.GRANTED;
        
        console.log(`[AUTH-SERVICE] 📊 Status for ${pluginId}: ${status}`);
        return status;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-SERVICE] ✅ Granting authorization for: ${pluginId}`);
        
        const previousStatus = this.authorizationStates.get(pluginId);
        const newStatus = AuthorizationStatus.GRANTED;
        
        // 总是更新状态和发送事件，确保所有监听者获得最新状态
        // 即使状态看起来相同，也可能有缓存不同步的情况
        console.log(`[AUTH-SERVICE] 🔄 Updating status from ${previousStatus} to ${newStatus} (forced sync)`);
        
        // Update state
        this.authorizationStates.set(pluginId, newStatus);
        
        // Fire event
        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: newStatus,
            previousStatus
        };
        
        console.log(`[AUTH-SERVICE] 🎉 Authorization granted for ${pluginId}, firing event...`);
        this._onDidUpdateAuthorizationStatus.fire(event);
        console.log(`[AUTH-SERVICE] 📡 Event fired successfully`);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-SERVICE] ❌ Revoking authorization for: ${pluginId}`);
        
        const previousStatus = this.authorizationStates.get(pluginId);
        const newStatus = AuthorizationStatus.DENIED;
        
        // 总是更新状态和发送事件，确保所有监听者获得最新状态
        // 即使状态看起来相同，也可能有缓存不同步的情况
        console.log(`[AUTH-SERVICE] 🔄 Updating status from ${previousStatus} to ${newStatus} (forced sync)`);
        
        // Update state
        this.authorizationStates.set(pluginId, newStatus);
        
        // Fire event
        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: newStatus,
            previousStatus
        };
        
        console.log(`[AUTH-SERVICE] 🚫 Authorization revoked for ${pluginId}, firing event...`);
        this._onDidUpdateAuthorizationStatus.fire(event);
        console.log(`[AUTH-SERVICE] 📡 Event fired successfully`);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        console.log(`[AUTH-SERVICE] 📋 Getting all authorization statuses (${this.authorizationStates.size} plugins)`);
        return new Map(this.authorizationStates);
    }

    /**
     * Initialize default authorization states for testing and development.
     * In a production system, this would load from persistent storage.
     */
    private initializeDefaultStates(): void {
        // Built-in plugins - always granted
        this.authorizationStates.set('vscode.typescript-language-features', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('vscode.json-language-features', AuthorizationStatus.GRANTED);
        
        // Demo plugins - granted by default
        this.authorizationStates.set('demo-plugin', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('theia-webview-test-plugin', AuthorizationStatus.GRANTED);
        
        // Test plugin - starts as denied for testing purposes
        this.authorizationStates.set('<unpublished>.test-plugin', AuthorizationStatus.DENIED);
        
        console.log(`[AUTH-SERVICE] 📝 Initialized default states:`, 
            Array.from(this.authorizationStates.entries()).map(([id, status]) => `${id}: ${status}`)
        );
    }

    /**
     * Development/testing helper methods
     */
    
    async resetToDefaults(): Promise<void> {
        console.log(`[AUTH-SERVICE] 🔄 Resetting all authorization states to defaults...`);
        this.authorizationStates.clear();
        this.initializeDefaultStates();
        
        // Fire events for all plugins that changed
        for (const [pluginId, status] of this.authorizationStates.entries()) {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId,
                status
            };
            this._onDidUpdateAuthorizationStatus.fire(event);
        }
        
        console.log(`[AUTH-SERVICE] ✨ Reset complete, events fired for all plugins`);
    }
}
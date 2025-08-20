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
import { Disposable } from '@theia/core/lib/common/disposable';
import * as theia from '@theia/plugin';
import { RPCProtocol } from '../common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT } from '../common/plugin-api-rpc';
import { AuthorizationExtImpl, AuthorizationChangeEvent as ExtAuthorizationChangeEvent } from './authorization-ext-impl';

export interface AuthorizationMain {
    $getAuthorizationStatus(pluginId: string): Promise<string>;
}

export class AuthorizationExt implements theia.Authorization {
    
    private readonly proxy: AuthorizationMain;
    private readonly pluginId: string;
    private readonly statusChangeEmitter: Emitter<theia.AuthorizationChangeEvent>;
    private readonly dependencyStatusChangeEmitter: Emitter<theia.DependencyAuthorizationChangeEvent>;
    private readonly toDispose = new Array<Disposable>();

    constructor(rpc: RPCProtocol, pluginId: string, authorizationExtImpl?: AuthorizationExtImpl) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.AUTHORIZATION_MAIN);
        this.pluginId = pluginId;
        
        // Create our own emitters for the plugin API
        this.statusChangeEmitter = new Emitter<theia.AuthorizationChangeEvent>();
        this.dependencyStatusChangeEmitter = new Emitter<theia.DependencyAuthorizationChangeEvent>();
        this.toDispose.push(this.statusChangeEmitter);
        this.toDispose.push(this.dependencyStatusChangeEmitter);
        
        // Register with the global authorization extension implementation if provided
        if (authorizationExtImpl) {
            authorizationExtImpl.registerPluginAuthorizationInstance(pluginId, this);
            this.toDispose.push({
                dispose: () => authorizationExtImpl.unregisterPluginAuthorizationInstance(pluginId)
            });
        }
    }

    async getStatus(): Promise<theia.AuthorizationStatus> {
        try {
            const status = await this.proxy.$getAuthorizationStatus(this.pluginId);
            return status === 'granted' ? theia.AuthorizationStatus.Granted : theia.AuthorizationStatus.Denied;
        } catch (error) {
            console.warn(`Failed to get authorization status for plugin ${this.pluginId}:`, error);
            return theia.AuthorizationStatus.Denied;
        }
    }

    get onDidChangeStatus(): Event<theia.AuthorizationChangeEvent> {
        return this.statusChangeEmitter.event;
    }

    async getDependencyStatus(dependencyId: string): Promise<theia.AuthorizationStatus> {
        try {
            // TODO: 实现依赖状态检查的RPC调用
            console.warn(`[AuthorizationExt] getDependencyStatus not yet implemented for dependency: ${dependencyId}`);
            return theia.AuthorizationStatus.Granted; // 暂时默认为已授权
        } catch (error) {
            console.warn(`Failed to get dependency authorization status for ${dependencyId}:`, error);
            return theia.AuthorizationStatus.Denied;
        }
    }

    get onDependencyStatusChange(): Event<theia.DependencyAuthorizationChangeEvent> {
        return this.dependencyStatusChangeEmitter.event;
    }

    /**
     * Handle authorization status change from the main process via the extension implementation
     */
    $handleAuthorizationStatusChange(event: ExtAuthorizationChangeEvent): void {
        console.log(`[AuthorizationExt] 📡 Received authorization change for ${this.pluginId}:`, event);
        
        const theiaEvent: theia.AuthorizationChangeEvent = {
            status: event.status === 'granted' ? theia.AuthorizationStatus.Granted : theia.AuthorizationStatus.Denied,
            previousStatus: event.previousStatus === 'granted' ? theia.AuthorizationStatus.Granted : theia.AuthorizationStatus.Denied,
            timestamp: new Date(event.timestamp)
        };

        this.statusChangeEmitter.fire(theiaEvent);
    }

    dispose(): void {
        this.toDispose.forEach(disposable => disposable.dispose());
        this.toDispose.length = 0;
    }
}
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

import { AuthorizationExt } from '../common/plugin-api-rpc';

export interface AuthorizationChangeEvent {
    status: string;
    previousStatus: string;
    timestamp: Date;
}

export class AuthorizationExtImpl implements AuthorizationExt {
    
    private readonly pluginAuthorizationInstances = new Map<string, { $handleAuthorizationStatusChange: (event: AuthorizationChangeEvent) => void }>();

    $handleAuthorizationStatusChange(pluginId: string, event: AuthorizationChangeEvent): void {
        console.log(`[AuthorizationExtImpl] 📡 Forwarding authorization change for ${pluginId}:`, event);
        
        const pluginInstance = this.pluginAuthorizationInstances.get(pluginId);
        if (pluginInstance) {
            pluginInstance.$handleAuthorizationStatusChange(event);
        } else {
            console.warn(`[AuthorizationExtImpl] No authorization instance found for plugin: ${pluginId}`);
        }
    }

    registerPluginAuthorizationInstance(pluginId: string, instance: { $handleAuthorizationStatusChange: (event: AuthorizationChangeEvent) => void }): void {
        this.pluginAuthorizationInstances.set(pluginId, instance);
        console.log(`[AuthorizationExtImpl] 📝 Registered authorization instance for plugin: ${pluginId}`);
    }

    unregisterPluginAuthorizationInstance(pluginId: string): void {
        this.pluginAuthorizationInstances.delete(pluginId);
        console.log(`[AuthorizationExtImpl] 🗑️ Unregistered authorization instance for plugin: ${pluginId}`);
    }
}
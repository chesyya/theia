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

import { Event } from '@theia/core/lib/common/event';
import { PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent, PluginAuthorizationChangeEvent } from './types';

/**
 * Provider interface for plugin authorization.
 * This is used by the plugin system to check authorization status.
 */
export interface PluginAuthorizationProvider {
    /**
     * Event emitted when authorization status changes (legacy)
     */
    readonly onAuthorizationChanged: Event<PluginAuthorizationChangeEvent>;

    /**
     * Event emitted when authorization status changes (new)
     */
    readonly onDidUpdateAuthorizationStatus: Event<IAuthorizationStatusChangeEvent>;

    /**
     * Check if a plugin is authorized
     */
    isAuthorized(pluginId: PluginIdentifier): Promise<boolean>;

    /**
     * Get the authorization status for a plugin
     */
    getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus>;

    /**
     * Grant authorization for a plugin
     */
    grantAuthorization(pluginId: PluginIdentifier): Promise<void>;

    /**
     * Revoke authorization for a plugin
     */
    revokeAuthorization(pluginId: PluginIdentifier): Promise<void>;

    /**
     * Get all authorized plugin IDs (legacy method from reference code)
     */
    getAuthorizedPluginIds(): Promise<string[]>;

    /**
     * Get all unauthorized plugin IDs (legacy method from reference code)
     */
    getUnauthorizedPluginIds(): Promise<string[]>;
}

export const PluginAuthorizationProvider = Symbol('PluginAuthorizationProvider');
export const pluginAuthorizationPath = '/services/plugin-authorization-provider';
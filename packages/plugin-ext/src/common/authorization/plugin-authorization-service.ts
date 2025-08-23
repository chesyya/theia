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
 * The legacy plugin authorization service interface.
 * This is kept for backward compatibility with existing code.
 */
export interface PluginAuthorizationService {
    /**
     * Event emitted when authorization status changes (new)
     */
    readonly onDidUpdateAuthorizationStatus: Event<IAuthorizationStatusChangeEvent>;

    /**
     * Event emitted when authorization status changes (legacy)
     */
    readonly onAuthorizationChanged: Event<PluginAuthorizationChangeEvent>;

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
     * Get all authorization statuses
     */
    getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>>;

    /**
     * Legacy methods for backward compatibility
     */
    getUnauthorizedPluginIds(): Promise<string[]>;
    getAuthorizedPluginIds(): Promise<string[]>;
}

export const PluginAuthorizationService = Symbol('PluginAuthorizationService');
export const pluginAuthorizationServicePath = '/services/plugin-authorization';
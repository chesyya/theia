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
import { PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from './types';

/**
 * The core service for managing plugin authorizations.
 * This is the single source of truth for the entire application.
 * 
 * Implementation Note:
 * - The backend implementation manages the actual state
 * - Frontend proxies delegate calls via RPC
 * - All consumers should listen to `onDidUpdateAuthorizationStatus` events
 *   instead of polling or having their own update methods
 */
export interface IAuthorizationService {
    /**
     * An event that fires whenever a plugin's authorization status changes.
     * Components should listen to this event to update their state, rather
     * than implementing custom update methods like `updateAuthorizationStatus`.
     * 
     * This is the single mechanism for authorization state propagation.
     */
    readonly onDidUpdateAuthorizationStatus: Event<IAuthorizationStatusChangeEvent>;

    /**
     * Retrieves the current authorization status for a given plugin.
     * @param pluginId The identifier of the plugin.
     * @returns A promise that resolves to the current status.
     */
    getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus>;

    /**
     * Grants authorization for a plugin.
     * This is a command that modifies state and triggers events.
     * @param pluginId The identifier of the plugin to authorize.
     * @returns A promise that resolves when the authorization process is complete.
     */
    grantAuthorization(pluginId: PluginIdentifier): Promise<void>;

    /**
     * Revokes authorization for a plugin.
     * This is a command that modifies state and triggers events.
     * @param pluginId The identifier of the plugin to revoke.
     * @returns A promise that resolves when the revocation is complete.
     */
    revokeAuthorization(pluginId: PluginIdentifier): Promise<void>;

    /**
     * Retrieves authorization statuses for all known plugins.
     * @returns A promise that resolves to a map of plugin IDs to their statuses.
     */
    getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>>;
}

/**
 * RPC interface for authorization service.
 * This mirrors IAuthorizationService but with $ prefixes to indicate RPC methods.
 */
export interface IAuthorizationRPC {
    $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus>;
    $grantAuthorization(pluginId: PluginIdentifier): Promise<void>;
    $revokeAuthorization(pluginId: PluginIdentifier): Promise<void>;
    $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>>;
}

/**
 * Client interface for receiving authorization events from the backend.
 * This is used by the RPC mechanism to push events to the frontend.
 */
export interface IAuthorizationClient {
    /**
     * Called by the backend when an authorization status changes.
     * This method is invoked via RPC to notify the frontend about state changes.
     */
    $onDidUpdateAuthorizationStatus(event: IAuthorizationStatusChangeEvent): void;
}

/**
 * Service identifiers for dependency injection
 */
export const IAuthorizationService = Symbol('IAuthorizationService');
export const authorizationServicePath = '/services/authorization';
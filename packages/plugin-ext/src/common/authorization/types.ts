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

/**
 * Unique identifier for a plugin.
 * Uses the standard format: '<publisher>.<name>' for unpublished plugins
 * or just '<name>' for published/built-in plugins.
 */
export type PluginIdentifier = string;

/**
 * Represents the authorization status of a plugin.
 */
export enum AuthorizationStatus {
    /**
     * The user has not yet made a decision.
     */
    PENDING = 'pending',
    /**
     * The user has granted authorization.
     */
    GRANTED = 'granted',
    /**
     * The user has denied authorization.
     */
    DENIED = 'denied'
}

/**
 * Event fired when a plugin's authorization status changes.
 */
export interface IAuthorizationStatusChangeEvent {
    readonly pluginId: PluginIdentifier;
    readonly status: AuthorizationStatus;
    readonly previousStatus?: AuthorizationStatus;
    readonly timestamp: Date;
}

/**
 * Legacy event interface for backward compatibility
 */
export interface PluginAuthorizationChangeEvent {
    readonly pluginId: string;
    readonly authorized: boolean;
    readonly status?: string;
    readonly previousStatus?: string;
}

/**
 * Plugin dependency authorization configuration.
 * Used in package.json to declare authorization dependencies.
 */
export interface PluginAuthorizationDependencyConfig {
    /**
     * The plugin ID this plugin depends on for authorization.
     */
    readonly pluginId: PluginIdentifier;
    /**
     * Whether this dependency is required for the plugin to function.
     */
    readonly required: boolean;
    /**
     * Whether the plugin should degrade gracefully when the dependency is unauthorized.
     */
    readonly degradeGracefully: boolean;
}

/**
 * Authorization policy configuration for a plugin.
 * Used in package.json authorizationDependencyPolicy.
 */
export interface PluginAuthorizationPolicy {
    [dependencyId: string]: {
        required: boolean;
        degradeGracefully: boolean;
    };
}

/**
 * Statistics about the current authorization state.
 */
export interface AuthorizationStats {
    readonly totalPlugins: number;
    readonly authorizedPlugins: number;
    readonly deniedPlugins: number;
    readonly pendingPlugins: number;
    readonly dependencyRelations: number;
}

/**
 * Extended plugin metadata with authorization information.
 */
export interface PluginAuthorizationInfo {
    readonly pluginId: PluginIdentifier;
    readonly status: AuthorizationStatus;
    readonly dependencies: PluginIdentifier[];
    readonly dependents: PluginIdentifier[];
    readonly lastStatusChange?: Date;
}
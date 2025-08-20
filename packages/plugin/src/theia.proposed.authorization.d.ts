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

declare module '@theia/plugin' {

    /**
     * Represents the authorization status of a plugin.
     */
    export enum AuthorizationStatus {
        /**
         * The plugin is authorized to run.
         */
        Granted = 'granted',
        
        /**
         * The plugin is not authorized to run.
         */
        Denied = 'denied'
    }

    /**
     * An event describing an authorization status change.
     */
    export interface AuthorizationChangeEvent {
        /**
         * The current authorization status of the plugin.
         */
        readonly status: AuthorizationStatus;

        /**
         * The previous authorization status of the plugin.
         */
        readonly previousStatus: AuthorizationStatus;

        /**
         * The timestamp when the authorization status changed.
         */
        readonly timestamp: Date;
    }

    /**
     * An event describing dependency authorization status change.
     */
    export interface DependencyAuthorizationChangeEvent {
        /**
         * The ID of the dependency plugin whose authorization status changed.
         */
        readonly dependencyId: string;

        /**
         * The current authorization status of the dependency plugin.
         */
        readonly status: AuthorizationStatus;

        /**
         * The previous authorization status of the dependency plugin.
         */
        readonly previousStatus: AuthorizationStatus;

        /**
         * The timestamp when the authorization status changed.
         */
        readonly timestamp: Date;
    }

    /**
     * Authorization management interface for plugins.
     */
    export interface Authorization {
        /**
         * Get the current authorization status of this plugin.
         * @returns The current authorization status.
         */
        getStatus(): Thenable<AuthorizationStatus>;

        /**
         * Get the authorization status of a dependency plugin.
         * Only works for plugins declared in authorizationDependencies.
         * @param dependencyId The ID of the dependency plugin
         * @returns The authorization status of the dependency plugin
         */
        getDependencyStatus(dependencyId: string): Thenable<AuthorizationStatus>;

        /**
         * An event that is emitted when the authorization status of this plugin changes.
         * This allows the plugin to react to authorization changes, such as cleaning up
         * resources when authorization is revoked.
         * 
         * @example
         * ```typescript
         * context.authorization.onDidChangeStatus(event => {
         *   if (event.status === AuthorizationStatus.Denied) {
         *     // Clean up resources, save state, etc.
         *     console.log('Plugin authorization revoked, cleaning up...');
         *     // Perform cleanup logic
         *   } else if (event.status === AuthorizationStatus.Granted) {
         *     console.log('Plugin authorization restored');
         *     // Reinitialize if needed
         *   }
         * });
         * ```
         */
        readonly onDidChangeStatus: Event<AuthorizationChangeEvent>;

        /**
         * An event that is emitted when the authorization status of a dependency plugin changes.
         * Only emits events for plugins declared in authorizationDependencies in package.json.
         * This allows plugins to react to their dependencies' authorization changes.
         * 
         * @example
         * ```typescript
         * context.authorization.onDependencyStatusChange(event => {
         *   if (event.dependencyId === 'database-plugin' && event.status === AuthorizationStatus.Denied) {
         *     console.log('Database plugin lost authorization, switching to local mode...');
         *     this.switchToLocalMode();
         *   }
         * });
         * ```
         */
        readonly onDependencyStatusChange: Event<DependencyAuthorizationChangeEvent>;
    }

    export interface ExtensionContext {
        /**
         * Authorization management interface for this plugin.
         * Allows the plugin to monitor and react to authorization status changes.
         */
        readonly authorization: Authorization;
    }
}
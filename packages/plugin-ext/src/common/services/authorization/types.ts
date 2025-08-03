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
    DENIED = 'denied',
}

/**
 * Event fired when a plugin's authorization status changes.
 */
export interface IAuthorizationStatusChangeEvent {
    readonly pluginId: PluginIdentifier;
    readonly status: AuthorizationStatus;
    readonly previousStatus?: AuthorizationStatus;
}
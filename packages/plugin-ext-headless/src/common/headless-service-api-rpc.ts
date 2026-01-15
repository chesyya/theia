// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * Headless Service API - RPC Protocol Definitions
 *
 * This file defines the RPC interfaces for communication between
 * the headless plugin host (Ext) and the main application (Main).
 */

import { createProxyIdentifier } from '@theia/plugin-ext/lib/common/rpc-protocol';

/**
 * System information returned by the headless service.
 */
export interface SystemInfo {
    platform: string;
    nodeVersion: string;
    uptime: number;
    memoryUsage: {
        total: number;
        used: number;
        free: number;
    };
    cpuCount: number;
}

/**
 * Main-side interface (called by plugin host, implemented in main application).
 * Methods must start with '$' due to RPC conventions.
 */
export const HeadlessServiceMain = Symbol('HeadlessServiceMain');
export interface HeadlessServiceMain {
    /**
     * Get system information from the main process.
     */
    $getSystemInfo(): Promise<SystemInfo>;

    /**
     * Store a value in global state.
     */
    $setGlobalState(key: string, value: unknown): Promise<void>;

    /**
     * Retrieve a value from global state.
     */
    $getGlobalState(key: string): Promise<unknown>;

    /**
     * Log a message to the main process console.
     */
    $log(level: 'info' | 'warn' | 'error', message: string): Promise<void>;

    /**
     * Schedule a task to run after a delay.
     */
    $scheduleTask(taskId: string, delayMs: number): Promise<void>;

    /**
     * Cancel a scheduled task.
     */
    $cancelTask(taskId: string): Promise<boolean>;
}

/**
 * Ext-side interface (called by main application, implemented in plugin host).
 * Used for callbacks from main to plugin host.
 */
export const HeadlessServiceExt = Symbol('HeadlessServiceExt');
export interface HeadlessServiceExt {
    /**
     * Called when a scheduled task is triggered.
     */
    $onTaskTriggered(taskId: string): Promise<void>;

    /**
     * Called when global state changes.
     */
    $onGlobalStateChanged(key: string, value: unknown): Promise<void>;
}

/**
 * RPC context for plugin host to get proxy to main side.
 */
export const HEADLESS_SERVICE_PLUGIN_RPC_CONTEXT = {
    HEADLESS_SERVICE_MAIN: createProxyIdentifier<HeadlessServiceMain>('HeadlessServiceMain')
};

/**
 * RPC context for main side to get proxy to plugin host.
 */
export const HEADLESS_SERVICE_MAIN_RPC_CONTEXT = {
    HEADLESS_SERVICE_EXT: createProxyIdentifier<HeadlessServiceExt>('HeadlessServiceExt')
};

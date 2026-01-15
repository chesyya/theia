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
 * @theia/headless-service API Type Definitions
 *
 * This module provides APIs specifically designed for headless plugins.
 * Headless plugins run on the backend without a UI context and have
 * access to these specialized APIs.
 *
 * Usage in a headless plugin:
 * ```typescript
 * import * as headlessService from '@theia/headless-service';
 *
 * export async function activate() {
 *     const info = await headlessService.getSystemInfo();
 *     console.log('Running on:', info.platform);
 * }
 * ```
 */
declare module '@theia/headless-service' {

    /**
     * System information returned by getSystemInfo().
     */
    export interface SystemInfo {
        /** Operating system platform (e.g., 'linux', 'darwin', 'win32') */
        platform: string;
        /** Node.js version */
        nodeVersion: string;
        /** Process uptime in seconds */
        uptime: number;
        /** Memory usage information */
        memoryUsage: {
            /** Total system memory in bytes */
            total: number;
            /** Used memory in bytes */
            used: number;
            /** Free memory in bytes */
            free: number;
        };
        /** Number of CPU cores */
        cpuCount: number;
    }

    /**
     * Disposable interface for event listeners.
     */
    export interface Disposable {
        dispose(): void;
    }

    /**
     * Event for global state changes.
     */
    export interface GlobalStateChangeEvent {
        key: string;
        value: unknown;
    }

    /**
     * Get system information from the main process.
     *
     * @returns Promise resolving to system information
     *
     * @example
     * ```typescript
     * const info = await headlessService.getSystemInfo();
     * console.log(`Platform: ${info.platform}`);
     * console.log(`Node: ${info.nodeVersion}`);
     * console.log(`CPUs: ${info.cpuCount}`);
     * console.log(`Memory: ${info.memoryUsage.used} / ${info.memoryUsage.total}`);
     * ```
     */
    export function getSystemInfo(): Promise<SystemInfo>;

    /**
     * Set a value in global state.
     * The global state is shared across all headless plugins.
     *
     * @param key The state key
     * @param value The value to store (must be JSON-serializable)
     *
     * @example
     * ```typescript
     * await headlessService.setGlobalState('counter', 42);
     * await headlessService.setGlobalState('config', { debug: true });
     * ```
     */
    export function setGlobalState(key: string, value: unknown): Promise<void>;

    /**
     * Get a value from global state.
     *
     * @param key The state key
     * @returns Promise resolving to the stored value, or undefined if not found
     *
     * @example
     * ```typescript
     * const counter = await headlessService.getGlobalState<number>('counter');
     * const config = await headlessService.getGlobalState<{ debug: boolean }>('config');
     * ```
     */
    export function getGlobalState<T = unknown>(key: string): Promise<T | undefined>;

    /**
     * Log a message via the main process logger.
     * This ensures messages appear in the main Theia log output.
     *
     * @param level Log level ('info', 'warn', or 'error')
     * @param message The message to log
     *
     * @example
     * ```typescript
     * await headlessService.log('info', 'Plugin started');
     * await headlessService.log('warn', 'Resource running low');
     * await headlessService.log('error', 'Failed to connect');
     * ```
     */
    export function log(level: 'info' | 'warn' | 'error', message: string): Promise<void>;

    /**
     * Schedule a task to run after a delay.
     *
     * @param taskId Unique identifier for the task
     * @param delayMs Delay in milliseconds before the task triggers
     * @param callback Optional callback function to execute when task triggers
     *
     * @example
     * ```typescript
     * // Schedule a task with inline callback
     * await headlessService.scheduleTask('cleanup', 60000, async () => {
     *     console.log('Running cleanup...');
     * });
     *
     * // Schedule a task and listen for it separately
     * await headlessService.scheduleTask('refresh', 30000);
     * headlessService.onTaskTriggered((taskId) => {
     *     if (taskId === 'refresh') {
     *         console.log('Refreshing data...');
     *     }
     * });
     * ```
     */
    export function scheduleTask(
        taskId: string,
        delayMs: number,
        callback?: () => void | Promise<void>
    ): Promise<void>;

    /**
     * Cancel a scheduled task.
     *
     * @param taskId The task identifier to cancel
     * @returns Promise resolving to true if task was found and cancelled
     *
     * @example
     * ```typescript
     * const cancelled = await headlessService.cancelTask('cleanup');
     * if (cancelled) {
     *     console.log('Task cancelled');
     * }
     * ```
     */
    export function cancelTask(taskId: string): Promise<boolean>;

    /**
     * Register a listener for when a scheduled task is triggered.
     *
     * @param listener Callback function receiving the task ID
     * @returns Disposable to remove the listener
     *
     * @example
     * ```typescript
     * const disposable = headlessService.onTaskTriggered((taskId) => {
     *     console.log(`Task triggered: ${taskId}`);
     * });
     *
     * // Later, to stop listening:
     * disposable.dispose();
     * ```
     */
    export function onTaskTriggered(listener: (taskId: string) => void): Disposable;

    /**
     * Register a listener for global state changes.
     *
     * @param listener Callback function receiving the change event
     * @returns Disposable to remove the listener
     *
     * @example
     * ```typescript
     * const disposable = headlessService.onGlobalStateChanged((event) => {
     *     console.log(`State changed: ${event.key} = ${JSON.stringify(event.value)}`);
     * });
     * ```
     */
    export function onGlobalStateChanged(
        listener: (event: GlobalStateChangeEvent) => void
    ): Disposable;
}

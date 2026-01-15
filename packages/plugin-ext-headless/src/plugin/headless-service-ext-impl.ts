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
 * Headless Service API - Plugin Host (Ext) Side Implementation
 *
 * This implementation runs in the headless plugin host process.
 * It provides the API that plugins can import and use.
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import {
    HeadlessServiceMain,
    HeadlessServiceExt,
    SystemInfo,
    HEADLESS_SERVICE_PLUGIN_RPC_CONTEXT
} from '../common/headless-service-api-rpc';

/**
 * Task callback type
 */
export type TaskCallback = () => void | Promise<void>;

/**
 * Ext-side implementation that handles callbacks from main side
 * and provides the API for plugins.
 */
@injectable()
export class HeadlessServiceExtImpl implements HeadlessServiceExt {

    private proxy: HeadlessServiceMain;

    // Event emitters for callbacks
    private readonly onTaskTriggeredEmitter = new Emitter<string>();
    private readonly onGlobalStateChangedEmitter = new Emitter<{ key: string; value: unknown }>();

    // Task callbacks registered by plugins
    private readonly taskCallbacks = new Map<string, TaskCallback>();

    constructor(@inject(RPCProtocol) rpc: RPCProtocol) {
        // Get proxy to call main side
        this.proxy = rpc.getProxy(HEADLESS_SERVICE_PLUGIN_RPC_CONTEXT.HEADLESS_SERVICE_MAIN);
    }

    // ========== Ext interface methods (called by main side) ==========

    async $onTaskTriggered(taskId: string): Promise<void> {
        this.onTaskTriggeredEmitter.fire(taskId);

        // Execute registered callback
        const callback = this.taskCallbacks.get(taskId);
        if (callback) {
            try {
                await callback();
            } catch (error) {
                console.error(`[HeadlessService] Task callback error for ${taskId}:`, error);
            }
        }
    }

    async $onGlobalStateChanged(key: string, value: unknown): Promise<void> {
        this.onGlobalStateChangedEmitter.fire({ key, value });
    }

    // ========== Public API for plugins ==========

    /**
     * Get system information.
     */
    getSystemInfo(): Promise<SystemInfo> {
        return this.proxy.$getSystemInfo();
    }

    /**
     * Set a value in global state.
     */
    setGlobalState(key: string, value: unknown): Promise<void> {
        return this.proxy.$setGlobalState(key, value);
    }

    /**
     * Get a value from global state.
     */
    getGlobalState<T = unknown>(key: string): Promise<T | undefined> {
        return this.proxy.$getGlobalState(key) as Promise<T | undefined>;
    }

    /**
     * Log a message via the main process.
     */
    log(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
        return this.proxy.$log(level, message);
    }

    /**
     * Schedule a task to run after a delay.
     * @param taskId Unique identifier for the task
     * @param delayMs Delay in milliseconds
     * @param callback Optional callback to execute when task triggers
     */
    scheduleTask(taskId: string, delayMs: number, callback?: TaskCallback): Promise<void> {
        if (callback) {
            this.taskCallbacks.set(taskId, callback);
        }
        return this.proxy.$scheduleTask(taskId, delayMs);
    }

    /**
     * Cancel a scheduled task.
     */
    cancelTask(taskId: string): Promise<boolean> {
        this.taskCallbacks.delete(taskId);
        return this.proxy.$cancelTask(taskId);
    }

    /**
     * Event fired when a task is triggered.
     */
    get onTaskTriggered(): Event<string> {
        return this.onTaskTriggeredEmitter.event;
    }

    /**
     * Event fired when global state changes.
     */
    get onGlobalStateChanged(): Event<{ key: string; value: unknown }> {
        return this.onGlobalStateChangedEmitter.event;
    }
}

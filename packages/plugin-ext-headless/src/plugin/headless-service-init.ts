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
 * Headless Service API - Plugin Host Initialization
 *
 * This file is loaded by the headless plugin host to initialize the
 * @theia/headless-service API. It exports:
 * - containerModule: IoC bindings for the API implementation
 * - The API is automatically registered to intercept imports of '@theia/headless-service'
 */

import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { Plugin } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { PluginContainerModule } from '@theia/plugin-ext/lib/plugin/node/plugin-container-module';
import { HeadlessServiceExtImpl } from './headless-service-ext-impl';
import { HeadlessServiceExt, HEADLESS_SERVICE_MAIN_RPC_CONTEXT } from '../common/headless-service-api-rpc';

/**
 * The API namespace that plugins will import.
 * Usage in plugins:
 *   import * as headlessService from '@theia/headless-service';
 *   const info = await headlessService.getSystemInfo();
 */
export interface HeadlessServiceAPI {
    /**
     * Get system information from the main process.
     */
    getSystemInfo(): Promise<{
        platform: string;
        nodeVersion: string;
        uptime: number;
        memoryUsage: {
            total: number;
            used: number;
            free: number;
        };
        cpuCount: number;
    }>;

    /**
     * Set a value in global state (shared across all headless plugins).
     */
    setGlobalState(key: string, value: unknown): Promise<void>;

    /**
     * Get a value from global state.
     */
    getGlobalState<T = unknown>(key: string): Promise<T | undefined>;

    /**
     * Log a message via the main process logger.
     */
    log(level: 'info' | 'warn' | 'error', message: string): Promise<void>;

    /**
     * Schedule a task to run after a delay.
     */
    scheduleTask(taskId: string, delayMs: number, callback?: () => void | Promise<void>): Promise<void>;

    /**
     * Cancel a scheduled task.
     */
    cancelTask(taskId: string): Promise<boolean>;

    /**
     * Event listener for when a task is triggered.
     */
    onTaskTriggered(listener: (taskId: string) => void): { dispose(): void };

    /**
     * Event listener for global state changes.
     */
    onGlobalStateChanged(listener: (event: { key: string; value: unknown }) => void): { dispose(): void };
}

// Symbol for the API factory
const HeadlessServiceApiFactory = Symbol('HeadlessServiceApiFactory');

/**
 * Factory class that creates the API object for each plugin.
 */
@injectable()
class HeadlessServiceApiFactoryImpl {
    @inject(RPCProtocol)
    protected readonly rpc: RPCProtocol;

    @inject(HeadlessServiceExtImpl)
    protected readonly serviceExt: HeadlessServiceExtImpl;

    @postConstruct()
    initialize(): void {
        // Register the Ext implementation with RPC so main side can call back
        this.rpc.set(HEADLESS_SERVICE_MAIN_RPC_CONTEXT.HEADLESS_SERVICE_EXT, this.serviceExt);
    }

    /**
     * Create the API object for a plugin.
     * This method is called by the plugin container module.
     */
    createApi(plugin: Plugin): HeadlessServiceAPI {
        const ext = this.serviceExt;

        return {
            getSystemInfo: () => ext.getSystemInfo(),
            setGlobalState: (key, value) => ext.setGlobalState(key, value),
            getGlobalState: <T>(key: string) => ext.getGlobalState<T>(key),
            log: (level, message) => ext.log(level, message),
            scheduleTask: (taskId, delayMs, callback) => ext.scheduleTask(taskId, delayMs, callback),
            cancelTask: (taskId) => ext.cancelTask(taskId),
            onTaskTriggered: (listener) => ext.onTaskTriggered(listener),
            onGlobalStateChanged: (listener) => ext.onGlobalStateChanged(listener)
        };
    }
}

/**
 * Container module that configures the IoC container for the Headless Service API.
 * This is loaded by the plugin host when initializing the API.
 */
export const containerModule = PluginContainerModule.create(({ bind, bindApiFactory }) => {
    // Bind the Ext implementation
    bind(HeadlessServiceExtImpl).toSelf().inSingletonScope();
    bind(HeadlessServiceExt).toService(HeadlessServiceExtImpl);

    // Bind the API factory to the module name that plugins will import
    // When a plugin does: import * as headlessService from '@theia/headless-service'
    // The module loader will call our factory to create the API object
    bindApiFactory('@theia/headless-service', HeadlessServiceApiFactory, HeadlessServiceApiFactoryImpl);
});

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
 * Headless Service API - Main Side Implementation
 *
 * This implementation runs in the main Theia backend process.
 * It provides system information and global state management for headless plugins.
 */

import * as os from 'os';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import {
    HeadlessServiceMain,
    HeadlessServiceExt,
    SystemInfo,
    HEADLESS_SERVICE_MAIN_RPC_CONTEXT
} from '../../common/headless-service-api-rpc';

@injectable()
export class HeadlessServiceMainImpl implements HeadlessServiceMain {

    @inject(ILogger)
    protected readonly logger: ILogger;

    protected rpc: RPCProtocol;
    protected proxy: HeadlessServiceExt;

    // Global state storage (in production, use a proper storage backend)
    private readonly globalState = new Map<string, unknown>();

    // Scheduled tasks
    private readonly scheduledTasks = new Map<string, NodeJS.Timeout>();

    initialize(rpc: RPCProtocol): void {
        this.rpc = rpc;
        // Get proxy to call back to plugin host
        this.proxy = rpc.getProxy(HEADLESS_SERVICE_MAIN_RPC_CONTEXT.HEADLESS_SERVICE_EXT);
        this.logger.info('[HeadlessServiceMain] Initialized');
    }

    async $getSystemInfo(): Promise<SystemInfo> {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        return {
            platform: os.platform(),
            nodeVersion: process.version,
            uptime: process.uptime(),
            memoryUsage: {
                total: totalMem,
                used: totalMem - freeMem,
                free: freeMem
            },
            cpuCount: os.cpus().length
        };
    }

    async $setGlobalState(key: string, value: unknown): Promise<void> {
        const oldValue = this.globalState.get(key);
        this.globalState.set(key, value);
        this.logger.info(`[HeadlessServiceMain] Global state set: ${key}`);

        // Notify plugin host about the change
        if (this.proxy && oldValue !== value) {
            this.proxy.$onGlobalStateChanged(key, value);
        }
    }

    async $getGlobalState(key: string): Promise<unknown> {
        return this.globalState.get(key);
    }

    async $log(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
        const formattedMessage = `[HeadlessPlugin] ${message}`;
        switch (level) {
            case 'info':
                this.logger.info(formattedMessage);
                break;
            case 'warn':
                this.logger.warn(formattedMessage);
                break;
            case 'error':
                this.logger.error(formattedMessage);
                break;
        }
    }

    async $scheduleTask(taskId: string, delayMs: number): Promise<void> {
        // Cancel existing task with same ID
        await this.$cancelTask(taskId);

        const timeout = setTimeout(async () => {
            this.scheduledTasks.delete(taskId);
            if (this.proxy) {
                await this.proxy.$onTaskTriggered(taskId);
            }
        }, delayMs);

        this.scheduledTasks.set(taskId, timeout);
        this.logger.info(`[HeadlessServiceMain] Task scheduled: ${taskId} (delay: ${delayMs}ms)`);
    }

    async $cancelTask(taskId: string): Promise<boolean> {
        const timeout = this.scheduledTasks.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.scheduledTasks.delete(taskId);
            this.logger.info(`[HeadlessServiceMain] Task cancelled: ${taskId}`);
            return true;
        }
        return false;
    }

    dispose(): void {
        // Clean up all scheduled tasks
        for (const timeout of this.scheduledTasks.values()) {
            clearTimeout(timeout);
        }
        this.scheduledTasks.clear();
        this.globalState.clear();
    }
}

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

import { injectable, inject, postConstruct, optional } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { PluginServer, PluginIdentifiers } from '../../common/plugin-protocol';
import { PluginAuthorizationProvider } from '../../common/plugin-authorization';
import { HostedPluginWatcher } from '../../hosted/browser/hosted-plugin-watcher';
import { ILogger } from '@theia/core/lib/common/logger';

/**
 * 授权强制执行服务
 * 负责协调插件授权状态和enable/disable状态
 */
@injectable()
export class AuthorizationEnforcementService implements BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(PluginServer)
    protected readonly pluginServer: PluginServer;

    @inject(PluginAuthorizationProvider)
    protected readonly authorizationProvider: PluginAuthorizationProvider;

    @inject(HostedPluginWatcher) @optional()
    protected readonly pluginWatcher?: HostedPluginWatcher;

    @postConstruct()
    protected init(): void {
        // 监听插件部署事件（仅在hosted plugin环境中可用）
        if (this.pluginWatcher) {
            this.pluginWatcher.onDidDeploy(() => {
                this.onPluginDeployed();
            });
        } else {
            this.logger.warn('[AUTH-ENFORCEMENT] HostedPluginWatcher not available, skipping deployment monitoring');
        }

        // 监听授权状态变更事件
        this.authorizationProvider.onAuthorizationChanged(event => {
            this.onAuthorizationChanged(event);
        });

        this.logger.info('[AUTH-ENFORCEMENT] Authorization enforcement service initialized');
    }

    async onStart(): Promise<void> {
        this.logger.info('[AUTH-ENFORCEMENT] Starting authorization enforcement...');
        
        // 在应用启动时同步所有插件的授权状态
        await this.synchronizeAllPlugins();
        
        this.logger.info('[AUTH-ENFORCEMENT] Authorization enforcement service started');
    }

    /**
     * 同步所有已安装插件的授权状态
     */
    private async synchronizeAllPlugins(): Promise<void> {
        try {
            const [deployedIds, disabledIds] = await Promise.all([
                this.pluginServer.getInstalledPlugins(),
                this.pluginServer.getDisabledPlugins()
            ]);

            const allPluginIds = new Set([...deployedIds, ...disabledIds]);
            this.logger.info(`[AUTH-ENFORCEMENT] Synchronizing ${allPluginIds.size} plugins`);

            const syncOperations = Array.from(allPluginIds).map(async (versionedId) => {
                const unversionedId = PluginIdentifiers.unversionedFromVersioned(versionedId);
                const isAuthorized = await this.authorizationProvider.$isAuthorized(unversionedId);
                const isEnabled = !disabledIds.includes(versionedId);

                this.logger.debug(`[AUTH-ENFORCEMENT] Plugin ${unversionedId}: authorized=${isAuthorized}, enabled=${isEnabled}`);

                if (isAuthorized && !isEnabled) {
                    // 已授权但被禁用 -> 启用
                    this.logger.info(`[AUTH-ENFORCEMENT] Enabling authorized plugin: ${unversionedId}`);
                    return this.pluginServer.enablePlugin(versionedId);
                } else if (!isAuthorized && isEnabled) {
                    // 未授权但已启用 -> 禁用
                    this.logger.info(`[AUTH-ENFORCEMENT] Disabling unauthorized plugin: ${unversionedId}`);
                    return this.pluginServer.disablePlugin(versionedId);
                }
                
                return Promise.resolve();
            });

            // 使用 allSettled 来防止单个失败影响其他操作
            const results = await Promise.allSettled(syncOperations);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    this.logger.error(`[AUTH-ENFORCEMENT] Failed to synchronize plugin at index ${index}:`, result.reason);
                }
            });

            this.logger.info('[AUTH-ENFORCEMENT] Plugin synchronization completed');
        } catch (error) {
            this.logger.error('[AUTH-ENFORCEMENT] Failed to synchronize plugins:', error);
        }
    }

    /**
     * 处理插件部署事件
     */
    private async onPluginDeployed(): Promise<void> {
        this.logger.info('[AUTH-ENFORCEMENT] Plugin deployed, checking authorization...');
        
        // 简单的方式：重新同步所有插件
        // 在生产环境中，可能需要更精确地处理新部署的插件
        setTimeout(() => {
            this.synchronizeAllPlugins();
        }, 1000); // 延迟执行，确保插件完全部署
    }

    /**
     * 处理授权状态变更事件
     */
    private async onAuthorizationChanged(event: import('../../common/plugin-authorization').PluginAuthorizationChangeEvent): Promise<void> {
        const { changedPluginIds, changeType } = event;
        
        this.logger.info(`[AUTH-ENFORCEMENT] Authorization ${changeType} for plugins:`, changedPluginIds);

        for (const pluginId of changedPluginIds) {
            try {
                // 找到对应的versioned plugin ID
                const deployedIds = await this.pluginServer.getInstalledPlugins();
                const versionedId = deployedIds.find(id => 
                    PluginIdentifiers.unversionedFromVersioned(id) === pluginId
                );

                if (!versionedId) {
                    this.logger.warn(`[AUTH-ENFORCEMENT] Plugin ${pluginId} not found in deployed plugins`);
                    continue;
                }

                if (changeType === 'granted') {
                    // 授权被授予 -> 启用插件
                    this.logger.info(`[AUTH-ENFORCEMENT] Enabling plugin ${pluginId} after authorization grant`);
                    await this.pluginServer.enablePlugin(versionedId);
                } else if (changeType === 'revoked') {
                    // 授权被撤销 -> 禁用插件
                    this.logger.info(`[AUTH-ENFORCEMENT] Disabling plugin ${pluginId} after authorization revocation`);
                    await this.pluginServer.disablePlugin(versionedId);
                }

                this.logger.info(`[AUTH-ENFORCEMENT] Successfully processed authorization ${changeType} for ${pluginId}`);
            } catch (error) {
                this.logger.error(`[AUTH-ENFORCEMENT] Failed to process authorization ${changeType} for plugin ${pluginId}:`, error);
            }
        }
    }
}
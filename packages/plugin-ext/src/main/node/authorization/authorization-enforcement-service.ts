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
import { PluginServer, PluginIdentifiers } from '../../../common/plugin-protocol';
import { PluginAuthorizationProvider } from '../../../common/services/authorization/plugin-authorization';
import { HostedPluginWatcher } from '../../../hosted/browser/hosted-plugin-watcher';
import { ILogger } from '@theia/core/lib/common/logger';

/**
 * 授权强制执行服务
 * 负责协调插件授权状态和 enable/disable 状态
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
        // 监听插件部署事件（仅在 hosted plugin 环境中可用）
        if (this.pluginWatcher) {
            this.pluginWatcher.onDidDeploy(() => {
                this.onPluginDeployed();
            });
        } else {
            this.logger.warn('[PLUGIN] ⚠️ HostedPluginWatcher 不可用，跳过插件部署监控');
        }

        // 监听授权状态变更事件
        this.authorizationProvider.onAuthorizationChanged(event => {
            this.onAuthorizationChanged(event);
        });

        this.logger.info('[PLUGIN] ℹ️ 授权强制服务初始化完成');
    }

    async onStart(): Promise<void> {
        this.logger.info('[PLUGIN] ℹ️ 启动授权强制服务...');

        // 在应用启动时同步所有插件的授权状态
        await this.synchronizeAllPlugins();

        this.logger.info('[PLUGIN] ℹ️ 授权强制服务已启动');
    }

    /**
     * 同步所有已安装插件的授权状态
     */
    private async synchronizeAllPlugins(): Promise<void> {
        try {
            // TODO: Replace with actual plugin management service calls
            const deployedIds: string[] = [];
            const disabledIds: string[] = [];

            const allPluginIds = new Set([...deployedIds, ...disabledIds]);
            this.logger.info(`[PLUGIN] ℹ️ 同步插件状态，共 ${allPluginIds.size} 个插件`);

            const syncOperations = Array.from(allPluginIds).map(async (versionedId) => {
                const unversionedId = PluginIdentifiers.unversionedFromVersioned(versionedId as PluginIdentifiers.VersionedId);
                const isAuthorized = await this.authorizationProvider.isAuthorized(unversionedId);
                const isEnabled = !disabledIds.includes(versionedId);

                this.logger.info(`[PLUGIN] ℹ️ 插件 ${unversionedId}: 授权=${isAuthorized}, 启用=${isEnabled}`);

                if (isAuthorized && !isEnabled) {
                    // 已授权但被禁用 -> 启用
                    this.logger.info(`[PLUGIN] ℹ️ 启用已授权插件: ${unversionedId}`);
                    // TODO: Call actual plugin enable method
                } else if (!isAuthorized && isEnabled) {
                    // 未授权但已启用 -> 禁用
                    this.logger.info(`[PLUGIN] ℹ️ 禁用未授权插件: ${unversionedId}`);
                    // TODO: Call actual plugin disable method
                }

                return Promise.resolve();
            });

            const results = await Promise.allSettled(syncOperations);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    this.logger.error(`[PLUGIN] ❌ 同步插件失败，索引 ${index}:`, result.reason);
                }
            });

            this.logger.info('[PLUGIN] ℹ️ 插件状态同步完成');
        } catch (error) {
            this.logger.error('[PLUGIN] ❌ 同步插件状态失败:', error);
        }
    }

    /**
     * 处理插件部署事件
     */
    private async onPluginDeployed(): Promise<void> {
        this.logger.info('[PLUGIN] ℹ️ 插件已部署，检查授权状态...');

        // 简单方式：重新同步所有插件
        setTimeout(() => {
            this.synchronizeAllPlugins();
        }, 1000); // 延迟执行，确保插件完全部署
    }

    /**
     * 处理授权状态变更事件
     */
    private async onAuthorizationChanged(event: any): Promise<void> {
        const { pluginId, status } = event;

        this.logger.info(`[PLUGIN] ℹ️ 授权状态变更 (${status}) 插件: ${pluginId}`);

        try {
            // TODO: Replace with actual plugin management service calls
            const deployedIds: string[] = [];
            const versionedId = deployedIds.find(id =>
                PluginIdentifiers.unversionedFromVersioned(id as PluginIdentifiers.VersionedId) === pluginId
            );

            if (!versionedId) {
                this.logger.warn(`[PLUGIN] ⚠️ 插件 ${pluginId} 未在已部署插件中找到`);
                return;
            }

            if (status === 'granted') {
                this.logger.info(`[PLUGIN] ℹ️ 授权已授予，重新加载插件贡献点 ${pluginId}`);
                // TODO: Call actual plugin enable method
            } else if (status === 'denied') {
                this.logger.info(`[PLUGIN] ℹ️ 授权已撤销，禁用插件 ${pluginId}`);
                // TODO: Call actual plugin disable method
            }

            this.logger.info(`[PLUGIN] ℹ️ 成功处理插件 ${pluginId} 的授权变更 (${status})`);
        } catch (error) {
            this.logger.error(`[PLUGIN] ❌ 处理插件 ${pluginId} 授权变更 (${status}) 失败:`, error);
        }
    }
}

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

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Event, Emitter } from '@theia/core/lib/common/event';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { PluginDeployer, PluginDeployerHandler, PluginIdentifiers } from '../../../common/plugin-protocol';
import { ILogger } from '@theia/core/lib/common/logger';
import { AuthorizationStatus, IAuthorizationClient, IAuthorizationService, IAuthorizationStatusChangeEvent, IAuthorizationRPC, PluginIdentifier } from '../../../common/authorization/i-authorization-service';

/**
 * 统一的后端插件授权服务管理器
 * 整合了授权服务、授权强制执行和插件状态管理的功能
 * 提供完整的后端插件授权解决方案
 */
@injectable()
export class PluginAuthorizationBackendManager implements IAuthorizationService, IAuthorizationRPC, BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployer;

    @inject(PluginDeployerHandler)
    protected readonly deployerHandler: PluginDeployerHandler;

    // 事件发射器
    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();

    // 插件授权状态存储
    private readonly authorizationStates = new Map<PluginIdentifier, AuthorizationStatus>();

    // 插件版本映射表
    private readonly pluginVersionMapping = new Map<PluginIdentifiers.UnversionedId, PluginIdentifiers.VersionedId>();

    // RPC客户端连接
    private client: IAuthorizationClient | undefined;





    @postConstruct()
    protected init(): void {
        this.logger.info('[PLUGIN] 初始化 PluginAuthorizationBackendManager...');
        this.initializeDefaultStates();

        // 监听自己的授权状态变更事件
        // this.onDidUpdateAuthorizationStatus(event => {
        //     this.handleAuthorizationChanged(event);
        // });

        this.logger.info(`[PLUGIN] PluginAuthorizationBackendManager 初始化完成，包含 ${this.authorizationStates.size} 个默认状态`);
    }

    // ========================= IAuthorizationService 接口实现 =========================

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        const status = this.authorizationStates.get(pluginId);
        if (status !== undefined) {
            this.logger.debug(`[PLUGIN] 查询插件 ${pluginId} 授权状态: ${status}`);
            return status;
        }

        // 特殊处理：test-plugin 默认为 GRANTED
        if (pluginId === 'test-plugin' || pluginId.startsWith('test-plugin@')) {
            return AuthorizationStatus.GRANTED;
        }

        // 默认为 GRANTED - 插件默认授权，除非显式拒绝
        const defaultStatus = AuthorizationStatus.GRANTED;
        this.logger.debug(`[PLUGIN] 查询插件 ${pluginId} 授权状态: ${defaultStatus} (默认)`);
        return defaultStatus;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = this.authorizationStates.get(pluginId);
        const newStatus = AuthorizationStatus.GRANTED;

        this.authorizationStates.set(pluginId, newStatus);

        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: newStatus,
            previousStatus
        };

        // 触发本地事件和RPC客户端通知
        this._onDidUpdateAuthorizationStatus.fire(event);
        this.notifyClient(event);
        
        this.logger.info(`[PLUGIN] 已授予插件授权: ${pluginId} (${previousStatus} -> ${newStatus})`);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = this.authorizationStates.get(pluginId);
        const newStatus = AuthorizationStatus.DENIED;

        this.authorizationStates.set(pluginId, newStatus);

        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: newStatus,
            previousStatus
        };

        // 触发本地事件和RPC客户端通知
        this._onDidUpdateAuthorizationStatus.fire(event);
        this.notifyClient(event);
        
        this.logger.info(`[PLUGIN] 已撤销插件授权: ${pluginId} (${previousStatus} -> ${newStatus})`);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        this.logger.debug(`[PLUGIN] 获取全部插件授权状态 (${this.authorizationStates.size} 个插件)`);
        return new Map(this.authorizationStates);
    }

    // ========================= BackendApplicationContribution 接口实现 =========================

    async onStart(): Promise<void> {
        this.logger.info('[PLUGIN] 启动插件授权后端管理器...');

        // 在应用启动时同步所有插件的授权状态
        await this.synchronizeAllPlugins();

        this.logger.info('[PLUGIN] 插件授权后端管理器已启动');
    }

    // ========================= 内部实现方法 =========================

    /**
     * 初始化默认授权状态
     * 生产环境应从持久化存储加载
     */
    private initializeDefaultStates(): void {
        this.authorizationStates.set('vscode.typescript-language-features', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('vscode.json-language-features', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('<unpublished>.demo-plugin', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('<unpublished>.theia-webview-test-plugin', AuthorizationStatus.GRANTED);

        this.logger.debug('[PLUGIN] 默认授权状态已初始化',
            Array.from(this.authorizationStates.entries()).map(([id, status]) => `${id}: ${status}`)
        );
    }

    /**
     * 同步所有已部署插件的授权状态
     */
    private async synchronizeAllPlugins(): Promise<void> {
        try {
            // 获取所有已部署插件
            const deployedPlugins = await this.deployerHandler.getDeployedPlugins();

            this.logger.info(`[PLUGIN] 开始同步插件授权状态，部署插件 ${deployedPlugins.length} 个`);

            // 构建插件版本映射
            for (const plugin of deployedPlugins) {
                const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                const unversionedId = PluginIdentifiers.unversionedFromVersioned(versionedId);
                this.pluginVersionMapping.set(unversionedId, versionedId);
            }

            // 处理已部署的插件
            for (const plugin of deployedPlugins) {
                const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                const unversionedId = PluginIdentifiers.unversionedFromVersioned(versionedId);
                const authStatus = await this.getAuthorizationStatus(unversionedId);

                this.logger.info(`[PLUGIN] 插件 ${unversionedId}: 授权=${authStatus}`);

                if (authStatus === AuthorizationStatus.DENIED) {
                    // 未授权插件需要 undeploy
                    this.logger.info(`[PLUGIN] undeploy 未授权插件: ${unversionedId}`);
                    await this.pluginDeployer.undeploy(versionedId);
                }
            }

            this.logger.info('[PLUGIN] 插件授权状态同步完成');
        } catch (error) {
            this.logger.error('[PLUGIN] 同步插件授权状态失败:', error);
        }
    }

    /**
     * 处理授权状态变更事件
     */
    // private async handleAuthorizationChanged(event: IAuthorizationStatusChangeEvent): Promise<void> {
    //     const { pluginId, status, previousStatus } = event;

    //     this.logger.info(`[PLUGIN] 授权状态变更: ${pluginId} (${previousStatus} -> ${status})`);

    //     try {
    //         // 标准化插件ID格式以匹配存储的mapping
    //         const normalizedPluginId = this.normalizePluginId(pluginId);
    //         this.logger.debug(`[PLUGIN] 标准化插件ID: ${pluginId} -> ${normalizedPluginId}`);

    //         // const versionedId = this.pluginVersionMapping.get(normalizedPluginId as PluginIdentifiers.UnversionedId);

    //         // if (status === AuthorizationStatus.DENIED) {
    //         //     // 撤销授权：需要 undeploy 插件
    //         //     if (versionedId) {
    //         //         this.logger.info(`[PLUGIN] undeploy 未授权插件: ${pluginId}`);
    //         //         await this.pluginDeployer.(versionedId);
    //         //     }
    //         // } else if (status === AuthorizationStatus.GRANTED && (previousStatus === AuthorizationStatus.DENIED)) {
    //         //     // 恢复授权：可能需要触发重新部署
    //         //     this.logger.info(`[PLUGIN] 插件 ${pluginId} 授权恢复`);
    //         //     // 注意：重新部署逻辑可以在这里实现，当前保持简单
    //         // }

    //     } catch (error) {
    //         this.logger.error(`[PLUGIN] 处理插件 ${pluginId} 授权变更失败:`, error);
    //     }
    // }

    /**
     * 标准化插件ID格式，将各种格式统一转换为存储格式
     */
    // private normalizePluginId(pluginId: string): string {
    //     // 移除尖括号：<unpublished>.test-plugin -> unpublished.test-plugin
    //     return pluginId.replace(/[<>]/g, '');
    // }

    /**
     * 重置为默认授权状态（开发/测试用）
     */
    async resetToDefaults(): Promise<void> {
        this.logger.warn('[PLUGIN] 重置所有插件授权状态为默认值');
        this.authorizationStates.clear();
        this.initializeDefaultStates();

        for (const [pluginId, status] of this.authorizationStates.entries()) {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId,
                status
            };
            // 触发本地事件和RPC客户端通知
            this._onDidUpdateAuthorizationStatus.fire(event);
            this.notifyClient(event);
        }

        this.logger.info('[PLUGIN] 重置完成，已触发所有插件的授权事件');
    }

    // ========================= IAuthorizationRPC 接口实现 =========================

    async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        return this.getAuthorizationStatus(pluginId);
    }

    async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        return this.grantAuthorization(pluginId);
    }

    async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        return this.revokeAuthorization(pluginId);
    }

    async $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        return this.getAllAuthorizationStatuses();
    }

    async $resetToDefaults(): Promise<void> {
        return this.resetToDefaults();
    }

    async $registerClient(client: IAuthorizationClient): Promise<void> {
        // 不再需要客户端注册，事件通过 RPC 系统自动传播
        this.logger.debug('[PLUGIN] $registerClient 调用 - 事件通过 RPC 系统自动传播');
    }

    // ========================= 客户端管理 =========================
    
    /**
     * 设置RPC客户端连接，用于事件通知
     */
    setClient(client: IAuthorizationClient): void {
        this.client = client;
        this.logger.info('[PLUGIN] 已设置授权服务RPC客户端');
    }

    /**
     * 向客户端发送事件通知
     */
    private notifyClient(event: IAuthorizationStatusChangeEvent): void {
        if (this.client) {
            try {
                this.client.$onDidUpdateAuthorizationStatus(event);
                this.logger.debug(`[PLUGIN] 已通知客户端授权状态变更: ${event.pluginId}`);
            } catch (error) {
                this.logger.error('[PLUGIN] 通知客户端失败:', error);
            }
        } else {
            this.logger.warn('[PLUGIN] 无法通知客户端 - 客户端未连接');
        }
    }

}

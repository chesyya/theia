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
import { Event } from '@theia/core/lib/common/event';
import { IAuthorizationService, IAuthorizationRPC, IAuthorizationClient } from '../../../common/services/authorization/i-authorization-service';
import { PluginAuthorizationManager } from '../../../common/services/authorization/plugin-authorization-manager';
import { PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from '../../../common/services/authorization/types';

/**
 * 后端授权服务实现
 * 基于PluginAuthorizationManager提供授权管理功能
 * 无需数据库，完全基于内存和现有插件信息
 */
@injectable()
export class AuthorizationServiceBackendImpl implements IAuthorizationService, IAuthorizationRPC {

    @inject(PluginAuthorizationManager)
    protected readonly authorizationManager: PluginAuthorizationManager;

    protected clients: IAuthorizationClient[] = [];

    constructor() {
        console.log(`[AUTH-BACKEND] 🏗️ AuthorizationServiceBackendImpl created`);
    }

    @postConstruct()
    protected init(): void {
        console.log(`[AUTH-BACKEND] 🔧 Initializing AuthorizationServiceBackendImpl`);

        // 监听授权管理器的状态变化，并广播给所有客户端
        this.authorizationManager.onDidUpdateAuthorizationStatus(event => {
            console.log(`[AUTH-BACKEND] 📡 Broadcasting authorization status change to ${this.clients.length} clients:`, event);

            // 通知所有连接的客户端
            this.clients.forEach(client => {
                try {
                    client.$onDidUpdateAuthorizationStatus(event);
                } catch (error) {
                    console.error(`[AUTH-BACKEND] ❌ Error notifying client:`, error);
                }
            });
        });

        console.log(`[AUTH-BACKEND] ✅ AuthorizationServiceBackendImpl initialized`);
    }

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this.authorizationManager.onDidUpdateAuthorizationStatus;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        console.log(`[AUTH-BACKEND] 🔍 Getting authorization status for: ${pluginId}`);
        return this.authorizationManager.getAuthorizationStatus(pluginId);
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-BACKEND] 🔓 Granting authorization for: ${pluginId}`);
        await this.authorizationManager.grantAuthorization(pluginId);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-BACKEND] 🔒 Revoking authorization for: ${pluginId}`);
        await this.authorizationManager.revokeAuthorization(pluginId);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        console.log(`[AUTH-BACKEND] 📋 Getting all authorization statuses`);
        return this.authorizationManager.getAllAuthorizationStatuses();
    }

    // RPC接口实现 - 用于前端调用
    async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        return this.getAuthorizationStatus(pluginId);
    }

    async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        await this.grantAuthorization(pluginId);
    }

    async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        await this.revokeAuthorization(pluginId);
    }

    async $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        return this.getAllAuthorizationStatuses();
    }

    /**
     * 注册客户端，用于接收状态变化通知
     */
    registerClient(client: IAuthorizationClient): void {
        console.log(`[AUTH-BACKEND] 📝 Registering new client, total clients: ${this.clients.length + 1}`);
        this.clients.push(client);
    }

    /**
     * 注销客户端
     */
    unregisterClient(client: IAuthorizationClient): void {
        const index = this.clients.indexOf(client);
        if (index !== -1) {
            this.clients.splice(index, 1);
            console.log(`[AUTH-BACKEND] 📤 Unregistered client, remaining clients: ${this.clients.length}`);
        }
    }


    /**
     * 获取授权统计信息（用于调试和监控）
     */
    getAuthorizationStats(): any {
        console.log(`[AUTH-BACKEND] 📊 Getting authorization statistics`);
        return this.authorizationManager.getAuthorizationStats();
    }

    /**
     * 重置授权状态（用于测试）
     */
    resetAllAuthorizations(): void {
        console.log(`[AUTH-BACKEND] 🔄 Resetting all authorizations`);
        this.authorizationManager.resetAllAuthorizations();
    }

    /**
     * 批量操作：授权多个插件
     */
    async grantAuthorizationBatch(pluginIds: PluginIdentifier[]): Promise<void> {
        console.log(`[AUTH-BACKEND] 🔓 Batch granting authorization for:`, pluginIds);

        for (const pluginId of pluginIds) {
            await this.grantAuthorization(pluginId);
        }

        console.log(`[AUTH-BACKEND] ✅ Batch authorization completed for ${pluginIds.length} plugins`);
    }

    /**
     * 批量操作：撤销多个插件授权
     */
    async revokeAuthorizationBatch(pluginIds: PluginIdentifier[]): Promise<void> {
        console.log(`[AUTH-BACKEND] 🔒 Batch revoking authorization for:`, pluginIds);

        for (const pluginId of pluginIds) {
            await this.revokeAuthorization(pluginId);
        }

        console.log(`[AUTH-BACKEND] ❌ Batch revocation completed for ${pluginIds.length} plugins`);
    }
}

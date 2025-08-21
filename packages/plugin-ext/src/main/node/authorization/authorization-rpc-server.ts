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

import { injectable, inject } from '@theia/core/shared/inversify';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { RpcServer } from '@theia/core/lib/common/messaging/proxy-factory';
import {
    IAuthorizationService,
    IAuthorizationRPC,
    IAuthorizationClient,
    PluginIdentifier,
    AuthorizationStatus
} from '../../../common/services/authorization';
import { ILogger } from '@theia/core/lib/common/logger';

/**
 * 授权 RPC 服务端
 * 
 * 作用：
 * - 接收前端/插件进程的 RPC 调用
 * - 委托给核心 AuthorizationService 处理
 * - 转发事件给远程 RPC 客户端
 * - 不包含业务逻辑，仅做转发
 */
@injectable()
export class AuthorizationRPCServer implements IAuthorizationRPC, RpcServer<IAuthorizationClient> {

    private readonly disposables = new DisposableCollection();
    private client: IAuthorizationClient | undefined;

    constructor(
        @inject(IAuthorizationService) private readonly authorizationService: IAuthorizationService,
        @inject(ILogger) private readonly logger: ILogger
    ) {
        this.logger.info('[PLUGIN] 🌐 初始化 AuthorizationRPCServer...');
        this.setupEventForwarding();
        this.logger.info('[PLUGIN] ✅ AuthorizationRPCServer 初始化完成（事件转发已启用）');
    }

    setClient(client: IAuthorizationClient | undefined): void {
        this.logger.info(`[PLUGIN] 🔗 设置客户端: ${!!client}`);
        this.client = client;
    }

    getClient(): IAuthorizationClient | undefined {
        return this.client;
    }

    private setupEventForwarding(): void {
        this.disposables.push(this.authorizationService.onDidUpdateAuthorizationStatus(event => {
            this.logger.info(`[PLUGIN] 📡 发送授权变更事件: ${JSON.stringify(event)}`);
            try {
                if (this.client) {
                    this.client.$onDidUpdateAuthorizationStatus(event);
                    this.logger.info('[PLUGIN] ✅ 事件成功发送到客户端');
                } else {
                    this.logger.warn('[PLUGIN] ⚠️ 没有客户端连接，无法发送事件');
                }
            } catch (error) {
                this.logger.error('[PLUGIN] ❌ 发送事件到客户端时出错', error);
            }
        }));
    }

    dispose(): void {
        this.logger.info('[PLUGIN] 🧹 释放 AuthorizationRPCServer 资源...');
        this.disposables.dispose();
    }

    async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        this.logger.info(`[PLUGIN] 📞 RPC 调用: $getAuthorizationStatus(${pluginId})`);
        try {
            const result = await this.authorizationService.getAuthorizationStatus(pluginId);
            this.logger.info(`[PLUGIN] ✅ RPC 响应: ${result}`);
            return result;
        } catch (error) {
            this.logger.error('[PLUGIN] ❌ $getAuthorizationStatus 执行出错', error);
            throw error;
        }
    }

    async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        this.logger.info(`[PLUGIN] 📞 RPC 调用: $grantAuthorization(${pluginId})`);
        try {
            await this.authorizationService.grantAuthorization(pluginId);
            this.logger.info('[PLUGIN] ✅ RPC 完成: $grantAuthorization');
        } catch (error) {
            this.logger.error('[PLUGIN] ❌ $grantAuthorization 执行出错', error);
            throw error;
        }
    }

    async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        this.logger.info(`[PLUGIN] 📞 RPC 调用: $revokeAuthorization(${pluginId})`);
        try {
            await this.authorizationService.revokeAuthorization(pluginId);
            this.logger.info('[PLUGIN] ✅ RPC 完成: $revokeAuthorization');
        } catch (error) {
            this.logger.error('[PLUGIN] ❌ $revokeAuthorization 执行出错', error);
            throw error;
        }
    }

    async $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        this.logger.info('[PLUGIN] 📞 RPC 调用: $getAllAuthorizationStatuses()');
        try {
            const result = await this.authorizationService.getAllAuthorizationStatuses();
            this.logger.info(`[PLUGIN] ✅ RPC 响应: ${result.size} 条授权状态`);
            return result;
        } catch (error) {
            this.logger.error('[PLUGIN] ❌ $getAllAuthorizationStatuses 执行出错', error);
            throw error;
        }
    }

    async $resetToDefaults(): Promise<void> {
        this.logger.info('[PLUGIN] 📞 RPC 调用: $resetToDefaults()');
        try {
            if ('resetToDefaults' in this.authorizationService) {
                await (this.authorizationService as any).resetToDefaults();
                this.logger.info('[PLUGIN] ✅ RPC 完成: $resetToDefaults');
            } else {
                this.logger.warn('[PLUGIN] ⚠️ resetToDefaults 方法在 service 中不可用');
            }
        } catch (error) {
            this.logger.error('[PLUGIN] ❌ $resetToDefaults 执行出错', error);
            throw error;
        }
    }
}

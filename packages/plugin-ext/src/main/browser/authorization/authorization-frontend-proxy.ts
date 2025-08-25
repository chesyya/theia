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
import { Emitter } from '@theia/core/lib/common/event';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { ILogger } from '@theia/core/lib/common/logger';
import { AuthorizationStatus, IAuthorizationClient, IAuthorizationRPC, IAuthorizationService, IAuthorizationStatusChangeEvent, PluginIdentifier, IAuthorizationRPCToken } from '../../../common/authorization/i-authorization-service';
import { AuthorizationClientImpl } from './authorization-client-impl';

/**
 * Frontend proxy 实现 IAuthorizationService
 * 按照Theia标准模式实现
 */
@injectable()
export class AuthorizationFrontendProxy implements IAuthorizationService, IAuthorizationClient {

    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();
    private readonly disposables = new DisposableCollection();
    private readonly loggerChild: ILogger;

    constructor(
        @inject(ILogger) protected readonly logger: ILogger,
        @inject(IAuthorizationRPCToken) protected readonly rpcProxy: IAuthorizationRPC,
        @inject(AuthorizationClientImpl) protected readonly client: AuthorizationClientImpl
    ) {
        // 创建子 logger，附带类名
        this.loggerChild = this.logger.child(`[PLUGIN] ${AuthorizationFrontendProxy.name}`);
        this.loggerChild.info('🔗 AuthorizationFrontendProxy 构造函数完成');
    }

    @postConstruct()
    protected init(): void {
        // 设置客户端服务，这样客户端实现就能将事件转发给我们
        this.client.setService(this);
        this.loggerChild.info('🔗 AuthorizationFrontendProxy 初始化完成');
    }



    get onDidUpdateAuthorizationStatus() {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    // --- IAuthorizationClient 实现 ---
    // Theia RPC 系统会自动调用这个方法来传播后端事件
    $onDidUpdateAuthorizationStatus(event: IAuthorizationStatusChangeEvent): void {
        this.loggerChild.info('🎉 收到来自后端的授权状态变更事件:', event);
        this._onDidUpdateAuthorizationStatus.fire(event);
        this.loggerChild.info('📢 已重新触发事件到前端监听者');
    }

    // --- IAuthorizationService 实现 ---
    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        this.loggerChild.info(`📞 请求后端 getAuthorizationStatus(${pluginId})...`);
        try {
            const result = await this.rpcProxy.$getAuthorizationStatus(pluginId);
            this.loggerChild.info(`✅ getAuthorizationStatus 结果: ${result}`);
            return result;
        } catch (error) {
            this.loggerChild.error(`❌ 获取授权状态失败:`, error);
            throw error;
        }
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        this.loggerChild.info(`📞 请求后端 grantAuthorization(${pluginId})...`);
        try {
            await this.rpcProxy.$grantAuthorization(pluginId);
            this.loggerChild.info(`✅ grantAuthorization 完成`);
        } catch (error) {
            this.loggerChild.error(`❌ 授权插件失败:`, error);
            throw error;
        }
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        this.loggerChild.info(`📞 请求后端 revokeAuthorization(${pluginId})...`);
        try {
            await this.rpcProxy.$revokeAuthorization(pluginId);
            this.loggerChild.info(`✅ revokeAuthorization 完成`);
        } catch (error) {
            this.loggerChild.error(`❌ 撤销插件授权失败:`, error);
            throw error;
        }
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        this.loggerChild.info(`📞 请求后端 getAllAuthorizationStatuses()...`);
        try {
            const result = await this.rpcProxy.$getAllAuthorizationStatuses();
            this.loggerChild.info(`✅ 获取所有授权状态成功，共 ${result.size} 个状态`);
            return result;
        } catch (error) {
            this.loggerChild.error(`❌ 获取所有插件授权状态失败:`, error);
            throw error;
        }
    }

    async resetToDefaults(): Promise<void> {
        this.loggerChild.info(`📞 请求后端 resetToDefaults()...`);
        try {
            await (this.rpcProxy as any).$resetToDefaults();
            this.loggerChild.info(`✅ resetToDefaults 完成`);
        } catch (error) {
            this.loggerChild.error(`❌ resetToDefaults 调用失败:`, error);
            throw error;
        }
    }


    dispose(): void {
        this.loggerChild.info('🧹 释放 AuthorizationFrontendProxy...');
        this._onDidUpdateAuthorizationStatus.dispose();
        this.disposables.dispose();
    }
}

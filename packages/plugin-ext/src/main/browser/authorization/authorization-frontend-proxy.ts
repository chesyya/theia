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
    
    // 本地缓存的授权状态存储
    private readonly authorizationCache = new Map<PluginIdentifier, { status: AuthorizationStatus; options?: any }>();

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
    protected async init(): Promise<void> {
        this.loggerChild.info('🚀 开始初始化 AuthorizationFrontendProxy...');

        try {
            // 1. 获取当前系统里面所有deployed的插件
            // 从RPC代理获取已部署的插件ID列表
            const deployedPluginIds = await this.rpcProxy.$getAllAuthorizationStatuses();
            const pluginIds: string[] = Array.from(deployedPluginIds.keys());

            // 2. 通过某个服务的接口获取每个id的授权状态
            // TODO: 调用服务的getAllStatus接口
            // const result = await someService.getAllStatus(pluginIds);
            const result: { pluginId: string, status: string, options: any }[] = []; // 占位，实际需要从服务获取

            // 3. 初始化默认状态
            this.initializeDefaultStates(result);

            // 4. 设置客户端服务，这样客户端实现就能将事件转发给我们
            this.client.setService(this);

            // 5. 监听某个服务的授权变更事件
            // 后续的变更就需要监听某个服务的授权变更事件，他会把pluginIds: {status: string, options: any}[]这样的数组通过事件发过来
            // TODO: 监听服务的授权变更事件
            // someService.onAuthorizationChanged((changes: { pluginId: string, status: string, options: any }[]) => {
            //     this.handleAuthorizationChangeEvent(changes);
            // });

            this.loggerChild.info('📡 已设置授权状态变更监听');

        } catch (error) {
            this.loggerChild.error('❌ 初始化授权代理失败:', error);
            // 即使失败也要设置客户端服务，保证基本功能可用
            this.client.setService(this);
        }

        this.loggerChild.info('✅ AuthorizationFrontendProxy 初始化完成');
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
        this.loggerChild.info(`📞 获取插件授权状态 getAuthorizationStatus(${pluginId})...`);
        
        // 首先检查本地缓存
        const cachedStatus = this.authorizationCache.get(pluginId);
        if (cachedStatus) {
            this.loggerChild.info(`✅ 从缓存获取授权状态: ${cachedStatus.status}`);
            return cachedStatus.status;
        }
        
        // 缓存中没有，从服务获取并存储
        this.loggerChild.info(`📞 缓存中未找到，从服务获取授权状态...`);
        try {
            // TODO: 从某个服务获取单个插件的授权状态
            // const authState = await someService.getStatus(pluginId);
            // const authorizationStatus = this.convertStringToAuthorizationStatus(authState.status);
            // this.authorizationCache.set(pluginId, {
            //     status: authorizationStatus,
            //     options: authState.options
            // });
            // this.loggerChild.info(`✅ 获取并缓存授权状态: ${authorizationStatus}`);
            // return authorizationStatus;
            
            // 临时方案：从RPC代理获取
            const result = await this.rpcProxy.$getAuthorizationStatus(pluginId);
            this.authorizationCache.set(pluginId, { status: result });
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


    /**
     * 初始化默认授权状态
     * @param pluginAuthStates 从服务获取的授权状态数组 { pluginId: string, status: string, options: any }[]
     */
    private initializeDefaultStates(pluginAuthStates: { pluginId: string, status: string, options: any }[]): void {
        this.loggerChild.info('🔧 初始化默认授权状态...');
        
        // 处理从服务获取的授权状态数据
        for (const authState of pluginAuthStates) {
            const { pluginId, status, options } = authState;
            
            // 将字符串状态转换为 AuthorizationStatus 枚举
            const authorizationStatus = this.convertStringToAuthorizationStatus(status);
            
            // 存储到本地缓存
            this.authorizationCache.set(pluginId, {
                status: authorizationStatus,
                options: options
            });
            
            this.loggerChild.debug(`插件 ${pluginId} 的授权状态: ${authorizationStatus}, 选项:`, options);
        }
        
        this.loggerChild.info(`🏁 默认授权状态初始化完成，共 ${pluginAuthStates.length} 个插件`);
    }

    /**
     * 处理授权变更事件
     * @param authorizationChanges 授权变更数据数组 { pluginId: string, status: string, options: any }[]
     */
    private handleAuthorizationChangeEvent(authorizationChanges: { pluginId: string, status: string, options: any }[]): void {
        this.loggerChild.info('🎉 收到授权状态变更事件...');

        // TODO: 获取当前已部署的插件ID列表（需要从服务获取）
        // const deployedPluginIds = await someService.getDeployedPluginIds();
        // const deployedPluginIdsSet = new Set(deployedPluginIds);
        
        // 暂时处理所有变更（实际需要检查是否为已部署插件）
        for (const change of authorizationChanges) {
            const { pluginId, status, options } = change;
            
            // TODO: 检查pluginId是否在已部署插件列表中
            // if (deployedPluginIdsSet.has(pluginId)) {
                this.loggerChild.info(`📢 插件 ${pluginId} 授权状态变更: ${status}`);
                
                // TODO: 转换为内部事件格式并触发
                // 这里需要将字符串状态转换为 AuthorizationStatus 枚举
                // 然后通过 this._onDidUpdateAuthorizationStatus.fire() 发送事件
                
                // 示例：
                // const event: IAuthorizationStatusChangeEvent = {
                //     pluginId: pluginId,
                //     status: this.convertStringToAuthorizationStatus(status),
                //     previousStatus: ..., // 需要跟踪之前的状态
                //     options: options
                // };
                // this._onDidUpdateAuthorizationStatus.fire(event);
            // }
        }
    }

    /**
     * 将字符串状态转换为 AuthorizationStatus 枚举
     * @param status 字符串状态
     * @returns AuthorizationStatus 枚举值
     */
    private convertStringToAuthorizationStatus(status: string): AuthorizationStatus {
        switch (status.toLowerCase()) {
            case 'granted':
                return AuthorizationStatus.GRANTED;
            case 'denied':
                return AuthorizationStatus.DENIED;
            default:
                this.loggerChild.warn(`未知的授权状态字符串: ${status}，默认为DENIED`);
                return AuthorizationStatus.DENIED;
        }
    }

    dispose(): void {
        this.loggerChild.info('🧹 释放 AuthorizationFrontendProxy...');
        this._onDidUpdateAuthorizationStatus.dispose();
        this.disposables.dispose();
        this.authorizationCache.clear();
    }
}

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
import { Emitter, Event } from '@theia/core/lib/common/event';
import { PluginAuthorizationProvider, PluginAuthorizationChangeEvent } from '../../common/plugin-authorization';
import { AuthorizationStatus } from '../../common/services/authorization';
import { AuthorizationServiceBackendImpl } from './authorization-service-backend-impl';

/**
 * 授权提供者实现，委托给新的授权服务
 * 提供向后兼容的接口，但使用新的授权服务作为数据源
 */
@injectable()
export class PluginAuthorizationProviderImpl implements PluginAuthorizationProvider {

    private readonly onAuthorizationChangedEmitter = new Emitter<PluginAuthorizationChangeEvent>();

    @inject(AuthorizationServiceBackendImpl)
    protected readonly authorizationService: AuthorizationServiceBackendImpl;

    constructor() {
        console.log(`[OLD-AUTH] 🔗 PluginAuthorizationProviderImpl initializing with delegation to new authorization service`);
    }

    @postConstruct()
    protected postConstruct(): void {
        // 监听新授权服务的状态变化，转换为旧接口的事件格式
        this.authorizationService.onDidUpdateAuthorizationStatus(event => {
            console.log(`[OLD-AUTH] 📡 Received authorization update from new service:`, event);
            
            const legacyEvent: PluginAuthorizationChangeEvent = {
                changedPluginIds: [event.pluginId],
                changeType: event.status === AuthorizationStatus.GRANTED ? 'granted' : 'revoked'
            };
            
            console.log(`[OLD-AUTH] 🔄 Converting to legacy event format:`, legacyEvent);
            this.onAuthorizationChangedEmitter.fire(legacyEvent);
        });
    }


    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.onAuthorizationChangedEmitter.event;
    }

    async $isAuthorized(pluginId: string): Promise<boolean> {
        console.log(`[OLD-AUTH] 🔍 Checking authorization for plugin: ${pluginId} (delegating to new service)`);
        
        try {
            const authStatus = await this.authorizationService.getAuthorizationStatus(pluginId);
            const isAuthorized = authStatus === AuthorizationStatus.GRANTED;
            
            console.log(`[OLD-AUTH] ✅ New service returned status: ${authStatus}, authorized: ${isAuthorized}`);
            return isAuthorized;
        } catch (error) {
            console.error(`[OLD-AUTH] ❌ Error getting authorization status from new service:`, error);
            // 发生错误时默认为已授权（向后兼容）
            return true;
        }
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        console.log(`[OLD-AUTH] 📋 Getting authorized plugin IDs (not implemented in new service - returning empty array)`);
        // 新的授权服务不维护插件列表，只检查特定插件的状态
        // 这里返回空数组，如果需要可以遍历已知插件进行检查
        return [];
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        console.log(`[OLD-AUTH] 📋 Getting unauthorized plugin IDs (not implemented in new service - returning empty array)`);
        // 新的授权服务不维护插件列表，只检查特定插件的状态
        // 这里返回空数组，如果需要可以遍历已知插件进行检查
        return [];
    }

    /**
     * 将插件设置为已授权状态（委托给新服务）
     */
    grantAuthorization(pluginIds: string[]): void {
        console.log(`[OLD-AUTH] 🎯 grantAuthorization called with:`, pluginIds);
        
        for (const pluginId of pluginIds) {
            console.log(`[OLD-AUTH] 🔓 Granting authorization for plugin: ${pluginId}`);
            try {
                // 委托给新的授权服务
                this.authorizationService.grantAuthorization(pluginId);
                console.log(`[OLD-AUTH] ✅ Successfully granted authorization for ${pluginId}`);
            } catch (error) {
                console.error(`[OLD-AUTH] ❌ Error granting authorization for ${pluginId}:`, error);
            }
        }
    }

    /**
     * 将插件设置为未授权状态（委托给新服务）
     */
    revokeAuthorization(pluginIds: string[]): void {
        console.log(`[OLD-AUTH] 🎯 revokeAuthorization called with:`, pluginIds);
        
        for (const pluginId of pluginIds) {
            console.log(`[OLD-AUTH] 🔒 Revoking authorization for plugin: ${pluginId}`);
            try {
                // 委托给新的授权服务
                this.authorizationService.revokeAuthorization(pluginId);
                console.log(`[OLD-AUTH] ✅ Successfully revoked authorization for ${pluginId}`);
            } catch (error) {
                console.error(`[OLD-AUTH] ❌ Error revoking authorization for ${pluginId}:`, error);
            }
        }
    }

    /**
     * 授权测试插件（仅用于测试）
     */
    async grantTestPluginAuthorization(): Promise<void> {
        console.log(`[OLD-AUTH] 🧪 Granting test plugin authorization`);
        this.grantAuthorization(['<unpublished>.test-plugin']);
    }

    /**
     * 撤销测试插件授权（仅用于测试）
     */
    async revokeTestPluginAuthorization(): Promise<void> {
        console.log(`[OLD-AUTH] 🧪 Revoking test plugin authorization`);
        this.revokeAuthorization(['<unpublished>.test-plugin']);
    }

    /**
     * 重置授权状态到初始状态（仅用于测试）
     */
    async resetAuthorizationState(): Promise<void> {
        console.log(`[OLD-AUTH] 🔄 Resetting authorization state (delegating to new service)`);
        
        try {
            // 撤销测试插件的授权，让它回到未授权状态
            await this.authorizationService.revokeAuthorization('<unpublished>.test-plugin');
            console.log(`[OLD-AUTH] ✅ Reset completed - test plugin is now unauthorized`);
        } catch (error) {
            console.error(`[OLD-AUTH] ❌ Error resetting authorization state:`, error);
        }
    }

}

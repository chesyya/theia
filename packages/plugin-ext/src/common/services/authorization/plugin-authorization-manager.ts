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

import { injectable, postConstruct } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from './types';
import { IAuthorizationService } from './i-authorization-service';

/**
 * 内存级插件授权管理器 - 不依赖数据库的授权状态管理
 * 
 * 设计原则：
 * 1. 基于内存的状态管理，利用现有后端插件信息
 * 2. 无需数据库，状态存储在内存中
 * 3. 支持事件通知
 * 4. 与现有Theia插件系统完全集成
 */
@injectable()
export class PluginAuthorizationManager implements IAuthorizationService {

    private readonly authorizationMap = new Map<PluginIdentifier, AuthorizationStatus>();
    private readonly onDidUpdateAuthorizationStatusEmitter = new Emitter<IAuthorizationStatusChangeEvent>();

    constructor() {
        console.log(`[AUTH-MGR] 🏗️ PluginAuthorizationManager created - in-memory authorization management`);
        
        // 初始化默认授权状态
        this.initializeDefaultStatuses();
    }

    @postConstruct()
    protected init(): void {
        console.log(`[AUTH-MGR] 🔧 PluginAuthorizationManager initialized`);
    }

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this.onDidUpdateAuthorizationStatusEmitter.event;
    }

    /**
     * 初始化默认授权状态
     * 基于现有插件安装信息设置初始状态
     */
    private initializeDefaultStatuses(): void {
        console.log(`[AUTH-MGR] 📋 Initializing default authorization statuses`);
        
        // 默认情况下，大多数插件都是授权的
        // 只有特定的测试插件需要显式授权管理
        
        // 测试插件默认为未授权状态，需要用户授权
        this.authorizationMap.set('<unpublished>.test-plugin', AuthorizationStatus.DENIED);
        
        console.log(`[AUTH-MGR] ✅ Default statuses initialized:`, Array.from(this.authorizationMap.entries()));
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        console.log(`[AUTH-MGR] 🔍 Getting authorization status for: ${pluginId}`);
        
        // 检查内存中的状态，如果不存在则默认为已授权
        const status = this.authorizationMap.get(pluginId) ?? AuthorizationStatus.GRANTED;
        
        console.log(`[AUTH-MGR] 📊 Status for ${pluginId}: ${status}`);
        return status;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-MGR] 🔓 Granting authorization for: ${pluginId}`);
        
        const previousStatus = await this.getAuthorizationStatus(pluginId);
        
        // 更新状态
        this.authorizationMap.set(pluginId, AuthorizationStatus.GRANTED);
        
        // 触发状态变化事件
        this.fireAuthorizationStatusChange(pluginId, AuthorizationStatus.GRANTED, previousStatus);
        
        
        console.log(`[AUTH-MGR] ✅ Authorization granted for ${pluginId}`);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[AUTH-MGR] 🔒 Revoking authorization for: ${pluginId}`);
        
        const previousStatus = await this.getAuthorizationStatus(pluginId);
        
        // 更新状态
        this.authorizationMap.set(pluginId, AuthorizationStatus.DENIED);
        
        // 触发状态变化事件
        this.fireAuthorizationStatusChange(pluginId, AuthorizationStatus.DENIED, previousStatus);
        
        
        console.log(`[AUTH-MGR] ❌ Authorization revoked for ${pluginId}`);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        console.log(`[AUTH-MGR] 📋 Getting all authorization statuses`);
        
        // 返回当前内存中的所有状态
        const result = new Map(this.authorizationMap);
        
        console.log(`[AUTH-MGR] 📊 Current statuses:`, Array.from(result.entries()));
        return result;
    }


    /**
     * 触发授权状态变化事件
     */
    private fireAuthorizationStatusChange(
        pluginId: PluginIdentifier, 
        newStatus: AuthorizationStatus, 
        previousStatus: AuthorizationStatus
    ): void {
        if (newStatus !== previousStatus) {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId,
                status: newStatus,
                previousStatus,
                timestamp: new Date()
            };
            
            console.log(`[AUTH-MGR] 📡 Firing authorization status change event:`, event);
            this.onDidUpdateAuthorizationStatusEmitter.fire(event);
        }
    }


    /**
     * 重置所有授权状态（用于测试和调试）
     */
    resetAllAuthorizations(): void {
        console.log(`[AUTH-MGR] 🔄 Resetting all authorization statuses`);
        
        // 保存当前状态用于事件触发
        const previousStatuses = new Map(this.authorizationMap);
        
        // 清空并重新初始化
        this.authorizationMap.clear();
        this.initializeDefaultStatuses();
        
        // 为每个变化的状态触发事件
        for (const [pluginId, newStatus] of this.authorizationMap) {
            const previousStatus = previousStatuses.get(pluginId) ?? AuthorizationStatus.GRANTED;
            this.fireAuthorizationStatusChange(pluginId, newStatus, previousStatus);
        }
        
        console.log(`[AUTH-MGR] ✅ All authorizations reset to default state`);
    }

    /**
     * 获取统计信息
     */
    getAuthorizationStats(): {
        totalPlugins: number;
        authorizedPlugins: number;
        deniedPlugins: number;
    } {
        const totalPlugins = this.authorizationMap.size;
        const authorizedPlugins = Array.from(this.authorizationMap.values())
            .filter(status => status === AuthorizationStatus.GRANTED).length;
        const deniedPlugins = totalPlugins - authorizedPlugins;

        const stats = {
            totalPlugins,
            authorizedPlugins,
            deniedPlugins,
        };

        console.log(`[AUTH-MGR] 📊 Authorization statistics:`, stats);
        return stats;
    }
}
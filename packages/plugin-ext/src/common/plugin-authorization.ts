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

import { Event } from '@theia/core/lib/common/event';

export const PluginAuthorizationProvider = Symbol('PluginAuthorizationProvider');
export const pluginAuthorizationPath = '/services/plugin-authorization';

/**
 * 插件授权变更事件
 */
export interface PluginAuthorizationChangeEvent {
    /**
     * 授权状态发生变更的插件ID列表
     */
    changedPluginIds: string[];

    /**
     * 变更类型：granted表示新授权，revoked表示撤销授权
     */
    changeType: 'granted' | 'revoked';
}

/**
 * 插件授权提供者接口
 * 由plugin-ext包实现，用于查询和监听插件授权状态
 */
export interface PluginAuthorizationProvider {
    /**
     * 检查指定插件是否已授权
     * @param pluginId 插件ID
     * @returns Promise，resolved为true表示已授权，false表示未授权
     */
    $isAuthorized(pluginId: string): Promise<boolean>;

    /**
     * 获取所有已授权的插件ID列表
     * @returns Promise，resolved为已授权插件ID的数组
     */
    getAuthorizedPluginIds(): Promise<string[]>;

    /**
     * 获取所有未授权的插件ID列表
     * @returns Promise，resolved为未授权插件ID的数组
     */
    getUnauthorizedPluginIds(): Promise<string[]>;

    /**
     * 授权状态变更事件
     * 当有插件的授权状态发生变更时触发此事件
     */
    readonly onAuthorizationChanged: Event<PluginAuthorizationChangeEvent>;

    /**
     * 授权测试插件（仅用于测试）
     */
    grantTestPluginAuthorization?(): Promise<void>;

    /**
     * 撤销测试插件授权（仅用于测试）
     */
    revokeTestPluginAuthorization?(): Promise<void>;

    /**
     * 重置授权状态到初始状态（仅用于测试）
     */
    resetAuthorizationState?(): Promise<void>;
}

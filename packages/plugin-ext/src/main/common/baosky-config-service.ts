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

/**
 * 宝思科配置接口
 * 
 * 定义从 /etc/baosky.ini 配置文件中读取的配置项
 */
export interface BaoskyConfig {
    /** 是否启用用户插件管理功能 */
    userPluginsEnabled: boolean;
    
    /** 当前用户ID */
    currentUser?: string;
    
    /** 管理员用户列表 */
    adminUsers?: string[];
}

/**
 * 宝思科配置服务符号
 * 用于依赖注入
 */
export const BaoskyConfigService = Symbol('BaoskyConfigService');

/**
 * 宝思科配置服务接口
 * 
 * 负责从 /etc/baosky.ini 配置文件中读取配置信息
 */
export interface BaoskyConfigService {
    /**
     * 获取完整配置
     */
    getConfig(): Promise<BaoskyConfig>;
    
    /**
     * 检查是否启用用户插件管理功能
     */
    isUserPluginsEnabled(): Promise<boolean>;
    
    /**
     * 获取当前用户ID
     */
    getCurrentUser(): Promise<string>;
    
    /**
     * 检查指定用户是否为管理员
     */
    isAdminUser(userId: string): Promise<boolean>;
    
    /**
     * 监听配置文件变化（可选实现）
     */
    onConfigChanged?(callback: (config: BaoskyConfig) => void): void;
}
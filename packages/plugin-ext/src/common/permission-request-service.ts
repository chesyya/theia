// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
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
 * 通用权限请求服务 - 用于所有需要用户确认的操作
 *
 * 设计目标：
 * 1. 提供统一的权限请求接口
 * 2. 支持决策缓存（记住用户选择）
 * 3. 可被模块拦截、API 调用等多场景复用
 */

/**
 * 权限请求的严重级别
 */
export enum PermissionSeverity {
    /** 信息级别 - 蓝色图标 */
    INFO = 'info',
    /** 警告级别 - 黄色图标 */
    WARNING = 'warning',
    /** 高危级别 - 橙色图标 */
    HIGH = 'high',
    /** 严重级别 - 红色图标 */
    CRITICAL = 'critical'
}

/**
 * 权限请求参数
 */
export interface PermissionRequest {
    /** 请求标题 */
    title: string;

    /** 详细消息（支持 Markdown） */
    message: string;

    /** 严重级别 */
    severity: PermissionSeverity;

    /** 发起请求的插件 ID */
    pluginId: string;

    /** 插件显示名称 */
    pluginName: string;

    /**
     * 操作标识符（用于缓存）
     * 例如: `fs.readFile`, `child_process.exec`, `terminal.sendText`
     */
    operationId: string;

    /** 额外的元数据（可选） */
    metadata?: Record<string, any>;
}

/**
 * 权限决策结果
 */
export interface PermissionDecision {
    /** 是否允许 */
    allowed: boolean;

    /** 是否记住此决策 */
    remember: boolean;

    /** 记住的范围 */
    rememberScope?: PermissionRememberScope;

    /** 决策原因（可选） */
    reason?: string;

    /** 决策时间戳 */
    timestamp?: number;
}

/**
 * 记住决策的范围
 */
export enum PermissionRememberScope {
    /** 仅记住此次具体操作（最精确） */
    THIS_OPERATION = 'this_operation',

    /** 记住此插件的所有操作（最宽松） */
    THIS_PLUGIN = 'this_plugin',

    /** 当前会话（不持久化） */
    SESSION_ONLY = 'session_only'
}

/**
 * 权限缓存键
 */
export interface PermissionCacheKey {
    pluginId: string;
    operationId: string;
}

/**
 * 通用权限请求服务接口（RPC Main 接口）
 */
export interface PermissionRequestService {
    /**
     * 请求用户权限（异步，会显示确认对话框）
     *
     * @param request 权限请求参数
     * @returns 权限决策结果
     * @throws Error 如果用户拒绝
     */
    $requestPermission(request: PermissionRequest): Promise<PermissionDecision>;

    /**
     * 获取缓存的权限决策
     *
     * @param key 缓存键
     * @returns 缓存的决策，如果不存在则返回 null
     */
    $getCachedPermission(key: PermissionCacheKey): Promise<PermissionDecision | null>;

    /**
     * 缓存权限决策
     *
     * @param key 缓存键
     * @param decision 决策结果
     */
    $cachePermission(key: PermissionCacheKey, decision: PermissionDecision): Promise<void>;

    /**
     * 清除插件的所有权限缓存
     *
     * @param pluginId 插件 ID
     */
    $clearPluginPermissions(pluginId: string): Promise<void>;

    /**
     * 获取所有缓存的权限（用于管理界面）
     *
     * @returns 所有缓存的权限决策
     */
    $getAllPermissions(): Promise<Map<string, PermissionDecision>>;
}

/**
 * 生成缓存键的字符串表示
 */
export function generateCacheKeyString(key: PermissionCacheKey): string {
    return `${key.pluginId}:${key.operationId}`;
}

/**
 * 解析缓存键字符串
 */
export function parseCacheKeyString(keyString: string): PermissionCacheKey | null {
    const colonIndex = keyString.indexOf(':');
    if (colonIndex === -1) {
        return null;
    }
    return {
        pluginId: keyString.substring(0, colonIndex),
        operationId: keyString.substring(colonIndex + 1)
    };
}

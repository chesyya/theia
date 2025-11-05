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
 * 模块操作信息
 */
export interface ModuleOperation {
    /** 模块 ID，如 'fs', 'child_process' */
    moduleId: string;
    /** 函数名，如 'readFile', 'exec' */
    functionName: string;
    /** 参数（已脱敏） */
    args: any[];
    /** 插件 ID */
    pluginId: string;
    /** 插件显示名称 */
    pluginName: string;
}

/**
 * 权限决策结果
 */
export interface PermissionDecision {
    /** 是否允许 */
    allowed: boolean;
    /** 是否记住此决策 */
    remember: boolean;
    /** 原因 */
    reason?: string;
}

/**
 * 模块敏感级别
 */
export enum ModuleSensitivityLevel {
    CRITICAL = 'critical',  // 严重：如 child_process
    HIGH = 'high',          // 高：如 fs, net
    MEDIUM = 'medium',      // 中：如 os, crypto
    LOW = 'low'            // 低
}

/**
 * 敏感模块配置
 */
export interface SensitiveModuleConfig {
    modules: string[];
    level: ModuleSensitivityLevel;
    description: string;
    securityWarning: string;
}

/**
 * 模块权限检查器接口
 */
export interface ModulePermissionChecker {
    /**
     * 检查模块操作权限（异步，可能触发用户弹窗）
     * @throws Error 如果权限被拒绝
     */
    checkModulePermission(operation: ModuleOperation): Promise<void>;

    /**
     * 获取已缓存的权限决策
     */
    getCachedPermission(pluginId: string, moduleId: string, functionName: string): PermissionDecision | null;

    /**
     * 缓存权限决策
     */
    cachePermission(pluginId: string, moduleId: string, functionName: string, decision: PermissionDecision): void;

    /**
     * 清除插件的所有权限缓存
     */
    clearPluginPermissions(pluginId: string): void;
}

/**
 * 预定义的敏感模块配置
 */
export const SENSITIVE_MODULES: Record<string, SensitiveModuleConfig> = {
    filesystem: {
        modules: ['fs', 'fs/promises', 'node:fs', 'node:fs/promises', 'fs-extra', 'graceful-fs'],
        level: ModuleSensitivityLevel.HIGH,
        description: '文件系统访问',
        securityWarning: '• 读取或修改文件\n• 可能泄露敏感信息\n• 可能破坏系统文件'
    },
    process: {
        modules: ['child_process', 'node:child_process', 'worker_threads', 'node:worker_threads'],
        level: ModuleSensitivityLevel.CRITICAL,
        description: '子进程创建和执行',
        securityWarning: '• 执行系统命令\n• 访问或修改文件系统\n• 可能带来严重安全风险'
    },
    network: {
        modules: ['net', 'node:net', 'http', 'node:http', 'https', 'node:https', 'dgram', 'node:dgram'],
        level: ModuleSensitivityLevel.HIGH,
        description: '网络通信',
        securityWarning: '• 发起网络连接\n• 可能发送数据到外部服务器\n• 可能泄露敏感信息'
    },
    system: {
        modules: ['os', 'node:os'],
        level: ModuleSensitivityLevel.MEDIUM,
        description: '系统信息访问',
        securityWarning: '• 访问系统信息\n• 可能泄露环境变量'
    },
    crypto: {
        modules: ['crypto', 'node:crypto'],
        level: ModuleSensitivityLevel.MEDIUM,
        description: '加密功能',
        securityWarning: '• 使用加密功能\n• 可能用于数据混淆'
    }
};

/**
 * 白名单模块（不拦截）
 */
export const WHITELIST_MODULES = [
    '@theia/',
    'vscode',
    '@types/',
    'tslib',
    'inversify',
    'path',
    'util',
    'events',
    'stream',
    'buffer',
];

/**
 * 检查模块是否在白名单中
 */
export function isWhitelistedModule(moduleId: string): boolean {
    return WHITELIST_MODULES.some(prefix => moduleId.startsWith(prefix));
}

/**
 * 检查模块是否为敏感模块
 */
export function isSensitiveModule(moduleId: string): boolean {
    for (const config of Object.values(SENSITIVE_MODULES)) {
        if (config.modules.includes(moduleId)) {
            return true;
        }
    }
    return false;
}

/**
 * 获取模块的敏感级别配置
 */
export function getSensitiveModuleConfig(moduleId: string): SensitiveModuleConfig | null {
    for (const config of Object.values(SENSITIVE_MODULES)) {
        if (config.modules.includes(moduleId)) {
            return config;
        }
    }
    return null;
}

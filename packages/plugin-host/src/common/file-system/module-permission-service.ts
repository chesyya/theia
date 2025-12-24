import { PluginApiScope } from '..';
import { Plugin } from '../../common/plugin-api-rpc';
// 模块操作信息
export interface ModuleOperation {
    moduleId?: PluginApiScope;
    functionName: string;
    args: any[];
    pluginId: string;
    pluginName: string;
}

export interface SensitiveModuleConfig {
    modules: string[];
    moduleId: PluginApiScope;
    description: string;
}

export const ModulePermissionService = Symbol('ModulePermissionService');

export interface ModulePermissionService {
    $checkModulePermission(operation: ModuleOperation, plugin: Plugin): Promise<void>;
}

// 键是 PluginApiScope 中的任一字符串，值是 string 数组
export type BaoskyPluginApiPermissionsMap = {
    [scope in PluginApiScope]: string[];
};

// baosky api权限类别及具体api
export const BaoskyAPI_PERMISSION_MAP: BaoskyPluginApiPermissionsMap = {
    filesystem: [
        'readFile',
        'writeFile',
        // ...
    ],
    network: [
        // 'fetch',
        // ...
    ],
    process: [

    ]
    // ...
};

// 逆向查找权限类别的类型
export type BaoskyPluginApiToScopeMap = {
    [apiName: string]: PluginApiScope;
};


/**
 * 生成逆向权限类别查找表
 * @date 2025/11/18 - 14:27:40 PM
 * @author wubing
 *
 * @param {PluginApiPermissionsMap} permissionMap
 * @returns {PluginApiToScopeMap}
 */
const generateApiToScopeMap = (permissionMap: BaoskyPluginApiPermissionsMap): BaoskyPluginApiToScopeMap => {
    const reverseMap: BaoskyPluginApiToScopeMap = {};
    for (const scope in permissionMap) {
        if (permissionMap.hasOwnProperty(scope)) {
            const apis = permissionMap[scope as PluginApiScope];
            for (const apiName of apis) {
                // 如果出现重复的 API 名称，这里会覆盖，但通常每个 API 只能属于一个 Scope
                reverseMap[apiName] = scope as PluginApiScope;
            }
        }
    }
    return reverseMap;
};

export const BaoskyAPI_TO_SCOPE_MAP: BaoskyPluginApiToScopeMap = generateApiToScopeMap(BaoskyAPI_PERMISSION_MAP);

export type SensitiveModulesMap = {
    [K in PluginApiScope]: SensitiveModuleConfig;
}


/**
 * 预定义的敏感模块配置
 * @date 2025/11/18 - 14:27:27 PM
 * @author wubing
 *
 * @type {SensitiveModulesMap}
 */
export const SENSITIVE_MODULES: SensitiveModulesMap = {
    filesystem: {
        modules: ['fs', 'fs/promises', 'node:fs', 'node:fs/promises', 'fs-extra', 'graceful-fs'],
        description: '文件系统访问',
        moduleId: 'filesystem'
    },
    process: {
        modules: ['child_process', 'node:child_process', 'worker_threads', 'node:worker_threads'],
        description: '子进程创建和执行',
        moduleId: 'process'
    },
    network: {
        modules: ['net', 'node:net', 'http', 'node:http', 'https', 'node:https', 'dgram', 'node:dgram'],
        description: '网络通信',
        moduleId: 'network'
    },
    // system: {
    //     modules: ['os', 'node:os'],
    //     description: '系统信息访问'
    // },
    // crypto: {
    //     modules: ['crypto', 'node:crypto'],
    //     description: '加密功能'
    // }
};


/**
 * 检查模块是否为敏感模块
 * @date 2025/11/18 - 14:27:13 PM
 * @author wubing
 *
 * @export
 * @param {string} moduleId
 * @returns {boolean}
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
 * 获取敏感模块配置
 * @date 2025/11/18 - 14:26:55 PM
 * @author wubing
 *
 * @export
 * @param {string} moduleId
 * @returns {(SensitiveModuleConfig | null)}
 */
export function getSensitiveModuleConfig(moduleId: string): SensitiveModuleConfig | null {
    for (const config of Object.values(SENSITIVE_MODULES)) {
        if (config.modules.includes(moduleId)) {
            return config;
        }
    }
    return null;
}

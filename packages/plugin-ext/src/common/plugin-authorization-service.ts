import { Event, PluginAuthorizationChangeEvent } from '@theia/core';

export const PluginAuthorizationService = Symbol('PluginAuthorizationService');

export interface PluginAuthorizationService {
    /**
     * 检查插件是否已授权
     * @param pluginId 插件ID
     * @returns 如果插件已授权返回true，否则返回false
     */
    isAuthorized(pluginId: string): Promise<boolean>;
    
    /**
     * 获取所有未授权的插件ID列表
     * @returns 未授权的插件ID数组
     */
    getUnauthorizedPluginIds(): Promise<string[]>;
    
    /**
     * 获取所有已授权的插件ID列表
     * @returns 已授权的插件ID数组
     */
    getAuthorizedPluginIds(): Promise<string[]>;
    
    /**
     * 授权状态变更事件
     */
    readonly onAuthorizationChanged: Event<PluginAuthorizationChangeEvent>;
}
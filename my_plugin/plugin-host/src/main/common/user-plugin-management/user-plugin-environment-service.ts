/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-05 09:22:09
 * @FilePath: /workdir/packages/plugin-host/src/main/common/user-plugin-management/user-plugin-environment-service.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-11 09:34:39
 */
import { injectable, inject } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { PluginEnvironment } from '../plugin-environment';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { SharedStorage, UserStorage } from '@baosky/platform/lib/common/storage-space/user-storage/user-storage-utils'

export const PluginStorageKey = 'plugins';


/**
 * 用户插件环境管理服务
 */
@injectable()
export class UserPluginEnvironment {

    @inject(PluginEnvironment)
    protected readonly baseEnvironment: PluginEnvironment;

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;


    protected _sharedPluginsDirUri: URI | undefined;
    protected _userPluginsRootDirUri: URI | undefined;

    /**
     * 获取共享插件目录URI
     */
    async getSharedPluginsDirUri(): Promise<URI> {
        if (!this._sharedPluginsDirUri) {
            const configDir = new URI(await this.environments.getConfigDirUri());
            const sharedDir = configDir.resolve(SharedStorage);
            this._sharedPluginsDirUri = sharedDir.resolve(PluginStorageKey);
        }
        return this._sharedPluginsDirUri;
    }

    /**
     * 获取用户插件根目录URI
     */
    async getUserPluginsRootDirUri(): Promise<URI> {
        if (!this._userPluginsRootDirUri) {
            const pluginsDir = await this.baseEnvironment.getPluginsDirUri();
            this._userPluginsRootDirUri = pluginsDir;
        }
        return this._userPluginsRootDirUri;
    }

    /**
     * 获取特定用户的插件目录URI
     */
    async getUserPluginsDirUri(userId: string): Promise<URI> {
        const userPluginsRoot = await this.getUserPluginsRootDirUri();
        const userDir = userPluginsRoot.resolve(userId);
        return userDir.resolve(PluginStorageKey)
    }

    /**
     * 获取所有相关的插件目录
     * 优先级: 用户目录 > 共享目录
     */
    async getAllPluginDirectories(userId?: string): Promise<URI[]> {
        const directories: URI[] = [];

        // 用户插件目录优先级更高
        if (userId) {
            directories.push(await this.getUserPluginsDirUri(userId));
        }

        // 添加共享插件目录
        directories.push(await this.getSharedPluginsDirUri());

        return directories;
    }

    /**
     * 判断路径是否为用户插件路径
     */
    isUserPluginPath(pluginPath: string, userId: string): boolean {
        return pluginPath.includes(`/${UserStorage}/${userId}/${PluginStorageKey}`);
    }

    /**
     * 判断路径是否为共享插件路径
     */
    isSharedPluginPath(pluginPath: string): boolean {
        return pluginPath.includes(`/${SharedStorage}/${PluginStorageKey}`);
    }

}

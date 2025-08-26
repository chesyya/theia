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

import { injectable, inject } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { PluginTheiaEnvironment } from '../plugin-theia-environment';

/**
 * 用户插件环境管理服务
 * 扩展原有的PluginTheiaEnvironment以支持用户作用域的插件目录结构
 * 
 * 目录结构:
 * .theia/plugins/
 * ├── shared/           # 共享插件目录
 * └── users/            # 用户插件根目录
 *     ├── alice/        # 用户alice的私有插件
 *     ├── bob/          # 用户bob的私有插件
 *     └── admin/        # 管理员的私有插件
 */
@injectable()
export class UserPluginEnvironmentService {

    @inject(PluginTheiaEnvironment)
    protected readonly baseEnvironment: PluginTheiaEnvironment;

    protected _sharedPluginsDirUri: URI | undefined;
    protected _userPluginsRootDirUri: URI | undefined;

    /**
     * 获取共享插件目录URI
     */
    async getSharedPluginsDirUri(): Promise<URI> {
        if (!this._sharedPluginsDirUri) {
            const pluginsDir = await this.baseEnvironment.getPluginsDirUri();
            this._sharedPluginsDirUri = pluginsDir.resolve('shared');
        }
        return this._sharedPluginsDirUri;
    }

    /**
     * 获取用户插件根目录URI
     */
    async getUserPluginsRootDirUri(): Promise<URI> {
        if (!this._userPluginsRootDirUri) {
            const pluginsDir = await this.baseEnvironment.getPluginsDirUri();
            this._userPluginsRootDirUri = pluginsDir.resolve('users');
        }
        return this._userPluginsRootDirUri;
    }

    /**
     * 获取特定用户的插件目录URI
     */
    async getUserPluginsDirUri(userId: string): Promise<URI> {
        const userPluginsRoot = await this.getUserPluginsRootDirUri();
        return userPluginsRoot.resolve(userId);
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
        return pluginPath.includes(`/users/${userId}/`);
    }

    /**
     * 判断路径是否为共享插件路径
     */
    isSharedPluginPath(pluginPath: string): boolean {
        return pluginPath.includes('/shared/');
    }

}
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
import { ILogger } from '@theia/core/lib/common/logger';
import { FileUri } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import { PluginDeployerResolver, PluginDeployerResolverContext } from '../../../common/plugin-protocol';
import { UserPluginEnvironmentService } from '../../common/user-plugin-management/user-plugin-environment-service';

/**
 * 用户插件目录解析器
 * 
 * 负责扫描用户作用域的插件目录结构：
 * - .theia/plugins/shared/ (共享插件)
 * - .theia/plugins/users/{userId}/ (用户私有插件)
 * 
 * 支持的URL格式:
 * - user-plugins:// - 扫描所有用户插件目录
 * - user-plugins://userId - 扫描特定用户的插件目录
 * - shared-plugins:// - 只扫描共享插件目录
 */
@injectable()
export class UserPluginDirectoryResolver implements PluginDeployerResolver {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserPluginEnvironmentService)
    protected readonly userPluginEnvironment: UserPluginEnvironmentService;

    accept(pluginId: string): boolean {
        // 只有启用用户插件管理功能时才接受用户插件URL
        const enableUserPlugins = process.env.THEIA_USER_PLUGINS_ENABLED === 'true';
        
        if (!enableUserPlugins) {
            return false;
        }
        
        return pluginId.startsWith('user-plugins://') || 
               pluginId.startsWith('shared-plugins://');
    }

    async resolve(pluginResolverContext: PluginDeployerResolverContext): Promise<void> {
        const pluginId = pluginResolverContext.getOriginId();
        this.logger.info(`[USER-PLUGIN-RESOLVER] 开始解析: ${pluginId}`);

        try {
            if (pluginId.startsWith('shared-plugins://')) {
                await this.resolveSharedPlugins(pluginResolverContext);
            } else if (pluginId.startsWith('user-plugins://')) {
                const userId = this.extractUserIdFromPluginId(pluginId);
                if (userId) {
                    await this.resolveUserPlugins(pluginResolverContext, userId);
                } else {
                    await this.resolveAllUserPlugins(pluginResolverContext);
                }
            }
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-RESOLVER] 解析插件失败: ${pluginId}`, error);
        }
    }

    /**
     * 解析共享插件目录
     */
    private async resolveSharedPlugins(pluginResolverContext: PluginDeployerResolverContext): Promise<void> {
        const sharedPluginDir = await this.userPluginEnvironment.getSharedPluginsDirUri();
        const sharedPluginPath = FileUri.fsPath(sharedPluginDir);

        this.logger.info(`[USER-PLUGIN-RESOLVER] 扫描共享插件目录: ${sharedPluginPath}`);
        await this.scanPluginDirectory(pluginResolverContext, sharedPluginPath, 'shared');
    }

    /**
     * 解析特定用户的插件目录
     */
    private async resolveUserPlugins(pluginResolverContext: PluginDeployerResolverContext, userId: string): Promise<void> {
        const userPluginDir = await this.userPluginEnvironment.getUserPluginsDirUri(userId);
        const userPluginPath = FileUri.fsPath(userPluginDir);

        this.logger.debug(`[USER-PLUGIN-RESOLVER] 扫描用户插件目录: ${userPluginPath} (用户: ${userId})`);
        await this.scanPluginDirectory(pluginResolverContext, userPluginPath, `user:${userId}`);
    }

    /**
     * 解析所有用户插件目录
     */
    private async resolveAllUserPlugins(pluginResolverContext: PluginDeployerResolverContext): Promise<void> {
        // 首先扫描共享目录
        await this.resolveSharedPlugins(pluginResolverContext);

        // 然后扫描所有用户目录
        const userPluginsRootDir = await this.userPluginEnvironment.getUserPluginsRootDirUri();
        const userPluginsRootPath = FileUri.fsPath(userPluginsRootDir);

        if (await fs.pathExists(userPluginsRootPath)) {
            const userDirs = await fs.readdir(userPluginsRootPath);
            
            for (const userDir of userDirs) {
                const userDirPath = path.join(userPluginsRootPath, userDir);
                const stat = await fs.stat(userDirPath);
                
                if (stat.isDirectory()) {
                    this.logger.debug(`[USER-PLUGIN-RESOLVER] 扫描用户目录: ${userDirPath} (用户: ${userDir})`);
                    await this.scanPluginDirectory(pluginResolverContext, userDirPath, `user:${userDir}`);
                }
            }
        }
    }

    /**
     * 扫描插件目录
     */
    private async scanPluginDirectory(
        pluginResolverContext: PluginDeployerResolverContext, 
        directoryPath: string, 
        source: string
    ): Promise<void> {
        if (!await fs.pathExists(directoryPath)) {
            this.logger.debug(`[USER-PLUGIN-RESOLVER] 目录不存在，跳过: ${directoryPath}`);
            return;
        }

        try {
            const files = await fs.readdir(directoryPath);
            let pluginCount = 0;

            for (const file of files) {
                const filePath = path.resolve(directoryPath, file);
                const stat = await fs.stat(filePath);

                if (stat.isDirectory() || this.isPluginFile(file)) {
                    const pluginName = `${source}:${file}`;
                    pluginResolverContext.addPlugin(pluginName, filePath);
                    pluginCount++;
                    
                    this.logger.debug(`[USER-PLUGIN-RESOLVER] 发现插件: ${pluginName} -> ${filePath}`);
                }
            }

            this.logger.info(`[USER-PLUGIN-RESOLVER] 在 ${source} 中发现 ${pluginCount} 个插件`);
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-RESOLVER] 扫描目录失败: ${directoryPath}`, error);
        }
    }

    /**
     * 判断文件是否为插件文件
     */
    private isPluginFile(filename: string): boolean {
        const ext = path.extname(filename).toLowerCase();
        return ext === '.vsix' || ext === '.tgz' || ext === '.tar.gz';
    }

    /**
     * 从插件ID中提取用户ID
     */
    private extractUserIdFromPluginId(pluginId: string): string | undefined {
        const match = pluginId.match(/^user-plugins:\/\/(.+)$/);
        return match?.[1];
    }

}
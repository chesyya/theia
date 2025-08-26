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
import { UserPluginEnvironmentService } from '../../common/user-plugin-management/user-plugin-environment-service';

/**
 * 插件安装位置选项
 */
export enum PluginInstallLocation {
    PERSONAL = 'personal',  // 个人插件目录
    SHARED = 'shared'       // 共享插件目录
}

/**
 * 插件安装请求
 */
export interface PluginInstallRequest {
    pluginPath: string;           // 插件源路径
    userId: string;               // 安装用户ID
    location: PluginInstallLocation;  // 安装位置
    isAdmin?: boolean;            // 是否为管理员操作
}

/**
 * 插件安装结果
 */
export interface PluginInstallResult {
    success: boolean;
    targetPath?: string;
    error?: string;
}

/**
 * 用户插件安装服务
 * 
 * 职责：
 * 1. 处理插件安装到用户目录或共享目录
 * 2. 为管理员提供安装位置选择功能
 * 3. 确保目录权限和文件系统操作的安全性
 */
@injectable()
export class UserPluginInstallationService {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserPluginEnvironmentService)
    protected readonly userPluginEnvironment: UserPluginEnvironmentService;

    /**
     * 安装插件到指定位置
     */
    async installPlugin(request: PluginInstallRequest): Promise<PluginInstallResult> {
        const { pluginPath, userId, location, isAdmin = false } = request;
        
        this.logger.info(`[USER-PLUGIN-INSTALL] 开始安装插件: ${pluginPath} -> ${location} (用户: ${userId}, 管理员: ${isAdmin})`);

        try {
            // 验证权限
            if (!this.validateInstallPermissions(request)) {
                throw new Error('权限不足：无法安装到指定位置');
            }

            // 确定目标目录
            const targetDir = await this.getTargetDirectory(location, userId);
            
            // 确保目标目录存在
            await this.ensureDirectoryExists(targetDir);
            
            // 执行插件安装
            const targetPath = await this.performInstallation(pluginPath, targetDir);
            
            this.logger.info(`[USER-PLUGIN-INSTALL] 插件安装成功: ${targetPath}`);
            
            return {
                success: true,
                targetPath
            };
            
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-INSTALL] 插件安装失败:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * 获取用户可用的安装位置
     */
    getAvailableInstallLocations(userId: string, isAdmin: boolean = false): PluginInstallLocation[] {
        const locations: PluginInstallLocation[] = [];
        
        // 所有用户都可以安装到个人目录
        locations.push(PluginInstallLocation.PERSONAL);
        
        // 只有管理员可以安装到共享目录
        if (isAdmin) {
            locations.push(PluginInstallLocation.SHARED);
        }
        
        return locations;
    }

    /**
     * 验证安装权限
     */
    private validateInstallPermissions(request: PluginInstallRequest): boolean {
        const { location, isAdmin } = request;
        
        // 安装到共享目录需要管理员权限
        if (location === PluginInstallLocation.SHARED && !isAdmin) {
            return false;
        }
        
        return true;
    }

    /**
     * 获取目标安装目录
     */
    private async getTargetDirectory(location: PluginInstallLocation, userId: string): Promise<string> {
        let targetUri;
        
        switch (location) {
            case PluginInstallLocation.PERSONAL:
                targetUri = await this.userPluginEnvironment.getUserPluginsDirUri(userId);
                break;
            case PluginInstallLocation.SHARED:
                targetUri = await this.userPluginEnvironment.getSharedPluginsDirUri();
                break;
            default:
                throw new Error(`不支持的安装位置: ${location}`);
        }
        
        return FileUri.fsPath(targetUri);
    }

    /**
     * 确保目录存在
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!await fs.pathExists(dirPath)) {
            await fs.mkdirp(dirPath);
            this.logger.debug(`[USER-PLUGIN-INSTALL] 创建目录: ${dirPath}`);
        }
    }

    /**
     * 执行具体的安装操作
     */
    private async performInstallation(sourcePath: string, targetDir: string): Promise<string> {
        const pluginName = require('path').basename(sourcePath);
        const targetPath = require('path').join(targetDir, pluginName);
        
        // 检查目标是否已存在
        if (await fs.pathExists(targetPath)) {
            // 如果存在，先备份或删除旧版本
            const backupPath = `${targetPath}.backup.${Date.now()}`;
            await fs.move(targetPath, backupPath);
            this.logger.debug(`[USER-PLUGIN-INSTALL] 备份已存在插件: ${targetPath} -> ${backupPath}`);
        }
        
        // 复制插件到目标位置
        await fs.copy(sourcePath, targetPath);
        
        return targetPath;
    }

    /**
     * 卸载插件
     */
    async uninstallPlugin(pluginPath: string, userId: string): Promise<PluginInstallResult> {
        this.logger.info(`[USER-PLUGIN-INSTALL] 开始卸载插件: ${pluginPath} (用户: ${userId})`);
        
        try {
            if (await fs.pathExists(pluginPath)) {
                await fs.remove(pluginPath);
                this.logger.info(`[USER-PLUGIN-INSTALL] 插件卸载成功: ${pluginPath}`);
                
                return { success: true };
            } else {
                throw new Error('插件路径不存在');
            }
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-INSTALL] 插件卸载失败:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

}
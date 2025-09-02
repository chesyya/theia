// *****************************************************************************
// Copyright (C) 2020 TypeFox and others.
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
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import URI from '@theia/core/lib/common/uri';
import { PluginTheiaEnvironment } from '@theia/plugin-ext/lib/main/common/plugin-theia-environment';
import { BaoskyConfigService } from '@theia/plugin-ext/lib/main/common/baosky-config-service';
import { ILogger } from '@theia/core/lib/common/logger';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';

/**
 * 用户目录映射接口
 */
interface UserDirectoryMapping {
    [userId: string]: {
        directoryId: string;
        lastUpdated: string;
        displayName?: string;
    };
}

@injectable()
export class PluginVSCodeEnvironment {

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    @inject(PluginTheiaEnvironment)
    protected readonly pluginTheiaEnvironment: PluginTheiaEnvironment;

    @inject(BaoskyConfigService)
    protected readonly configService: BaoskyConfigService;

    @inject(ILogger)
    protected readonly logger: ILogger;

    protected _userExtensionsDirUri: URI | undefined;
    protected _deployedPluginsUri: URI | undefined;
    protected _tmpDirUri: URI | undefined;
    
    // 内存缓存
    private _userMappingCache = new Map<string, string>();
    private _cacheTTL = 300000; // 5分钟缓存
    private _cacheTimestamp = 0;

    async getUserExtensionsDirUri(): Promise<URI> {
        if (!this._userExtensionsDirUri) {
            const configDir = new URI(await this.environments.getConfigDirUri());
            this._userExtensionsDirUri = configDir.resolve('extensions');
        }
        return this._userExtensionsDirUri;
    }

    async getDeploymentDirUri(): Promise<URI> {
        // 从配置文件检查是否启用用户插件管理功能
        const enableUserPlugins = await this.configService.isUserPluginsEnabled();
        
        if (enableUserPlugins) {
            // 使用基于JSON映射文件的用户插件目录结构
            const currentUserId = await this.configService.getCurrentUser();
            const pluginsDir = await this.pluginTheiaEnvironment.getPluginsDirUri();
            
            // 获取或创建用户目录ID（基于JSON映射）
            const userDirId = await this.getUserDirectoryId(currentUserId, pluginsDir.path.toString());
            const userPluginsDir = pluginsDir.resolve('users').resolve(userDirId);
            
            // 确保用户插件目录存在
            await this.ensureUserPluginDirExists(userPluginsDir.path.toString(), currentUserId);
            
            return userPluginsDir;
        }
        
        // 回退到传统的 deployedPlugins 目录
        if (!this._deployedPluginsUri) {
            const configDir = new URI(await this.environments.getConfigDirUri());
            this._deployedPluginsUri = configDir.resolve('deployedPlugins');
        }
        return this._deployedPluginsUri;
    }

    async getTempDirUri(prefix?: string): Promise<URI> {
        if (!this._tmpDirUri) {
            const configDir: URI = new URI(await this.environments.getConfigDirUri());
            this._tmpDirUri = configDir.resolve('tmp');
        }

        if (prefix) {
            return this._tmpDirUri.resolve(prefix);
        }

        return this._tmpDirUri;
    }

    /**
     * 验证用户ID安全性
     */
    private validateUserId(userId: string): void {
        if (!userId || typeof userId !== 'string') {
            throw new Error('userId cannot be empty');
        }
        
        // 防止路径注入攻击
        if (userId.includes('../') || userId.includes('..\\') || 
            userId.includes('/') || userId.includes('\\') ||
            userId.includes('<') || userId.includes('>') ||
            userId.includes('|') || userId.includes('&') ||
            userId.includes(';') || userId.includes('`')) {
            throw new Error(`Invalid userId format: ${userId}`);
        }
        
        // 限制长度，防止过长的用户名
        if (userId.length > 100) {
            throw new Error(`userId too long: ${userId.length} characters`);
        }
        
        this.logger.debug(`[PLUGIN-VSCODE-ENV] 用户ID验证通过: ${userId}`);
    }

    /**
     * 获取用户目录映射文件路径
     */
    private getUserMappingFilePath(pluginsDir: string): string {
        return path.join(pluginsDir, 'user-directory-mapping.json');
    }

    /**
     * 检查缓存是否有效
     */
    private isCacheValid(): boolean {
        return Date.now() - this._cacheTimestamp < this._cacheTTL;
    }

    /**
     * 从缓存获取用户目录ID
     */
    private getCachedUserDirectoryId(userId: string): string | undefined {
        if (!this.isCacheValid()) {
            this._userMappingCache.clear();
            return undefined;
        }
        return this._userMappingCache.get(userId);
    }

    /**
     * 验证用户目录是否真实存在
     */
    private async validateUserDirectoryExists(pluginsDir: string, directoryId: string): Promise<boolean> {
        const userDirPath = path.join(pluginsDir, 'users', directoryId);
        const userInfoPath = path.join(userDirPath, '.user-info.json');
        
        try {
            // 检查目录和用户信息文件是否都存在
            const dirExists = await fs.pathExists(userDirPath);
            const infoExists = await fs.pathExists(userInfoPath);
            
            if (dirExists && infoExists) {
                // 验证用户信息文件的完整性
                const userInfoContent = await fs.readFile(userInfoPath, 'utf-8');
                const userInfo = JSON.parse(userInfoContent);
                return !!userInfo.userId && !!userInfo.createdAt;
            }
        } catch (error) {
            this.logger.warn(`[PLUGIN-VSCODE-ENV] 验证用户目录失败: ${directoryId}`, error);
        }
        
        return false;
    }

    /**
     * 获取或创建用户目录ID（带文件锁和双重验证）
     */
    private async getUserDirectoryId(userId: string, pluginsDir: string): Promise<string> {
        // 输入验证
        this.validateUserId(userId);
        
        // 检查内存缓存
        const cachedId = this.getCachedUserDirectoryId(userId);
        if (cachedId) {
            // 双重验证：即使有缓存，也要验证目录是否真实存在
            if (await this.validateUserDirectoryExists(pluginsDir, cachedId)) {
                this.logger.debug(`[PLUGIN-VSCODE-ENV] 从缓存获取用户 ${userId} 目录ID: ${cachedId}`);
                return cachedId;
            } else {
                // 缓存的目录不存在，清除缓存项
                this._userMappingCache.delete(userId);
                this.logger.warn(`[PLUGIN-VSCODE-ENV] 缓存的用户目录不存在，已清除: ${userId}/${cachedId}`);
            }
        }
        
        const mappingFilePath = this.getUserMappingFilePath(pluginsDir);
        let release: (() => Promise<void>) | undefined;
        
        try {
            // 获取文件锁
            release = await lockfile.lock(mappingFilePath, {
                retries: 3,
                stale: 5000,
                update: 2000
            });
            
            // 读取现有映射文件
            let mapping: UserDirectoryMapping = {};
            if (await fs.pathExists(mappingFilePath)) {
                const content = await fs.readFile(mappingFilePath, 'utf-8');
                mapping = JSON.parse(content);
            }
            
            // 检查用户是否已有目录映射
            if (mapping[userId]) {
                const directoryId = mapping[userId].directoryId;
                
                // 双重验证：验证映射的目录是否真实存在
                if (await this.validateUserDirectoryExists(pluginsDir, directoryId)) {
                    // 更新缓存
                    this._userMappingCache.set(userId, directoryId);
                    this._cacheTimestamp = Date.now();
                    
                    this.logger.debug(`[PLUGIN-VSCODE-ENV] 用户 ${userId} 已有有效目录映射: ${directoryId}`);
                    return directoryId;
                } else {
                    // 映射存在但目录不存在，重新创建目录
                    this.logger.warn(`[PLUGIN-VSCODE-ENV] 用户 ${userId} 映射目录不存在，重新创建: ${directoryId}`);
                    await this.ensureUserPluginDirExists(path.join(pluginsDir, 'users', directoryId), userId);
                    
                    // 更新缓存
                    this._userMappingCache.set(userId, directoryId);
                    this._cacheTimestamp = Date.now();
                    
                    return directoryId;
                }
            }
            
            // 为新用户创建目录ID（使用时间戳 + 随机数确保唯一性）
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            const directoryId = `user_${timestamp}_${random}`;
            
            // 更新映射
            mapping[userId] = {
                directoryId,
                lastUpdated: new Date().toISOString(),
                displayName: userId
            };
            
            // 保存映射文件
            await fs.ensureDir(path.dirname(mappingFilePath));
            await fs.writeFile(mappingFilePath, JSON.stringify(mapping, null, 2), 'utf-8');
            
            // 更新缓存
            this._userMappingCache.set(userId, directoryId);
            this._cacheTimestamp = Date.now();
            
            this.logger.info(`[PLUGIN-VSCODE-ENV] 为用户 ${userId} 创建新目录映射: ${directoryId}`);
            return directoryId;
            
        } catch (error) {
            this.logger.error(`[PLUGIN-VSCODE-ENV] 处理用户目录映射失败:`, {
                userId,
                pluginsDir,
                error: error instanceof Error ? error.message : error
            });
            
            // 回退到基于用户名的目录ID
            const fallbackId = `user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            this.logger.info(`[PLUGIN-VSCODE-ENV] 使用回退目录ID: ${fallbackId}`);
            return fallbackId;
            
        } finally {
            // 释放文件锁
            if (release) {
                try {
                    await release();
                } catch (error) {
                    this.logger.warn(`[PLUGIN-VSCODE-ENV] 释放文件锁失败:`, error);
                }
            }
        }
    }

    /**
     * 确保用户插件目录存在
     */
    private async ensureUserPluginDirExists(userPluginDirPath: string, userId: string): Promise<void> {
        try {
            // 确保目录存在
            await fs.ensureDir(userPluginDirPath);
            
            // 创建用户信息文件（用于标识目录所有者）
            const userInfoPath = path.join(userPluginDirPath, '.user-info.json');
            const userInfo = {
                userId,
                createdAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };
            
            if (!await fs.pathExists(userInfoPath)) {
                await fs.writeFile(userInfoPath, JSON.stringify(userInfo, null, 2), 'utf-8');
                this.logger.info(`[PLUGIN-VSCODE-ENV] 创建用户插件目录: ${userPluginDirPath}`);
            } else {
                // 更新最后访问时间
                try {
                    const existingInfo = JSON.parse(await fs.readFile(userInfoPath, 'utf-8'));
                    existingInfo.lastAccessed = new Date().toISOString();
                    await fs.writeFile(userInfoPath, JSON.stringify(existingInfo, null, 2), 'utf-8');
                } catch (error) {
                    this.logger.warn(`[PLUGIN-VSCODE-ENV] 更新用户信息文件失败:`, error);
                }
            }
            
        } catch (error) {
            this.logger.error(`[PLUGIN-VSCODE-ENV] 创建用户插件目录失败: ${userPluginDirPath}`, error);
            throw error;
        }
    }

    /**
     * 更新用户目录映射（当用户名改变时）
     */
    public async updateUserDirectoryMapping(oldUserId: string, newUserId: string): Promise<void> {
        const pluginsDir = await this.pluginTheiaEnvironment.getPluginsDirUri();
        const mappingFilePath = this.getUserMappingFilePath(pluginsDir.path.toString());
        
        try {
            if (!await fs.pathExists(mappingFilePath)) {
                return;
            }
            
            const content = await fs.readFile(mappingFilePath, 'utf-8');
            const mapping: UserDirectoryMapping = JSON.parse(content);
            
            if (mapping[oldUserId]) {
                // 将旧用户映射移动到新用户ID
                mapping[newUserId] = {
                    ...mapping[oldUserId],
                    lastUpdated: new Date().toISOString(),
                    displayName: newUserId
                };
                delete mapping[oldUserId];
                
                // 保存更新的映射
                await fs.writeFile(mappingFilePath, JSON.stringify(mapping, null, 2), 'utf-8');
                
                this.logger.info(`[PLUGIN-VSCODE-ENV] 用户目录映射已更新: ${oldUserId} -> ${newUserId}`);
                
                // 更新目录中的用户信息文件
                const userPluginsDir = pluginsDir.resolve('users').resolve(mapping[newUserId].directoryId);
                const userInfoPath = path.join(userPluginsDir.path.toString(), '.user-info.json');
                
                if (await fs.pathExists(userInfoPath)) {
                    const userInfo = JSON.parse(await fs.readFile(userInfoPath, 'utf-8'));
                    userInfo.userId = newUserId;
                    userInfo.lastAccessed = new Date().toISOString();
                    await fs.writeFile(userInfoPath, JSON.stringify(userInfo, null, 2), 'utf-8');
                }
            }
            
        } catch (error) {
            this.logger.error(`[PLUGIN-VSCODE-ENV] 更新用户目录映射失败:`, error);
        }
    }
}

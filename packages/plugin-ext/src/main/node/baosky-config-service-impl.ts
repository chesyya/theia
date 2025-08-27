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
import * as fs from '@theia/core/shared/fs-extra';
import { BaoskyConfig, BaoskyConfigService as IBaoskyConfigService } from '../common/baosky-config-service';

/**
 * 宝思科配置服务实现
 * 
 * 负责从 /etc/baosky.ini 配置文件中读取配置信息
 * 支持 INI 格式的配置文件
 */
@injectable()
export class BaoskyConfigServiceImpl implements IBaoskyConfigService {

    private static readonly CONFIG_FILE_PATH = '/etc/baosky.ini';
    private static readonly CONFIG_CACHE_DURATION = 30000; // 30秒缓存

    @inject(ILogger)
    protected readonly logger: ILogger;

    private configCache: BaoskyConfig | undefined;
    private configCacheTime: number = 0;

    /**
     * 获取完整配置
     */
    async getConfig(): Promise<BaoskyConfig> {
        // 检查缓存是否有效
        const now = Date.now();
        if (this.configCache && (now - this.configCacheTime) < BaoskyConfigServiceImpl.CONFIG_CACHE_DURATION) {
            return this.configCache;
        }

        try {
            // 读取配置文件
            const config = await this.readConfigFile();
            
            // 更新缓存
            this.configCache = config;
            this.configCacheTime = now;
            
            this.logger.debug(`[BAOSKY-CONFIG] 配置读取成功: ${JSON.stringify(config)}`);
            return config;
            
        } catch (error) {
            this.logger.warn(`[BAOSKY-CONFIG] 读取配置文件失败，使用默认配置: ${error instanceof Error ? error.message : error}`);
            
            // 返回默认配置
            const defaultConfig: BaoskyConfig = {
                userPluginsEnabled: false,
                currentUser: 'default',
                adminUsers: ['admin', 'root']
            };
            
            this.configCache = defaultConfig;
            this.configCacheTime = now;
            
            return defaultConfig;
        }
    }

    /**
     * 检查是否启用用户插件管理功能
     */
    async isUserPluginsEnabled(): Promise<boolean> {
        const config = await this.getConfig();
        return config.userPluginsEnabled;
    }

    /**
     * 获取当前用户ID
     */
    async getCurrentUser(): Promise<string> {
        const config = await this.getConfig();
        return config.currentUser || 'default';
    }

    /**
     * 检查指定用户是否为管理员
     */
    async isAdminUser(userId: string): Promise<boolean> {
        const config = await this.getConfig();
        return config.adminUsers?.includes(userId) ?? false;
    }

    /**
     * 读取并解析配置文件
     */
    private async readConfigFile(): Promise<BaoskyConfig> {
        if (!await fs.pathExists(BaoskyConfigServiceImpl.CONFIG_FILE_PATH)) {
            throw new Error(`配置文件不存在: ${BaoskyConfigServiceImpl.CONFIG_FILE_PATH}`);
        }

        const configContent = await fs.readFile(BaoskyConfigServiceImpl.CONFIG_FILE_PATH, 'utf-8');
        const parsedConfig = this.parseIniContent(configContent);

        // 解析配置项
        const config: BaoskyConfig = {
            userPluginsEnabled: this.parseBooleanValue(parsedConfig.plugins?.userPluginsEnabled, false),
            currentUser: parsedConfig.user?.currentUser || 'default',
            adminUsers: this.parseArrayValue(parsedConfig.user?.adminUsers, ['admin', 'root'])
        };

        this.logger.info(`[BAOSKY-CONFIG] 从配置文件读取: ${BaoskyConfigServiceImpl.CONFIG_FILE_PATH}`);
        
        return config;
    }

    /**
     * 解析布尔值配置
     */
    private parseBooleanValue(value: any, defaultValue: boolean): boolean {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'on';
        }
        return defaultValue;
    }

    /**
     * 解析数组配置（逗号分隔）
     */
    private parseArrayValue(value: any, defaultValue: string[]): string[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
        return defaultValue;
    }

    /**
     * 简单的 INI 文件解析
     */
    private parseIniContent(content: string): any {
        const result: any = {};
        let currentSection: any = result;
        let currentSectionName = '';

        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过空行和注释
            if (!trimmedLine || trimmedLine.startsWith(';') || trimmedLine.startsWith('#')) {
                continue;
            }
            
            // 解析节点 [section]
            const sectionMatch = trimmedLine.match(/^\[(.+)\]$/);
            if (sectionMatch) {
                currentSectionName = sectionMatch[1];
                currentSection = result[currentSectionName] = {};
                continue;
            }
            
            // 解析键值对 key=value
            const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
            if (keyValueMatch) {
                const key = keyValueMatch[1].trim();
                const value = keyValueMatch[2].trim();
                currentSection[key] = value;
            }
        }
        
        return result;
    }

    /**
     * 清除配置缓存（用于测试）
     */
    clearCache(): void {
        this.configCache = undefined;
        this.configCacheTime = 0;
    }
}
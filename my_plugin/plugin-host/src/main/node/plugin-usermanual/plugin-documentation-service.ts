/*
 * @Author: wubing
 * @Date: 2025/07/10 - 10:26:28 AM
 * @FilePath: /workdir/extensions/plugin-host/src/main/node/plugin-documentation-service.ts
 * Copyright (c) 2023 by BAOSIGHT,All Rights Reserved.
 * @Description:
 */
import * as path from 'path';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger, MaybePromise } from '@theia/core';
import { DeployedPlugin, PluginIdentifiers } from '../../../common/plugin-protocol';
import { bnls } from '@baosky/platform/lib/common/bnls';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { UsermanualServer } from '@baosky/platform/lib/common/documentation/documentation-server'

export interface PluginDocumentationInfo {
    pluginId: string;
    pluginName: string;
    pages: PluginPagesInfo[];
}

export interface PluginPagesInfo {
    filePath: string; // 文档路径
    title: string; // 文档标题
}

/**
 * 插件文档服务接口
 * @date 2025/07/10 - 15:40:25 PM
 * @author wubing
 *
 * @export
 * @interface PluginDocumentationService
 * @typedef {PluginDocumentationService}
 */
export interface PluginDocumentationService {
    getPluginDocumentation(pluginId: string): Promise<PluginDocumentationInfo | undefined>;
    getAllPluginDocumentation(): Promise<PluginDocumentationInfo[]>;
}

/**
 * 插件文档服务实现类
 * @date 2025/07/10 - 15:40:13 PM
 * @author wubing
 *
 * @export
 * @class PluginDocumentationServiceImpl
 * @typedef {PluginDocumentationServiceImpl}
 * @implements {PluginDocumentationService}
 */
@injectable()
export class PluginDocumentationServiceImpl implements PluginDocumentationService, BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;
    @inject(UsermanualServer)
    protected readonly usermanualService: UsermanualServer;

    private pluginDocs = new Map<string, PluginDocumentationInfo>();
    // private commandUrlMap = new Map<string, string>();

    onStart(): MaybePromise<void> {

    }

    /**
     * 注册插件的文档信息
     * @date 2025/07/10 - 15:40:39 PM
     * @author wubing
     *
     * @param {DeployedPlugin} plugin
     */
    registerPluginDocumentation(plugin: DeployedPlugin): void {
        const helpDocs = plugin.contributes?.usermanual;
        if (!helpDocs || !Array.isArray(helpDocs)) {
            return;
        }

        const pluginId = plugin.metadata.model.id;
        const pluginPackagePath = plugin.metadata.model.packagePath;

        const pages: PluginPagesInfo[] = helpDocs.map(doc => {
            const filePath = path.resolve(pluginPackagePath, doc.path);
            return {
                filePath,
                title: doc.title
            };
        });

        this.pluginDocs.set(pluginId, {
            pluginId,
            pluginName: plugin.metadata.model.name,
            pages
        });

        this.usermanualService.registerDocumentation({ pluginId: pluginId, pluginName: plugin.metadata.model.name, pages: pages });

        this.logger.info(bnls.localizeByDefault(`插件 {0} 注册文档失败。`, pluginId));
    }

    private generateDefaultRoute(docPath: string): string {
        const fileNameWithoutExt = docPath.replace(/^.*[\\/]/, '')
            .replace(/\.[^/.]+$/, '');
        return `/${fileNameWithoutExt}`;
    }

    /**
     * 注销插件的文档信息
     * @date 2025/07/10 - 16:01:14 PM
     * @author wubing
     *
     * @param {string} pluginId
     */
    unregisterPluginDocumentation(pluginId: PluginIdentifiers.UnversionedId): void {
        const unversionedId = pluginId.replace(/@.*$/, "");
        this.pluginDocs.delete(unversionedId);
        this.usermanualService.unregisterDocumentation(unversionedId);
        this.logger.info(bnls.localizeByDefault(`注销插件 {0} 文档信息。`, unversionedId));
    }

    /**
     * 获取指定插件的文档信息
     * @date 2025/07/10 - 16:01:24 PM
     * @author wubing
     *
     * @async
     * @param {string} pluginId
     * @returns {Promise<PluginDocumentationInfo | undefined>}
     */
    async getPluginDocumentation(pluginId: string): Promise<PluginDocumentationInfo | undefined> {
        return this.pluginDocs.get(pluginId);
    }

    /**
     * 获取所有插件的文档信息
     * @date 2025/07/10 - 16:01:36 PM
     * @author wubing
     *
     * @async
     * @returns {Promise<PluginDocumentationInfo[]>}
     */
    async getAllPluginDocumentation(): Promise<PluginDocumentationInfo[]> {
        return Array.from(this.pluginDocs.values());
    }
}

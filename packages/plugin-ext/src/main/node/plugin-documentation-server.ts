// *****************************************************************************
// Copyright (C) 2024 Eclipse Theia contributors.
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

import * as express from '@theia/core/shared/express';
import * as path from 'path';
import * as fs from '@theia/core/shared/fs-extra';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ILogger } from '@theia/core';
import { DeployedPlugin } from '../../common/plugin-protocol';
import { PluginDocumentationService, PluginDocumentationInfo } from '../browser/plugin-documentation-frontend-service';
import { JsonRpcServer } from '@theia/core/lib/common/messaging/proxy-factory';

// 简单的HTML转义函数
// function escapeHtml(text: string): string {
//     return text
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&#39;');
// }

// 简单的Markdown到HTML转换函数
function markdownToHtml(markdown: string): string {
    return markdown
        // 标题
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 粗体和斜体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 代码块
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 列表
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        // 段落
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, '<p>$1</p>')
        // 清理多余的段落标签
        .replace(/<p><\/p>/g, '')
        .replace(/<p><p>/g, '<p>')
        .replace(/<\/p><\/p>/g, '</p>');
}



@injectable()
export class PluginDocumentationServer implements BackendApplicationContribution, PluginDocumentationService, JsonRpcServer<PluginDocumentationService> {

    @inject(ILogger)
    protected readonly logger: ILogger;

    private pluginDocs = new Map<string, PluginDocumentationInfo>();
    private readonly DOCS_BASE_PATH = '/plugindoc';
    private docUrlMap = new Map<string, { filePath: string, pluginId: string }>();
    private commandUrlMap = new Map<string, string>();
    private docMappings = new Map<string, { pluginId: string, main: { url: string, filePath: string, commands: string[] }, pages: Array<{ url: string, filePath: string, commands: string[] }> }>();

    configure(app: express.Application): void {
        // 先注册 API 路由，保证不会被 catch-all 路由覆盖
        app.get('/usermanual/api/docs', (req, res) => {
            res.json(this.getAllDocMappings());
        });
        // 再注册 catch-all 文档路由
        app.get('/usermanual/:pluginId/:mainMdName/:subPath(*)?', async (req, res) => {
            const { pluginId, mainMdName, subPath } = req.params;
            let urlKey = `${pluginId}/${mainMdName}`;
            if (subPath) {
                urlKey += `/${subPath}`;
            }
            const doc = this.docUrlMap.get(urlKey);
            if (!doc) {
                res.status(404).send('Help document not found');
                return;
            }
            if (!await fs.pathExists(doc.filePath)) {
                res.status(404).send('File not found');
                return;
            }
            const md = await fs.readFile(doc.filePath, 'utf-8');
            const html = markdownToHtml(md);
            res.send(`
                <html>
                  <head><title>Help: ${urlKey}</title></head>
                  <body>${html}</body>
                </html>
            `);
        });

        // API路由 - 获取插件文档信息
        app.get(`${this.DOCS_BASE_PATH}/api/plugins`, (req, res) => {
            const plugins = Array.from(this.pluginDocs.values()).map(doc => ({
                id: doc.pluginId,
                name: doc.pluginName,
                title: doc.title,
                baseUrl: doc.baseUrl,
                navigationPaths: doc.navigationPaths
            }));
            res.json(plugins);
        });
    }

    // JsonRpcServer required
    setClient(client: PluginDocumentationService | undefined): void { }
    dispose(): void { }

    getAllDocMappings(): Promise<any[]> {
        return Promise.resolve(Array.from(this.docMappings.values()));
    }
    /**
     * 注册插件的文档信息
     */
    registerPluginDocumentation(plugin: DeployedPlugin): void {
        const helpDoc = plugin.contributes?.helpDocumentation;
        if (!helpDoc) {
            return;
        }
        const pluginId = plugin.metadata.model.id;
        const pluginName = plugin.metadata.model.displayName || plugin.metadata.model.name;
        const basePath = (helpDoc as any).basePath || '';
        let mainObj = (helpDoc as any).main;
        if (typeof mainObj === 'string') {
            mainObj = { path: mainObj };
        }
        const mainMd: string = mainObj.path;
        if (!mainMd) return;
        const mainMdName = mainMd.replace(/\.md$/, '');
        const mainFilePath = path.resolve(plugin.metadata.model.packagePath, basePath, mainMd);
        const mainUrl = `/usermanual/${pluginId}/${mainMdName}`;
        const main = {
            url: mainUrl,
            filePath: mainFilePath,
            commands: Array.isArray(mainObj.commands) ? mainObj.commands : []
        };
        // 主文档命令映射
        if (Array.isArray(mainObj.commands)) {
            for (const cmd of mainObj.commands) {
                this.commandUrlMap.set(cmd, mainUrl);
            }
        }
        // 子页面
        let navigationPaths: string[] = [];
        const pagesArr = (helpDoc as any).pages;
        const pages: Array<{ url: string, filePath: string, commands: string[] }> = [];
        if (Array.isArray(pagesArr)) {
            for (const pageObj of pagesArr) {
                const page = typeof pageObj === 'string' ? { path: pageObj } : pageObj;
                const pagePath = page.path;
                const subPath = pagePath.replace(/\.md$/, '').replace(/\\/g, '/');
                const filePath = path.resolve(plugin.metadata.model.packagePath, basePath, pagePath);
                const url = `${mainUrl}/${subPath}`;
                pages.push({
                    url,
                    filePath,
                    commands: Array.isArray(page.commands) ? page.commands : []
                });
                this.docUrlMap.set(`${pluginId}/${mainMdName}/${subPath}`, { filePath, pluginId });
                navigationPaths.push(subPath);
                // 子页面命令映射
                if (Array.isArray(page.commands)) {
                    for (const cmd of page.commands) {
                        this.commandUrlMap.set(cmd, url);
                    }
                }
            }
        }
        // 注册 PluginDocumentationInfo 供前端菜单/命令用
        this.pluginDocs.set(pluginId, {
            pluginId,
            pluginName,
            docPath: mainFilePath,
            mainMdName,
            baseUrl: mainUrl,
            navigationPaths,
            title: (helpDoc as any).title || `${pluginName} Documentation`
        });
        // 存储完整映射
        this.docMappings.set(pluginId, { pluginId, main, pages });
        // 输出到控制台和写入文件，便于后端调试
        const allMappings = this.getAllDocMappings();
        console.log('All plugin doc mappings:', JSON.stringify(allMappings, null, 2));
        try {
            require('fs').writeFileSync('/tmp/theia-doc-mappings.json', JSON.stringify(allMappings, null, 2));
        } catch (e) {
            console.error('Failed to write /tmp/theia-doc-mappings.json:', e);
        }
        this.logger.info(`Registered documentation for plugin: ${pluginId} (${pluginName})`);
        this.logger.info('deployed.contributes:', JSON.stringify(plugin.contributes));
    }

    /**
     * 注销插件的文档信息
     */
    unregisterPluginDocumentation(pluginId: string): void {
        this.pluginDocs.delete(pluginId);
        this.logger.info(`Unregistered documentation for plugin: ${pluginId}`);
    }

    /**
     * 获取插件的文档信息
     */
    async getPluginDocumentation(pluginId: string): Promise<PluginDocumentationInfo | undefined> {
        return this.pluginDocs.get(pluginId);
    }

    /**
     * 获取所有插件的文档信息
     */
    async getAllPluginDocumentation(): Promise<PluginDocumentationInfo[]> {
        return Array.from(this.pluginDocs.values());
    }
} 

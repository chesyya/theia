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

// 简单的HTML转义函数
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
export class PluginDocumentationServer implements BackendApplicationContribution, PluginDocumentationService {

    @inject(ILogger)
    protected readonly logger: ILogger;

    private pluginDocs = new Map<string, PluginDocumentationInfo>();
    private readonly DOCS_BASE_PATH = '/plugindoc';

    configure(app: express.Application): void {
        // 设置静态文件服务
        app.use(this.DOCS_BASE_PATH, express.static(path.join(__dirname, '..', 'browser', 'documentation', 'static')));

        // 主文档页面路由
        app.get(`${this.DOCS_BASE_PATH}/:pluginId`, async (req, res) => {
            const pluginId = req.params.pluginId;
            const docInfo = this.pluginDocs.get(pluginId);

            if (!docInfo) {
                res.status(404).send('Plugin documentation not found');
                return;
            }

            try {
                await this.serveDocumentation(req, res, docInfo);
            } catch (error) {
                this.logger.error(`Error serving documentation for plugin ${pluginId}:`, error);
                res.status(500).send('Internal server error');
            }
        });

        // 特定路径的文档路由
        app.get(`${this.DOCS_BASE_PATH}/:pluginId/:docPath(*)`, async (req, res) => {
            const pluginId = req.params.pluginId;
            const docPath = req.params.docPath;
            const docInfo = this.pluginDocs.get(pluginId);

            if (!docInfo) {
                res.status(404).send('Plugin documentation not found');
                return;
            }

            try {
                await this.serveDocumentationPath(req, res, docInfo, docPath);
            } catch (error) {
                this.logger.error(`Error serving documentation path for plugin ${pluginId}:`, error);
                res.status(500).send('Internal server error');
            }
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
        const docPath = path.resolve(plugin.metadata.model.packagePath, helpDoc.path);
        const baseUrl = helpDoc.baseUrl || `${this.DOCS_BASE_PATH}/${pluginId}`;
        const navigationPaths = helpDoc.navigationPaths || [];
        const title = helpDoc.title || `${pluginName} Documentation`;

        this.pluginDocs.set(pluginId, {
            pluginId,
            pluginName,
            docPath,
            baseUrl,
            navigationPaths,
            title
        });

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

    /**
     * 服务主文档页面
     */
    private async serveDocumentation(req: express.Request, res: express.Response, docInfo: PluginDocumentationInfo): Promise<void> {
        const pluginPath = path.dirname(docInfo.docPath);
        const fullDocPath = path.resolve(pluginPath, docInfo.docPath);

        if (!await fs.pathExists(fullDocPath)) {
            res.status(404).send('Documentation file not found');
            return;
        }

        const content = await fs.readFile(fullDocPath, 'utf-8');
        const html = this.convertMarkdownToHtml(content, docInfo);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }

    /**
     * 服务特定路径的文档
     */
    private async serveDocumentationPath(req: express.Request, res: express.Response, docInfo: PluginDocumentationInfo, docPath: string): Promise<void> {
        // 检查是否是允许的导航路径
        if (!docInfo.navigationPaths.includes(docPath)) {
            res.status(404).send('Documentation path not found');
            return;
        }

        const pluginPath = path.dirname(docInfo.docPath);
        const fullPath = path.resolve(pluginPath, docPath);

        if (!await fs.pathExists(fullPath)) {
            res.status(404).send('Documentation file not found');
            return;
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        const html = this.convertMarkdownToHtml(content, docInfo, docPath);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }

    /**
     * 将Markdown转换为HTML
     */
    private convertMarkdownToHtml(content: string, docInfo: PluginDocumentationInfo, currentPath?: string): string {
        const htmlContent = markdownToHtml(content);

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(docInfo.title)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ecf0f1; padding-bottom: 5px; }
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 15px;
            color: #7f8c8d;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .navigation {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .navigation h3 {
            margin-top: 0;
            color: #2c3e50;
        }
        .navigation ul {
            list-style: none;
            padding: 0;
        }
        .navigation li {
            margin: 5px 0;
        }
        .navigation a {
            color: #3498db;
            text-decoration: none;
        }
        .navigation a:hover {
            text-decoration: underline;
        }
        .current-page {
            font-weight: bold;
            color: #2c3e50;
        }
        .back-link {
            margin-bottom: 20px;
        }
        .back-link a {
            color: #3498db;
            text-decoration: none;
        }
        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="back-link">
        <a href="${docInfo.baseUrl}">← Back to ${escapeHtml(docInfo.pluginName)} Documentation</a>
    </div>
    
    ${docInfo.navigationPaths.length > 0 ? `
    <div class="navigation">
        <h3>Navigation</h3>
        <ul>
            <li><a href="${docInfo.baseUrl}" ${!currentPath ? 'class="current-page"' : ''}>Main Documentation</a></li>
            ${docInfo.navigationPaths.map(navPath => `
                <li><a href="${docInfo.baseUrl}/${navPath}" ${currentPath === navPath ? 'class="current-page"' : ''}>${navPath}</a></li>
            `).join('')}
        </ul>
    </div>
    ` : ''}
    
    <div class="content">
        ${htmlContent}
    </div>
</body>
</html>`;
    }
} 

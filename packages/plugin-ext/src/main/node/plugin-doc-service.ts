// *****************************************************************************
// Copyright (C) 2024 and others.
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
import * as fs from 'fs';
import * as path from 'path';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { injectable } from '@theia/core/shared/inversify';

/**
 * 插件信息接口
 */
interface PluginDocInfo {
    id: string;
    name: string;
    file: string;
    path: string;
    menuIndex: number;
}

/**
 * 插件文档服务贡献
 * 提供插件文档的 HTTP 服务端点
 */
@injectable()
export class PluginDocContribution implements BackendApplicationContribution {

    protected pluginDocsDir: string;
    protected templateFile: string;

    constructor() {
        // 插件文档目录
        this.pluginDocsDir = '/root/theia/packages/plugin-ext/plugin-docs';
        // HTML 模板文件
        this.templateFile = '/root/theia/packages/plugin-ext/index.html'
    }

    /**
     * 配置 Express 路由
     */
    configure(app: express.Application): void {
        // 主页面路由 - 返回带有插件菜单的完整 HTML
        app.get('/plugin/doc', (req, res) => {
            try {
                this.serveDocumentPage(res);
            } catch (error) {
                console.error('处理插件文档请求失败:', error);
                res.status(500).send('服务器错误');
            }
        });

        // 获取特定插件文档内容的 API
        app.get('/plugin/doc/:pluginId', (req, res) => {
            try {
                const pluginId = req.params.pluginId;
                this.servePluginContent(pluginId, res);
            } catch (error) {
                console.error('获取插件文档失败:', error);
                res.status(500).send('服务器错误');
            }
        });

        // 获取所有插件列表的 API
        app.get('/plugin/list', (req, res) => {
            try {
                const plugins = this.scanPluginDocs();
                res.json(plugins);
            } catch (error) {
                console.error('获取插件列表失败:', error);
                res.status(500).json({ error: 'Failed to get plugin list' });
            }
        });

        console.log('[PluginDocContribution] 插件文档路由已配置:');
        console.log('  - GET /plugin/doc - 主文档页面');
        console.log('  - GET /plugin/doc/:pluginId - 获取插件文档');
        console.log('  - GET /plugin/list - 获取插件列表');
    }

    /**
     * 扫描插件文档目录，获取所有插件
     */
    protected scanPluginDocs(): PluginDocInfo[] {
        const plugins: PluginDocInfo[] = [];

        // 确保目录存在
        if (!fs.existsSync(this.pluginDocsDir)) {
            console.log('[PluginDocContribution] 插件文档目录不存在，创建目录:', this.pluginDocsDir);
            fs.mkdirSync(this.pluginDocsDir, { recursive: true });
            return plugins;
        }

        const files = fs.readdirSync(this.pluginDocsDir);

        files.forEach((file, index) => {
            if (file.endsWith('.html')) {
                const pluginId = path.basename(file, '.html');
                const pluginName = this.formatPluginName(pluginId);

                plugins.push({
                    id: pluginId,
                    name: pluginName,
                    file: file,
                    path: path.join(this.pluginDocsDir, file),
                    menuIndex: 12 + index // 从 12 开始，因为前面有 11 个菜单项
                });
            }
        });

        return plugins;
    }

    /**
     * 格式化插件名称
     */
    protected formatPluginName(pluginId: string): string {
        return pluginId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * 生成插件菜单项 HTML
     */
    protected generatePluginMenuItems(plugins: PluginDocInfo[]): string {
        if (plugins.length === 0) {
            return '';
        }

        let menuHtml = '\n                                                <!-- 插件文档分类 -->\n';
        menuHtml += '                                                <li class="theme-doc-sidebar-item-category theme-doc-sidebar-item-category-level-2 menu__list-item menu__list-item--collapsed">\n';
        menuHtml += '                                                    <div class="menu__list-item-collapsible">\n';
        menuHtml += '                                                        <a class="menu__link menu__link--sublist" aria-expanded="false" tabindex="0" href="#">12. 插件文档</a>\n';
        menuHtml += '                                                        <button aria-label="展开侧边栏分类 &#x27;12. 插件文档&#x27;" type="button" class="clean-btn menu__caret"></button>\n';
        menuHtml += '                                                    </div>\n';
        menuHtml += '                                                    <ul style="display:none;" class="menu__list">\n';

        plugins.forEach((plugin, index) => {
            menuHtml += `                                                        <li class="theme-doc-sidebar-item-link theme-doc-sidebar-item-link-level-3 menu__list-item">\n`;
            menuHtml += `                                                            <a class="menu__link" tabindex="0" href="#" data-plugin-id="${plugin.id}">12.${index + 1} ${plugin.name}</a>\n`;
            menuHtml += `                                                        </li>\n`;
        });

        menuHtml += '                                                    </ul>\n';
        menuHtml += '                                                </li>\n';

        return menuHtml;
    }

    /**
     * 转换插件 HTML 内容以适配 Docusaurus 样式
     */
    protected transformPluginContent(htmlContent: string, pluginName: string): string {
        // 提取 body 内容
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

        // 包装成 Docusaurus 风格的内容
        return `
            <header>
                <h1>${pluginName}</h1>
            </header>
            ${bodyContent}
        `;
    }

    /**
     * 服务文档主页面
     */
    protected serveDocumentPage(res: express.Response): void {
        // 检查模板文件是否存在
        const filePath = '/root/theia/packages/plugin-ext/index.html'
        if (!fs.existsSync(filePath)) {
            res.status(404).send('模板文件不存在');
            return;
        }

        // 读取模板文件
        let template = fs.readFileSync(this.templateFile, 'utf-8');

        // 扫描插件
        const plugins = this.scanPluginDocs();
        console.log(`[PluginDocContribution] 找到 ${plugins.length} 个插件文档`);

        // 生成插件菜单项
        const pluginMenuItems = this.generatePluginMenuItems(plugins);

        // 替换占位符
        template = template.replace('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->', pluginMenuItems);

        res.send(template);
    }

    /**
     * 服务插件内容
     */
    protected servePluginContent(pluginId: string, res: express.Response): void {
        const pluginFile = path.join(this.pluginDocsDir, `${pluginId}.html`);

        if (!fs.existsSync(pluginFile)) {
            res.status(404).send('插件文档不存在');
            return;
        }

        // 读取插件文档内容
        const pluginContent = fs.readFileSync(pluginFile, 'utf-8');

        // 获取插件名称
        const pluginName = this.formatPluginName(pluginId);

        // 转换内容以适配样式
        const transformedContent = this.transformPluginContent(pluginContent, pluginName);

        res.send(transformedContent);
    }
}

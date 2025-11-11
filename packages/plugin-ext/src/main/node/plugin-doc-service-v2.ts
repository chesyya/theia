// *****************************************************************************
// Copyright (C) 2024 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
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
 * 插件文档服务贡献 V2 - 完全适配 Docusaurus 架构
 * 每个插件都有独立的 URL 和完整的 HTML 页面
 */
@injectable()
export class PluginDocContributionV2 implements BackendApplicationContribution {

    protected pluginDocsDir: string;
    protected templateFile: string;

    constructor() {
        // 插件文档目录
        this.pluginDocsDir = path.join(__dirname, '../../../plugin-docs');
        // HTML 模板文件
        this.templateFile = path.join(__dirname, '../../../index.html');
    }

    /**
     * 配置 Express 路由
     */
    configure(app: express.Application): void {
        // 插件列表 API
        app.get('/plugin/list', (req, res) => {
            try {
                const plugins = this.scanPluginDocs();
                res.json(plugins);
            } catch (error) {
                console.error('获取插件列表失败:', error);
                res.status(500).json({ error: 'Failed to get plugin list' });
            }
        });

        // 特定插件的完整页面（像 Docusaurus 页面一样）
        app.get('/plugin/doc/:pluginId', (req, res) => {
            try {
                const pluginId = req.params.pluginId;
                this.servePluginPage(pluginId, res);
            } catch (error) {
                console.error('获取插件页面失败:', error);
                res.status(500).send('服务器错误');
            }
        });

        // 默认插件文档首页
        app.get('/plugin/doc', (req, res) => {
            try {
                this.serveIndexPage(res);
            } catch (error) {
                console.error('处理首页请求失败:', error);
                res.status(500).send('服务器错误');
            }
        });

        console.log('[PluginDocContribution] 插件文档路由已配置（Docusaurus 模式）:');
        console.log('  - GET /plugin/doc - 插件文档首页');
        console.log('  - GET /plugin/doc/:pluginId - 具体插件页面（完整 HTML）');
        console.log('  - GET /plugin/list - 插件列表 API');
    }

    /**
     * 扫描插件文档目录，获取所有插件
     */
    protected scanPluginDocs(): PluginDocInfo[] {
        const plugins: PluginDocInfo[] = [];

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
                    menuIndex: 12 + index
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
     * 生成插件菜单项 HTML（使用真实的 URL）
     */
    protected generatePluginMenuItems(plugins: PluginDocInfo[], currentPluginId?: string): string {
        if (plugins.length === 0) {
            return '';
        }

        let menuHtml = '\n                                                <!-- 插件文档分类 -->\n';
        menuHtml += '                                                <li class="theme-doc-sidebar-item-category theme-doc-sidebar-item-category-level-2 menu__list-item menu__list-item--collapsed">\n';
        menuHtml += '                                                    <div class="menu__list-item-collapsible">\n';
        menuHtml += '                                                        <a class="menu__link menu__link--sublist" aria-expanded="false" tabindex="0" href="/plugin/doc">12. 插件文档</a>\n';
        menuHtml += '                                                        <button aria-label="展开侧边栏分类 &#x27;12. 插件文档&#x27;" type="button" class="clean-btn menu__caret"></button>\n';
        menuHtml += '                                                    </div>\n';
        menuHtml += '                                                    <ul style="display:none;" class="menu__list">\n';

        plugins.forEach((plugin, index) => {
            const isActive = currentPluginId === plugin.id;
            const activeClass = isActive ? ' menu__link--active' : '';
            const ariaCurrent = isActive ? ' aria-current="page"' : '';

            menuHtml += `                                                        <li class="theme-doc-sidebar-item-link theme-doc-sidebar-item-link-level-3 menu__list-item">\n`;
            menuHtml += `                                                            <a class="menu__link${activeClass}" tabindex="0"${ariaCurrent} href="/plugin/doc/${plugin.id}">12.${index + 1} ${plugin.name}</a>\n`;
            menuHtml += `                                                        </li>\n`;
        });

        menuHtml += '                                                    </ul>\n';
        menuHtml += '                                                </li>\n';

        return menuHtml;
    }

    /**
     * 读取并处理模板
     */
    protected getTemplate(): string {
        const filePath = this.templateFile;
        if (!fs.existsSync(filePath)) {
            throw new Error(`模板文件不存在: ${filePath}`);
        }
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * 读取插件内容
     */
    protected getPluginContent(pluginId: string): string {
        const pluginFile = path.join(this.pluginDocsDir, `${pluginId}.html`);

        if (!fs.existsSync(pluginFile)) {
            throw new Error(`插件文档不存在: ${pluginId}`);
        }

        const pluginContent = fs.readFileSync(pluginFile, 'utf-8');
        const pluginName = this.formatPluginName(pluginId);

        // 提取 body 内容并转换
        return this.transformPluginContent(pluginContent, pluginName);
    }

    /**
     * 转换插件 HTML 内容
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
     * 服务首页（默认显示插件文档介绍）
     */
    protected serveIndexPage(res: express.Response): void {
        let template = this.getTemplate();
        const plugins = this.scanPluginDocs();

        console.log(`[PluginDocContribution] 渲染首页，找到 ${plugins.length} 个插件文档`);

        // 生成插件菜单项
        const pluginMenuItems = this.generatePluginMenuItems(plugins);

        // 替换菜单占位符
        template = template.replace('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->', pluginMenuItems);

        // 替换内容占位符为欢迎页
        const welcomeContent = `
            <header>
                <h1>插件文档</h1>
            </header>
            <p>欢迎使用插件文档系统。请从左侧菜单选择要查看的插件文档。</p>
            <h2>可用插件</h2>
            <ul>
                ${plugins.map(p => `<li><a href="/plugin/doc/${p.id}">${p.name}</a></li>`).join('\n                ')}
            </ul>
        `;
        template = template.replace('<!-- PLUGIN_CONTENT_PLACEHOLDER -->', welcomeContent);

        res.send(template);
    }

    /**
     * 服务特定插件的完整页面（像 Docusaurus 页面一样）
     */
    protected servePluginPage(pluginId: string, res: express.Response): void {
        let template = this.getTemplate();
        const plugins = this.scanPluginDocs();

        console.log(`[PluginDocContribution] 渲染插件页面: ${pluginId}`);

        // 检查插件是否存在
        const plugin = plugins.find(p => p.id === pluginId);
        if (!plugin) {
            res.status(404).send('插件文档不存在');
            return;
        }

        // 生成插件菜单项（当前插件高亮）
        const pluginMenuItems = this.generatePluginMenuItems(plugins, pluginId);

        // 替换菜单占位符
        template = template.replace('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->', pluginMenuItems);

        // 获取插件内容
        try {
            const pluginContent = this.getPluginContent(pluginId);
            template = template.replace('<!-- PLUGIN_CONTENT_PLACEHOLDER -->', pluginContent);
        } catch (error) {
            console.error('加载插件内容失败:', error);
            template = template.replace('<!-- PLUGIN_CONTENT_PLACEHOLDER -->', `
                <header>
                    <h1>加载失败</h1>
                </header>
                <p style="color: red;">无法加载插件文档: ${error}</p>
            `);
        }

        res.send(template);
    }
}

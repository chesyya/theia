const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 插件文档目录
const PLUGIN_DOCS_DIR = path.join(__dirname, 'plugin-docs');
const TEMPLATE_FILE = path.join(__dirname, 'index.html');

/**
 * 扫描插件文档目录，获取所有插件
 */
function scanPluginDocs() {
    const plugins = [];

    if (!fs.existsSync(PLUGIN_DOCS_DIR)) {
        console.log('插件文档目录不存在，创建目录:', PLUGIN_DOCS_DIR);
        fs.mkdirSync(PLUGIN_DOCS_DIR, { recursive: true });
        return plugins;
    }

    const files = fs.readdirSync(PLUGIN_DOCS_DIR);

    files.forEach((file, index) => {
        if (file.endsWith('.html')) {
            const pluginId = path.basename(file, '.html');
            const pluginName = pluginId
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            plugins.push({
                id: pluginId,
                name: pluginName,
                file: file,
                path: path.join(PLUGIN_DOCS_DIR, file),
                menuIndex: 12 + index // 从 12 开始，因为前面有 11 个菜单项
            });
        }
    });

    return plugins;
}

/**
 * 生成插件菜单项 HTML
 */
function generatePluginMenuItems(plugins) {
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
function transformPluginContent(htmlContent, pluginName) {
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
 * 主页面路由 - 返回带有插件菜单的完整 HTML
 */
app.get('/plugin/doc', (req, res) => {
    try {
        // 读取模板文件
        let template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');

        // 扫描插件
        const plugins = scanPluginDocs();
        console.log(`找到 ${plugins.length} 个插件文档`);

        // 生成插件菜单项
        const pluginMenuItems = generatePluginMenuItems(plugins);

        // 替换占位符
        template = template.replace('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->', pluginMenuItems);

        res.send(template);
    } catch (error) {
        console.error('处理请求失败:', error);
        res.status(500).send('服务器错误: ' + error.message);
    }
});

/**
 * 获取特定插件文档内容的 API
 */
app.get('/plugin/doc/:pluginId', (req, res) => {
    try {
        const pluginId = req.params.pluginId;
        const pluginFile = path.join(PLUGIN_DOCS_DIR, `${pluginId}.html`);

        if (!fs.existsSync(pluginFile)) {
            return res.status(404).send('插件文档不存在');
        }

        // 读取插件文档内容
        const pluginContent = fs.readFileSync(pluginFile, 'utf-8');

        // 获取插件名称
        const pluginName = pluginId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // 转换内容以适配样式
        const transformedContent = transformPluginContent(pluginContent, pluginName);

        res.send(transformedContent);
    } catch (error) {
        console.error('获取插件文档失败:', error);
        res.status(500).send('服务器错误: ' + error.message);
    }
});

/**
 * 获取所有插件列表的 API
 */
app.get('/plugin/list', (req, res) => {
    try {
        const plugins = scanPluginDocs();
        res.json(plugins);
    } catch (error) {
        console.error('获取插件列表失败:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 静态资源服务
 */
app.use('/usermanual/generalfunction/assets', express.static(path.join(__dirname, 'assets')));

/**
 * 启动服务器
 */
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`插件文档服务器已启动`);
    console.log(`访问地址: http://localhost:${PORT}/plugin/doc`);
    console.log(`插件 API: http://localhost:${PORT}/plugin/list`);
    console.log(`插件目录: ${PLUGIN_DOCS_DIR}`);
    console.log(`========================================`);

    const plugins = scanPluginDocs();
    if (plugins.length > 0) {
        console.log(`\n已加载的插件文档:`);
        plugins.forEach(plugin => {
            console.log(`  - ${plugin.name} (${plugin.id})`);
        });
    } else {
        console.log(`\n提示: 插件文档目录为空，请添加 HTML 文档到 ${PLUGIN_DOCS_DIR}`);
    }
});

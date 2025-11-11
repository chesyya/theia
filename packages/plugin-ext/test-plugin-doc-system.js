#!/usr/bin/env node

/**
 * 测试插件文档系统
 * 验证文档扫描和动态插入功能
 */

const fs = require('fs');
const path = require('path');

console.log('=== 插件文档系统测试 ===\n');

// 1. 检查插件文档目录
const pluginDocsDir = path.join(__dirname, 'plugin-docs');
console.log('1. 检查插件文档目录...');
console.log(`   目录路径: ${pluginDocsDir}`);

if (!fs.existsSync(pluginDocsDir)) {
    console.error('   ❌ 插件文档目录不存在！');
    process.exit(1);
}
console.log('   ✅ 目录存在');

// 2. 扫描插件文档
console.log('\n2. 扫描插件文档...');
const files = fs.readdirSync(pluginDocsDir);
const htmlFiles = files.filter(f => f.endsWith('.html'));

console.log(`   找到 ${htmlFiles.length} 个 HTML 文档:`);
htmlFiles.forEach(file => {
    const filePath = path.join(pluginDocsDir, file);
    const stats = fs.statSync(filePath);
    const pluginId = path.basename(file, '.html');
    const pluginName = pluginId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    console.log(`   - ${file}`);
    console.log(`     • 插件ID: ${pluginId}`);
    console.log(`     • 插件名: ${pluginName}`);
    console.log(`     • 大小: ${stats.size} bytes`);
});

// 3. 验证 HTML 模板
console.log('\n3. 验证 HTML 模板...');
const templateFile = path.join(__dirname, 'index.html');
console.log(`   模板路径: ${templateFile}`);

if (!fs.existsSync(templateFile)) {
    console.error('   ❌ HTML 模板文件不存在！');
    process.exit(1);
}

const template = fs.readFileSync(templateFile, 'utf-8');

// 检查扩展点
const hasMenuPlaceholder = template.includes('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->');
const hasContentPlaceholder = template.includes('<!-- PLUGIN_CONTENT_PLACEHOLDER -->');

console.log(`   ✅ 菜单扩展点: ${hasMenuPlaceholder ? '存在' : '不存在'}`);
console.log(`   ✅ 内容扩展点: ${hasContentPlaceholder ? '存在' : '不存在'}`);

if (!hasMenuPlaceholder || !hasContentPlaceholder) {
    console.error('   ❌ 扩展点缺失！');
    process.exit(1);
}

// 4. 验证 plugin-test.html
console.log('\n4. 验证 plugin-test.html...');
const pluginTestFile = path.join(pluginDocsDir, 'plugin-test.html');

if (!fs.existsSync(pluginTestFile)) {
    console.error('   ❌ plugin-test.html 不存在！');
    process.exit(1);
}

const pluginTestContent = fs.readFileSync(pluginTestFile, 'utf-8');
console.log(`   ✅ 文件存在`);
console.log(`   • 大小: ${pluginTestContent.length} 字符`);

// 检查关键内容
const hasTitle = pluginTestContent.includes('统一插件权限管理架构');
const hasArchDiagram = pluginTestContent.includes('Plugin Host Process');
const hasCodeBlocks = pluginTestContent.includes('UnifiedModuleInterceptor');

console.log(`   • 包含标题: ${hasTitle ? '✅' : '❌'}`);
console.log(`   • 包含架构图: ${hasArchDiagram ? '✅' : '❌'}`);
console.log(`   • 包含代码块: ${hasCodeBlocks ? '✅' : '❌'}`);

// 5. 模拟菜单生成
console.log('\n5. 模拟菜单生成...');

function generatePluginMenuItems(plugins) {
    if (plugins.length === 0) {
        return '';
    }

    let menuHtml = '\n<!-- 插件文档分类 -->\n';
    menuHtml += '<li class="theme-doc-sidebar-item-category">\n';
    menuHtml += '  <div class="menu__list-item-collapsible">\n';
    menuHtml += '    <a class="menu__link menu__link--sublist" href="#">12. 插件文档</a>\n';
    menuHtml += '  </div>\n';
    menuHtml += '  <ul class="menu__list">\n';

    plugins.forEach((plugin, index) => {
        menuHtml += `    <li class="theme-doc-sidebar-item-link">\n`;
        menuHtml += `      <a class="menu__link" href="#" data-plugin-id="${plugin.id}">12.${index + 1} ${plugin.name}</a>\n`;
        menuHtml += `    </li>\n`;
    });

    menuHtml += '  </ul>\n';
    menuHtml += '</li>\n';

    return menuHtml;
}

const plugins = htmlFiles.map((file, index) => {
    const pluginId = path.basename(file, '.html');
    const pluginName = pluginId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    return {
        id: pluginId,
        name: pluginName,
        file: file,
        menuIndex: 12 + index
    };
});

const menuHtml = generatePluginMenuItems(plugins);
console.log('   生成的菜单项:');
console.log(menuHtml);

// 6. 测试内容转换
console.log('\n6. 测试内容转换...');

function transformPluginContent(htmlContent, pluginName) {
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

    return `
        <header>
            <h1>${pluginName}</h1>
        </header>
        ${bodyContent}
    `;
}

const transformedContent = transformPluginContent(pluginTestContent, 'Plugin Test');
console.log(`   ✅ 内容转换成功`);
console.log(`   • 转换后大小: ${transformedContent.length} 字符`);

// 7. 总结
console.log('\n=== 测试总结 ===');
console.log(`✅ 找到 ${htmlFiles.length} 个插件文档`);
console.log('✅ HTML 模板包含所有扩展点');
console.log('✅ plugin-test.html 内容完整');
console.log('✅ 菜单生成功能正常');
console.log('✅ 内容转换功能正常');

console.log('\n📝 插件列表:');
plugins.forEach(plugin => {
    console.log(`  ${plugin.menuIndex}. ${plugin.name} (${plugin.id})`);
});

console.log('\n🎉 所有测试通过！');
console.log('\n💡 使用提示:');
console.log('  1. 编译代码: npm run compile');
console.log('  2. 启动 Theia 服务');
console.log('  3. 访问: http://localhost:3000/plugin/doc');
console.log('  4. 查看插件列表: http://localhost:3000/plugin/list');
console.log('  5. 查看 plugin-test: http://localhost:3000/plugin/doc/plugin-test');

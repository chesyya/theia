# 占位符工作流程详解

## 🎯 核心概念

**占位符**是在 HTML 模板中预留的特殊注释，后端会在运行时将它们替换为动态生成的内容。

## 📍 步骤 1：在 HTML 模板中设置占位符

文件：`/root/theia/packages/plugin-ext/index.html`

### 占位符位置 1：菜单（第 226 行）

```html
<li class="theme-doc-sidebar-item-link">
    <a class="menu__link" href="/usermanual/generalfunction/docs/DevicePoolManagement">
        11. 设备池管理
    </a>
</li>
<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
<!--     ↑↑↑ 这里会插入插件菜单 ↑↑↑ -->
```

### 占位符位置 2：内容（第 280 行）

```html
<div class="theme-doc-markdown markdown" id="main-content-area">
    <!-- PLUGIN_CONTENT_PLACEHOLDER -->
    <!--     ↑↑↑ 这里会插入插件文档内容 ↑↑↑ -->
</div>
```

---

## 🔄 步骤 2：后端扫描插件文档

文件：`plugin-doc-service-v2.ts`

```typescript
protected scanPluginDocs(): PluginDocInfo[] {
    const plugins: PluginDocInfo[] = [];

    // 扫描 plugin-docs 目录
    const files = fs.readdirSync(this.pluginDocsDir);

    files.forEach((file, index) => {
        if (file.endsWith('.html')) {
            // 从文件名提取插件 ID
            const pluginId = path.basename(file, '.html');

            plugins.push({
                id: pluginId,              // 例如: "plugin-test"
                name: formatName(pluginId), // 例如: "Plugin Test"
                file: file,
                path: path.join(this.pluginDocsDir, file),
                menuIndex: 12 + index
            });
        }
    });

    return plugins;
}
```

**扫描结果示例：**
```javascript
[
    { id: 'demo-plugin', name: 'Demo Plugin', file: 'demo-plugin.html' },
    { id: 'plugin-test', name: 'Plugin Test', file: 'plugin-test.html' },
    { id: 'test-plugin', name: 'Test Plugin', file: 'test-plugin.html' }
]
```

---

## 📝 步骤 3：生成菜单 HTML

```typescript
protected generatePluginMenuItems(plugins: PluginDocInfo[], currentPluginId?: string): string {
    let menuHtml = '';

    // 生成父菜单项
    menuHtml += '<li class="menu__list-item">\n';
    menuHtml += '  <a href="/plugin/doc">12. 插件文档</a>\n';
    menuHtml += '  <ul>\n';

    // 为每个插件生成菜单项
    plugins.forEach((plugin, index) => {
        // 判断是否是当前页面（高亮显示）
        const isActive = currentPluginId === plugin.id;
        const activeClass = isActive ? ' menu__link--active' : '';

        menuHtml += '    <li>\n';
        menuHtml += `      <a class="menu__link${activeClass}" `;
        menuHtml += `href="/plugin/doc/${plugin.id}">`;
        menuHtml += `12.${index + 1} ${plugin.name}</a>\n`;
        menuHtml += '    </li>\n';
    });

    menuHtml += '  </ul>\n';
    menuHtml += '</li>\n';

    return menuHtml;
}
```

**生成的菜单 HTML 示例：**
```html
<li class="menu__list-item">
    <a href="/plugin/doc">12. 插件文档</a>
    <ul>
        <li>
            <a class="menu__link" href="/plugin/doc/demo-plugin">12.1 Demo Plugin</a>
        </li>
        <li>
            <a class="menu__link menu__link--active" href="/plugin/doc/plugin-test">12.2 Plugin Test</a>
        </li>
        <li>
            <a class="menu__link" href="/plugin/doc/test-plugin">12.3 Test Plugin</a>
        </li>
    </ul>
</li>
```

---

## 📄 步骤 4：读取插件内容

```typescript
protected getPluginContent(pluginId: string): string {
    // 构建插件文件路径
    const pluginFile = path.join(this.pluginDocsDir, `${pluginId}.html`);

    // 读取文件内容
    const pluginContent = fs.readFileSync(pluginFile, 'utf-8');

    // 提取 <body> 内容
    const bodyMatch = pluginContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : pluginContent;

    // 包装成 Docusaurus 风格
    return `
        <header>
            <h1>${pluginName}</h1>
        </header>
        ${bodyContent}
    `;
}
```

**输入文件：** `plugin-docs/plugin-test.html`
```html
<!DOCTYPE html>
<html>
<body>
    <h2>简介</h2>
    <p>这是一个测试插件...</p>
</body>
</html>
```

**输出内容：**
```html
<header>
    <h1>Plugin Test</h1>
</header>
<h2>简介</h2>
<p>这是一个测试插件...</p>
```

---

## 🔁 步骤 5：替换占位符

```typescript
protected servePluginPage(pluginId: string, res: express.Response): void {
    // 1. 读取 HTML 模板
    let template = this.getTemplate(); // 读取 index.html

    // 2. 扫描所有插件
    const plugins = this.scanPluginDocs();

    // 3. 生成菜单 HTML（当前插件高亮）
    const pluginMenuItems = this.generatePluginMenuItems(plugins, pluginId);

    // 4. 替换菜单占位符
    template = template.replace(
        '<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->',
        pluginMenuItems
    );

    // 5. 获取插件内容
    const pluginContent = this.getPluginContent(pluginId);

    // 6. 替换内容占位符
    template = template.replace(
        '<!-- PLUGIN_CONTENT_PLACEHOLDER -->',
        pluginContent
    );

    // 7. 返回完整的 HTML
    res.send(template);
}
```

---

## 📊 完整流程图

```
用户访问: http://localhost:3000/plugin/doc/plugin-test
    ↓
Express 路由: app.get('/plugin/doc/:pluginId')
    ↓
调用: servePluginPage('plugin-test', res)
    ↓
┌─────────────────────────────────────────┐
│ 1. 读取模板 index.html                  │
│    template = fs.readFileSync(...)      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 2. 扫描 plugin-docs 目录                │
│    plugins = scanPluginDocs()           │
│    结果: [demo, plugin-test, test]      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. 生成菜单 HTML                        │
│    menuHtml = generatePluginMenuItems() │
│    - demo-plugin (无高亮)               │
│    - plugin-test (高亮)                 │
│    - test-plugin (无高亮)               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. 替换菜单占位符                       │
│    template = template.replace(         │
│        '<!-- PLUGIN_MENU_ITEMS ... -->', │
│        menuHtml                          │
│    )                                     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. 读取插件内容                         │
│    content = getPluginContent('plugin-test') │
│    从 plugin-test.html 提取 body        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 6. 替换内容占位符                       │
│    template = template.replace(         │
│        '<!-- PLUGIN_CONTENT ... -->',   │
│        content                           │
│    )                                     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 7. 返回完整 HTML                        │
│    res.send(template)                   │
└─────────────────────────────────────────┘
    ↓
浏览器显示完整页面
```

---

## 🎨 替换前后对比

### 替换前（模板）

```html
<!DOCTYPE html>
<html>
<body>
    <nav>
        <ul>
            <li>11. 设备池管理</li>
            <!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
        </ul>
    </nav>

    <main id="main-content-area">
        <!-- PLUGIN_CONTENT_PLACEHOLDER -->
    </main>
</body>
</html>
```

### 替换后（发送给浏览器）

```html
<!DOCTYPE html>
<html>
<body>
    <nav>
        <ul>
            <li>11. 设备池管理</li>
            <li class="menu__list-item">
                <a href="/plugin/doc">12. 插件文档</a>
                <ul>
                    <li><a href="/plugin/doc/demo-plugin">12.1 Demo Plugin</a></li>
                    <li><a class="menu__link--active" href="/plugin/doc/plugin-test">12.2 Plugin Test</a></li>
                    <li><a href="/plugin/doc/test-plugin">12.3 Test Plugin</a></li>
                </ul>
            </li>
        </ul>
    </nav>

    <main id="main-content-area">
        <header>
            <h1>Plugin Test</h1>
        </header>
        <h2>简介</h2>
        <p>这是一个测试插件...</p>
    </main>
</body>
</html>
```

---

## 🛠️ 如何添加新的占位符

### 示例：添加页面标题占位符

**1. 在 index.html 中添加占位符：**
```html
<head>
    <title><!-- PAGE_TITLE_PLACEHOLDER --></title>
</head>
```

**2. 在后端代码中替换：**
```typescript
protected servePluginPage(pluginId: string, res: express.Response): void {
    let template = this.getTemplate();

    // ... 其他代码 ...

    // 替换页面标题
    const pageTitle = `${pluginName} - 插件文档`;
    template = template.replace(
        '<!-- PAGE_TITLE_PLACEHOLDER -->',
        pageTitle
    );

    res.send(template);
}
```

**3. 结果：**
```html
<head>
    <title>Plugin Test - 插件文档</title>
</head>
```

---

## ✅ 关键点总结

### 1. 占位符命名规范
- 使用大写字母和下划线
- 以 `PLACEHOLDER` 结尾
- 描述性命名，如 `PLUGIN_MENU_ITEMS_PLACEHOLDER`

### 2. 替换顺序
顺序不重要，但建议：
1. 先替换菜单（侧边栏）
2. 再替换内容（主体）
3. 最后替换其他（标题、元数据等）

### 3. 错误处理
```typescript
try {
    const content = this.getPluginContent(pluginId);
    template = template.replace('<!-- PLACEHOLDER -->', content);
} catch (error) {
    // 替换为错误信息
    template = template.replace(
        '<!-- PLACEHOLDER -->',
        '<p style="color: red;">加载失败</p>'
    );
}
```

### 4. 占位符的优势
✅ 服务器端渲染（SEO 友好）
✅ 每次请求生成新内容（动态）
✅ 完整的 HTML 页面（可分享 URL）
✅ 简单易懂（字符串替换）

### 5. 何时使用占位符
- ✅ 页面加载时就能确定的内容
- ✅ 不需要用户交互的内容
- ✅ 需要 SEO 的内容
- ✅ 静态或准静态的内容

### 6. 何时不用占位符
- ❌ 依赖用户输入的内容（用 AJAX）
- ❌ 实时更新的内容（用 WebSocket）
- ❌ 大量数据需要分页的内容（用 API）

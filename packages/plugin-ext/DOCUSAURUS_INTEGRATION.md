# 完全适配 Docusaurus 架构的插件文档系统

## 🎯 核心思想

**完全模仿原始 Docusaurus 的行为：**
- ✅ 每个插件有独立的 URL：`/plugin/doc/plugin-test`
- ✅ 点击菜单时页面跳转（不是 AJAX 加载）
- ✅ 每个页面都是完整的 HTML（包含导航、侧边栏）
- ✅ 菜单项使用真实的 `href`，不是 `href="#"`

## 🔄 对比：原始 vs 新设计

### 原始文档（3.2 打开项目）

```html
<a href="/usermanual/generalfunction/docs/project/OpenProject">
    3.2 打开项目
</a>
```

**行为：**
- 点击 → 跳转到新 URL
- 服务器返回完整 HTML
- 页面刷新

### 新设计的插件文档（12.2 Plugin Test）

```html
<a href="/plugin/doc/plugin-test">
    12.2 Plugin Test
</a>
```

**行为：**
- 点击 → 跳转到新 URL
- 服务器返回完整 HTML
- 页面刷新
- **与原始文档行为完全一致！** ✅

## 📐 新架构设计

### 文件结构

```
packages/plugin-ext/
├── src/main/node/
│   └── plugin-doc-service-v2.ts    ← 新服务（Docusaurus 模式）
├── plugin-docs/
│   ├── test-plugin.html             ← 插件内容片段
│   ├── demo-plugin.html
│   └── plugin-test.html
├── index.html                        ← 模板（包含占位符）
└── DOCUSAURUS_INTEGRATION.md        ← 本文档
```

### 路由设计

```
GET /plugin/doc
    ↓
返回：首页（完整 HTML）
内容：插件文档列表

GET /plugin/doc/plugin-test
    ↓
返回：plugin-test 页面（完整 HTML）
内容：plugin-test 的文档内容
菜单：插件菜单（plugin-test 高亮）

GET /plugin/doc/demo-plugin
    ↓
返回：demo-plugin 页面（完整 HTML）
内容：demo-plugin 的文档内容
菜单：插件菜单（demo-plugin 高亮）
```

## 🔧 实现细节

### 1. 占位符替换（服务器端）

**模板（index.html）：**
```html
<ul class="menu__list">
    <li>11. 设备池管理</li>
    <!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
</ul>

<div id="main-content-area">
    <!-- PLUGIN_CONTENT_PLACEHOLDER -->
</div>
```

**服务器渲染：**
```typescript
// 访问 /plugin/doc/plugin-test 时
let template = readTemplate();

// 1. 生成菜单（plugin-test 高亮）
const menu = generatePluginMenuItems(plugins, 'plugin-test');
template = template.replace('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->', menu);

// 2. 插入内容
const content = readPluginContent('plugin-test');
template = template.replace('<!-- PLUGIN_CONTENT_PLACEHOLDER -->', content);

// 3. 返回完整 HTML
res.send(template);
```

### 2. 菜单生成逻辑

```typescript
protected generatePluginMenuItems(
    plugins: PluginDocInfo[],
    currentPluginId?: string
): string {
    let menuHtml = '<li class="menu__list-item">';
    menuHtml += '  <a href="/plugin/doc">12. 插件文档</a>';
    menuHtml += '  <ul>';

    plugins.forEach((plugin, index) => {
        // 判断是否是当前页面
        const isActive = currentPluginId === plugin.id;
        const activeClass = isActive ? ' menu__link--active' : '';

        // 使用真实的 URL
        menuHtml += `    <li>`;
        menuHtml += `      <a class="menu__link${activeClass}" href="/plugin/doc/${plugin.id}">`;
        menuHtml += `        12.${index + 1} ${plugin.name}`;
        menuHtml += `      </a>`;
        menuHtml += `    </li>`;
    });

    menuHtml += '  </ul>';
    menuHtml += '</li>';

    return menuHtml;
}
```

### 3. 完整页面生成

```typescript
protected servePluginPage(pluginId: string, res: express.Response): void {
    // 1. 读取模板
    let template = this.getTemplate();

    // 2. 扫描所有插件
    const plugins = this.scanPluginDocs();

    // 3. 生成菜单（当前插件高亮）
    const pluginMenuItems = this.generatePluginMenuItems(plugins, pluginId);
    template = template.replace('<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->', pluginMenuItems);

    // 4. 获取插件内容
    const pluginContent = this.getPluginContent(pluginId);
    template = template.replace('<!-- PLUGIN_CONTENT_PLACEHOLDER -->', pluginContent);

    // 5. 返回完整 HTML
    res.send(template);
}
```

## 📊 用户流程对比

### 旧方案（AJAX 模式）

```
用户点击 "12.2 Plugin Test"
    ↓
href="#" + data-plugin-id="plugin-test"
    ↓
JavaScript 拦截
    ↓
fetch('/plugin/doc/plugin-test')
    ↓
返回 HTML 片段
    ↓
替换中间区域
    ↓
URL 不变：/plugin/doc
```

**问题：**
- ❌ URL 不变，无法分享链接
- ❌ 前进/后退按钮不工作
- ❌ 与原始文档行为不一致

### 新方案（Docusaurus 模式）

```
用户点击 "12.2 Plugin Test"
    ↓
href="/plugin/doc/plugin-test"
    ↓
浏览器跳转到新 URL
    ↓
服务器生成完整 HTML
    ↓
返回整个页面
    ↓
URL 变为：/plugin/doc/plugin-test
```

**优势：**
- ✅ URL 可分享
- ✅ 前进/后退按钮正常工作
- ✅ 与原始文档行为完全一致
- ✅ SEO 友好

## 🎨 HTML 示例

### 访问 `/plugin/doc`（首页）

```html
<ul class="menu__list">
    <li>11. 设备池管理</li>
    <li class="menu__list-item">
        <a href="/plugin/doc">12. 插件文档</a>
        <ul>
            <li><a href="/plugin/doc/demo-plugin">12.1 Demo Plugin</a></li>
            <li><a href="/plugin/doc/plugin-test">12.2 Plugin Test</a></li>
            <li><a href="/plugin/doc/test-plugin">12.3 Test Plugin</a></li>
        </ul>
    </li>
</ul>

<div id="main-content-area">
    <header><h1>插件文档</h1></header>
    <p>欢迎使用插件文档系统...</p>
</div>
```

### 访问 `/plugin/doc/plugin-test`（插件页面）

```html
<ul class="menu__list">
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

<div id="main-content-area">
    <header><h1>Plugin Test</h1></header>
    <h2>🎯 设计目标</h2>
    <!-- plugin-test 的完整内容 -->
</div>
```

## 🚀 使用方法

### 1. 更新后端模块绑定

编辑 `src/main/node/plugin-ext-backend-module.ts`：

```typescript
// 导入新服务
import { PluginDocContributionV2 } from './plugin-doc-service-v2';

// 在 bindMainBackend 函数中
export function bindMainBackend(...) {
    // 注释掉旧服务
    // bind(PluginDocContribution).toSelf().inSingletonScope();
    // bind(BackendApplicationContribution).toService(PluginDocContribution);

    // 绑定新服务
    bind(PluginDocContributionV2).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginDocContributionV2);
}
```

### 2. 编译代码

```bash
cd /root/theia/packages/plugin-ext
npm run compile
```

### 3. 启动 Theia

```bash
cd /root/theia/examples/browser
yarn start
```

### 4. 测试

**访问首页：**
```
http://localhost:3000/plugin/doc
```

**直接访问插件页面：**
```
http://localhost:3000/plugin/doc/plugin-test
http://localhost:3000/plugin/doc/demo-plugin
http://localhost:3000/plugin/doc/test-plugin
```

**测试链接分享：**
- 复制 URL：`http://localhost:3000/plugin/doc/plugin-test`
- 在新标签页打开
- 应该直接显示 plugin-test 的内容

## ✨ 关键优势

### 1. 完全兼容 Docusaurus

```
原始文档：
/docs/project/OpenProject
    ↓
完整 HTML，页面跳转

插件文档：
/plugin/doc/plugin-test
    ↓
完整 HTML，页面跳转

行为完全一致！✅
```

### 2. URL 可分享

```
用户访问：http://localhost:3000/plugin/doc/plugin-test
直接看到：plugin-test 的完整页面
无需先访问首页再点击菜单
```

### 3. SEO 友好

```
搜索引擎爬虫：
GET /plugin/doc/plugin-test
    ↓
返回完整的 HTML（包含所有内容）
    ↓
可以被索引
```

### 4. 浏览器原生支持

```
前进/后退按钮：
/plugin/doc → /plugin/doc/plugin-test → /plugin/doc/demo-plugin
    ←                ←                        ←
正常工作！
```

## 📝 占位符使用说明

### 菜单占位符

**位置：** `index.html` 第 226 行

```html
<li>11. 设备池管理</li>
<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
```

**替换为：**
```html
<li>11. 设备池管理</li>
<li class="menu__list-item">
    <a href="/plugin/doc">12. 插件文档</a>
    <ul>
        <li><a href="/plugin/doc/demo-plugin">12.1 Demo Plugin</a></li>
        <li><a href="/plugin/doc/plugin-test">12.2 Plugin Test</a></li>
    </ul>
</li>
```

### 内容占位符

**位置：** `index.html` 第 280 行

```html
<div id="main-content-area">
    <!-- PLUGIN_CONTENT_PLACEHOLDER -->
</div>
```

**首页替换为：**
```html
<header><h1>插件文档</h1></header>
<p>欢迎使用...</p>
```

**插件页面替换为：**
```html
<header><h1>Plugin Test</h1></header>
<h2>🎯 设计目标</h2>
<!-- 插件完整内容 -->
```

## 🔄 迁移步骤

### 从 AJAX 模式迁移到 Docusaurus 模式

1. **备份旧服务**
   ```bash
   # 旧文件可以保留作为参考
   # plugin-doc-service.ts (AJAX 模式)
   # plugin-doc-service-v2.ts (Docusaurus 模式)
   ```

2. **更新绑定**
   ```typescript
   // 切换到 V2
   bind(PluginDocContributionV2).toSelf().inSingletonScope();
   ```

3. **更新 HTML**
   - ✅ 已完成：移除 AJAX 脚本
   - ✅ 已完成：保留侧边栏交互

4. **编译和测试**
   ```bash
   npm run compile
   yarn start
   ```

## 📊 性能对比

| 指标 | AJAX 模式 | Docusaurus 模式 |
|-----|----------|----------------|
| **首次加载** | 快（只加载菜单） | 稍慢（完整页面） |
| **切换速度** | 快（无刷新） | 中等（页面跳转） |
| **内存占用** | 低 | 中等 |
| **SEO** | 差 | 好 |
| **URL 分享** | 不支持 | 支持 |
| **前进/后退** | 需额外实现 | 原生支持 |
| **Docusaurus 兼容** | 不兼容 | 完全兼容 ✅ |

## 💡 最佳实践

### 1. 文件命名

```bash
# 插件文档文件名
plugin-docs/
├── demo-plugin.html        ← 小写+连字符
├── my-awesome-plugin.html  ← 小写+连字符
└── test-plugin.html        ← 小写+连字符
```

### 2. 内容格式

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>My Plugin</title>
</head>
<body>
    <!-- 只写 body 内容，会自动提取 -->
    <h2>简介</h2>
    <p>这是我的插件...</p>
</body>
</html>
```

### 3. URL 设计

```
/plugin/doc              ← 首页
/plugin/doc/demo-plugin  ← 具体插件
/plugin/doc/test-plugin  ← 具体插件
```

## 🎉 总结

### 新架构特点

✅ **完全模仿 Docusaurus**
- 每个插件有独立 URL
- 页面跳转行为一致
- 菜单结构相同

✅ **占位符动态替换**
- 服务器端生成菜单
- 服务器端插入内容
- 无需 AJAX

✅ **用户体验**
- URL 可分享
- 前进/后退正常
- 与原始文档无缝集成

### 实现方式

```
每次请求时：
1. 读取 index.html 模板
2. 扫描 plugin-docs 目录
3. 生成插件菜单（当前页面高亮）
4. 插入插件内容
5. 返回完整 HTML
```

这就是完全适配 Docusaurus 架构的插件文档系统！ 🚀

# 占位符与动态加载策略指南

## 概述

在插件文档系统中，我们同时使用了**服务器端占位符替换**和**客户端动态加载**两种方式。选择哪种方式取决于具体场景。

## 决策流程图

```
需要动态插入内容？
    ↓
    是
    ↓
内容在页面加载时就能确定？
    ↓
    ├─ 是 → 需要用户交互才切换？
    │         ↓
    │         ├─ 否 → 使用服务器端占位符 ✅
    │         └─ 是 → 需要刷新整个页面？
    │                   ↓
    │                   ├─ 是 → 使用服务器端占位符
    │                   └─ 否 → 使用客户端 AJAX ✅
    │
    └─ 否 → 使用客户端 AJAX ✅
```

## 实际案例分析

### 案例 1：插件菜单项（占位符方案）✅

**场景：**
- 插件列表在服务器启动时就能确定
- 菜单项不需要频繁变化
- 用户不需要交互就能看到菜单

**实现：**
```typescript
// 后端：plugin-doc-service.ts
const pluginMenuItems = this.generatePluginMenuItems(plugins);
template = template.replace(
    '<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->',
    pluginMenuItems
);
```

```html
<!-- 前端：index.html -->
<ul class="menu__list">
    <li>11. 设备池管理</li>
    <!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
    <!-- ↑ 服务器渲染时替换为完整的插件菜单 -->
</ul>
```

**为什么用占位符：**
- ✅ 菜单一次性渲染，之后不需要变化
- ✅ SEO 友好，搜索引擎能看到菜单
- ✅ 首屏渲染快，无需额外请求

### 案例 2：插件内容区域（AJAX 方案）✅

**场景：**
- 内容根据用户点击的菜单项变化
- 需要无刷新切换
- 不需要所有内容都在首屏加载

**实现：**
```javascript
// 前端：index.html
window.loadPluginContent = function(pluginId) {
    fetch(`/plugin/doc/${pluginId}`)
        .then(response => response.text())
        .then(html => {
            document.getElementById('main-content-area').innerHTML = html;
        });
};
```

**为什么用 AJAX：**
- ✅ 用户体验好，无需刷新页面
- ✅ 按需加载，节省带宽
- ✅ 内容切换快速流畅

### 案例 3：如果内容区域也用占位符会怎样？❌

**假设使用占位符：**
```html
<!-- 不推荐 ❌ -->
<div id="main-content-area">
    <!-- PLUGIN_CONTENT_PLACEHOLDER -->
</div>
```

**问题：**
1. **页面体积巨大**
   ```html
   <!-- 页面会包含所有插件的完整内容！-->
   <div id="plugin-1-content" style="display:none">...</div>
   <div id="plugin-2-content" style="display:none">...</div>
   <div id="plugin-3-content" style="display:none">...</div>
   <!-- 首次加载就下载几 MB 的数据 -->
   ```

2. **首屏加载慢**
   - 加载时间长
   - 用户需要等待

3. **浪费带宽**
   - 用户可能只看一个插件文档
   - 却下载了所有插件的内容

4. **切换需要刷新页面**
   ```html
   <!-- 每次切换都要 -->
   <a href="/plugin/doc?show=plugin-test">Plugin Test</a>
   <!-- ↑ 整个页面重新加载 -->
   ```

## 完整对比表

| 方面 | 服务器端占位符 | 客户端 AJAX |
|------|--------------|-------------|
| **渲染时机** | 页面加载时 | 用户交互时 |
| **首屏性能** | 好（一次性渲染） | 更好（延迟加载） |
| **SEO** | 友好 | 不友好 |
| **用户体验** | 需要刷新页面 | 无刷新切换 |
| **带宽消耗** | 一次性加载所有 | 按需加载 |
| **实现复杂度** | 简单 | 中等 |
| **浏览器兼容** | 完美 | 需要 JavaScript |

## 其他可以用占位符的地方

### 1. 用户信息区域

```html
<!-- USER_INFO_SECTION -->
```

**后端替换为：**
```html
<div class="user-info">
    <img src="/avatar/user123.jpg" alt="User Avatar">
    <span>Welcome, John Doe</span>
</div>
```

**适用原因：**
- 用户信息在服务器端已知
- 不需要频繁变化

### 2. 主题配置

```html
<head>
    <!-- THEME_VARIABLES -->
</head>
```

**后端替换为：**
```html
<style>
    :root {
        --primary-color: #3498db;
        --secondary-color: #2ecc71;
    }
</style>
```

### 3. 环境变量

```html
<!-- ENVIRONMENT_CONFIG -->
```

**后端替换为：**
```javascript
<script>
    window.ENV = {
        API_URL: 'http://localhost:3000',
        DEBUG: true
    };
</script>
```

### 4. 静态资源路径

```html
<!-- STATIC_ASSETS_BASE -->
```

**后端替换为：**
```html
<link rel="stylesheet" href="https://cdn.example.com/v1.0/styles.css">
```

## 不应该用占位符的地方

### 1. 搜索结果 ❌

```html
<!-- ❌ 不要这样 -->
<div id="search-results">
    <!-- SEARCH_RESULTS_PLACEHOLDER -->
</div>
```

**为什么不适合：**
- 搜索结果依赖用户输入
- 每次搜索都不同
- 应该用 AJAX 实时获取

**正确做法：**
```javascript
// ✅ 使用 AJAX
function search(query) {
    fetch(`/api/search?q=${query}`)
        .then(response => response.json())
        .then(results => renderResults(results));
}
```

### 2. 分页内容 ❌

```html
<!-- ❌ 不要这样 -->
<!-- PAGE_1_CONTENT -->
<!-- PAGE_2_CONTENT -->
<!-- PAGE_3_CONTENT -->
```

**问题：**
- 首次加载所有分页内容
- 浪费带宽
- 页面加载慢

**正确做法：**
```javascript
// ✅ 按需加载分页
function loadPage(pageNum) {
    fetch(`/api/content?page=${pageNum}`)
        .then(response => response.text())
        .then(html => updateContent(html));
}
```

### 3. 实时数据 ❌

```html
<!-- ❌ 不要这样 -->
<div class="stock-price">
    <!-- CURRENT_STOCK_PRICE -->
</div>
```

**问题：**
- 数据需要实时更新
- 占位符只能在页面加载时替换一次

**正确做法：**
```javascript
// ✅ 使用 WebSocket 或轮询
setInterval(() => {
    fetch('/api/stock-price')
        .then(response => response.json())
        .then(data => updatePrice(data));
}, 1000);
```

## 混合方案最佳实践

在我们的插件文档系统中，完美的混合方案：

```html
<!DOCTYPE html>
<html>
<head>
    <title><!-- PAGE_TITLE --></title>
    <!-- THEME_CONFIG -->
</head>
<body>
    <nav>
        <ul>
            <li>11. 设备池管理</li>
            <!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
            <!--    ↑ 占位符：静态菜单 -->
        </ul>
    </nav>

    <main id="main-content-area">
        <!-- PLUGIN_CONTENT_PLACEHOLDER -->
        <!--    ↑ 初始内容占位符 -->
        <!--    点击菜单后用 AJAX 替换 -->
    </main>

    <script>
        // AJAX 动态加载内容
        document.querySelectorAll('[data-plugin-id]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                loadPluginContent(this.getAttribute('data-plugin-id'));
            });
        });
    </script>
</body>
</html>
```

## 性能优化建议

### 1. 占位符方案优化

**缓存模板：**
```typescript
private templateCache: string | null = null;

protected getTemplate(): string {
    if (!this.templateCache) {
        this.templateCache = fs.readFileSync(this.templateFile, 'utf-8');
    }
    return this.templateCache;
}
```

**延迟替换：**
```typescript
// 只在第一次访问时扫描和替换
protected renderPage(res: Response): void {
    if (!this.renderedPage) {
        const template = this.getTemplate();
        const plugins = this.scanPluginDocs();
        this.renderedPage = template.replace('<!-- PLACEHOLDER -->', ...);
    }
    res.send(this.renderedPage);
}
```

### 2. AJAX 方案优化

**客户端缓存：**
```javascript
const contentCache = new Map();

window.loadPluginContent = function(pluginId) {
    // 先检查缓存
    if (contentCache.has(pluginId)) {
        updateContent(contentCache.get(pluginId));
        return;
    }

    // 没有缓存再请求
    fetch(`/plugin/doc/${pluginId}`)
        .then(response => response.text())
        .then(html => {
            contentCache.set(pluginId, html);
            updateContent(html);
        });
};
```

**预加载：**
```javascript
// 页面加载后预加载常用插件
document.addEventListener('DOMContentLoaded', () => {
    const popularPlugins = ['plugin-test', 'demo-plugin'];
    popularPlugins.forEach(id => {
        fetch(`/plugin/doc/${id}`)
            .then(response => response.text())
            .then(html => contentCache.set(id, html));
    });
});
```

## 总结

### 占位符适用场景
✅ 页面加载时就能确定的内容
✅ 不需要频繁变化的内容
✅ 需要 SEO 的内容
✅ 静态配置和设置

### AJAX 适用场景
✅ 根据用户交互变化的内容
✅ 需要无刷新体验的内容
✅ 按需加载的内容
✅ 实时更新的内容

### 黄金法则
**如果内容在页面加载时就能确定，且不需要交互后变化 → 用占位符**
**如果内容需要根据用户操作动态变化 → 用 AJAX**

### 我们的实现
- **菜单项** → 占位符（静态列表）
- **内容区域** → AJAX（动态切换）
- **完美平衡** → 性能 + 体验 ✨

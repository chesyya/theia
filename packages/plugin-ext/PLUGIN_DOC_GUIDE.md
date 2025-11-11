# 插件文档系统完整指南

## 📚 目录

1. [系统架构](#系统架构)
2. [快速开始](#快速开始)
3. [工作流程](#工作流程)
4. [使用示例](#使用示例)
5. [测试指南](#测试指南)
6. [常见问题](#常见问题)

## 系统架构

### 核心组件

```
┌──────────────────────────────────────────────────────┐
│                  Theia Backend                        │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  PluginDocContribution                         │  │
│  │  (src/main/node/plugin-doc-service.ts)        │  │
│  │                                                 │  │
│  │  路由:                                          │  │
│  │  • GET /plugin/doc                             │  │
│  │  • GET /plugin/doc/:pluginId                   │  │
│  │  • GET /plugin/list                            │  │
│  └────────────────────────────────────────────────┘  │
│                          ↓                             │
└──────────────────────────┼───────────────────────────┘
                           │ HTTP
                           ↓
┌──────────────────────────────────────────────────────┐
│                  Browser (前端)                       │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  index.html (主文档页面)                       │  │
│  │                                                 │  │
│  │  扩展点:                                        │  │
│  │  • PLUGIN_MENU_ITEMS_PLACEHOLDER               │  │
│  │  • PLUGIN_CONTENT_PLACEHOLDER                  │  │
│  │                                                 │  │
│  │  JavaScript:                                   │  │
│  │  • loadPluginContent(pluginId)                │  │
│  │  • setupSidebarToggle()                       │  │
│  └────────────────────────────────────────────────┘  │
│                          ↓                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  plugin-docs/                                  │  │
│  │  • test-plugin.html                            │  │
│  │  • demo-plugin.html                            │  │
│  │  • plugin-test.html (统一权限架构文档)         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 编译代码

```bash
cd /root/theia/packages/plugin-ext
npm run compile
```

### 2. 启动 Theia

```bash
cd /root/theia/examples/browser
yarn start
```

### 3. 访问文档页面

在浏览器中打开：
```
http://localhost:3000/plugin/doc
```

## 工作流程

### 用户访问流程

```
1. 用户访问 /plugin/doc
   ↓
2. 后端扫描 plugin-docs/ 目录
   ↓
3. 生成插件菜单 HTML
   ↓
4. 替换模板中的 PLUGIN_MENU_ITEMS_PLACEHOLDER
   ↓
5. 返回完整的 HTML 页面
   ↓
6. 浏览器渲染页面，显示侧边栏菜单
```

### 点击插件菜单流程

```
1. 用户点击侧边栏的 "12.1 Plugin Test"
   ↓
2. JavaScript 拦截点击事件 (preventDefault)
   ↓
3. 获取 data-plugin-id="plugin-test"
   ↓
4. 调用 loadPluginContent('plugin-test')
   ↓
5. 发起 AJAX: GET /plugin/doc/plugin-test
   ↓
6. 后端读取 plugin-docs/plugin-test.html
   ↓
7. 提取 <body> 内容并转换格式
   ↓
8. 返回 HTML 片段
   ↓
9. JavaScript 替换 main-content-area 的 innerHTML
   ↓
10. 用户在主内容区域看到插件文档
```

## 使用示例

### 示例 1：查看所有插件列表

**请求：**
```bash
curl http://localhost:3000/plugin/list
```

**响应：**
```json
[
  {
    "id": "demo-plugin",
    "name": "Demo Plugin",
    "file": "demo-plugin.html",
    "path": "/root/theia/packages/plugin-ext/plugin-docs/demo-plugin.html",
    "menuIndex": 12
  },
  {
    "id": "plugin-test",
    "name": "Plugin Test",
    "file": "plugin-test.html",
    "path": "/root/theia/packages/plugin-ext/plugin-docs/plugin-test.html",
    "menuIndex": 13
  },
  {
    "id": "test-plugin",
    "name": "Test Plugin",
    "file": "test-plugin.html",
    "path": "/root/theia/packages/plugin-ext/plugin-docs/test-plugin.html",
    "menuIndex": 14
  }
]
```

### 示例 2：获取特定插件文档

**请求：**
```bash
curl http://localhost:3000/plugin/doc/plugin-test
```

**响应：**
```html
<header>
    <h1>Plugin Test</h1>
</header>
<h2><span class="emoji">🎯</span> 设计目标</h2>
<ol>
    <li><strong>统一拦截点</strong>：在 <code>plugin-host-rpc.ts</code> 的 <code>loadPlugin</code> 中一次性设置全局拦截</li>
    <!-- ... 更多内容 ... -->
</ol>
```

### 示例 3：在浏览器中点击菜单

**步骤：**

1. 打开浏览器访问 `http://localhost:3000/plugin/doc`

2. 看到侧边栏菜单：
   ```
   使用手册
   ├─ 1. 概述
   ├─ 2. ES-SERVER
   ├─ 3. 项目管理 (展开)
   ├─ ...
   ├─ 11. 设备池管理
   └─ 12. 插件文档 (可展开)
       ├─ 12.1 Demo Plugin
       ├─ 12.2 Plugin Test       ← 点击这里
       └─ 12.3 Test Plugin
   ```

3. 点击 "12.2 Plugin Test"

4. 主内容区域自动切换显示插件文档

5. 浏览器控制台输出：
   ```
   DOM 加载完成，初始化插件文档系统...
   插件文档系统初始化完成
   加载插件文档: plugin-test
   插件文档加载成功: plugin-test
   ```

## 测试指南

### 1. 运行自动化测试

```bash
node /root/theia/packages/plugin-ext/test-plugin-doc-system.js
```

**预期输出：**
```
=== 插件文档系统测试 ===

1. 检查插件文档目录...
   ✅ 目录存在

2. 扫描插件文档...
   找到 3 个 HTML 文档

3. 验证 HTML 模板...
   ✅ 菜单扩展点: 存在
   ✅ 内容扩展点: 存在

4. 验证 plugin-test.html...
   ✅ 文件存在
   • 包含标题: ✅
   • 包含架构图: ✅
   • 包含代码块: ✅

🎉 所有测试通过！
```

### 2. 手动测试清单

#### ✅ 基础功能测试

- [ ] 访问 `/plugin/doc` 页面加载正常
- [ ] 侧边栏显示 "12. 插件文档" 菜单项
- [ ] 点击 "12. 插件文档" 可以展开/收起
- [ ] 展开后显示 3 个子菜单项

#### ✅ 动态加载测试

- [ ] 点击 "12.1 Demo Plugin"，主内容区域显示 Demo Plugin 文档
- [ ] 点击 "12.2 Plugin Test"，主内容区域显示统一权限架构文档
- [ ] 点击 "12.3 Test Plugin"，主内容区域显示 Test Plugin 文档
- [ ] 内容切换时页面滚动到顶部

#### ✅ 样式测试

- [ ] 插件文档内容继承 Docusaurus 样式
- [ ] 代码块显示正常
- [ ] 架构图显示正常
- [ ] 表格和列表格式正确

#### ✅ 交互测试

- [ ] 点击菜单项时，菜单项高亮
- [ ] 切换不同插件时，高亮状态正确切换
- [ ] 侧边栏滚动正常

### 3. API 端点测试

#### 测试 /plugin/list

```bash
curl -s http://localhost:3000/plugin/list | jq .
```

**预期：** 返回 JSON 数组，包含所有插件信息

#### 测试 /plugin/doc/:pluginId

```bash
# 测试存在的插件
curl -s http://localhost:3000/plugin/doc/plugin-test | head -20

# 测试不存在的插件
curl -s http://localhost:3000/plugin/doc/non-existent-plugin
```

**预期：**
- 存在的插件返回 HTML 内容
- 不存在的插件返回 404

#### 测试 /plugin/doc 主页面

```bash
curl -s http://localhost:3000/plugin/doc | grep "PLUGIN_MENU_ITEMS_PLACEHOLDER"
```

**预期：** 不应该包含占位符（已被替换）

## 添加新的插件文档

### 步骤 1：创建 HTML 文件

```bash
cd /root/theia/packages/plugin-ext/plugin-docs
touch my-new-plugin.html
```

### 步骤 2：编写文档内容

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>我的新插件</title>
</head>
<body>
    <h2>简介</h2>
    <p>这是我的新插件...</p>

    <h2>功能</h2>
    <ul>
        <li>功能一</li>
        <li>功能二</li>
    </ul>

    <h2>使用方法</h2>
    <pre><code>
// 示例代码
const plugin = require('my-new-plugin');
plugin.init();
    </code></pre>
</body>
</html>
```

### 步骤 3：重启服务

```bash
# 编译（如果修改了 TS 代码）
npm run compile

# 重启 Theia
cd /root/theia/examples/browser
# 停止旧进程
pkill -f "yarn start"
# 启动新进程
yarn start
```

### 步骤 4：验证

访问 `http://localhost:3000/plugin/doc`，在侧边栏应该能看到新增的 "12.4 My New Plugin" 菜单项。

## 常见问题

### Q1: 点击插件菜单没有反应？

**检查步骤：**

1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 查看 Network 标签，是否有失败的请求
4. 确认 data-plugin-id 属性存在

**解决方案：**
```javascript
// 在浏览器控制台手动测试
window.loadPluginContent('plugin-test');
```

### Q2: 插件文档样式不正确？

**原因：** 插件 HTML 中的 CSS 可能与 Docusaurus 样式冲突。

**解决方案：**
- 避免在插件 HTML 中使用全局样式
- 使用行内样式或 scoped 样式
- 遵循 Docusaurus 的 HTML 结构

### Q3: 新增的插件文档不显示？

**检查步骤：**

1. 确认文件在 `plugin-docs/` 目录下
2. 文件扩展名是 `.html`
3. 文件名格式正确（小写+连字符）
4. 重启了 Theia 服务

**调试命令：**
```bash
# 检查文件是否存在
ls -la /root/theia/packages/plugin-ext/plugin-docs/

# 测试扫描功能
node -e "
const fs = require('fs');
const path = require('path');
const dir = '/root/theia/packages/plugin-ext/plugin-docs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
console.log('找到', files.length, '个文档:', files);
"
```

### Q4: 如何调试动态加载？

**在浏览器控制台：**

```javascript
// 1. 检查扩展点是否正确注入
console.log(window.PLUGIN_EXTENSION_POINTS);

// 2. 手动触发加载
window.loadPluginContent('plugin-test');

// 3. 检查内容区域
console.log(document.getElementById('main-content-area'));

// 4. 检查所有插件链接
document.querySelectorAll('[data-plugin-id]').forEach(link => {
    console.log('Plugin:', link.getAttribute('data-plugin-id'), link.textContent);
});
```

### Q5: 服务器日志在哪里？

**查看后端日志：**

启动 Theia 时会输出：
```
[PluginDocContribution] 插件文档路由已配置:
  - GET /plugin/doc - 主文档页面
  - GET /plugin/doc/:pluginId - 获取插件文档
  - GET /plugin/list - 获取插件列表

[PluginDocContribution] 找到 3 个插件文档
```

## 高级技巧

### 技巧 1：支持 Markdown 文件

修改 `plugin-doc-service.ts`：

```typescript
protected scanPluginDocs(): PluginDocInfo[] {
    const files = fs.readdirSync(this.pluginDocsDir);

    files.forEach((file, index) => {
        // 支持 .html 和 .md
        if (file.endsWith('.html') || file.endsWith('.md')) {
            const pluginId = path.basename(file, path.extname(file));
            // ...
        }
    });
}
```

### 技巧 2：添加搜索功能

在 `index.html` 中添加：

```javascript
function searchPlugins(query) {
    const links = document.querySelectorAll('[data-plugin-id]');
    links.forEach(link => {
        const text = link.textContent.toLowerCase();
        const match = text.includes(query.toLowerCase());
        link.parentElement.style.display = match ? 'block' : 'none';
    });
}
```

### 技巧 3：插件文档缓存

修改 `loadPluginContent`：

```javascript
const cache = new Map();

window.loadPluginContent = function(pluginId) {
    if (cache.has(pluginId)) {
        document.getElementById('main-content-area').innerHTML = cache.get(pluginId);
        return;
    }

    fetch(`/plugin/doc/${pluginId}`)
        .then(response => response.text())
        .then(html => {
            cache.set(pluginId, html);
            document.getElementById('main-content-area').innerHTML = html;
        });
};
```

## 性能优化建议

1. **启用浏览器缓存**：为静态资源设置合适的缓存头
2. **压缩 HTML**：使用 gzip 压缩响应
3. **延迟加载**：只在需要时加载插件内容
4. **预加载**：预先加载热门插件文档

## 安全注意事项

⚠️ **重要：** 插件 HTML 内容未经过 XSS 过滤！

**建议：**
1. 只允许信任的来源提供插件文档
2. 考虑使用 DOMPurify 进行 HTML 净化
3. 限制可执行的 JavaScript

## 总结

✅ **核心特性：**
- 通过 Theia 后端模块配置路由
- 动态扫描和加载插件文档
- 无缝集成到 Docusaurus 风格页面
- 支持客户端动态切换内容

🎯 **最佳实践：**
- 遵循文件命名约定
- 使用语义化的 HTML 结构
- 提供清晰的插件文档内容
- 定期测试新增的文档

📚 **参考资源：**
- [PLUGIN_DOC_README.md](./PLUGIN_DOC_README.md) - 技术架构文档
- [test-plugin-doc-system.js](./test-plugin-doc-system.js) - 自动化测试脚本

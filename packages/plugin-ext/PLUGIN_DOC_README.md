# 插件文档系统使用说明

## 概述

这个系统通过 Theia 内置的后端模块配置，实现了插件文档的动态插入和展示功能。

## 架构设计

### 核心组件

1. **PluginDocContribution** (`src/main/node/plugin-doc-service.ts`)
   - 实现 `BackendApplicationContribution` 接口
   - 配置 Express 路由处理插件文档请求
   - 扫描和管理插件文档

2. **HTML 模板** (`index.html`)
   - 基于 Docusaurus 风格的文档页面
   - 包含两个扩展点：
     - `<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->`: 菜单项占位符
     - `<!-- PLUGIN_CONTENT_PLACEHOLDER -->`: 内容占位符

3. **插件文档目录** (`plugin-docs/`)
   - 存放插件的 HTML 文档文件
   - 文件命名格式：`plugin-name.html`

## 工作流程

### 1. 服务器启动时

```
Theia 启动
    ↓
加载 plugin-ext-backend-module
    ↓
实例化 PluginDocContribution
    ↓
调用 configure() 方法
    ↓
注册三个路由端点:
  - GET /plugin/doc
  - GET /plugin/doc/:pluginId
  - GET /plugin/list
```

### 2. 请求处理流程

#### 访问主页面 `/plugin/doc`

```
客户端请求 /plugin/doc
    ↓
扫描 plugin-docs 目录
    ↓
生成插件菜单 HTML
    ↓
替换模板中的 PLUGIN_MENU_ITEMS_PLACEHOLDER
    ↓
返回完整的 HTML 页面
```

#### 获取插件内容 `/plugin/doc/:pluginId`

```
客户端请求 /plugin/doc/test-plugin
    ↓
读取 plugin-docs/test-plugin.html
    ↓
提取 body 内容
    ↓
包装成 Docusaurus 风格
    ↓
返回格式化的 HTML 片段
```

## 使用方法

### 添加新的插件文档

1. **创建插件 HTML 文档**

   在 `plugin-docs/` 目录下创建新的 HTML 文件：

   ```bash
   touch plugin-docs/my-awesome-plugin.html
   ```

2. **编写插件文档内容**

   ```html
   <!DOCTYPE html>
   <html lang="zh-CN">
   <head>
       <meta charset="UTF-8">
       <title>我的超棒插件</title>
   </head>
   <body>
       <h2>简介</h2>
       <p>这是一个很棒的插件...</p>

       <h2>功能特性</h2>
       <ul>
           <li>功能一</li>
           <li>功能二</li>
       </ul>

       <h2>使用方法</h2>
       <p>安装和配置说明...</p>
   </body>
   </html>
   ```

3. **重启 Theia 服务**

   文档会自动被扫描并添加到菜单中。

### 访问插件文档

1. **在浏览器中访问**

   ```
   http://localhost:3000/plugin/doc
   ```

2. **查看插件列表 API**

   ```bash
   curl http://localhost:3000/plugin/list
   ```

   返回：
   ```json
   [
     {
       "id": "test-plugin",
       "name": "Test Plugin",
       "file": "test-plugin.html",
       "path": "/root/theia/packages/plugin-ext/plugin-docs/test-plugin.html",
       "menuIndex": 12
     }
   ]
   ```

3. **获取单个插件文档**

   ```bash
   curl http://localhost:3000/plugin/doc/test-plugin
   ```

## 扩展点说明

### 菜单扩展点

位置：`index.html` 第 226 行

```html
<!-- PLUGIN_MENU_ITEMS_PLACEHOLDER -->
```

**动态生成的菜单结构：**

```html
<li class="theme-doc-sidebar-item-category ...">
    <div class="menu__list-item-collapsible">
        <a class="menu__link menu__link--sublist" href="#">12. 插件文档</a>
        <button class="clean-btn menu__caret"></button>
    </div>
    <ul class="menu__list">
        <li class="theme-doc-sidebar-item-link ...">
            <a class="menu__link" href="#" data-plugin-id="test-plugin">
                12.1 Test Plugin
            </a>
        </li>
        <!-- 更多插件... -->
    </ul>
</li>
```

### 内容扩展点

位置：`index.html` 第 280 行

```html
<div class="theme-doc-markdown markdown" id="main-content-area">
    <!-- PLUGIN_CONTENT_PLACEHOLDER -->
    <!-- 默认内容... -->
</div>
```

**客户端动态加载：**

```javascript
// 点击插件菜单项时
window.loadPluginContent('test-plugin');
// ↓
// 发起 AJAX 请求获取插件内容
fetch('/plugin/doc/test-plugin')
// ↓
// 替换 main-content-area 的 innerHTML
```

## 文件结构

```
packages/plugin-ext/
├── src/
│   └── main/
│       └── node/
│           ├── plugin-ext-backend-module.ts  # 后端模块配置
│           └── plugin-doc-service.ts         # 插件文档服务
├── plugin-docs/                              # 插件文档目录
│   ├── test-plugin.html                      # 测试插件文档
│   └── demo-plugin.html                      # 演示插件文档
├── index.html                                 # HTML 模板
└── PLUGIN_DOC_README.md                      # 本文档
```

## API 端点

### GET /plugin/doc

返回包含所有插件菜单的完整文档页面。

**响应：** HTML 页面

### GET /plugin/doc/:pluginId

获取特定插件的文档内容（HTML 片段）。

**参数：**
- `pluginId`: 插件ID（文件名不含扩展名）

**响应：** HTML 片段

**示例：**
```bash
curl http://localhost:3000/plugin/doc/test-plugin
```

### GET /plugin/list

获取所有可用插件的列表。

**响应：** JSON 数组

**示例响应：**
```json
[
  {
    "id": "test-plugin",
    "name": "Test Plugin",
    "file": "test-plugin.html",
    "path": "/absolute/path/to/test-plugin.html",
    "menuIndex": 12
  }
]
```

## 高级配置

### 自定义插件文档目录

修改 `src/main/node/plugin-doc-service.ts` 的构造函数：

```typescript
constructor() {
    // 修改为自定义目录
    this.pluginDocsDir = path.join(__dirname, '../../../custom-plugin-docs');
    this.templateFile = path.join(__dirname, '../../../index.html');
}
```

### 自定义插件名称格式化

修改 `formatPluginName` 方法：

```typescript
protected formatPluginName(pluginId: string): string {
    // 自定义格式化逻辑
    return pluginId.toUpperCase();
}
```

### 添加权限控制

在 `configure` 方法中添加中间件：

```typescript
configure(app: express.Application): void {
    // 添加认证中间件
    const authMiddleware = (req, res, next) => {
        // 实现认证逻辑
        if (isAuthenticated(req)) {
            next();
        } else {
            res.status(401).send('Unauthorized');
        }
    };

    app.get('/plugin/doc', authMiddleware, (req, res) => {
        // ...
    });
}
```

## 故障排除

### 插件文档不显示

1. **检查文件是否存在**
   ```bash
   ls -la plugin-docs/
   ```

2. **检查服务器日志**
   ```
   [PluginDocContribution] 找到 N 个插件文档
   ```

3. **验证 HTML 格式**
   确保插件 HTML 文件格式正确，包含 `<body>` 标签。

### 路由未注册

1. **确认编译成功**
   ```bash
   npm run compile
   ```

2. **检查后端模块绑定**
   查看 `plugin-ext-backend-module.ts` 中的绑定代码。

3. **查看启动日志**
   ```
   [PluginDocContribution] 插件文档路由已配置
   ```

## 测试

### 单元测试

```bash
npm test
```

### 手动测试

1. 启动 Theia：
   ```bash
   cd examples/browser
   yarn start
   ```

2. 访问文档页面：
   ```
   http://localhost:3000/plugin/doc
   ```

3. 测试 API：
   ```bash
   curl http://localhost:3000/plugin/list
   ```

## 注意事项

1. **文件命名约定**
   - 使用小写字母和连字符
   - 例如：`my-plugin.html`，不要用 `MyPlugin.html`

2. **HTML 内容限制**
   - 避免使用外部脚本
   - CSS 样式会继承 Docusaurus 主题

3. **性能考虑**
   - 文档在每次请求时扫描，适合中小规模插件
   - 对于大量插件，考虑添加缓存机制

4. **安全性**
   - 插件 HTML 内容未经过滤，请确保内容可信
   - 生产环境建议添加 XSS 防护

## 下一步优化

- [ ] 添加插件文档缓存机制
- [ ] 支持 Markdown 格式的插件文档
- [ ] 添加插件文档搜索功能
- [ ] 支持多语言插件文档
- [ ] 添加插件文档版本管理

## 技术栈

- **后端框架**: Express.js (Theia 内置)
- **依赖注入**: InversifyJS
- **模块系统**: Theia ContainerModule
- **前端样式**: Docusaurus 3.0.1

## 参考资料

- [Theia 扩展开发文档](https://theia-ide.org/docs/composing_applications/)
- [InversifyJS 文档](https://inversify.io/)
- [Docusaurus 文档](https://docusaurus.io/)

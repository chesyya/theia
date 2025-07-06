# Plugin Documentation System

这个功能允许插件提供帮助文档，并通过网页形式展示给用户。

## 功能概述

- 插件可以提供 `HELPDOC.md` 文档文件
- 文档会自动转换为网页并托管在 `/plugindoc/` 路径下
- 在插件的menubar菜单中自动添加"Help Documentation"菜单项
- 支持多个导航路径，可以跳转到不同的文档页面
- 提供API来获取和管理插件文档信息

## 插件配置

在插件的 `package.json` 中添加 `helpDocumentation` 配置：

```json
{
  "name": "my-plugin",
  "contributes": {
    "helpDocumentation": {
      "path": "HELPDOC.md",
      "title": "My Plugin Documentation",
      "navigationPaths": [
        "examples.md",
        "api.md",
        "troubleshooting.md"
      ]
    }
  }
}
```

### 配置说明

- `path`: 主文档文件的路径（相对于插件根目录）
- `title`: 文档页面的标题
- `navigationPaths`: 可选的导航路径数组，用于跳转到其他文档页面

## 文档结构

### 主文档 (HELPDOC.md)

这是插件的主要文档，应该包含：

- 插件概述
- 功能说明
- 使用方法
- 配置选项
- 示例代码

### 导航文档

可以创建多个额外的文档文件，例如：

- `examples.md`: 使用示例
- `api.md`: API参考
- `troubleshooting.md`: 故障排除

## 访问文档

### 通过Menubar

1. 在顶层menubar中找到插件菜单
2. 点击"Help Documentation"菜单项
3. 文档会在新标签页中打开

### 直接访问

文档的URL格式为：
```
http://localhost:7777/plugindoc/{pluginId}
```

例如：
```
http://localhost:7777/plugindoc/test-plugin
```

### 导航路径

访问特定文档页面：
```
http://localhost:7777/plugindoc/{pluginId}/{path}
```

例如：
```
http://localhost:7777/plugindoc/test-plugin/examples
http://localhost:7777/plugindoc/test-plugin/api
```

## 命令

系统提供了以下命令来管理插件文档：

### plugin.documentation.show

显示可用的插件文档列表，如果有单个文档则直接打开。

### plugin.documentation.list

在控制台输出详细的插件文档报告。

## API

### PluginDocumentationServer

后端服务，负责：

- 注册/注销插件文档
- 提供文档服务
- 管理文档信息

主要方法：

```typescript
// 注册插件文档
registerPluginDocumentation(plugin: DeployedPlugin): void

// 注销插件文档
unregisterPluginDocumentation(pluginId: string): void

// 获取插件文档信息
getPluginDocumentation(pluginId: string): PluginDocumentationInfo | undefined

// 获取所有插件文档
getAllPluginDocumentation(): PluginDocumentationInfo[]
```

### PluginDocumentationInfo

文档信息接口：

```typescript
interface PluginDocumentationInfo {
    pluginId: string;
    pluginName: string;
    docPath: string;
    baseUrl: string;
    navigationPaths: string[];
    title: string;
}
```

## 示例

### 测试插件

项目包含一个完整的测试插件示例：

- `plugins/test-plugin/HELPDOC.md`: 主文档
- `plugins/test-plugin/examples.md`: 示例文档
- `plugins/test-plugin/api.md`: API文档
- `plugins/test-plugin/package.json`: 包含文档配置

### 配置示例

```json
{
  "contributes": {
    "helpDocumentation": {
      "path": "HELPDOC.md",
      "title": "Test Plugin Documentation",
      "navigationPaths": [
        "examples.md",
        "api.md"
      ]
    }
  }
}
```

## 文档格式

文档支持标准的Markdown格式，包括：

- 标题 (H1-H6)
- 代码块和行内代码
- 列表和表格
- 链接和图片
- 引用块

## 样式

文档页面使用现代化的CSS样式：

- 响应式设计
- 清晰的排版
- 代码高亮
- 导航菜单
- 返回链接

## 安全

- 文档文件路径验证
- 导航路径白名单
- 错误处理和日志记录

## 调试

1. 检查控制台输出，寻找文档注册信息
2. 使用 `plugin.documentation.list` 命令查看文档状态
3. 验证文档文件路径是否正确
4. 检查网络请求是否成功

## 注意事项

- 文档文件必须存在于插件目录中
- 导航路径必须在 `navigationPaths` 数组中定义
- 文档服务器运行在端口7777上
- 支持热重载，插件更新后文档会自动刷新 

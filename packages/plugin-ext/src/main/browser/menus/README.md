# Plugin Menubar Contribution

这个功能允许插件通过 `menubar/plugin` 贡献点将菜单项添加到Theia的顶层menubar中。

## 功能概述

- 自动检测插件中的 `menubar/plugin` 配置
- 为包含该配置的插件在顶层menubar中创建独立的菜单
- 支持命令和子菜单的注册
- 提供分析工具来检查插件的menubar配置

## 使用方法

### 1. 插件配置

在插件的 `package.json` 中添加 `menubar/plugin` 配置：

```json
{
  "name": "my-plugin",
  "contributes": {
    "commands": [
      {
        "command": "my-plugin.hello",
        "title": "Hello from My Plugin"
      },
      {
        "command": "my-plugin.settings",
        "title": "Plugin Settings"
      }
    ],
    "menus": {
      "menubar/plugin": [
        {
          "command": "my-plugin.hello",
          "group": "navigation@1"
        },
        {
          "command": "my-plugin.settings",
          "group": "navigation@2"
        }
      ]
    }
  }
}
```

### 2. 配置说明

- `menubar/plugin`: 贡献点标识符，表示这些菜单项应该添加到顶层menubar
- `command`: 要执行的命令ID
- `group`: 菜单项分组，格式为 `groupName@order`
- `when`: 可选的上下文条件表达式

### 3. 自动注册

当插件加载时，系统会自动：

1. 检查插件是否包含 `menubar/plugin` 配置
2. 在顶层menubar中创建以插件名命名的菜单
3. 注册插件贡献的命令和菜单项
4. 在控制台输出注册信息

### 4. 分析工具

系统提供了分析工具来检查插件的menubar配置：

```typescript
// 检查单个插件
const info = menubarAnalyzer.analyzePlugin(plugin);
console.log(info);

// 分析所有插件
const menubarPlugins = menubarAnalyzer.analyzeAllPlugins(plugins);

// 生成报告
const report = menubarAnalyzer.generateReport(plugins);
```

## 实现细节

### 核心组件

1. **PluginMenubarAnalyzer**: 分析插件配置的工具类
2. **MenusContributionPointHandler**: 处理菜单贡献点的主要处理器
3. **PluginMenubarCommandContribution**: 提供分析命令

### 菜单路径

插件菜单会被注册到以下路径：
```
MAIN_MENU_BAR -> plugin_{pluginId}
```

例如：`['menubar', 'plugin_my-plugin']`

### 错误处理

- 如果插件同时贡献了 `command` 和 `submenu`，系统会发出警告并只注册命令
- 注册失败时会记录错误信息但不会中断其他插件的处理

## 示例

### 测试插件

项目包含一个测试插件 `plugins/test-plugin/`，演示了如何配置 `menubar/plugin`：

```json
{
  "contributes": {
    "commands": [
      {
        "command": "test-plugin.hello",
        "title": "Hello from Test Plugin"
      },
      {
        "command": "test-plugin.settings",
        "title": "Plugin Settings"
      }
    ],
    "menus": {
      "menubar/plugin": [
        {
          "command": "test-plugin.hello",
          "group": "navigation@1"
        },
        {
          "command": "test-plugin.settings",
          "group": "navigation@2"
        }
      ]
    }
  }
}
```

### 预期结果

当测试插件加载后，你应该能在顶层menubar中看到 "Test Plugin" 菜单，包含两个菜单项：
- Hello from Test Plugin
- Plugin Settings

## 调试

1. 打开浏览器开发者工具
2. 查看控制台输出，寻找类似以下信息：
   ```
   Registered plugin menubar for: Test Plugin (test-plugin)
   ```

3. 使用分析命令检查插件配置：
   ```
   Plugin menubar analysis is enabled. Check console for detailed reports.
   ```

## 注意事项

- 插件菜单会按字母顺序排列在Help菜单之后
- 每个插件只能有一个顶层菜单
- 菜单项的顺序由 `group` 参数中的 `@order` 部分控制
- 系统会自动处理命令的注册和绑定 

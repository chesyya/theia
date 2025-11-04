# 插件三状态Icon功能使用指南

## 概述

插件系统现在支持三种交互状态的icon：
- **default**: 默认未点击状态
- **hover**: 鼠标悬浮状态
- **active**: 点击激活状态

每种状态都支持主题感知（light/dark主题）。

## API类型定义

### 基础类型

```typescript
// 主题感知的icon路径
interface ThemeIconPath {
    light: Uri;  // 亮色主题的icon
    dark: Uri;   // 暗色主题的icon
}

// 三状态交互式icon路径
interface InteractiveIconPath {
    default: Uri | ThemeIconPath;   // 必需：默认状态
    hover?: Uri | ThemeIconPath;    // 可选：悬浮状态
    active?: Uri | ThemeIconPath;   // 可选：激活状态
}

// 统一的icon路径类型
type IconPath = Uri | ThemeIconPath | ThemeIcon | InteractiveIconPath;
```

## 使用示例

### 1. Webview Panel 的三状态Icon

```typescript
import * as vscode from '@theia/plugin';

export function activate(context: vscode.PluginContext) {
    // 创建webview panel
    const panel = vscode.window.createWebviewPanel(
        'myWebview',
        'My Webview',
        vscode.ViewColumn.One,
        {}
    );

    // 设置三状态icon
    panel.iconPath = {
        // 默认状态 - 支持主题
        default: {
            light: vscode.Uri.file(context.asAbsolutePath('resources/icon-default-light.svg')),
            dark: vscode.Uri.file(context.asAbsolutePath('resources/icon-default-dark.svg'))
        },
        // 悬浮状态 - 简单路径
        hover: vscode.Uri.file(context.asAbsolutePath('resources/icon-hover.svg')),
        // 激活状态 - 支持主题
        active: {
            light: vscode.Uri.file(context.asAbsolutePath('resources/icon-active-light.svg')),
            dark: vscode.Uri.file(context.asAbsolutePath('resources/icon-active-dark.svg'))
        }
    };
}
```

### 2. 简化用法（仅默认状态）

如果只需要默认状态，可以省略hover和active：

```typescript
panel.iconPath = {
    default: vscode.Uri.file(context.asAbsolutePath('resources/icon.svg'))
};
```

### 3. 向后兼容用法

现有的代码继续工作，无需修改：

```typescript
// 方式1: 简单路径
panel.iconPath = vscode.Uri.file('resources/icon.svg');

// 方式2: 主题感知
panel.iconPath = {
    light: vscode.Uri.file('resources/icon-light.svg'),
    dark: vscode.Uri.file('resources/icon-dark.svg')
};
```

## 应用场景

### 场景1: 简单的状态反馈

```typescript
// 文件浏览器icon - 正常、悬浮、选中
panel.iconPath = {
    default: vscode.Uri.file('icons/folder.svg'),
    hover: vscode.Uri.file('icons/folder-hover.svg'),
    active: vscode.Uri.file('icons/folder-open.svg')
};
```

### 场景2: 主题适配的复杂状态

```typescript
// 工具面板icon - 完整主题支持
panel.iconPath = {
    default: {
        light: vscode.Uri.file('icons/tool-light.svg'),
        dark: vscode.Uri.file('icons/tool-dark.svg')
    },
    hover: {
        light: vscode.Uri.file('icons/tool-hover-light.svg'),
        dark: vscode.Uri.file('icons/tool-hover-dark.svg')
    },
    active: {
        light: vscode.Uri.file('icons/tool-active-light.svg'),
        dark: vscode.Uri.file('icons/tool-active-dark.svg')
    }
};
```

### 场景3: 混合使用

```typescript
// 默认和激活状态有主题，悬浮状态通用
panel.iconPath = {
    default: {
        light: vscode.Uri.file('icons/default-light.svg'),
        dark: vscode.Uri.file('icons/default-dark.svg')
    },
    hover: vscode.Uri.file('icons/hover-universal.svg'),
    active: {
        light: vscode.Uri.file('icons/active-light.svg'),
        dark: vscode.Uri.file('icons/active-dark.svg')
    }
};
```

## 技术细节

### 内部实现

1. **类型转换**: `PluginIconPath.toUrl()` 将Uri转换为字符串URL
2. **RPC传输**: 通过`$setIconPath`方法传输到前端
3. **动态CSS**: 使用`PluginSharedStyle`在运行时注入CSS规则
4. **伪类选择器**: 使用`:hover`和`.theia-mod-active`控制状态切换
5. **主题支持**: 根据当前主题动态选择light或dark图标

### CSS选择器

- 默认状态: `.plugin-icon-N::before`
- 悬浮状态: `.plugin-icon-N:hover::before` 或 `.p-TabBar-tab:hover .plugin-icon-N::before`
- 激活状态: `.plugin-icon-N.theia-mod-active::before` 或 `.p-TabBar-tab.theia-mod-active .plugin-icon-N::before`

## 兼容性

- ✅ 完全向后兼容现有插件
- ✅ 支持所有使用IconUrl的地方（webview、菜单、树视图等）
- ✅ 自动处理主题切换
- ✅ 资源自动清理（通过DisposableCollection）

## 最佳实践

1. **渐进增强**: 先提供default图标，有需要再添加hover和active
2. **视觉一致性**: 确保三种状态的icon风格一致
3. **性能考虑**: icon文件应尽量小（推荐SVG格式）
4. **主题支持**: 如果UI在不同主题下差异明显，建议使用ThemeIconPath
5. **状态清晰**: hover和active状态的视觉变化应该明显但不突兀

## 示例文件结构

```
my-plugin/
├── package.json
├── src/
│   └── extension.ts
└── resources/
    ├── icon-default-light.svg
    ├── icon-default-dark.svg
    ├── icon-hover-light.svg
    ├── icon-hover-dark.svg
    ├── icon-active-light.svg
    └── icon-active-dark.svg
```

## 相关文件

- API定义: `packages/plugin/src/theia.d.ts` (IconPath, ThemeIconPath, InteractiveIconPath)
- 类型定义: `packages/plugin-ext/src/common/plugin-protocol.ts` (IconUrl)
- 路径转换: `packages/plugin-ext/src/plugin/plugin-icon-path.ts`
- UI渲染: `packages/plugin-ext/src/main/browser/webview/webview.ts`
- 样式系统: `packages/plugin-ext/src/main/browser/plugin-shared-style.ts`

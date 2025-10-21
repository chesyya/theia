# Help Documentation Feature Implementation Guide

## 概述

这个功能允许插件通过 package.json 中的 `contributes.helpDocumentation` 字段定义 Markdown 文档，系统会自动将其转换为 HTML 并通过 HTTP 端点提供访问。

## 已完成的工作

### 1. 接口定义 ✅

已在 `/root/theia/packages/plugin-ext/src/common/plugin-protocol.ts` 中添加：

```typescript
export interface HelpDocumentationContribution {
    urlPath: string;
    main: {
        title: string;
        file: string;
    };
    pages?: Array<{
        id: string;
        title: string;
        file: string;
    }>;
}
```

并在 `PluginContribution` 接口中添加了 `helpDocumentation?: HelpDocumentationContribution;`

### 2. 示例插件 ✅

创建了 `/root/theia/plugins/help-doc-plugin/` 包含：
- package.json 配置
- 三个示例 MD 文件
- backend.ts 实现（基础版本）

## 需要实现的部分

### 3. HTTP 端点服务器

需要在 Theia 后端创建一个新的 HTTP 路由处理器来提供 HTML 页面。

#### 步骤 3.1: 创建 Help Documentation Service

文件: `/root/theia/packages/plugin-ext/src/main/node/help-doc-service.ts`

```typescript
import { injectable } from '@theia/core/shared/inversify';
import express = require('@theia/core/shared/express');
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { Application } from '@theia/core/shared/express';

@injectable()
export class HelpDocumentationService implements BackendApplicationContribution {
    private htmlPages = new Map<string, Map<string, { title: string, html: string }>>();

    configure(app: Application): void {
        // Register route: /plugins/:urlPath
        app.get('/plugins/:urlPath', (req, res) => {
            const urlPath = req.params.urlPath;
            const pages = this.htmlPages.get(urlPath);

            if (!pages) {
                res.status(404).send('Documentation not found');
                return;
            }

            const mainPage = pages.get('main');
            if (!mainPage) {
                res.status(404).send('Main documentation page not found');
                return;
            }

            res.send(this.wrapInHTML(mainPage.title, mainPage.html));
        });

        // Register route: /plugins/:urlPath/:pageId
        app.get('/plugins/:urlPath/:pageId', (req, res) => {
            const { urlPath, pageId } = req.params;
            const pages = this.htmlPages.get(urlPath);

            if (!pages) {
                res.status(404).send('Documentation not found');
                return;
            }

            const page = pages.get(pageId);
            if (!page) {
                res.status(404).send(`Page '${pageId}' not found`);
                return;
            }

            res.send(this.wrapInHTML(page.title, page.html));
        });
    }

    registerDocumentation(urlPath: string, pages: Map<string, { title: string, html: string }>): void {
        this.htmlPages.set(urlPath, pages);
        console.log(`Registered help documentation at /plugins/${urlPath}`);
    }

    private wrapInHTML(title: string, content: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .content {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        code {
            background-color: #f6f8fa;
            border-radius: 3px;
            padding: 0.2em 0.4em;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        }
        pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        table th, table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
        }
        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
    </style>
</head>
<body>
    <div class="content">
        ${content}
    </div>
</body>
</html>`;
    }
}
```

#### 步骤 3.2: 注册服务到后端模块

文件: `/root/theia/packages/plugin-ext/src/main/node/plugin-ext-backend-module.ts`

在这个文件中添加：

```typescript
import { HelpDocumentationService } from './help-doc-service';

// ... 在 export default 中添加:
bind(HelpDocumentationService).toSelf().inSingletonScope();
bind(BackendApplicationContribution).toService(HelpDocumentationService);
```

### 4. 插件加载时处理 Help Documentation

#### 步骤 4.1: 修改插件扫描器

文件: `/root/theia/packages/plugin-ext/src/hosted/node/scanners/scanner-theia.ts`

在扫描插件贡献时，确保 `helpDocumentation` 被正确读取。

#### 步骤 4.2: 在插件初始化时注册文档

修改 backend.ts，使其与 HelpDocumentationService 通信：

```typescript
// 在插件的 backend.ts 中
export function start(context: theia.PluginContext) {
    const packageJSON = context.extension.packageJSON;
    const helpDocConfig = packageJSON.contributes?.helpDocumentation;

    if (helpDocConfig) {
        // 解析 Markdown 文件
        const htmlPages = parseMarkdownFiles(context, helpDocConfig);

        // 通过消息传递机制通知后端服务
        // 这需要实现一个 RPC 调用
        registerHelpDocumentation(helpDocConfig.urlPath, htmlPages);
    }

    // 注册命令
    registerCommands(context, helpDocConfig);
}

function parseMarkdownFiles(context: theia.PluginContext, config: any) {
    const htmlPages = new Map();

    // 解析主页面
    const mainContent = fs.readFileSync(
        path.join(context.extensionPath, config.main.file),
        'utf-8'
    );
    htmlPages.set('main', {
        title: config.main.title,
        html: marked.parse(mainContent)
    });

    // 解析子页面
    if (config.pages) {
        for (const page of config.pages) {
            const pageContent = fs.readFileSync(
                path.join(context.extensionPath, page.file),
                'utf-8'
            );
            htmlPages.set(page.id, {
                title: page.title,
                html: marked.parse(pageContent)
            });
        }
    }

    return htmlPages;
}
```

### 5. RPC 协议实现

需要创建 RPC 方法来从插件后端向 Theia 后端服务传递 HTML 内容。

#### 步骤 5.1: 定义 RPC 接口

文件: `/root/theia/packages/plugin-ext/src/common/plugin-api-rpc.ts`

```typescript
export interface HelpDocumentationMain {
    $registerDocumentation(urlPath: string, pages: Map<string, { title: string, html: string }>): Promise<void>;
}

export interface HelpDocumentationExt {
    // 如果需要从主进程通知插件
}

export const PLUGIN_RPC_CONTEXT = {
    // ... 现有的常量
    HELP_DOCUMENTATION_MAIN: <ProxyIdentifier<HelpDocumentationMain>>createProxyIdentifier<HelpDocumentationMain>('HelpDocumentationMain'),
};
```

#### 步骤 5.2: 实现 Main 侧

文件: `/root/theia/packages/plugin-ext/src/main/browser/help-documentation-main.ts`

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { HelpDocumentationMain } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';

@injectable()
export class HelpDocumentationMainImpl implements HelpDocumentationMain {

    constructor(private rpc: RPCProtocol) {}

    async $registerDocumentation(urlPath: string, pages: Map<string, { title: string, html: string }>): Promise<void> {
        // 通过某种方式将数据传递给 HelpDocumentationService
        // 这可能需要通过事件或直接注入服务
        console.log(`Registering documentation for ${urlPath}`);
    }
}
```

### 6. 菜单和命令已在 package.json 中定义

```json
"contributes": {
    "commands": [
        {
            "command": "helpDoc.openMain",
            "title": "Open Help Documentation"
        }
    ],
    "menus": {
        "editor/context": [
            {
                "command": "helpDoc.openMain",
                "group": "navigation"
            }
        ]
    }
}
```

## 测试步骤

1. 编译 Theia：
   ```bash
   cd /root/theia
   yarn compile
   yarn build
   ```

2. 启动 Theia：
   ```bash
   cd /root/theia/examples/browser
   yarn start
   ```

3. 在编辑器中右键，应该看到"Open Help Documentation"选项

4. 点击后应该在新标签页打开 `http://localhost:3000/plugins/helpDoc`

5. 访问子页面：`http://localhost:3000/plugins/helpDoc/contributing`

## 简化实现方案

如果上述完整方案太复杂，可以采用简化方案：

1. **直接使用 Theia 的 Webview API** 而不是创建独立的 HTTP 端点
2. **在命令处理中直接打开 Webview** 并设置 HTML 内容

简化的 backend.ts：

```typescript
export function start(context: theia.PluginContext) {
    const packageJSON = context.extension.packageJSON;
    const helpDocConfig = packageJSON.contributes?.helpDocumentation;

    if (!helpDocConfig) return;

    // 注册命令
    const openMainCmd = theia.commands.registerCommand('helpDoc.openMain', async () => {
        // 读取并解析 Markdown
        const mainContent = fs.readFileSync(
            path.join(context.extensionPath, helpDocConfig.main.file),
            'utf-8'
        );
        const html = marked.parse(mainContent);

        // 创建 Webview
        const panel = theia.window.createWebviewPanel(
            'helpDoc',
            helpDocConfig.main.title,
            theia.ViewColumn.One,
            {}
        );

        panel.webview.html = wrapInHTML(helpDocConfig.main.title, html);
    });

    context.subscriptions.push(openMainCmd);
}

function wrapInHTML(title: string, content: string): string {
    // 返回完整的 HTML 页面
    return `<!DOCTYPE html>...${content}...</html>`;
}
```

这个简化方案不需要修改 Theia 核心代码，所有逻辑都在插件中实现。

## 文件清单

- ✅ `/root/theia/packages/plugin-ext/src/common/plugin-protocol.ts` - 接口定义已添加
- ✅ `/root/theia/plugins/help-doc-plugin/` - 示例插件已创建
- ⏳ `/root/theia/packages/plugin-ext/src/main/node/help-doc-service.ts` - 待创建
- ⏳ RPC 相关文件 - 待实现

## 下一步

选择实现方案：
1. **完整方案** - 创建 HTTP 端点，支持独立浏览器标签页访问
2. **简化方案** - 使用 Webview，在 Theia 内部显示

建议先尝试简化方案，验证概念后再考虑完整实现。

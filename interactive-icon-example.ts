/**
 * 三状态Icon功能示例
 *
 * 这个示例展示了如何在Theia插件中使用新的三状态icon功能
 */

import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {
    console.log('Interactive Icon Example activated');

    // ============================================================
    // 示例 1: 基础三状态Icon - Webview
    // ============================================================
    const example1 = theia.commands.registerCommand(
        { id: 'interactive-icon.example1', label: 'Example 1: Basic Interactive Icon' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example1',
                'Basic Interactive Icon',
                theia.ViewColumn.One,
                {}
            );

            // 设置三状态icon（简单路径）
            panel.iconPath = {
                default: theia.Uri.file(context.asAbsolutePath('resources/default.svg')),
                hover: theia.Uri.file(context.asAbsolutePath('resources/hover.svg')),
                active: theia.Uri.file(context.asAbsolutePath('resources/active.svg'))
            };

            panel.webview.html = getWebviewContent('Example 1: Basic Interactive Icon');
        }
    );

    // ============================================================
    // 示例 2: 主题感知的三状态Icon
    // ============================================================
    const example2 = theia.commands.registerCommand(
        { id: 'interactive-icon.example2', label: 'Example 2: Theme-Aware Interactive Icon' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example2',
                'Theme-Aware Interactive Icon',
                theia.ViewColumn.One,
                {}
            );

            // 设置支持主题的三状态icon
            panel.iconPath = {
                default: {
                    light: theia.Uri.file(context.asAbsolutePath('resources/default-light.svg')),
                    dark: theia.Uri.file(context.asAbsolutePath('resources/default-dark.svg'))
                },
                hover: {
                    light: theia.Uri.file(context.asAbsolutePath('resources/hover-light.svg')),
                    dark: theia.Uri.file(context.asAbsolutePath('resources/hover-dark.svg'))
                },
                active: {
                    light: theia.Uri.file(context.asAbsolutePath('resources/active-light.svg')),
                    dark: theia.Uri.file(context.asAbsolutePath('resources/active-dark.svg'))
                }
            };

            panel.webview.html = getWebviewContent('Example 2: Theme-Aware Interactive Icon');
        }
    );

    // ============================================================
    // 示例 3: 混合模式 - 部分状态有主题支持
    // ============================================================
    const example3 = theia.commands.registerCommand(
        { id: 'interactive-icon.example3', label: 'Example 3: Mixed Mode Interactive Icon' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example3',
                'Mixed Mode Interactive Icon',
                theia.ViewColumn.One,
                {}
            );

            // 默认状态：支持主题
            // 悬浮状态：通用图标
            // 激活状态：支持主题
            panel.iconPath = {
                default: {
                    light: theia.Uri.file(context.asAbsolutePath('resources/default-light.svg')),
                    dark: theia.Uri.file(context.asAbsolutePath('resources/default-dark.svg'))
                },
                hover: theia.Uri.file(context.asAbsolutePath('resources/hover-universal.svg')),
                active: {
                    light: theia.Uri.file(context.asAbsolutePath('resources/active-light.svg')),
                    dark: theia.Uri.file(context.asAbsolutePath('resources/active-dark.svg'))
                }
            };

            panel.webview.html = getWebviewContent('Example 3: Mixed Mode Interactive Icon');
        }
    );

    // ============================================================
    // 示例 4: 仅默认状态（渐进增强）
    // ============================================================
    const example4 = theia.commands.registerCommand(
        { id: 'interactive-icon.example4', label: 'Example 4: Default State Only' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example4',
                'Default State Only',
                theia.ViewColumn.One,
                {}
            );

            // 只设置默认状态，hover和active会自动使用默认图标
            panel.iconPath = {
                default: theia.Uri.file(context.asAbsolutePath('resources/icon.svg'))
            };

            panel.webview.html = getWebviewContent('Example 4: Default State Only (hover & active will use default)');
        }
    );

    // ============================================================
    // 示例 5: 向后兼容 - 传统方式
    // ============================================================
    const example5 = theia.commands.registerCommand(
        { id: 'interactive-icon.example5', label: 'Example 5: Backward Compatible' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example5',
                'Backward Compatible',
                theia.ViewColumn.One,
                {}
            );

            // 传统方式：直接设置Uri（所有状态使用同一图标）
            panel.iconPath = theia.Uri.file(context.asAbsolutePath('resources/icon.svg'));

            panel.webview.html = getWebviewContent('Example 5: Backward Compatible (traditional Uri)');
        }
    );

    // ============================================================
    // 示例 6: 向后兼容 - 主题感知
    // ============================================================
    const example6 = theia.commands.registerCommand(
        { id: 'interactive-icon.example6', label: 'Example 6: Backward Compatible Theme' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example6',
                'Backward Compatible Theme',
                theia.ViewColumn.One,
                {}
            );

            // 传统方式：主题感知（所有状态使用相同的light/dark图标）
            panel.iconPath = {
                light: theia.Uri.file(context.asAbsolutePath('resources/icon-light.svg')),
                dark: theia.Uri.file(context.asAbsolutePath('resources/icon-dark.svg'))
            };

            panel.webview.html = getWebviewContent('Example 6: Backward Compatible (theme-aware)');
        }
    );

    // ============================================================
    // 示例 7: 动态切换Icon
    // ============================================================
    const example7 = theia.commands.registerCommand(
        { id: 'interactive-icon.example7', label: 'Example 7: Dynamic Icon Change' },
        () => {
            const panel = theia.window.createWebviewPanel(
                'example7',
                'Dynamic Icon Change',
                theia.ViewColumn.One,
                {}
            );

            // 初始icon
            panel.iconPath = {
                default: theia.Uri.file(context.asAbsolutePath('resources/state1-default.svg')),
                hover: theia.Uri.file(context.asAbsolutePath('resources/state1-hover.svg')),
                active: theia.Uri.file(context.asAbsolutePath('resources/state1-active.svg'))
            };

            let state = 1;

            // 创建按钮切换icon状态
            panel.webview.html = getWebviewContentWithButton();

            // 处理来自webview的消息
            panel.webview.onDidReceiveMessage(
                message => {
                    if (message.command === 'toggleIcon') {
                        state = state === 1 ? 2 : 1;

                        // 动态切换到不同的icon集
                        panel.iconPath = {
                            default: theia.Uri.file(context.asAbsolutePath(`resources/state${state}-default.svg`)),
                            hover: theia.Uri.file(context.asAbsolutePath(`resources/state${state}-hover.svg`)),
                            active: theia.Uri.file(context.asAbsolutePath(`resources/state${state}-active.svg`))
                        };

                        panel.webview.postMessage({
                            command: 'iconChanged',
                            state: state
                        });
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    );

    // 注册所有命令
    context.subscriptions.push(
        example1,
        example2,
        example3,
        example4,
        example5,
        example6,
        example7
    );

    theia.window.showInformationMessage('Interactive Icon Examples registered. Use command palette to run examples.');
}

function getWebviewContent(title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            padding: 20px;
            font-family: sans-serif;
        }
        .info-box {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .instruction {
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="info-box">
        <h2>Instructions</h2>
        <ul>
            <li><strong>Default State:</strong> Look at the tab icon in normal state</li>
            <li><strong>Hover State:</strong> Hover your mouse over the tab to see the hover icon</li>
            <li><strong>Active State:</strong> Click on the tab to activate it and see the active icon</li>
        </ul>
    </div>
    <div class="instruction">
        <p>Try hovering over and clicking the tab above to see different icon states!</p>
        <p>If you're using a theme switcher, try switching between light and dark themes to see theme-aware icons.</p>
    </div>
</body>
</html>`;
}

function getWebviewContentWithButton(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic Icon Change</title>
    <style>
        body {
            padding: 20px;
            font-family: sans-serif;
        }
        button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 5px;
        }
        button:hover {
            background: #005a9e;
        }
        .state-info {
            margin-top: 20px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <h1>Dynamic Icon Change Example</h1>
    <button id="toggleButton">Toggle Icon State</button>
    <div class="state-info">
        <p>Current Icon State: <strong id="stateDisplay">1</strong></p>
    </div>
    <p>Click the button to switch between two different icon sets. Watch the tab icon change!</p>

    <script>
        const vscode = acquireVsCodeApi();
        const button = document.getElementById('toggleButton');
        const stateDisplay = document.getElementById('stateDisplay');

        button.addEventListener('click', () => {
            vscode.postMessage({ command: 'toggleIcon' });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'iconChanged') {
                stateDisplay.textContent = message.state;
            }
        });
    </script>
</body>
</html>`;
}

export function deactivate() {
    console.log('Interactive Icon Example deactivated');
}

# Demo Plugin Examples

This page contains examples of how to use the Demo Plugin.

## Basic Example

Here's a simple example of how to use the plugin:

```typescript
// Import the plugin API
import * as vscode from 'vscode';

// Register a command
vscode.commands.registerCommand('demo-plugin.hello', () => {
    vscode.window.showInformationMessage('Hello from my plugin!');
});
```

## Advanced Example

For more advanced usage:

```typescript
// Create a status bar item
const statusBarItem = vscode.window.createStatusBarItem();
statusBarItem.text = 'Demo Plugin Active';
statusBarItem.show();

// Register a webview
const panel = vscode.window.createWebviewPanel(
    'demoWebview',
    'Demo Webview',
    vscode.ViewColumn.One,
    {}
);

panel.webview.html = '<h1>Hello from Webview!</h1>';
```

## Configuration Example

Example configuration for the plugin:

```json
{
    "demo-plugin.enableNotifications": true,
    "demo-plugin.autoStart": false,
    "demo-plugin.debugMode": true
}
```

## Best Practices

1. Always handle errors gracefully
2. Use proper TypeScript types
3. Follow Theia's coding guidelines
4. Test your plugin thoroughly 

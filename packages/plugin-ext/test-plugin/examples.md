# Test Plugin Examples

This page contains examples of how to use the Test Plugin.

## Basic Example

Here's a simple example of how to use the plugin:

```typescript
// Import the plugin API
import * as theia from '@theia/plugin';

// Register a command
theia.commands.registerCommand('my-command', () => {
    theia.window.showInformationMessage('Hello from my plugin!');
});
```

## Advanced Example

For more advanced usage:

```typescript
// Create a status bar item
const statusBarItem = theia.window.createStatusBarItem();
statusBarItem.text = 'Test Plugin Active';
statusBarItem.show();

// Register a webview
const panel = theia.window.createWebviewPanel(
    'testWebview',
    'Test Webview',
    theia.ViewColumn.One,
    {}
);

panel.webview.html = '<h1>Hello from Webview!</h1>';
```

## Configuration Example

Example configuration for the plugin:

```json
{
    "test-plugin.enableNotifications": true,
    "test-plugin.autoStart": false,
    "test-plugin.debugMode": true
}
```

## Best Practices

1. Always handle errors gracefully
2. Use proper TypeScript types
3. Follow Theia's coding guidelines
4. Test your plugin thoroughly 

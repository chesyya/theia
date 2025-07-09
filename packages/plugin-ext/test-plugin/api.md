# Test Plugin API Reference

This document describes the API provided by the Test Plugin.

## Commands

### test-plugin.hello

Displays a greeting message to the user.

**Parameters:** None

**Returns:** void

**Example:**
```typescript
theia.commands.executeCommand('test-plugin.hello');
```

### test-plugin.settings

Opens the plugin settings panel.

**Parameters:** None

**Returns:** void

**Example:**
```typescript
theia.commands.executeCommand('test-plugin.settings');
```

## Events

### onPluginActivated

Fired when the plugin is activated.

**Event Data:**
```typescript
interface PluginActivatedEvent {
    timestamp: number;
    pluginId: string;
}
```

## Configuration

### test-plugin.enableNotifications

Controls whether the plugin shows notifications.

**Type:** boolean

**Default:** true

### test-plugin.autoStart

Controls whether the plugin starts automatically.

**Type:** boolean

**Default:** false

## Utility Functions

### getPluginInfo()

Returns information about the plugin.

**Returns:**
```typescript
interface PluginInfo {
    id: string;
    name: string;
    version: string;
    description: string;
}
```

## Error Handling

The plugin uses standard error handling patterns:

```typescript
try {
    // Plugin operation
} catch (error) {
    theia.window.showErrorMessage(`Plugin error: ${error.message}`);
}
```

## Extension Points

The plugin contributes the following extension points:

- Commands
- Menus
- Help Documentation

## Dependencies

- @theia/plugin: ^1.74.0
- TypeScript: ^4.0.0 

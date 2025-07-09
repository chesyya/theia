# Test Plugin Documentation

Welcome to the Test Plugin documentation! This plugin demonstrates the help documentation feature.

## Features

### Basic Commands

The Test Plugin provides several basic commands:

- **Hello Command**: Displays a greeting message
- **Settings Command**: Opens plugin settings

### Usage

1. Use the command palette to access plugin commands
2. Navigate to the plugin menu in the menubar
3. Click on "Help Documentation" to view this page

## Configuration

The plugin can be configured through the settings panel. Available options include:

- **Enable Notifications**: Toggle notification display
- **Auto-start**: Automatically start the plugin on startup

## Examples

### Hello Command Example

```typescript
// This command displays a greeting message
theia.commands.registerCommand('test-plugin.hello', () => {
    theia.window.showInformationMessage('Hello from Test Plugin!');
});
```

### Settings Command Example

```typescript
// This command opens the plugin settings
theia.commands.registerCommand('test-plugin.settings', () => {
    theia.window.showInformationMessage('Opening Test Plugin Settings...');
});
```

## Troubleshooting

If you encounter issues with the Test Plugin:

1. Check the console for error messages
2. Verify that the plugin is properly installed
3. Restart Theia if necessary

## Support

For additional support, please refer to the plugin's GitHub repository or contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- Basic command functionality
- Help documentation support 

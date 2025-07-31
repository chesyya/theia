import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Test plugin is now active!');

    // Register command: Hello World
    let helloWorldCommand = vscode.commands.registerCommand('testPlugin.helloWorld', () => {
        const config = vscode.workspace.getConfiguration('testPlugin');
        const message = config.get('message', 'Hello from Test Plugin!');
        vscode.window.showInformationMessage(message);
    });

    // Register command: Show Message
    let showMessageCommand = vscode.commands.registerCommand('testPlugin.showMessage', async () => {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter a message to display',
            placeHolder: 'Type your message here'
        });

        if (input) {
            vscode.window.showInformationMessage(`You entered: ${input}`);
        }
    });

    // Register text document provider
    const provider = new TestDocumentProvider();
    const providerRegistration = vscode.workspace.registerTextDocumentContentProvider(
        'test-plugin',
        provider
    );

    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(info) Test Plugin';
    statusBarItem.tooltip = 'Test Plugin is active';
    statusBarItem.command = 'testPlugin.helloWorld';
    statusBarItem.show();

    // Register disposables
    context.subscriptions.push(
        helloWorldCommand,
        showMessageCommand,
        providerRegistration,
        statusBarItem
    );

    // Export API for testing
    return {
        sayHello: (name: string) => `Hello, ${name}!`,
        getConfig: () => vscode.workspace.getConfiguration('testPlugin'),
        showMessage: (message: string) => vscode.window.showInformationMessage(message)
    };
}

export function deactivate() {
    console.log('Test plugin is deactivating...');
}

class TestDocumentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
        return `# Test Plugin Document

This is a test document provided by the test plugin.

URI: ${uri.toString()}
Timestamp: ${new Date().toISOString()}

## Features

- Command registration
- Configuration support
- Status bar integration
- Document provider
- Event handling

This document can be used for testing various plugin functionalities.
`;
    }
}
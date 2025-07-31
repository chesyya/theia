"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
function activate(context) {
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
    const providerRegistration = vscode.workspace.registerTextDocumentContentProvider('test-plugin', provider);
    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(info) Test Plugin';
    statusBarItem.tooltip = 'Test Plugin is active';
    statusBarItem.command = 'testPlugin.helloWorld';
    statusBarItem.show();
    // Register disposables
    context.subscriptions.push(helloWorldCommand, showMessageCommand, providerRegistration, statusBarItem);
    // Export API for testing
    return {
        sayHello: (name) => `Hello, ${name}!`,
        getConfig: () => vscode.workspace.getConfiguration('testPlugin'),
        showMessage: (message) => vscode.window.showInformationMessage(message)
    };
}
exports.activate = activate;
function deactivate() {
    console.log('Test plugin is deactivating...');
}
exports.deactivate = deactivate;
class TestDocumentProvider {
    constructor() {
        this._onDidChange = new vscode.EventEmitter();
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    provideTextDocumentContent(uri) {
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
//# sourceMappingURL=extension.js.map
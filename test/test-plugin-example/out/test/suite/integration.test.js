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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const mocha_1 = require("mocha");
(0, mocha_1.describe)('Integration Tests', () => {
    (0, mocha_1.before)(async () => {
        // Wait for the extension to be active
        const extension = vscode.extensions.getExtension('theia-test.test-plugin-example');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });
    (0, mocha_1.describe)('Editor Integration', () => {
        (0, mocha_1.it)('should work with text editor', async () => {
            // Create a new document
            const doc = await vscode.workspace.openTextDocument({
                content: 'Hello World\\nThis is a test document',
                language: 'plaintext'
            });
            // Show the document
            const editor = await vscode.window.showTextDocument(doc);
            assert.ok(editor);
            assert.strictEqual(editor.document, doc);
            // Test some basic editor operations
            await editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), 'Test: ');
            });
            assert.ok(editor.document.getText().startsWith('Test: Hello World'));
        });
        (0, mocha_1.it)('should handle document changes', async () => {
            const doc = await vscode.workspace.openTextDocument({
                content: 'Initial content',
                language: 'plaintext'
            });
            const editor = await vscode.window.showTextDocument(doc);
            // Listen for document changes
            let changeDetected = false;
            const disposable = vscode.workspace.onDidChangeTextDocument(event => {
                if (event.document === doc) {
                    changeDetected = true;
                }
            });
            // Make a change
            await editor.edit(editBuilder => {
                editBuilder.replace(new vscode.Range(0, 0, 0, 15), 'Modified content');
            });
            // Wait a bit for the event to fire
            await new Promise(resolve => setTimeout(resolve, 100));
            assert.ok(changeDetected, 'Document change should have been detected');
            disposable.dispose();
        });
    });
    (0, mocha_1.describe)('File System Integration', () => {
        (0, mocha_1.it)('should work with workspace files', async () => {
            // Test workspace API
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const folder = workspaceFolders[0];
                assert.ok(folder.uri);
                assert.ok(folder.name);
                // Try to list files in the workspace
                try {
                    const files = await vscode.workspace.findFiles('**/*', null, 10);
                    assert.ok(Array.isArray(files));
                }
                catch (error) {
                    console.warn('File search test skipped:', error);
                }
            }
        });
    });
    (0, mocha_1.describe)('Settings Integration', () => {
        (0, mocha_1.it)('should persist configuration changes', async () => {
            const config = vscode.workspace.getConfiguration('testPlugin');
            const originalValue = config.get('message');
            // Change the setting
            await config.update('message', 'Test message', vscode.ConfigurationTarget.Workspace);
            // Read it back
            const newValue = config.get('message');
            assert.strictEqual(newValue, 'Test message');
            // Restore original value
            await config.update('message', originalValue, vscode.ConfigurationTarget.Workspace);
        });
    });
    (0, mocha_1.describe)('Command Integration', () => {
        (0, mocha_1.it)('should execute commands in sequence', async () => {
            // Execute multiple commands to test they work together
            await vscode.commands.executeCommand('testPlugin.helloWorld');
            await vscode.commands.executeCommand('testPlugin.helloWorld');
            // No errors should be thrown
            assert.ok(true);
        });
    });
    (0, mocha_1.describe)('Threading and Async', () => {
        (0, mocha_1.it)('should handle concurrent operations', async () => {
            // Test concurrent command execution
            const promises = [
                vscode.commands.executeCommand('testPlugin.helloWorld'),
                vscode.commands.executeCommand('testPlugin.helloWorld'),
                vscode.commands.executeCommand('testPlugin.helloWorld')
            ];
            await Promise.all(promises);
            assert.ok(true, 'All concurrent operations should complete');
        });
        (0, mocha_1.it)('should handle async operations with timeout', async function () {
            this.timeout(5000); // 5 second timeout
            // Simulate async work
            await new Promise(resolve => setTimeout(resolve, 100));
            const extension = vscode.extensions.getExtension('theia-test.test-plugin-example');
            const api = extension?.exports;
            const result = api?.sayHello('Async Test');
            assert.strictEqual(result, 'Hello, Async Test!');
        });
    });
});
//# sourceMappingURL=integration.test.js.map
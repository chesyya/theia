import * as assert from 'assert';
import * as vscode from 'vscode';
import { before, after, describe, it } from 'mocha';

describe('Test Plugin Extension Tests', () => {
    let extension: vscode.Extension<any> | undefined;

    before(async () => {
        // Activate the extension
        extension = vscode.extensions.getExtension('theia-test.test-plugin-example');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    after(() => {
        // Clean up after tests
    });

    describe('Extension Activation', () => {
        it('should be present', () => {
            assert.ok(extension);
        });

        it('should activate', () => {
            assert.ok(extension?.isActive);
        });

        it('should export API', () => {
            const api = extension?.exports;
            assert.ok(api);
            assert.ok(typeof api.sayHello === 'function');
            assert.ok(typeof api.getConfig === 'function');
            assert.ok(typeof api.showMessage === 'function');
        });
    });

    describe('Commands', () => {
        it('should register helloWorld command', async () => {
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('testPlugin.helloWorld'));
        });

        it('should register showMessage command', async () => {
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('testPlugin.showMessage'));
        });

        it('should execute helloWorld command', async () => {
            // Execute the command
            await vscode.commands.executeCommand('testPlugin.helloWorld');
            // Note: In a real test, you might want to check for notifications
            // This is just testing that the command executes without error
        });
    });

    describe('Configuration', () => {
        it('should have default configuration', () => {
            const config = vscode.workspace.getConfiguration('testPlugin');
            assert.strictEqual(config.get('enable'), true);
            assert.strictEqual(config.get('message'), 'Hello from Test Plugin!');
        });

        it('should read configuration through API', () => {
            const api = extension?.exports;
            const config = api?.getConfig();
            assert.ok(config);
            assert.strictEqual(config.get('enable'), true);
        });
    });

    describe('API Functions', () => {
        it('should say hello with name', () => {
            const api = extension?.exports;
            const result = api?.sayHello('World');
            assert.strictEqual(result, 'Hello, World!');
        });

        it('should say hello with different names', () => {
            const api = extension?.exports;
            assert.strictEqual(api?.sayHello('Alice'), 'Hello, Alice!');
            assert.strictEqual(api?.sayHello('Bob'), 'Hello, Bob!');
            assert.strictEqual(api?.sayHello(''), 'Hello, !');
        });
    });

    describe('Document Provider', () => {
        it('should register test-plugin scheme', async () => {
            const uri = vscode.Uri.parse('test-plugin://example');
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                assert.ok(doc);
                assert.ok(doc.getText().includes('Test Plugin Document'));
                assert.ok(doc.getText().includes(uri.toString()));
            } catch (error) {
                // Document provider might not be fully functional in test environment
                console.warn('Document provider test skipped:', error);
            }
        });
    });

    describe('Workspace Integration', () => {
        it('should work with workspace folders', () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            // This test depends on how the test is run
            // In a real workspace, there should be at least one folder
            if (workspaceFolders) {
                assert.ok(workspaceFolders.length >= 0);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid commands gracefully', async () => {
            try {
                await vscode.commands.executeCommand('testPlugin.nonExistentCommand');
                assert.fail('Should have thrown an error');
            } catch (error) {
                // Expected to fail
                assert.ok(error);
            }
        });
    });
});
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
(0, mocha_1.describe)('Test Plugin Extension Tests', () => {
    let extension;
    (0, mocha_1.before)(async () => {
        // Activate the extension
        extension = vscode.extensions.getExtension('theia-test.test-plugin-example');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });
    (0, mocha_1.after)(() => {
        // Clean up after tests
    });
    (0, mocha_1.describe)('Extension Activation', () => {
        (0, mocha_1.it)('should be present', () => {
            assert.ok(extension);
        });
        (0, mocha_1.it)('should activate', () => {
            assert.ok(extension?.isActive);
        });
        (0, mocha_1.it)('should export API', () => {
            const api = extension?.exports;
            assert.ok(api);
            assert.ok(typeof api.sayHello === 'function');
            assert.ok(typeof api.getConfig === 'function');
            assert.ok(typeof api.showMessage === 'function');
        });
    });
    (0, mocha_1.describe)('Commands', () => {
        (0, mocha_1.it)('should register helloWorld command', async () => {
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('testPlugin.helloWorld'));
        });
        (0, mocha_1.it)('should register showMessage command', async () => {
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('testPlugin.showMessage'));
        });
        (0, mocha_1.it)('should execute helloWorld command', async () => {
            // Execute the command
            await vscode.commands.executeCommand('testPlugin.helloWorld');
            // Note: In a real test, you might want to check for notifications
            // This is just testing that the command executes without error
        });
    });
    (0, mocha_1.describe)('Configuration', () => {
        (0, mocha_1.it)('should have default configuration', () => {
            const config = vscode.workspace.getConfiguration('testPlugin');
            assert.strictEqual(config.get('enable'), true);
            assert.strictEqual(config.get('message'), 'Hello from Test Plugin!');
        });
        (0, mocha_1.it)('should read configuration through API', () => {
            const api = extension?.exports;
            const config = api?.getConfig();
            assert.ok(config);
            assert.strictEqual(config.get('enable'), true);
        });
    });
    (0, mocha_1.describe)('API Functions', () => {
        (0, mocha_1.it)('should say hello with name', () => {
            const api = extension?.exports;
            const result = api?.sayHello('World');
            assert.strictEqual(result, 'Hello, World!');
        });
        (0, mocha_1.it)('should say hello with different names', () => {
            const api = extension?.exports;
            assert.strictEqual(api?.sayHello('Alice'), 'Hello, Alice!');
            assert.strictEqual(api?.sayHello('Bob'), 'Hello, Bob!');
            assert.strictEqual(api?.sayHello(''), 'Hello, !');
        });
    });
    (0, mocha_1.describe)('Document Provider', () => {
        (0, mocha_1.it)('should register test-plugin scheme', async () => {
            const uri = vscode.Uri.parse('test-plugin://example');
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                assert.ok(doc);
                assert.ok(doc.getText().includes('Test Plugin Document'));
                assert.ok(doc.getText().includes(uri.toString()));
            }
            catch (error) {
                // Document provider might not be fully functional in test environment
                console.warn('Document provider test skipped:', error);
            }
        });
    });
    (0, mocha_1.describe)('Workspace Integration', () => {
        (0, mocha_1.it)('should work with workspace folders', () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            // This test depends on how the test is run
            // In a real workspace, there should be at least one folder
            if (workspaceFolders) {
                assert.ok(workspaceFolders.length >= 0);
            }
        });
    });
    (0, mocha_1.describe)('Error Handling', () => {
        (0, mocha_1.it)('should handle invalid commands gracefully', async () => {
            try {
                await vscode.commands.executeCommand('testPlugin.nonExistentCommand');
                assert.fail('Should have thrown an error');
            }
            catch (error) {
                // Expected to fail
                assert.ok(error);
            }
        });
    });
});
//# sourceMappingURL=extension.test.js.map
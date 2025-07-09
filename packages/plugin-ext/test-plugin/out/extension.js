"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
function activate(context) {
    console.log('Test Plugin is now active!');
    // 注册命令
    let disposable = vscode.commands.registerCommand('test-plugin.hello', () => {
        vscode.window.showInformationMessage('Hello from Test Plugin!');
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('test-plugin.settings', () => {
        vscode.window.showInformationMessage('Opening Test Plugin Settings...');
        // 这里可以打开设置页面或执行其他操作
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() {
    console.log('Test Plugin is now deactivated!');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
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

export function deactivate() {
    console.log('Test Plugin is now deactivated!');
} 

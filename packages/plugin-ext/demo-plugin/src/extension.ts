import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Demo Plugin is now active!');

    // 注册命令
    let disposable = vscode.commands.registerCommand('demo-plugin.hello', () => {
        vscode.window.showInformationMessage('Hello from Demo Plugin!');
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('demo-plugin.settings', () => {
        vscode.window.showInformationMessage('Opening Demo Plugin Settings...');
        // 这里可以打开设置页面或执行其他操作
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Demo Plugin is now deactivated!');
} 

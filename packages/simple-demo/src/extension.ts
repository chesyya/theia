/**
 * Simple Demo Plugin - VS Code Compatible
 * 使用 activate/deactivate 生命周期
 */
import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {
    console.log('[Simple Demo] Plugin activated');

    // 注册命令：显示简单消息
    const showMessageCommand = theia.commands.registerCommand(
        'simpleDemo.showMessage',
        () => {
            const timestamp = new Date().toLocaleTimeString();
            const message = `Hello from Simple Demo! 当前时间: ${timestamp}`;
            theia.window.showInformationMessage(message);
            console.log('[Simple Demo]', message);
        }
    );

    // 注册命令：获取系统信息（使用 Node.js API）
    const getSystemInfoCommand = theia.commands.registerCommand(
        'simpleDemo.getSystemInfo',
        () => {
            const os = require('os');
            const info = {
                platform: process.platform,
                nodeVersion: process.version,
                pid: process.pid,
                cpus: os.cpus().length,
                totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                uptime: `${(os.uptime() / 3600).toFixed(2)} hours`
            };

            const message = `System Info:\n${JSON.stringify(info, null, 2)}`;
            console.log('[Simple Demo]', message);
            theia.window.showInformationMessage(`[Simple Demo] ${JSON.stringify(info)}`);
        }
    );

    // 注册命令：执行耗时任务
    const heavyTaskCommand = theia.commands.registerCommand(
        'simpleDemo.heavyTask',
        async () => {
            console.log('[Simple Demo] Starting heavy task...');
            theia.window.showInformationMessage('[Simple Demo] Starting heavy computation...');

            // 模拟 CPU 密集型任务
            const startTime = Date.now();
            let sum = 0;
            for (let i = 0; i < 100000000; i++) {
                sum += Math.sqrt(i);
            }
            const duration = Date.now() - startTime;

            const result = `Heavy task completed! Duration: ${duration}ms, Result: ${sum.toFixed(2)}`;
            console.log('[Simple Demo]', result);
            theia.window.showInformationMessage(`[Simple Demo] ${result}`);
        }
    );

    context.subscriptions.push(
        showMessageCommand,
        getSystemInfoCommand,
        heavyTaskCommand
    );

    theia.window.showInformationMessage('[Simple Demo] Plugin started!');
}

export function deactivate() {
    console.log('[Simple Demo] Plugin deactivated');
}

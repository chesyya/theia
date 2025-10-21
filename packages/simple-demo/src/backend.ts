/**
 * 后端插件入口 (运行在 Node.js 进程)
 * 通过 package.json 的 "theiaPlugin.backend" 字段指定
 */
import * as theia from '@theia/plugin';

export function start(context: theia.PluginContext) {
    console.log('[Backend] Simple Demo backend plugin is now active');
    console.log('[Backend] Running in Node.js process:', process.pid);

    // 注册后端命令：获取系统信息
    const getSystemInfoCommand = theia.commands.registerCommand(
        'simpleDemo.backend.getSystemInfo',
        () => getSystemInfo()
    );

    // 注册后端命令：执行耗时任务
    const heavyTaskCommand = theia.commands.registerCommand(
        'simpleDemo.backend.heavyTask',
        async () => await performHeavyTask()
    );

    context.subscriptions.push(
        getSystemInfoCommand,
        heavyTaskCommand
    );

    // 后端插件激活时显示通知
    theia.window.showInformationMessage('[Backend] Backend plugin started in Node.js!');
}

/**
 * 后端函数：获取系统信息 (只有后端才能访问 Node.js API)
 */
function getSystemInfo(): string {
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
    console.log('[Backend]', message);
    theia.window.showInformationMessage(`[Backend] ${JSON.stringify(info)}`);
    return message;
}

/**
 * 后端函数：执行耗时任务 (CPU 密集型任务应该在后端执行)
 */
async function performHeavyTask(): Promise<string> {
    console.log('[Backend] Starting heavy task...');
    theia.window.showInformationMessage('[Backend] Starting heavy computation...');

    // 模拟 CPU 密集型任务
    const startTime = Date.now();
    let sum = 0;
    for (let i = 0; i < 1000000000; i++) {
        sum += Math.sqrt(i);
    }
    const duration = Date.now() - startTime;

    const result = `Heavy task completed! Duration: ${duration}ms, Result: ${sum.toFixed(2)}`;
    console.log('[Backend]', result);
    theia.window.showInformationMessage(`[Backend] ${result}`);
    return result;
}

export function stop() {
    console.log('[Backend] Backend plugin stopped');
}

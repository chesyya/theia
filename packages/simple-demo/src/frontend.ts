/**
 * 前端插件入口 (运行在浏览器/渲染进程)
 * 通过 package.json 的 "theiaPlugin.frontend" 字段指定
 */
import * as theia from '@theia/plugin';

export function start(context: theia.PluginContext) {
    console.log('[Frontend] Simple Demo frontend plugin is now active');
    console.log('[Frontend] Running in browser/renderer process');

    // 注册前端命令：显示简单消息
    const showMessageCommand = theia.commands.registerCommand(
        'simpleDemo.frontend.showMessage',
        () => showFrontendMessage()
    );

    // 注册前端命令：调用后端命令
    const callBackendCommand = theia.commands.registerCommand(
        'simpleDemo.frontend.callBackend',
        async () => await callBackendCommand_handler()
    );

    // 注册前端命令：获取后端系统信息
    const getSystemInfoCommand = theia.commands.registerCommand(
        'simpleDemo.frontend.getSystemInfo',
        async () => await getSystemInfoFromBackend()
    );

    context.subscriptions.push(
        showMessageCommand,
        callBackendCommand,
        getSystemInfoCommand
    );

    // 前端插件激活时显示通知
    theia.window.showInformationMessage('[Frontend] Frontend plugin started!');
}

/**
 * 前端函数：显示简单消息
 */
function showFrontendMessage(): void {
    const timestamp = new Date().toLocaleTimeString();
    const message = `Hello from Frontend! 当前时间: ${timestamp}`;

    theia.window.showInformationMessage(message);
    console.log('[Frontend]', message);
}

/**
 * 前端调用后端：通过 commands.executeCommand 调用后端注册的命令
 */
async function callBackendCommand_handler(): Promise<void> {
    console.log('[Frontend] Calling backend command...');

    try {
        // 调用后端注册的命令
        await theia.commands.executeCommand('simpleDemo.backend.getSystemInfo');
        console.log('[Frontend] Backend command executed successfully');
    } catch (error) {
        const errorMsg = `Failed to call backend: ${error}`;
        theia.window.showErrorMessage(errorMsg);
        console.error('[Frontend]', errorMsg);
    }
}

/**
 * 前端调用后端：执行耗时任务
 */
async function getSystemInfoFromBackend(): Promise<void> {
    console.log('[Frontend] Requesting system info from backend...');

    try {
        // 调用后端的耗时任务命令
        const result = await theia.commands.executeCommand('simpleDemo.backend.heavyTask');
        console.log('[Frontend] Received result from backend:', result);
    } catch (error) {
        const errorMsg = `Failed to get system info: ${error}`;
        theia.window.showErrorMessage(errorMsg);
        console.error('[Frontend]', errorMsg);
    }
}

export function stop() {
    console.log('[Frontend] Frontend plugin stopped');
}

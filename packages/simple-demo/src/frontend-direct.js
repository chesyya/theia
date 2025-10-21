/**
 * 前端插件入口 (运行在浏览器 Web Worker)
 * 必须直接使用全局 theia 对象，不能使用 require
 */
(function () {
    'use strict';

    // 使用全局 theia 对象（由 worker-main.ts 提供）
    const theia = self.theia;

    function start(context) {
        console.log('[Frontend] Simple Demo frontend plugin started');
        console.log('[Frontend] Running in Web Worker');

        // 注册前端命令：显示简单消息
        const showMessageCommand = theia.commands.registerCommand(
            'simpleDemo.frontend.showMessage',
            function() {
                const timestamp = new Date().toLocaleTimeString();
                const message = 'Hello from Frontend! 当前时间: ' + timestamp;
                theia.window.showInformationMessage(message);
                console.log('[Frontend]', message);
            }
        );

        // 注册前端命令：调用后端命令
        const callBackendCommand = theia.commands.registerCommand(
            'simpleDemo.frontend.callBackend',
            async function() {
                console.log('[Frontend] Calling backend command...');
                try {
                    await theia.commands.executeCommand('simpleDemo.backend.getSystemInfo');
                    console.log('[Frontend] Backend command executed successfully');
                } catch (error) {
                    const errorMsg = 'Failed to call backend: ' + error;
                    theia.window.showErrorMessage(errorMsg);
                    console.error('[Frontend]', errorMsg);
                }
            }
        );

        // 注册前端命令：获取后端系统信息
        const getSystemInfoCommand = theia.commands.registerCommand(
            'simpleDemo.frontend.getSystemInfo',
            async function() {
                console.log('[Frontend] Requesting system info from backend...');
                try {
                    const result = await theia.commands.executeCommand('simpleDemo.backend.heavyTask');
                    console.log('[Frontend] Received result from backend:', result);
                } catch (error) {
                    const errorMsg = 'Failed to get system info: ' + error;
                    theia.window.showErrorMessage(errorMsg);
                    console.error('[Frontend]', errorMsg);
                }
            }
        );

        context.subscriptions.push(
            showMessageCommand,
            callBackendCommand,
            getSystemInfoCommand
        );

        theia.window.showInformationMessage('[Frontend] Frontend plugin started!');
    }

    function stop() {
        console.log('[Frontend] Frontend plugin stopped');
    }

    // 导出到全局变量 (frontendModuleName = theia_simple_demo)
    self.theia_simple_demo = {
        start: start,
        stop: stop
    };

})();

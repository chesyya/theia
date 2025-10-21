"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = exports.start = void 0;
/**
 * 前端插件入口 (运行在浏览器/渲染进程)
 * 通过 package.json 的 "theiaPlugin.frontend" 字段指定
 */
const theia = require("@theia/plugin");
function start(context) {
    console.log('[Frontend] Simple Demo frontend plugin is now active');
    console.log('[Frontend] Running in browser/renderer process');
    // 注册前端命令：显示简单消息
    const showMessageCommand = theia.commands.registerCommand('simpleDemo.frontend.showMessage', () => showFrontendMessage());
    // 注册前端命令：调用后端命令
    const callBackendCommand = theia.commands.registerCommand('simpleDemo.frontend.callBackend', () => __awaiter(this, void 0, void 0, function* () { return yield callBackendCommand_handler(); }));
    // 注册前端命令：获取后端系统信息
    const getSystemInfoCommand = theia.commands.registerCommand('simpleDemo.frontend.getSystemInfo', () => __awaiter(this, void 0, void 0, function* () { return yield getSystemInfoFromBackend(); }));
    context.subscriptions.push(showMessageCommand, callBackendCommand, getSystemInfoCommand);
    // 前端插件激活时显示通知
    theia.window.showInformationMessage('[Frontend] Frontend plugin started!');
}
exports.start = start;
/**
 * 前端函数：显示简单消息
 */
function showFrontendMessage() {
    const timestamp = new Date().toLocaleTimeString();
    const message = `Hello from Frontend! 当前时间: ${timestamp}`;
    theia.window.showInformationMessage(message);
    console.log('[Frontend]', message);
}
/**
 * 前端调用后端：通过 commands.executeCommand 调用后端注册的命令
 */
function callBackendCommand_handler() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Frontend] Calling backend command...');
        try {
            // 调用后端注册的命令
            yield theia.commands.executeCommand('simpleDemo.backend.getSystemInfo');
            console.log('[Frontend] Backend command executed successfully');
        }
        catch (error) {
            const errorMsg = `Failed to call backend: ${error}`;
            theia.window.showErrorMessage(errorMsg);
            console.error('[Frontend]', errorMsg);
        }
    });
}
/**
 * 前端调用后端：执行耗时任务
 */
function getSystemInfoFromBackend() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Frontend] Requesting system info from backend...');
        try {
            // 调用后端的耗时任务命令
            const result = yield theia.commands.executeCommand('simpleDemo.backend.heavyTask');
            console.log('[Frontend] Received result from backend:', result);
        }
        catch (error) {
            const errorMsg = `Failed to get system info: ${error}`;
            theia.window.showErrorMessage(errorMsg);
            console.error('[Frontend]', errorMsg);
        }
    });
}
function stop() {
    console.log('[Frontend] Frontend plugin stopped');
}
exports.stop = stop;
//# sourceMappingURL=frontend.js.map
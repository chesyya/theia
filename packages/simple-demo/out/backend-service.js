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
exports.BackendService = void 0;
/**
 * 后端服务类
 * 这个类模拟后端逻辑，可以执行一些后端操作
 */
class BackendService {
    /**
     * 简单的后端函数：返回一条消息
     */
    getBackendMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            // 模拟一些后端处理时间
            yield this.delay(500);
            const timestamp = new Date().toLocaleString();
            const processInfo = this.getProcessInfo();
            return `Hello from Backend! 时间: ${timestamp}, 进程信息: ${processInfo}`;
        });
    }
    /**
     * 获取进程信息（模拟后端特有的操作）
     */
    getProcessInfo() {
        return `PID: ${process.pid}, Platform: ${process.platform}, Node: ${process.version}`;
    }
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.BackendService = BackendService;
//# sourceMappingURL=backend-service.js.map
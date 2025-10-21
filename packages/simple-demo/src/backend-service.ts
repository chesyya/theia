/**
 * 后端服务类
 * 这个类模拟后端逻辑，可以执行一些后端操作
 */
export class BackendService {

    /**
     * 简单的后端函数：返回一条消息
     */
    async getBackendMessage(): Promise<string> {
        // 模拟一些后端处理时间
        await this.delay(500);

        const timestamp = new Date().toLocaleString();
        const processInfo = this.getProcessInfo();

        return `Hello from Backend! 时间: ${timestamp}, 进程信息: ${processInfo}`;
    }

    /**
     * 获取进程信息（模拟后端特有的操作）
     */
    private getProcessInfo(): string {
        return `PID: ${process.pid}, Platform: ${process.platform}, Node: ${process.version}`;
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

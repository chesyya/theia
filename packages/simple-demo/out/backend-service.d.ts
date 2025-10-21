/**
 * 后端服务类
 * 这个类模拟后端逻辑，可以执行一些后端操作
 */
export declare class BackendService {
    /**
     * 简单的后端函数：返回一条消息
     */
    getBackendMessage(): Promise<string>;
    /**
     * 获取进程信息（模拟后端特有的操作）
     */
    private getProcessInfo;
    /**
     * 延迟函数
     */
    private delay;
}

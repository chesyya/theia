import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import { PluginAuthorizationService } from '../../common/plugin-authorization-service';
import { PluginIdentifiers } from '../../common/plugin-protocol';

@injectable()
export class PluginAuthorizationServiceImpl implements PluginAuthorizationService {
    @inject(ILogger)
    protected readonly logger: ILogger;

    // 存储未授权的插件ID
    private unauthorizedPlugins: Set<string> = new Set<string>();

    constructor() {
        // 初始化未授权插件列表，可以从配置文件或数据库加载
    }

    async isAuthorized(pluginId: string): Promise<boolean> {
        // 检查插件是否在未授权列表中
        return !this.unauthorizedPlugins.has(pluginId);
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return Array.from(this.unauthorizedPlugins);
    }

    /**
     * 设置插件授权状态
     * @param pluginId 插件ID
     * @param authorized 是否授权
     */
    setPluginAuthorization(pluginId: string, authorized: boolean): void {
        if (authorized) {
            this.unauthorizedPlugins.delete(pluginId);
        } else {
            this.unauthorizedPlugins.add(pluginId);
        }
    }
}
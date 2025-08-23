import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import {
    IAuthorizationService,
    PluginIdentifier,
    AuthorizationStatus,
    IAuthorizationStatusChangeEvent
} from '../../../common/services/authorization';

/**
 * 核心授权服务实现
 * - 维护插件授权状态
 * - 提供授权/撤销的业务逻辑
 * - 触发状态变更事件
 * - 提供查询接口
 */
@injectable()
export class AuthorizationService implements IAuthorizationService {

    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();

    // 插件授权状态存储
    private readonly authorizationStates = new Map<PluginIdentifier, AuthorizationStatus>();

    constructor(
        @inject(ILogger) private readonly logger: ILogger
    ) {
        this.logger.info('[PLUGIN] 初始化 AuthorizationService...');
        this.initializeDefaultStates();
        this.logger.info(`[PLUGIN] AuthorizationService 初始化完成，包含 ${this.authorizationStates.size} 个默认状态`);
    }

    get onDidUpdateAuthorizationStatus() {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        const status = this.authorizationStates.get(pluginId) ?? AuthorizationStatus.GRANTED;
        this.logger.debug(`[PLUGIN] 查询插件 ${pluginId} 授权状态: ${status}`);
        return status;
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = this.authorizationStates.get(pluginId);
        const newStatus = AuthorizationStatus.GRANTED;

        this.authorizationStates.set(pluginId, newStatus);

        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: newStatus,
            previousStatus,
            timestamp: new Date()
        };

        this._onDidUpdateAuthorizationStatus.fire(event);
        this.logger.info(`[PLUGIN] 已授予插件授权: ${pluginId}`);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        const previousStatus = this.authorizationStates.get(pluginId);
        const newStatus = AuthorizationStatus.DENIED;

        this.authorizationStates.set(pluginId, newStatus);

        const event: IAuthorizationStatusChangeEvent = {
            pluginId,
            status: newStatus,
            previousStatus,
            timestamp: new Date()
        };

        this._onDidUpdateAuthorizationStatus.fire(event);
        this.logger.info(`[PLUGIN] 已撤销插件授权: ${pluginId}`);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        this.logger.debug(`[PLUGIN] 获取全部插件授权状态 (${this.authorizationStates.size} 个插件)`);
        return new Map(this.authorizationStates);
    }

    /**
     * 初始化默认授权状态
     * 生产环境应从持久化存储加载
     */
    private initializeDefaultStates(): void {
        this.authorizationStates.set('vscode.typescript-language-features', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('vscode.json-language-features', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('<unpublished>.demo-plugin', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('<unpublished>.theia-webview-test-plugin', AuthorizationStatus.GRANTED);
        this.authorizationStates.set('<unpublished>.test-plugin', AuthorizationStatus.DENIED);

        this.logger.debug('[PLUGIN] 默认授权状态已初始化',
            Array.from(this.authorizationStates.entries()).map(([id, status]) => `${id}: ${status}`)
        );
    }

    /**
     * 重置为默认授权状态（开发/测试用）
     */
    async resetToDefaults(): Promise<void> {
        this.logger.warn('[PLUGIN] 重置所有插件授权状态为默认值');
        this.authorizationStates.clear();
        this.initializeDefaultStates();

        for (const [pluginId, status] of this.authorizationStates.entries()) {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId,
                status,
                timestamp: new Date()
            };
            this._onDidUpdateAuthorizationStatus.fire(event);
        }

        this.logger.info('[PLUGIN] 重置完成，已触发所有插件的授权事件');
    }
}

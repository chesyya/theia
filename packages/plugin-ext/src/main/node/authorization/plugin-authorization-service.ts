import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { PluginAuthorizationProvider } from '../../../common/authorization/plugin-authorization';
import { PluginAuthorizationChangeEvent } from '../../../common/authorization/types';
import {
    IAuthorizationRPC,
    IAuthorizationClient
} from '../../../common/authorization/i-authorization-service';
import { PluginAuthorizationManager } from '../../../common/authorization/plugin-authorization-manager';
import {
    PluginIdentifier,
    AuthorizationStatus
} from '../../../common/authorization/types';

/**
 * 统一的插件授权服务
 * 整合了Legacy接口、RPC通信和业务逻辑
 */
@injectable()
export class PluginAuthorizationService implements PluginAuthorizationProvider, IAuthorizationRPC {

    private readonly onAuthorizationChangedEmitter = new Emitter<PluginAuthorizationChangeEvent>();
    private clients: IAuthorizationClient[] = [];

    @inject(PluginAuthorizationManager)
    protected readonly manager: PluginAuthorizationManager;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @postConstruct()
    protected init(): void {
        // 监听Manager的状态变化，转发给Legacy和RPC客户端
        this.manager.onDidUpdateAuthorizationStatus(async event => {
            // Legacy接口事件转换
            const legacyEvent: PluginAuthorizationChangeEvent = {
                pluginId: event.pluginId,
                status: event.status === AuthorizationStatus.GRANTED ? 'granted' : 'denied',
                previousStatus: event.previousStatus === AuthorizationStatus.GRANTED ? 'granted' : 'denied'
            };
            this.onAuthorizationChangedEmitter.fire(legacyEvent);

            // RPC客户端通知
            for (const client of this.clients) {
                try {
                    client.$onDidUpdateAuthorizationStatus(event);
                } catch (error) {
                    this.logger.error(`通知RPC客户端时发生错误`, error);
                }
            }

        });
    }

    // Legacy PluginAuthorizationProvider 接口实现
    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.onAuthorizationChangedEmitter.event;
    }

    async isAuthorized(pluginId: string): Promise<boolean> {
        const status = await this.manager.getAuthorizationStatus(pluginId);
        return status === AuthorizationStatus.GRANTED;
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        const allStatuses = await this.manager.getAllAuthorizationStatuses();
        return Array.from(allStatuses.entries())
            .filter(([, status]) => status === AuthorizationStatus.GRANTED)
            .map(([pluginId]) => pluginId);
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        const allStatuses = await this.manager.getAllAuthorizationStatuses();
        return Array.from(allStatuses.entries())
            .filter(([, status]) => status === AuthorizationStatus.DENIED)
            .map(([pluginId]) => pluginId);
    }

    async grantAuthorization(pluginId: string): Promise<void> {
        await this.manager.grantAuthorization(pluginId);
    }

    async revokeAuthorization(pluginId: string): Promise<void> {
        await this.manager.revokeAuthorization(pluginId);
    }

    async getAuthorizationStatus(pluginId: string): Promise<AuthorizationStatus> {
        return this.manager.getAuthorizationStatus(pluginId);
    }

    get onDidUpdateAuthorizationStatus() {
        return this.manager.onDidUpdateAuthorizationStatus;
    }


    async manageTestPluginAuthorization(grant: boolean): Promise<void> {
        if (grant) {
            await this.grantAuthorization('<unpublished>.test-plugin');
        } else {
            await this.revokeAuthorization('<unpublished>.test-plugin');
        }
    }


    // IAuthorizationRPC 接口实现
    async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        return this.manager.getAuthorizationStatus(pluginId);
    }

    async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[PLUGIN-AUTH-SERVICE] 授权插件: ${pluginId}`);
        await this.manager.grantAuthorization(pluginId);
    }

    async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        console.log(`[PLUGIN-AUTH-SERVICE] 撤销授权: ${pluginId}`);
        await this.manager.revokeAuthorization(pluginId);
    }

    async $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        return this.manager.getAllAuthorizationStatuses();
    }

    // RPC客户端管理
    registerClient(client: IAuthorizationClient): void {
        this.clients.push(client);
        this.logger.debug(`新RPC客户端已注册，当前总数: ${this.clients.length}`);
    }

    unregisterClient(client: IAuthorizationClient): void {
        const index = this.clients.indexOf(client);
        if (index !== -1) {
            this.clients.splice(index, 1);
            this.logger.debug(`RPC客户端已注销，剩余数量: ${this.clients.length}`);
        }
    }


    // 扩展功能
    getAuthorizationStats(): any {
        return this.manager.getAuthorizationStats();
    }

    resetAllAuthorizations(): void {
        this.manager.resetAllAuthorizations();
    }
}

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { PluginAuthorizationProvider, PluginAuthorizationChangeEvent } from '../../../common/services/authorization/plugin-authorization';
import {
    IAuthorizationRPC,
    IAuthorizationClient
} from '../../../common/services/authorization/i-authorization-service';
import { PluginAuthorizationManager } from '../../../common/services/authorization/plugin-authorization-manager';
import {
    PluginIdentifier,
    AuthorizationStatus
} from '../../../common/services/authorization/types';

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
        this.manager.onDidUpdateAuthorizationStatus(event => {
            // Legacy接口事件转换
            const legacyEvent: PluginAuthorizationChangeEvent = {
                changedPluginIds: [event.pluginId],
                changeType: event.status === AuthorizationStatus.GRANTED ? 'granted' : 'revoked'
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

    // Legacy接口 - 批量操作
    grantAuthorization(pluginIds: string[]): void {
        pluginIds.forEach(pluginId => {
            this.manager.grantAuthorization(pluginId);
        });
    }

    revokeAuthorization(pluginIds: string[]): void {
        pluginIds.forEach(pluginId => {
            this.manager.revokeAuthorization(pluginId);
        });
    }


    async manageTestPluginAuthorization(grant: boolean): Promise<void> {
        if (grant) {
            this.grantAuthorization(['<unpublished>.test-plugin']);
        } else {
            this.revokeAuthorization(['<unpublished>.test-plugin']);
        }
    }


    // IAuthorizationRPC 接口实现
    async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        return this.manager.getAuthorizationStatus(pluginId);
    }

    async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        await this.manager.grantAuthorization(pluginId);
    }

    async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
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

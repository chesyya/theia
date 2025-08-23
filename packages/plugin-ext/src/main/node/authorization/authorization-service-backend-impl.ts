// import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
// import { Event } from '@theia/core/lib/common/event';
// import { ILogger } from '@theia/core/lib/common/logger';
// import { IAuthorizationService, IAuthorizationRPC, IAuthorizationClient } from '../../../common/services/authorization/i-authorization-service';
// import { PluginAuthorizationManager } from '../../../common/services/authorization/plugin-authorization-manager';
// import { PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from '../../../common/services/authorization/types';

// @injectable()
// export class AuthorizationServiceBackendImpl implements IAuthorizationService, IAuthorizationRPC {

//     @inject(PluginAuthorizationManager)
//     protected readonly authorizationManager: PluginAuthorizationManager;

//     @inject(ILogger)
//     protected readonly logger: ILogger;

//     protected clients: IAuthorizationClient[] = [];

//     @postConstruct()
//     protected init(): void {
//         this.authorizationManager.onDidUpdateAuthorizationStatus(event => {
//             this.logger.debug(`[PLUGIN] 向 ${this.clients.length} 个客户端广播授权状态变化`);
//             for (const client of this.clients) {
//                 try {
//                     client.$onDidUpdateAuthorizationStatus(event);
//                 } catch (error) {
//                     this.logger.error(`[PLUGIN] 通知客户端时发生错误`, error);
//                 }
//             }
//         });
//     }

//     get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
//         return this.authorizationManager.onDidUpdateAuthorizationStatus;
//     }

//     async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
//         return this.authorizationManager.getAuthorizationStatus(pluginId);
//     }

//     async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
//         await this.authorizationManager.grantAuthorization(pluginId);
//         this.logger.info(`[PLUGIN] 已授予插件授权: ${pluginId}`);
//     }

//     async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
//         await this.authorizationManager.revokeAuthorization(pluginId);
//         this.logger.info(`[PLUGIN] 已撤销插件授权: ${pluginId}`);
//     }

//     async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
//         return this.authorizationManager.getAllAuthorizationStatuses();
//     }

//     // RPC接口实现 - 用于前端调用
//     async $getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
//         return this.getAuthorizationStatus(pluginId);
//     }

//     async $grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
//         await this.grantAuthorization(pluginId);
//     }

//     async $revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
//         await this.revokeAuthorization(pluginId);
//     }

//     async $getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
//         return this.getAllAuthorizationStatuses();
//     }

//     registerClient(client: IAuthorizationClient): void {
//         this.clients.push(client);
//         this.logger.debug(`[PLUGIN] 新客户端已注册，当前总数: ${this.clients.length}`);
//     }

//     unregisterClient(client: IAuthorizationClient): void {
//         const index = this.clients.indexOf(client);
//         if (index !== -1) {
//             this.clients.splice(index, 1);
//             this.logger.debug(`[PLUGIN] 客户端已注销，剩余数量: ${this.clients.length}`);
//         }
//     }

//     getAuthorizationStats(): any {
//         return this.authorizationManager.getAuthorizationStats();
//     }

//     resetAllAuthorizations(): void {
//         this.authorizationManager.resetAllAuthorizations();
//         this.logger.warn(`[PLUGIN] 已重置所有插件授权状态`);
//     }

//     async grantAuthorizationBatch(pluginIds: PluginIdentifier[]): Promise<void> {
//         for (const pluginId of pluginIds) {
//             await this.grantAuthorization(pluginId);
//         }
//         this.logger.info(`[PLUGIN] 批量授予授权完成，共 ${pluginIds.length} 个插件`);
//     }

//     async revokeAuthorizationBatch(pluginIds: PluginIdentifier[]): Promise<void> {
//         for (const pluginId of pluginIds) {
//             await this.revokeAuthorization(pluginId);
//         }
//         this.logger.info(`[PLUGIN] 批量撤销授权完成，共 ${pluginIds.length} 个插件`);
//     }
// }

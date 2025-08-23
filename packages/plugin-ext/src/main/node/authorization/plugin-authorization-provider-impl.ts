// import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
// import { Emitter, Event } from '@theia/core/lib/common/event';
// import { ILogger } from '@theia/core';
// import { PluginAuthorizationProvider, PluginAuthorizationChangeEvent } from '../../../common/plugin-authorization';
// import { AuthorizationStatus } from '../../../common/services/authorization';
// import { AuthorizationServiceBackendImpl } from './authorization-service-backend-impl';

// /**
//  * 授权提供者
//  */
// @injectable()
// export class PluginAuthorizationProviderImpl implements PluginAuthorizationProvider {

//     private readonly onAuthorizationChangedEmitter = new Emitter<PluginAuthorizationChangeEvent>();

//     @inject(AuthorizationServiceBackendImpl)
//     protected readonly authorizationService: AuthorizationServiceBackendImpl;
//     @inject(ILogger)
//     protected readonly logger: ILogger

//     @postConstruct()
//     protected postConstruct(): void {
//         // 监听授权服务的状态变化
//         this.authorizationService.onDidUpdateAuthorizationStatus(event => {
//             this.logger.info(`[PLUGIN] 收到新的授权服务事件: ${JSON.stringify(event)}`);

//             const legacyEvent: PluginAuthorizationChangeEvent = {
//                 changedPluginIds: [event.pluginId],
//                 changeType: event.status === AuthorizationStatus.GRANTED ? 'granted' : 'revoked'
//             };

//             this.logger.info(`[PLUGIN] 🔄 转换为旧接口事件格式: ${JSON.stringify(legacyEvent)}`);
//             this.onAuthorizationChangedEmitter.fire(legacyEvent);
//         });
//     }

//     get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
//         return this.onAuthorizationChangedEmitter.event;
//     }

//     async $isAuthorized(pluginId: string): Promise<boolean> {
//         this.logger.info(`[PLUGIN] 🔍 检查插件授权状态: ${pluginId} (委托给新服务)`);

//         try {
//             const authStatus = await this.authorizationService.getAuthorizationStatus(pluginId);
//             const isAuthorized = authStatus === AuthorizationStatus.GRANTED;

//             this.logger.info(`[PLUGIN] ✅ 新服务返回状态: ${authStatus}, 是否已授权: ${isAuthorized}`);
//             return isAuthorized;
//         } catch (error) {
//             this.logger.error(`[PLUGIN] ❌ 获取插件授权状态出错: ${pluginId}`, error);
//             // 发生错误时默认为已授权（向后兼容）
//             return true;
//         }
//     }

//     async getAuthorizedPluginIds(): Promise<string[]> {
//         this.logger.info('[PLUGIN] 📋 获取已授权插件列表（新服务未实现，返回空数组）');
//         return [];
//     }

//     async getUnauthorizedPluginIds(): Promise<string[]> {
//         this.logger.info('[PLUGIN] 📋 获取未授权插件列表（新服务未实现，返回空数组）');
//         return [];
//     }

//     grantAuthorization(pluginIds: string[]): void {
//         this.logger.info(`[PLUGIN] 🎯 调用 grantAuthorization, 插件: ${pluginIds}`);

//         for (const pluginId of pluginIds) {
//             this.logger.info(`[PLUGIN] 🔓 授权插件: ${pluginId}`);
//             try {
//                 this.authorizationService.grantAuthorization(pluginId);
//                 this.logger.info(`[PLUGIN] ✅ 插件授权成功: ${pluginId}`);
//             } catch (error) {
//                 this.logger.error(`[PLUGIN] ❌ 插件授权失败: ${pluginId}`, error);
//             }
//         }
//     }

//     revokeAuthorization(pluginIds: string[]): void {
//         this.logger.info(`[PLUGIN] 🎯 调用 revokeAuthorization, 插件: ${pluginIds}`);

//         for (const pluginId of pluginIds) {
//             this.logger.info(`[PLUGIN] 🔒 撤销插件授权: ${pluginId}`);
//             try {
//                 this.authorizationService.revokeAuthorization(pluginId);
//                 this.logger.info(`[PLUGIN] ✅ 插件授权已撤销: ${pluginId}`);
//             } catch (error) {
//                 this.logger.error(`[PLUGIN] ❌ 撤销插件授权失败: ${pluginId}`, error);
//             }
//         }
//     }

//     async grantTestPluginAuthorization(): Promise<void> {
//         this.logger.info('[PLUGIN] 🧪 授权测试插件');
//         this.grantAuthorization(['<unpublished>.test-plugin']);
//     }

//     async revokeTestPluginAuthorization(): Promise<void> {
//         this.logger.info('[PLUGIN] 🧪 撤销测试插件授权');
//         this.revokeAuthorization(['<unpublished>.test-plugin']);
//     }

//     async resetAuthorizationState(): Promise<void> {
//         this.logger.info('[PLUGIN] 🔄 重置授权状态 (委托给新服务)');
//         try {
//             await this.authorizationService.revokeAuthorization('<unpublished>.test-plugin');
//             this.logger.info('[PLUGIN] ✅ 重置完成，测试插件已撤销授权');
//         } catch (error) {
//             this.logger.error('[PLUGIN] ❌ 重置授权状态失败', error);
//         }
//     }
// }

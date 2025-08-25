// // *****************************************************************************
// // Copyright (C) 2024 TypeFox and others.
// //
// // This program and the accompanying materials are made available under the
// // terms of the Eclipse Public License v. 2.0 which is available at
// // http://www.eclipse.org/legal/epl-2.0.
// //
// // This Source Code may also be made available under the following Secondary
// // Licenses when the conditions for such availability set forth in the Eclipse
// // Public License v. 2.0 are satisfied: GNU General Public License, version 2
// // with the GNU Classpath Exception which is available at
// // https://www.gnu.org/software/classpath/license.html.
// //
// // SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// // *****************************************************************************

// import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
// import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
// import { PluginDeployer, PluginDeployerHandler, PluginIdentifiers } from '../../../common/plugin-protocol';
// import { ILogger } from '@theia/core/lib/common/logger';
// import { AuthorizationStatus, IAuthorizationService } from '../../../common/authorization/i-authorization-service';

// /**
//  * 授权强制执行服务 (1.61.0 版本)
//  * 负责协调插件授权状态，使用 1.61.0 的 enable/disable 机制
//  */
// @injectable()
// export class AuthorizationEnforcementService implements BackendApplicationContribution {

//     @inject(ILogger)
//     protected readonly logger: ILogger;


//     @inject(PluginDeployer)
//     protected readonly pluginDeployer: PluginDeployer;

//     @inject(PluginDeployerHandler)
//     protected readonly deployerHandler: PluginDeployerHandler;

//     @inject(IAuthorizationService)
//     protected readonly authorizationService: IAuthorizationService;

//     // 插件版本映射表
//     private pluginVersionMapping = new Map<PluginIdentifiers.UnversionedId, PluginIdentifiers.VersionedId>();


//     @postConstruct()
//     protected init(): void {
//         // 监听授权状态变更事件
//         this.authorizationService.onDidUpdateAuthorizationStatus(event => {
//             this.handleAuthorizationChanged(event);
//         });

//         this.logger.info('[PLUGIN] ℹ️ 授权强制服务初始化完成 (1.61.0 disable模式)');
//     }

//     async onStart(): Promise<void> {
//         this.logger.info('[PLUGIN] ℹ️ 启动授权强制服务...');

//         // 在应用启动时同步所有插件的授权状态
//         await this.synchronizeAllPlugins();

//         this.logger.info('[PLUGIN] ℹ️ 授权强制服务已启动');
//     }

//     /**
//      * 同步所有已部署插件的授权状态
//      */
//     private async synchronizeAllPlugins(): Promise<void> {
//         try {
//             // 获取所有已部署插件
//             const deployedPlugins = await this.deployerHandler.getDeployedPlugins();

//             this.logger.info(`[PLUGIN] ℹ️ 开始同步插件授权状态，部署插件 ${deployedPlugins.length} 个`);

//             // 构建插件版本映射
//             for (const plugin of deployedPlugins) {
//                 const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
//                 const unversionedId = PluginIdentifiers.unversionedFromVersioned(versionedId);
//                 this.pluginVersionMapping.set(unversionedId, versionedId);
//             }

//             // 处理已部署的插件
//             for (const plugin of deployedPlugins) {
//                 const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
//                 const unversionedId = PluginIdentifiers.unversionedFromVersioned(versionedId);
//                 const authStatus = await this.authorizationService.getAuthorizationStatus(unversionedId);

//                 this.logger.info(`[PLUGIN] ℹ️ 插件 ${unversionedId}: 授权=${authStatus}`);

//                 if (authStatus === AuthorizationStatus.DENIED) {
//                     // 未授权插件需要 undeploy，暂时保持当前的undeploy逻辑
//                     this.logger.info(`[PLUGIN] ℹ️ undeploy 未授权插件: ${unversionedId}`);
//                     await this.pluginDeployer.undeploy(versionedId);
//                 }
//             }

//             this.logger.info('[PLUGIN] ℹ️ 插件授权状态同步完成');
//         } catch (error) {
//             this.logger.error('[PLUGIN] ❌ 同步插件授权状态失败:', error);
//         }
//     }

//     /**
//      * 处理授权状态变更事件
//      */
//     private async handleAuthorizationChanged(event: any): Promise<void> {
//         const { pluginId, status, previousStatus } = event;

//         this.logger.info(`[PLUGIN] ℹ️ 授权状态变更: ${pluginId} (${previousStatus} -> ${status})`);

//         try {
//             // 标准化插件ID格式以匹配存储的mapping
//             const normalizedPluginId = this.normalizePluginId(pluginId);
//             this.logger.debug(`[PLUGIN] 🔄 标准化插件ID: ${pluginId} -> ${normalizedPluginId}`);

//             const versionedId = this.pluginVersionMapping.get(normalizedPluginId as PluginIdentifiers.UnversionedId);

//             if (status === AuthorizationStatus.DENIED) {
//                 // 撤销授权：需要 undeploy 插件
//                 if (versionedId) {
//                     this.logger.info(`[PLUGIN] ℹ️ undeploy 未授权插件: ${pluginId}`);
//                     await this.pluginDeployer.undeploy(versionedId);
//                 }
//             } else if (status === AuthorizationStatus.GRANTED && (previousStatus === AuthorizationStatus.DENIED)) {
//                 // 恢复授权：触发重新部署
//                 // this.logger.info(`[PLUGIN] ℹ️ 插件 ${pluginId} 授权恢复，触发重新部署`);

//                 // // 触发插件重新扫描和部署
//                 // try {
//                 //     await this.pluginDeployer.start();
//                 //     this.logger.info(`[PLUGIN] ✅ 成功重新部署插件: ${pluginId}`);
//                 // } catch (deployError) {
//                 //     this.logger.error(`[PLUGIN] ❌ 重新部署插件失败: ${pluginId}`, deployError);
//                 // }
//             }

//         } catch (error) {
//             this.logger.error(`[PLUGIN] ❌ 处理插件 ${pluginId} 授权变更失败:`, error);
//         }
//     }

//     /**
//      * 标准化插件ID格式，将各种格式统一转换为存储格式
//      */
//     private normalizePluginId(pluginId: string): string {
//         // 移除尖括号：<unpublished>.test-plugin -> unpublished.test-plugin
//         return pluginId.replace(/[<>]/g, '');
//     }

// }

// // *****************************************************************************
// // Copyright (C) 2024 and others.
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

// import { injectable } from '@theia/core/shared/inversify';
// import {
//     PluginIdentifiers,
//     PluginOverrideInfo,
//     PluginOriginType,
//     PluginVersionInfo
// } from '../../common/plugin-protocol';

// /**
//  * 插件覆盖关系管理器
//  * 负责管理同一插件的多个版本，并根据优先级确定生效版本
//  */
// @injectable()
// export class PluginOverrideManager {
//     /** 存储所有插件的覆盖关系信息 */
//     protected overrideMap = new Map<PluginIdentifiers.UnversionedId, PluginOverrideInfo>();

//     /**
//      * 添加或更新插件版本
//      * @param pluginId 插件的版本化ID
//      * @param originType 插件的来源类型
//      * @returns 更新后的覆盖信息
//      */
//     addPluginVersion(
//         pluginId: PluginIdentifiers.VersionedId,
//         originType: PluginOriginType
//     ): PluginOverrideInfo {
//         const unversionedId = this.getUnversionedId(pluginId);
//         let overrideInfo = this.overrideMap.get(unversionedId);

//         if (!overrideInfo) {
//             // 首次添加该插件
//             overrideInfo = {
//                 activePluginId: pluginId,
//                 activeOriginType: originType,
//                 allVersions: [{
//                     pluginId,
//                     originType,
//                     isActive: true
//                 }]
//             };
//         } else {
//             // 检查该版本是否已存在
//             const existingIndex = overrideInfo.allVersions.findIndex(v => v.pluginId === pluginId);

//             if (existingIndex !== -1) {
//                 // 更新现有版本的信息
//                 overrideInfo.allVersions[existingIndex].originType = originType;
//             } else {
//                 // 添加新版本
//                 overrideInfo.allVersions.push({
//                     pluginId,
//                     originType,
//                     isActive: false
//                 });
//             }

//             // 重新计算激活的版本
//             this.recalculateActiveVersion(overrideInfo);
//         }

//         this.overrideMap.set(unversionedId, overrideInfo);
//         return overrideInfo;
//     }

//     /**
//      * 移除插件版本
//      * @param pluginId 要移除的插件ID
//      * @returns 移除后的覆盖信息，如果该插件完全移除则返回undefined
//      */
//     removePluginVersion(pluginId: PluginIdentifiers.VersionedId): PluginOverrideInfo | undefined {
//         const unversionedId = this.getUnversionedId(pluginId);
//         const overrideInfo = this.overrideMap.get(unversionedId);

//         if (!overrideInfo) {
//             return undefined;
//         }

//         // 移除指定版本
//         const versionIndex = overrideInfo.allVersions.findIndex(v => v.pluginId === pluginId);
//         if (versionIndex !== -1) {
//             overrideInfo.allVersions.splice(versionIndex, 1);
//         }

//         // 如果没有剩余版本，完全移除该插件
//         if (overrideInfo.allVersions.length === 0) {
//             this.overrideMap.delete(unversionedId);
//             return undefined;
//         }

//         // 重新计算激活的版本
//         this.recalculateActiveVersion(overrideInfo);
//         this.overrideMap.set(unversionedId, overrideInfo);

//         return overrideInfo;
//     }

//     /**
//      * 获取当前生效的插件版本ID
//      * @param unversionedId 未版本化的插件ID
//      * @returns 生效的插件版本ID，如果不存在则返回undefined
//      */
//     getActivePluginId(unversionedId: PluginIdentifiers.UnversionedId): PluginIdentifiers.VersionedId | undefined {
//         const overrideInfo = this.overrideMap.get(unversionedId);
//         return overrideInfo?.activePluginId;
//     }

//     /**
//      * 获取插件的完整覆盖信息
//      * @param pluginId 插件ID（可以是版本化或未版本化）
//      * @returns 覆盖信息，如果不存在则返回undefined
//      */
//     getOverrideInfo(pluginId: string): PluginOverrideInfo | undefined {
//         const unversionedId = this.getUnversionedId(pluginId as PluginIdentifiers.VersionedId);
//         return this.overrideMap.get(unversionedId);
//     }

//     /**
//      * 获取同一插件的所有版本
//      * @param unversionedId 未版本化的插件ID
//      * @returns 所有版本信息数组
//      */
//     getAllVersions(unversionedId: PluginIdentifiers.UnversionedId): PluginVersionInfo[] {
//         const overrideInfo = this.overrideMap.get(unversionedId);
//         return overrideInfo?.allVersions || [];
//     }

//     /**
//      * 检查指定插件版本是否为当前生效版本
//      * @param pluginId 插件的版本化ID
//      * @returns true 如果是生效版本，否则返回 false
//      */
//     isActiveVersion(pluginId: PluginIdentifiers.VersionedId): boolean {
//         const unversionedId = this.getUnversionedId(pluginId);
//         const overrideInfo = this.overrideMap.get(unversionedId);
//         return overrideInfo?.activePluginId === pluginId;
//     }

//     /**
//      * 获取所有可用的来源类型
//      * @param unversionedId 未版本化的插件ID
//      * @returns 所有可用的来源类型数组
//      */
//     getAvailableOrigins(unversionedId: PluginIdentifiers.UnversionedId): PluginOriginType[] {
//         const versions = this.getAllVersions(unversionedId);
//         const origins = new Set<PluginOriginType>();
//         versions.forEach(v => origins.add(v.originType));
//         return Array.from(origins);
//     }

//     /**
//      * 重新计算生效版本（根据优先级）
//      * 优先级：User > AdminShared > System
//      */
//     protected recalculateActiveVersion(overrideInfo: PluginOverrideInfo): void {
//         if (overrideInfo.allVersions.length === 0) {
//             return;
//         }

//         // 按优先级排序
//         const sorted = [...overrideInfo.allVersions].sort((a, b) => {
//             return this.calculatePriority(b.originType) - this.calculatePriority(a.originType);
//         });

//         // 更新激活状态
//         const activeVersion = sorted[0];
//         overrideInfo.activePluginId = activeVersion.pluginId;
//         overrideInfo.activeOriginType = activeVersion.originType;

//         // 更新所有版本的 isActive 状态
//         overrideInfo.allVersions.forEach(v => {
//             v.isActive = v.pluginId === activeVersion.pluginId;
//         });
//     }

//     /**
//      * 计算插件来源类型的优先级
//      * @param originType 来源类型
//      * @returns 优先级数值（越大优先级越高）
//      */
//     protected calculatePriority(originType: PluginOriginType): number {
//         switch (originType) {
//             case PluginOriginType.User:
//                 return 3;           // 最高优先级
//             case PluginOriginType.AdminShared:
//                 return 2;
//             case PluginOriginType.System:
//                 return 1;           // 最低优先级
//             default:
//                 return 0;
//         }
//     }

//     /**
//      * 从版本化ID提取未版本化ID
//      * @param versionedId 版本化的插件ID (例如: "publisher.name@1.0.0")
//      * @returns 未版本化的插件ID (例如: "publisher.name")
//      */
//     protected getUnversionedId(versionedId: PluginIdentifiers.VersionedId): PluginIdentifiers.UnversionedId {
//         const atIndex = versionedId.lastIndexOf('@');
//         if (atIndex !== -1) {
//             return versionedId.substring(0, atIndex) as PluginIdentifiers.UnversionedId;
//         }
//         return versionedId as unknown as PluginIdentifiers.UnversionedId;
//     }

//     /**
//      * 清空所有覆盖关系
//      */
//     clear(): void {
//         this.overrideMap.clear();
//     }

//     /**
//      * 获取所有插件的覆盖信息（用于调试）
//      */
//     getAllOverrideInfo(): Map<PluginIdentifiers.UnversionedId, PluginOverrideInfo> {
//         return new Map(this.overrideMap);
//     }
// }

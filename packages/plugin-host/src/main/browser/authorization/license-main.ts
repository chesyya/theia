/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-28 09:13:28
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/authorization/license-main.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-28 09:18:22
 */
import { interfaces } from "@theia/core/shared/inversify";
import { LicenseMain, PluginIdentifiers, PluginRegistryMain } from "../../../common";
import { PluginViewService } from "../../../common/plugin-view-service";
import { LicenseServer } from "@baosky/platform/lib/common/license/license-server";
import { LicenseableResource } from "@baosky/platform/lib/common/license/license-data-struct";

/**
 * 许可证接口实现
 * @date 2025-11-28 , 9:17:57 am
 * @author 南天远
 *
 * @export
 * @class LicenseMainImpl
 * @typedef {LicenseMainImpl}
 * @implements {LicenseMain}
 */
export class LicenseMainImpl implements LicenseMain{
    protected readonly licenseServer: LicenseServer;

    constructor(container: interfaces.Container){
        this.licenseServer = container.get(LicenseServer);
    }

    /**
     * 根据资源ID获取资源属性
     * @date 2025-11-28 , 9:18:09 am
     * @author 南天远
     *
     * @async
     * @param {string[]} resourceIds
     * @returns {Promise<LicenseableResource[]>}
     */
    async $getAttributesByIDEResource(
        resourceIds: string[]
      ): Promise<LicenseableResource[]>{
        const result = await this.licenseServer.getAttributesByIDEResource(resourceIds);
        return result
      }
}

/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-28 09:14:08
 * @FilePath: /workdir/packages/plugin-host/src/plugin/authorization/license-ext.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-28 09:26:41
 */
import { LicenseExt, LicenseMain } from "../../common";
import { RPCProtocol } from "../../common/rpc-protocol";
import { Plugin, PLUGIN_RPC_CONTEXT, PluginIdentifiers, PluginRegistryExt } from "../../common";
import { LicenseableResource } from "@baosky/platform/lib/common/license/license-data-struct";

/**
 * LicenseExtImpl
 * @date 2025-11-28 , 9:24:15 am
 * @author 南天远
 *
 * @export
 * @class LicenseExtImpl
 * @typedef {LicenseExtImpl}
 * @implements {LicenseExt}
 */
export class LicenseExtImpl implements LicenseExt{
    protected readonly proxy: LicenseMain;

    constructor(rpc: RPCProtocol){
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.LICENSE_MAIN);
    }

    /**
     * 根据资源ID获取资源属性
     * @param resourceIds
     * @returns
     */
    async getAttributesByIDEResource(resourceIds: string[]): Promise<LicenseableResource[]> {
        return this.proxy.$getAttributesByIDEResource(resourceIds);
    }
}

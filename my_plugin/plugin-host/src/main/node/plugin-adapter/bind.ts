/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-04 09:34:19
 * @FilePath: /workdir/packages/plugin-host/src/main/node/plugin-adapter/bind.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-06 17:09:28
 */
import { interfaces } from "@theia/core/shared/inversify";
import { UserStorageAdapterFactory, UserStorageAdapterProps } from "@baosky/platform/lib/common/storage-space/user-storage/user-storage-adapter";
import { PluginUserStorageAdapter, PluginUserStorageAdapterFactory } from "./plugin-adapter-control";

/**
 * 绑定
 * @date 2025-11-04 , 9:45:44 am
 * @author 南天远
 *
 * @export
 * @param {interfaces.Bind} bind
 */
export function bindUserStorage(bind: interfaces.Bind): void {
  // bind(PluginUserStorageControl).toSelf().inSingletonScope();

  bind(PluginUserStorageAdapterFactory).toFactory((ctx) => (props:UserStorageAdapterProps) => {
    const child = ctx.container.createChild();
    child.bind(UserStorageAdapterProps).toConstantValue({...props});
    child.bind(PluginUserStorageAdapter).toSelf().inSingletonScope();
    return child.get(PluginUserStorageAdapter);
  });
}

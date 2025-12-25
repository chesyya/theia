/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-12 15:08:12
 * @FilePath: /workdir/packages/plugin-host/src/plugin/project/user-service-ext.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { PLUGIN_RPC_CONTEXT, UserServiceExt, UserServiceMain } from "../../common";
import { RPCProtocol } from "../../common/rpc-protocol";
import * as baosky from '@baosky/plugin'

export class UserServiceExtImpl implements UserServiceExt {

    protected readonly proxy: UserServiceMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.USER_SERVICE_MAIN);
    }
    isAdminUser(): boolean {
        return this.proxy.$isAdminUser();
    }

    async getUserInfo(): Promise<baosky.UserInfo | undefined> {
        return await this.proxy.$getUserInfo();
    }

}

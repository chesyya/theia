/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-12 15:08:12
 * @FilePath: /workdir/packages/plugin-host/src/plugin/platform/message-service/message-service-ext.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { PlatformMessageServiceMain } from '../../../common';
import * as baosky from '@baosky/plugin';
import { PlatformMessageServiceExt, PLUGIN_RPC_CONTEXT } from "../../../common";
import { RPCProtocol } from "../../../common/rpc-protocol";

export class PlatformMessageServiceExtImpl implements PlatformMessageServiceExt {
    protected readonly proxy: PlatformMessageServiceMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLATFORM_MESSAGE_SERVICE_MAIN);
    }
    sendRoutineInfo(routineInfo: baosky.RoutineInfo): void {
        this.proxy.$pushRoutineInfo(routineInfo);
    }

}

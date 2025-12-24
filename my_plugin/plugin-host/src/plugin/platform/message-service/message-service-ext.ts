import { PlatformMessageServiceMain } from '../../../common';
import * as baosky from '@baosky/plugin';
import { RoutineInfoService } from '@baosky/platform/lib/browser/info-view/routine/routine-info-service'
import { interfaces } from "@theia/core/shared/inversify";
import { PlatformMessageServiceExt, PLUGIN_RPC_CONTEXT } from "../../../common";
import { RpcProtocol } from "@theia/core";
import { RPCProtocol } from "../../../common/rpc-protocol";

export class PlatformMessageServiceExtImpl implements PlatformMessageServiceExt {
    protected readonly proxy: PlatformMessageServiceMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLATFORM_MESSAGE_SERVICE_MAIN);
    }
    sendRoutineInfo(routineInfo: baosky.platform.RoutineInfo): void {
        this.proxy.$pushRoutineInfo(routineInfo);
    }

}

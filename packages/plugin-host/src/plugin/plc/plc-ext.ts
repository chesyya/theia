/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-11-27 10:52:31
 * @FilePath: /workdir/packages/plugin-host/src/plugin/plc/plc-ext.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { GlobalQuickfixProvider } from '@baosky/plc-protocol/lib/browser/quick-fix/quick-fix-interface'
import { PlcExt, PlcMain, PLUGIN_RPC_CONTEXT } from '../../common';
import { RPCProtocol } from '../../common/rpc-protocol';

import * as baosky from '@baosky/plugin'

export class PlcExtImpl implements PlcExt {

    protected readonly globalQuickfixProvider: GlobalQuickfixProvider;
    protected readonly proxy: PlcMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLC_MAIN);
    }

    async provideQuickFixAction(plcName: string) {
        const callbackId = await this.proxy.$provideQuickFixAction(plcName);
        return () => this.proxy.$invokeFunction(callbackId);
    }

    /**
     * @description 获取plc下默认的namespace 
     */
    public async getDefaultNamespace(plcName: string): Promise<string> {
        return this.proxy.$getDefaultNamespace(plcName)
    }
    async importPLCopen(options: baosky.ImportPLCopenOptions): Promise<void> {
        return await this.proxy.$importPLCopen(options);
    }

}

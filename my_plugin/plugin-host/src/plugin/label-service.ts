import { ResourceLabelFormatter } from '@baosky/plugin';
import { Disposable } from '@theia/core/lib/common/disposable';
import { LabelServiceExt, LabelServiceMain, PLUGIN_RPC_CONTEXT } from '../common/plugin-api-rpc';
import { RPCProtocol } from '../common/rpc-protocol';

export class LabelServiceExtImpl implements LabelServiceExt {
    private handle: number = 0;
    private proxy: LabelServiceMain;
    constructor(readonly rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.LABEL_SERVICE_MAIN);
    }

    $registerResourceLabelFormatter(formatter: ResourceLabelFormatter): Disposable {
        const handle = this.handle++;
        this.proxy.$registerResourceLabelFormatter(handle, formatter);
        return Disposable.create(() => {
            this.proxy.$unregisterResourceLabelFormatter(handle);
        });
    }
}

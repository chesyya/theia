import * as theia from '@baosky/plugin';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { RPCProtocol } from '../common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, ClipboardMain } from '../common';

@injectable()
export class ClipboardExt implements theia.Clipboard {

    @inject(RPCProtocol)
    protected readonly rpc: RPCProtocol;

    protected proxy: ClipboardMain;

    @postConstruct()
    initialize(): void {
        this.proxy = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.CLIPBOARD_MAIN);
    }

    readText(): Promise<string> {
        return this.proxy.$readText();
    }

    writeText(value: string): Promise<void> {
        return this.proxy.$writeText(value);
    }

}

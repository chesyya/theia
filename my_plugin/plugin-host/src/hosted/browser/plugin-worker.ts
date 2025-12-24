import { BasicChannel } from '@theia/core/lib/common/message-rpc/channel';
import { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } from '@theia/core/lib/common/message-rpc/uint8-array-message-buffer';
import { injectable } from '@theia/core/shared/inversify';
import { RPCProtocol, RPCProtocolImpl } from '../../common/rpc-protocol';

@injectable()
export class PluginWorker {

    private worker: Worker;

    public readonly rpc: RPCProtocol;

    constructor() {
        this.worker = new Worker(new URL('./worker/worker-main',
            // @ts-expect-error (TS1343)
            // We compile to CommonJS but `import.meta` is still available in the browser
            import.meta.url));

        const channel = new BasicChannel(() => {
            const writer = new Uint8ArrayWriteBuffer();
            writer.onCommit(buffer => {
                this.worker.postMessage(buffer);
            });
            return writer;
        });

        this.rpc = new RPCProtocolImpl(channel);

        // eslint-disable-next-line arrow-body-style
        this.worker.onmessage = buffer => channel.onMessageEmitter.fire(() => {
            return new Uint8ArrayReadBuffer(buffer.data);
        });

        this.worker.onerror = e => channel.onErrorEmitter.fire(e);
    }

}

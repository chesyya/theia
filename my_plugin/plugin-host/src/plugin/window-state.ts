import { URI } from './types-impl';
import { WindowState } from '@baosky/plugin';
import { WindowStateExt, WindowMain, PLUGIN_RPC_CONTEXT } from '../common/plugin-api-rpc';
import { Event, Emitter } from '@theia/core/lib/common/event';
import { RPCProtocol } from '../common/rpc-protocol';

export class WindowStateExtImpl implements WindowStateExt {

    private windowStateCached: WindowState;

    private windowStateChangedEmitter = new Emitter<WindowState>();
    public readonly onDidChangeWindowState: Event<WindowState> = this.windowStateChangedEmitter.event;

    private readonly proxy: WindowMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.WINDOW_MAIN);
        this.windowStateCached = { focused: true, active: true }; // supposed tab is active on start
    }

    getWindowState(): WindowState {
        return this.windowStateCached;
    }

    $onDidChangeWindowFocus(focused: boolean): void {
        this.onDidChangeWindowProperty('focused', focused);
    }

    $onDidChangeWindowActive(active: boolean): void {
        this.onDidChangeWindowProperty('active', active);
    }

    onDidChangeWindowProperty(property: keyof WindowState, value: boolean): void {
        if (value === this.windowStateCached[property]) {
            return;
        }

        this.windowStateCached = { ...this.windowStateCached, [property]: value };
        this.windowStateChangedEmitter.fire(this.windowStateCached);
    }

    async openUri(uriOrString: URI | string): Promise<boolean> {
        let uri: URI;
        if (typeof uriOrString === 'string') {
            uri = URI.parse(uriOrString);
        } else {
            uri = uriOrString;
        }
        if (!uri.scheme.trim().length) {
            throw new Error('Invalid scheme - cannot be empty');
        }

        return this.proxy.$openUri(uri);
    }

    async asExternalUri(target: URI): Promise<URI> {
        if (!target.scheme.trim().length) {
            throw new Error('Invalid scheme - cannot be empty');
        }

        const uri = await this.proxy.$asExternalUri(target);
        return URI.revive(uri);
    }

}

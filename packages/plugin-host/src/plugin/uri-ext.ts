import * as theia from '@baosky/plugin';
import {
    UriExt,
    PLUGIN_RPC_CONTEXT, PluginInfo, UriMain
} from '../common/plugin-api-rpc';
import { RPCProtocol } from '../common/rpc-protocol';
import { Disposable, URI } from './types-impl';
import { UriComponents } from '../common/uri-components';

export class UriExtImpl implements UriExt {

    private handlers = new Map<string, theia.UriHandler>();

    private readonly proxy: UriMain;

    constructor(readonly rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.URI_MAIN);
        console.log(this.proxy);
    }

    registerUriHandler(handler: theia.UriHandler, plugin: PluginInfo): theia.Disposable {
        const pluginId = plugin.id;
        if (this.handlers.has(pluginId)) {
            throw new Error(`URI handler already registered for plugin ${pluginId}`);
        }

        this.handlers.set(pluginId, handler);
        this.proxy.$registerUriHandler(pluginId, plugin.displayName || plugin.name);

        return new Disposable(() => {
            this.proxy.$unregisterUriHandler(pluginId);
            this.handlers.delete(pluginId);
        });
    }

    $handleExternalUri(uri: UriComponents): Promise<void> {
        const handler = this.handlers.get(uri.authority);
        if (!handler) {
            return Promise.resolve();
        }
        handler.handleUri(URI.revive(uri));
        return Promise.resolve();
    }
}

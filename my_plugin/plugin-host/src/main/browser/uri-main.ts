import { Disposable, URI } from '@theia/core';
import { MAIN_RPC_CONTEXT, UriExt, UriMain } from '../../common';
import { RPCProtocol } from '../../common/rpc-protocol';
import { interfaces } from '@theia/core/shared/inversify';
import { OpenHandler, OpenerOptions, OpenerService } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { HostedPluginSupport } from '../../hosted/browser/hosted-plugin';

export class UriMainImpl implements UriMain, Disposable {
    private readonly proxy: UriExt;
    private handlers = new Set<string>();
    private readonly openerService: OpenerService;
    private readonly pluginSupport: HostedPluginSupport;
    private readonly openHandler: OpenHandler;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.URI_EXT);
        this.openerService = container.get(OpenerService);
        this.pluginSupport = container.get(HostedPluginSupport);

        this.openHandler = {
            id: 'theia-plugin-open-handler',
            canHandle: async (uri: URI, options?: OpenerOptions | undefined): Promise<number> => {
                if (uri.scheme !== FrontendApplicationConfigProvider.get().electron.uriScheme) {
                    return 0;
                }
                await this.pluginSupport.activateByUri(uri.scheme, uri.authority);
                if (this.handlers.has(uri.authority)) {
                    return 500;
                }
                return 0;
            },
            open: async (uri: URI, options?: OpenerOptions | undefined): Promise<undefined> => {
                if (!this.handlers.has(uri.authority)) {
                    throw new Error(`No plugin to handle this uri: : '${uri}'`);
                }
                this.proxy.$handleExternalUri(uri.toComponents());
            }
        };

        this.openerService.addHandler?.(this.openHandler);
    }

    dispose(): void {
        this.openerService.removeHandler?.(this.openHandler);
        this.handlers.clear();
    }

    async $registerUriHandler(pluginId: string, extensionDisplayName: string): Promise<void> {
        this.handlers.add(pluginId);
    }

    async $unregisterUriHandler(pluginId: string): Promise<void> {
        this.handlers.delete(pluginId);
    }
}

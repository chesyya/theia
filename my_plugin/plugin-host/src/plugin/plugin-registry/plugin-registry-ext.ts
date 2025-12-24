import { Plugin, PLUGIN_RPC_CONTEXT, PluginIdentifiers, PluginRegistryExt, PluginRegistryMain } from "../../common";
import { RPCProtocol } from "../../common/rpc-protocol";

export class PluginRegistryExtImpl implements PluginRegistryExt{
    protected readonly proxy: PluginRegistryMain;

    constructor(rpc: RPCProtocol){
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLUGIN_REGISTRY_MAIN);
    }
    openPluginReadme(plugin: Plugin): Promise<void> {
        const pluginId = PluginIdentifiers.componentsToUnversionedId(plugin.model);
        return this.proxy.$openPluginReadme(pluginId);
    }
    checkPluginUpdates(plugin: Plugin): Promise<void> {
        const pluginId = PluginIdentifiers.componentsToUnversionedId(plugin.model);
        return this.proxy.$checkPluginUpdates(pluginId);
    }

}

import { interfaces } from "@theia/core/shared/inversify";
import { PluginDataServerImpl } from "./plugin-data-server-impl";
import { PluginDataServer, pluginDataServerPath } from "../../common/plugin-data-server";
import { ConnectionHandler, RpcConnectionHandler } from "@theia/core";

export function bindPluginData(bind: interfaces.Bind): void {
    bind(PluginDataServerImpl).toSelf().inSingletonScope();
    bind(PluginDataServer).toService(PluginDataServerImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(pluginDataServerPath, () =>
        ctx.container.get(PluginDataServer))
    )
}


import { RPCProtocol } from "../../common/rpc-protocol";
import { LanguageStatusExt, LanguageStatusMain, Plugin, PLUGIN_RPC_CONTEXT, PluginIdentifiers, PluginRegistryExt } from "../../common";

/**
 * LanguageStatusExtImpl
 * @date 2025-12-09 , 10:09:33 am
 * @author 南天远
 *
 * @export
 * @class LanguageStatusExtImpl
 * @typedef {LanguageStatusExtImpl}
 * @implements {LanguageStatusExt}
 */
export class LanguageStatusExtImpl implements LanguageStatusExt{
    protected readonly proxy: LanguageStatusMain;
    constructor(rpc: RPCProtocol){
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.LANGUAGE_STATUS_MAIN);
    }
    getStatus(): number {
        return this.proxy.$getStatus();
    }
}

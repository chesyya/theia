import { LibraryExt, LibraryMain, PLUGIN_RPC_CONTEXT } from "../../common";
import { RPCProtocol } from "../../common/rpc-protocol";
import * as baosky from '@baosky/plugin'

export class LibraryExtImpl implements LibraryExt {

    protected readonly proxy: LibraryMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLUGIN_LIBRARY_MAIN);
    }
    addToRefLibByLibSet(plcUri: baosky.Uri, libSetParamters: { libSet: string; version: string; category: string; }): Promise<void> {
        return this.proxy.$addToRefLibByLibSet(plcUri, libSetParamters);
    }

    getAllLibraryElements(options: { plcUri: baosky.Uri; filterId: baosky.LibraryFilterId; withVersion?: boolean; }) {
        return this.proxy.$getAllLibraryElements(options);
    }

    getAllReferenceLibElement(plcUri: baosky.Uri): Promise<baosky.LibraryElement[]> {
        return this.proxy.$getAllReferenceLibElement(plcUri);
    };
}

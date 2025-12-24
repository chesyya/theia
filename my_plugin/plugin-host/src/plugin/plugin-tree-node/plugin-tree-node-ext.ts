import { PLUGIN_RPC_CONTEXT, PluginPackage, PluginTreeNodeExt, PluginTreeNodeMain } from "../../common";
import { RPCProtocol } from "../../common/rpc-protocol";
import * as baosky from '@baosky/plugin'
// import { Disposable } from "@theia/core/shared/vscode-languageserver-protocol";
// import { Disposable, URI } from "@theia/core";
import path from 'path';
import { Plugin } from "../../common/plugin-api-rpc";
import { PluginIconPath } from "../plugin-icon-path";
import { ThemeIcon } from "../types-impl";

export class PluginTreeNodeExtImpl implements PluginTreeNodeExt {
    private readonly proxy: PluginTreeNodeMain;
    protected readonly listeners = new Map<string, () => void | undefined>();
    private nodeProviders = new Map<string, baosky.projects.TreeNodeProvider>();


    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLUGIN_TREE_NODE_MAIN);
    }
    registerTreeNodeProvider(provider: baosky.projects.TreeNodeProvider, plugin: Plugin): baosky.projects.TreeNodeController {

        const that = this;
        const treeNodeController: baosky.projects.TreeNodeController = new TreeNodeController(this.proxy, provider);
        const nodeData = provider.getNodeData();
        this.nodeProviders.set(nodeData.uri.path.toString(), provider);
        if (nodeData.icon && !(nodeData.icon.endsWith('</svg>')))
            nodeData.icon = PluginIconPath.asString(nodeData.icon, plugin);

        this.proxy.$addTreeNodeProvider(nodeData);



        return treeNodeController;

        // let subscription: theia.Disposable | undefined;
        // if (eventHandle !== undefined) {
        //     subscription = provider.onDidChangeNotebookKernelSourceActions!(_ => this.proxy.$emitNotebookKernelSourceActionsChangeEvent(eventHandle));
        // }

        // return {
        //     dispose: () => {
        //         this.kernelSourceActionProviders.delete(handle);
        //         that.proxy.$removeKernelSourceActionProvider(handle, handle);
        //         subscription?.dispose();
        //     }
        // };

        // const fileURI = URI.fromFilePath(path.join(nodeOptions.resource!, `${nodeOptions.name}.${nodeOptions.type}`));
        // if (nodeOptions.type == 'File') {
        //     if (await this.proxy.$addPluginTreeFileNode(nodeOptions))
        //         this.setListener(fileURI, nodeOptions);
        //     return {
        //         dispose: () => {
        //             this.proxy.$removeNode(fileURI);
        //             this.listeners.delete(fileURI.toString());
        //         }
        //     }
        // }
        // if (await this.proxy.$addPluginTreeFolderNode(nodeOptions))
        //     this.setListener(fileURI, nodeOptions)
        // return {
        //     dispose: () => {
        //         this.proxy.$removeNode(fileURI);
        //         this.listeners.delete(fileURI.toString());
        //     }
        // }
    }

    async $onDbclick(path: string): Promise<void> {
        const provider = this.nodeProviders.get(path);
        const action = provider?.actions?.onDoubleClick;
        if (action)
            await action();
    }

    // private setListener(uri: URI, nodeOptions: baosky.projects.NodeOptions) {
    //     if (nodeOptions.onDoubleClick) {
    //         this.listeners.set(uri.toString(), nodeOptions.onDoubleClick);
    //     }
    // }
}

class TreeNodeController implements baosky.projects.TreeNodeController {
    private readonly pluginTreeNodeMain: PluginTreeNodeMain;
    private _path: string;
    private _handle: number;
    private _provider: baosky.projects.TreeNodeProvider;
    constructor(proxy: PluginTreeNodeMain, provider: baosky.projects.TreeNodeProvider) {
        this.pluginTreeNodeMain = proxy;
        this._provider = provider;
    }
    async remove(): Promise<void> {
        const nodeData = this._provider.getNodeData();
        if (this._provider.actions?.onRemove)
            await this._provider.actions?.onRemove();
        await this.pluginTreeNodeMain.$removeNode(nodeData.uri.path.toString());
    }
    // async update(provider: baosky.projects.TreeNodeProvider): Promise<void> {
    //     const nodeData = this._provider.getNodeData();
    //     const new_nodeData = provider.getNodeData();

    //     if (this._provider.actions?.onUpdate)
    //         await this._provider.actions?.onUpdate();
    //     await this.pluginTreeNodeMain.$updateNode(nodeData.uri.path.toString(), new_nodeData);
    // }
}

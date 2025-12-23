import { injectable, interfaces } from "@theia/core/shared/inversify";
import { MAIN_RPC_CONTEXT, PLUGIN_RPC_CONTEXT, PluginTreeNodeExt, PluginTreeNodeMain } from "../../../common";
import { PluginTreeNodeManagerImpl } from "./plugin-node-manager";
import { URI } from "@theia/core";
import * as baosky from '@baosky/plugin';
import { RPCProtocol } from "../../../common/rpc-protocol";
import { PluginTreeNodeExtImpl } from "../../../plugin/plugin-tree-node/plugin-tree-node-ext";
import * as path from 'path';

@injectable()
export class PluginTreeNodeMainImpl implements PluginTreeNodeMain {
    private readonly pluginTreeNodeManager: PluginTreeNodeManagerImpl;
    protected readonly proxy: PluginTreeNodeExt;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.pluginTreeNodeManager = container.get(PluginTreeNodeManagerImpl);
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.PLUGIN_TREE_NODE_EXT);
        this.pluginTreeNodeManager.dbClickEvent((uri) => {
            this.onDoubleClick(uri);
        })
    }
    async $addTreeNodeProvider(nodeData: baosky.projects.TreeNodeData): Promise<void> {
        // nodeData.icon = path.resolve(pluginPath, nodeData.icon!);
        try {
            if (nodeData.type === 'FILE')
                await this.pluginTreeNodeManager.createPluginFileNode(nodeData);
            else if (nodeData.type === 'DIRECTORY')
                await this.pluginTreeNodeManager.createPluginFolderNode(nodeData);
        } catch (error) {
            throw new Error(error);
        }
    }

    async $removeNode(path: string): Promise<boolean> {
        this.pluginTreeNodeManager.removeNode(path);
        return true;
    }

    // async $updateNode(path: string, nodeData: baosky.projects.TreeNodeData): Promise<boolean> {
    //     this.pluginTreeNodeManager.updateNode(path, nodeData);
    //     return true;
    // }

    onDoubleClick(uri: URI): void {
        this.proxy.$onDbclick(uri.path.fsPath());
    }
}

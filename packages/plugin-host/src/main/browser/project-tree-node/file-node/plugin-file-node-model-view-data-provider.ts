import { ModelViewDataProvider } from '@baosky/platform/lib/browser/project/model-view-data-provider'
import { NodeStat, NodeStatType } from '@baosky/platform/lib/browser/project/project-tree/tree-node';
import { MenuPath, MaybePromise } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PLUGIN_FILE_NODE_SYMBOL, PluginFileNodeObject } from './plugin-file-node-object';
import { PluginTreeNodeManagerImpl } from '../plugin-node-manager';
import { PluginNodeMenuCommand } from '../register-menu-command';

@injectable()
export class PluginFileNodeModelViewDataProvider implements ModelViewDataProvider {

    @inject(PluginTreeNodeManagerImpl)
    protected readonly pluginTreeNodeManagerImpl: PluginTreeNodeManagerImpl;
    @inject(PluginNodeMenuCommand) pluginNodeMenuCommand: PluginNodeMenuCommand;

    public order = 70;
    public icon = 'icon-a-IOtable';
    public menupath: string = 'plugin_file_node_menu';
    public getViewModel(object: PluginFileNodeObject, menuPath?: MenuPath, shortcut?: NodeStat[]): MaybePromise<NodeStat | NodeStat[]> {
        const nodeData = this.pluginTreeNodeManagerImpl.nodesData.get(object.path);
        this.pluginNodeMenuCommand.registerFolderContextMenu(nodeData?.menuPath ?? this.menupath, object.path, nodeData?.commands);

        return {
            id: object.id,
            parentId: object.parentId,
            name: object.name,
            icon: nodeData?.iconClass ?? this.icon,
            order: nodeData?.order ?? 0,
            type: NodeStatType.FILE,
            path: object.path,
            contextMenuPath: nodeData?.commands ? [nodeData.menuPath] : undefined,
            nameIgnoreCase: true,
            objectType: PLUGIN_FILE_NODE_SYMBOL,
            eventHandlers: {
                onDoubleClick: (node) => {
                    if (node.path)
                        this.pluginTreeNodeManagerImpl.firedbEvent(node.path);
                }
            }
        }
    }
}

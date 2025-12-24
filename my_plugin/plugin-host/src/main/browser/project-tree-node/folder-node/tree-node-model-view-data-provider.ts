import { ModelViewDataProvider } from '@baosky/platform/lib/browser/project/model-view-data-provider'
import { NodeStat, NodeStatType } from '@baosky/platform/lib/browser/project/project-tree/tree-node';
import { MenuPath, MaybePromise } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PluginTreeNodeManagerImpl } from '../plugin-node-manager';
import { PluginFolderNodeObject } from './plugin-folder-node-object';
import { PLUGIN_FILE_NODE_SYMBOL } from '../file-node/plugin-file-node-object';
import { PluginNodeMenuCommand } from '../register-menu-command';

@injectable()
export class PluginFolderNodeModelViewDataProvider implements ModelViewDataProvider {

    @inject(PluginTreeNodeManagerImpl)
    protected readonly pluginTreeNodeManagerImpl: PluginTreeNodeManagerImpl;
    @inject(PluginNodeMenuCommand) pluginNodeMenuCommand: PluginNodeMenuCommand;

    public order = 70;
    public icon = 'icon-open';
    public menupath: string = 'plugin_folder_node_menu';
    public getViewModel(object: PluginFolderNodeObject, menuPath?: MenuPath, shortcut?: NodeStat[]): MaybePromise<NodeStat | NodeStat[]> {
        const nodeData = this.pluginTreeNodeManagerImpl.nodesData.get(object.path);
        this.pluginNodeMenuCommand.registerFolderContextMenu(nodeData?.menuPath ?? this.menupath, object.path, nodeData?.commands);
        return {
            id: object.id,
            parentId: object.parentId,
            name: object.name,
            icon: this.icon, //文件夹用框架默认图标
            order: nodeData?.order ?? 0,
            type: NodeStatType.DIRECTORY,
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

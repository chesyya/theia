import { BaoskyCommand } from "@baosky/platform/lib/browser/framework/command/baosky-command";
import { ModelViewDataContribution } from "@baosky/platform/lib/browser/project";
import { bnls } from "@baosky/platform/lib/common/bnls";
import { ProjectTreeNodeActionsController } from "@baosky/project/lib/browser/project-tree-view/controller/project-tree-node-actions-controller";
import { CommandRegistry, MenuModelRegistry, SelectionService, URI } from "@theia/core";
import { inject, injectable } from "@theia/core/shared/inversify";
import { PluginFolderNodeObject } from "./folder-node/plugin-folder-node-object";
import { PluginFileNodeObject } from "./file-node/plugin-file-node-object";
import { PluginTreeNodeManagerImpl } from "./plugin-node-manager";
import { UriSelection } from "../../../common/plugin-selection";
import { Disposable } from "@theia/core/shared/vscode-languageserver-protocol";
import * as baosky from '@baosky/plugin';
import { Command } from "@theia/core";

interface NodeCommand {
    id: string;
    label: string;
    iconClass?: string;
    order?: string;
    execute: (...args: any[]) => any;
}

@injectable()
export class PluginNodeMenuCommand {
    @inject(ProjectTreeNodeActionsController)
    protected readonly actionsController: ProjectTreeNodeActionsController;
    @inject(ModelViewDataContribution)
    protected readonly modelViewDataContribution: ModelViewDataContribution;
    @inject(CommandRegistry)
    private readonly commandRegistry: CommandRegistry;
    @inject(MenuModelRegistry)
    private readonly menuModelRegistry: MenuModelRegistry;
    @inject(PluginTreeNodeManagerImpl)
    private readonly pluginTreeNodeManagerImpl: PluginTreeNodeManagerImpl;
    @inject(SelectionService)
    protected readonly selectionService: SelectionService;

    public disposeAfterRemove = new Map<URI, Disposable[]>();

    // 默认删除命令定义
    public PLUGIN_FOLDER_NODE_DELETE = BaoskyCommand.toDefaultLocalizedCommand({
        id: 'plugin-folder.node.delete',
        label: bnls.localizeByDefault('删除'),
        iconClass: 'icon-delete'
    });

    public PLUGIN_FILE_NODE_DELETE = BaoskyCommand.toDefaultLocalizedCommand({
        id: 'plugin-file.node.delete',
        label: bnls.localizeByDefault('删除'),
        iconClass: 'icon-delete'
    });

    /**
     * 注册文件夹节点的上下文菜单（包含自定义命令）
     */
    registerFolderContextMenu(menuPath: string, uri: URI, commands?: string[]): void {
        this.modelViewDataContribution.registerContextMenu({
            contextMenuPath: [menuPath],
            schema: PluginFolderNodeObject.prototype
        });

        // 注册默认删除命令
        this.registerDefaultDeleteMenu(menuPath, uri, this.PLUGIN_FOLDER_NODE_DELETE.id);

        // 注册自定义命令
        if (commands) {
            const nodeCommands = commands.map((item) => this.commandRegistry.getCommand(item)).filter((item) => !!item);
            this.registerCustomCommands(menuPath, uri, nodeCommands);
        }
    }

    /**
     * 注册文件节点的上下文菜单（包含自定义命令）
     */
    registerFileContextMenu(menuPath: string, uri: URI, nodeData?: baosky.projects.TreeNodeData): void {
        this.modelViewDataContribution.registerContextMenu({
            contextMenuPath: [menuPath],
            schema: PluginFileNodeObject.prototype
        });

        // 注册默认删除命令
        this.registerDefaultDeleteMenu(menuPath, uri, this.PLUGIN_FILE_NODE_DELETE.id);

        // 注册自定义命令
        if (nodeData?.commands) {
            const nodeCommands = nodeData.commands.map((item) => this.commandRegistry.getCommand(item)).filter((item) => !!item);
            this.registerCustomCommands(menuPath, uri, nodeCommands);
        }
    }

    /**
     * 注册默认删除菜单项
     */
    private registerDefaultDeleteMenu(menuPath: string, uri: URI, commandId: string): void {
        const toDispose = this.menuModelRegistry.registerMenuAction([menuPath], {
            commandId,
            order: "99", // 删除命令放在最后
            icon: "icon-delete"
        });
        this.setDispose(uri, toDispose);
    }

    /**
     * 注册自定义命令到菜单
     */
    private registerCustomCommands(menuPath: string, uri: URI, commands: Command[]): void {
        //先清除旧的再重新注册,避免重复注册
        this.disposeResourcesForUri(uri);
        commands.forEach((command, index) => {
            // 注册命令
            // const commandDispose = this.commandRegistry.registerCommand(command, {
            //     execute: async (...args: any[]): Promise<void> => {
            //         try {
            //             await this.commandRegistry.executeCommand(command.id, ...args);
            //         } catch (error) {
            //             console.error(`执行命令 ${command.id} 失败:`, error);
            //         }
            //     }
            // });

            // 注册菜单项
            const menuDispose = this.menuModelRegistry.registerMenuAction([menuPath], {
                commandId: command.id,
                icon: command.iconClass
            });

            // this.setDispose(uri, commandDispose);
            this.setDispose(uri, menuDispose);
        });
    }

    /**
     * 注册文件夹删除命令
     */
    registerFolderDeleteCommand(uri: URI): void {
        //TODO:找书记 伍兵确认一下
        const toDispose = this.commandRegistry.registerCommand(this.PLUGIN_FOLDER_NODE_DELETE, {
            execute: async (): Promise<void> => {
                const selection = this.selectionService.selection as { selections: any, source: any };
                if (selection) {
                    const fileUri = UriSelection.getProjectTreeUri(selection.selections[0]).fileUri;
                    await this.pluginTreeNodeManagerImpl.removeNode(fileUri);
                }
            }
        });
        this.setDispose(uri, toDispose);
    }

    /**
     * 注册文件删除命令
     */
    registerFileDeleteCommand(uri: URI): void {
        const toDispose = this.commandRegistry.registerCommand(this.PLUGIN_FILE_NODE_DELETE, {
            execute: async (): Promise<void> => {
                const selection = this.selectionService.selection as { selections: any, source: any };
                if (selection) {
                    const fileUri = UriSelection.getProjectTreeUri(selection.selections[0]).fileUri;
                    await this.pluginTreeNodeManagerImpl.removeNode(fileUri);
                }
            }
        });
        this.setDispose(uri, toDispose);
    }

    /**
     * 管理需要清理的资源
     */
    setDispose(uri: URI, toDispose: Disposable): void {
        if (this.disposeAfterRemove.has(uri)) {
            this.disposeAfterRemove.get(uri)?.push(toDispose);
            return;
        }
        this.disposeAfterRemove.set(uri, [toDispose]);
    }

    /**
     * 清理指定URI的所有资源
     */
    disposeResourcesForUri(uri: URI): void {
        const disposables = this.disposeAfterRemove.get(uri);
        if (disposables) {
            disposables.forEach(disposable => disposable.dispose());
            this.disposeAfterRemove.delete(uri);
        }
    }

    /**
     * 批量注册节点命令和菜单
     */
    // registerNodeCommands(menuPath: string, uri: URI, nodeData: baosky.projects.TreeNodeData): void {
    //     if (nodeData.type === 'DIRECTORY') {
    //         this.registerFolderContextMenu(menuPath, uri, nodeData);
    //         this.registerFolderDeleteCommand(uri);
    //     } else {
    //         this.registerFileContextMenu(menuPath, uri, nodeData);
    //         this.registerFileDeleteCommand(uri);
    //     }
    // }
}

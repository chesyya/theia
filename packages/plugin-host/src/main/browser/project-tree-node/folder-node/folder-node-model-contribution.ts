import { MenuContribution, MenuModelRegistry } from "@theia/core";
import { FrontendApplicationContribution, KeybindingContribution, KeybindingRegistry } from "@theia/core/lib/browser";
import {
    ActionContribution,
    ActionParams,
    ModelViewDataContribution
} from "@baosky/platform/lib/browser/project";
import { inject, injectable } from "@theia/core/shared/inversify";
import { PluginFolderNodeModelViewDataProvider } from "./tree-node-model-view-data-provider";
import { PLUGIN_FOLDER_NODE_SYMBOL, PluginFolderNodeObject } from "./plugin-folder-node-object";
import { PluginNodeMenuCommand } from "../register-menu-command";
import { PluginTreeNodeManagerImpl } from "../plugin-node-manager";


@injectable()
export class PluginFolderNodeModelContribution implements FrontendApplicationContribution, MenuContribution, KeybindingContribution, ActionContribution {
    @inject(ModelViewDataContribution)
    protected readonly modelViewDataContribution: ModelViewDataContribution;
    @inject(PluginFolderNodeModelViewDataProvider)
    protected readonly pluginNodeModelViewDataProvider: PluginFolderNodeModelViewDataProvider;
    @inject(PluginNodeMenuCommand) protected readonly pluginNodeMenuCommand: PluginNodeMenuCommand;
    @inject(PluginTreeNodeManagerImpl) protected readonly pluginTreeNodeManagerImpl: PluginTreeNodeManagerImpl;
    public initialize(): void {
        this.modelViewDataContribution.registerProvider({
            getInstance: () => this.pluginNodeModelViewDataProvider,
            schema: PluginFolderNodeObject.prototype
        });
        this.pluginTreeNodeManagerImpl.removeNodeEvent((uri) => {
            this.pluginNodeMenuCommand.disposeAfterRemove.get(uri)?.forEach(element => {
                element.dispose();
            });
        })
    }

    public registerActions(): ActionParams {
        return {
            actions: [],
            type: PLUGIN_FOLDER_NODE_SYMBOL
        }
    };

    public registerMenus(menus: MenuModelRegistry): void {
    };

    public registerKeybindings(keybindings: KeybindingRegistry): void {

    }
}
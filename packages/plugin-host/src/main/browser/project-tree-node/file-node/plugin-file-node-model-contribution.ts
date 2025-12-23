import { CommandRegistry, MenuContribution, MenuModelRegistry } from "@theia/core";
import { FrontendApplicationContribution, KeybindingContribution, KeybindingRegistry } from "@theia/core/lib/browser";
import {
    ActionContribution,
    ActionParams,
    ModelViewDataContribution
} from "@baosky/platform/lib/browser/project";
import { inject, injectable } from "@theia/core/shared/inversify";
import { PluginFileNodeModelViewDataProvider } from "./plugin-file-node-model-view-data-provider";
import { PLUGIN_FILE_NODE_SYMBOL, PluginFileNodeObject } from "./plugin-file-node-object";
import { ProjectTreeNodeActionsController } from "@baosky/project/lib/browser/project-tree-view/controller/project-tree-node-actions-controller";
import { PluginNodeMenuCommand } from "../register-menu-command";

@injectable()
export class PluginFileNodeModelContribution implements FrontendApplicationContribution, MenuContribution, KeybindingContribution, ActionContribution {
    @inject(ModelViewDataContribution)
    protected readonly modelViewDataContribution: ModelViewDataContribution;
    @inject(PluginFileNodeModelViewDataProvider)
    protected readonly pluginNodeModelViewDataProvider: PluginFileNodeModelViewDataProvider;
    @inject(MenuModelRegistry) private readonly menuModelRegistry: MenuModelRegistry;
    @inject(ProjectTreeNodeActionsController)
    protected readonly actionsController: ProjectTreeNodeActionsController;
    @inject(CommandRegistry) private readonly commandRegistry: CommandRegistry;
    @inject(PluginNodeMenuCommand) protected readonly pluginNodeMenuCommand: PluginNodeMenuCommand;

    public initialize(): void {
        this.modelViewDataContribution.registerProvider({
            getInstance: () => this.pluginNodeModelViewDataProvider,
            schema: PluginFileNodeObject.prototype
        });
    }

    public registerActions(): ActionParams {
        return {
            actions: [],
            type: PLUGIN_FILE_NODE_SYMBOL
        }
    };

    public registerMenus(menus: MenuModelRegistry): void {
    };

    public registerKeybindings(keybindings: KeybindingRegistry): void {

    }
}
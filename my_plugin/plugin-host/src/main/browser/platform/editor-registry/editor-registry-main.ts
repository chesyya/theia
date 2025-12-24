import { EditorRegistryMain, PlatformMessageServiceMain } from "../../../../common";
import * as baosky from '@baosky/plugin';
import { RoutineInfoService } from '@baosky/platform/lib/browser/info-view/routine/routine-info-service'
import { interfaces } from "@theia/core/shared/inversify";
import { TabToolbarButtonRegistry } from "@baosky/platform/lib/browser/tab-toolbar/manager/tab-toolbar-button-registry";
import { CommandRegistry } from "@theia/core";
import { BaoskyCommand } from "@baosky/platform/lib/browser/framework/command/baosky-command";
import { TabToolbarButtonProps } from "@baosky/platform/lib/browser/tab-toolbar/tab-toolbar-button";

export interface ToolbarInfo {
    widgetType: string;
    tabToolbarButtonProps: TabToolbarButtonProps;
}

export class EditorRegistryMainImpl implements EditorRegistryMain {
    protected readonly routineInfoService: RoutineInfoService;
    // protected readonly pluginTabToolbarContribution: PluginTabToolbarContribution;
    protected readonly tabToolbarButtonRegistry: TabToolbarButtonRegistry;
    protected readonly commandRegistry: CommandRegistry;

    constructor(container: interfaces.Container) {
        this.routineInfoService = container.get(RoutineInfoService);
        // this.pluginTabToolbarContribution = container.get(PluginTabToolbarContribution);
        this.tabToolbarButtonRegistry = container.get(TabToolbarButtonRegistry);
        this.commandRegistry = container.get(CommandRegistry);
    }
    async $registerToolbar(toolbarItems: baosky.platform.ToolbarItem[]): Promise<ToolbarInfo[]> {
        const toolbarInfo: ToolbarInfo[] = [];
        toolbarItems.forEach(item => {
            const commands = item.commands.map(command => {
                const baoskyCommand = this.commandRegistry.getCommand(command);
                if (!baoskyCommand) {
                    throw new Error(`Command ${command} not found.`);
                }
                return baoskyCommand as BaoskyCommand;
            });
            const tabToolbarButtonProps: TabToolbarButtonProps = {
                buttonId: this.generateDeterministicButtonId(item.widgetType, item.commands),
                commands: commands,
                buttonPosition: item.position
            };
            this.tabToolbarButtonRegistry.registerTabToolbarButton(item.widgetType, [tabToolbarButtonProps], true);
            toolbarInfo.push({
                widgetType: item.widgetType,
                tabToolbarButtonProps: tabToolbarButtonProps
            });
        })
        return toolbarInfo;
    }
    $unregisterToolbar(toolbarInfo: ToolbarInfo): void {
        this.tabToolbarButtonRegistry.unregisterTabToolbarButton(toolbarInfo.widgetType, [toolbarInfo.tabToolbarButtonProps.buttonId], true);
    }

    //根据widget和commands生成唯一buttonId
    generateDeterministicButtonId(widgetType: string, commandIds: string[]): string {
        const sortedCommands = [...commandIds].sort();

        return `${widgetType}::${sortedCommands.join('|')}`;
    }

}

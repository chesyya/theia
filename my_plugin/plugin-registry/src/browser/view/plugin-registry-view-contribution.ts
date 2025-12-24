/*
 * @Author: wb
 * @Date:
 * @FilePath:
 * Copyright (c) 2023 by ${git_name_email}, All Rights Reserved.
 * @Description:
 */
import { CommandRegistry, MenuModelRegistry } from "@theia/core";
import { injectable } from "@theia/core/shared/inversify";
import { CustomMenus, CustomCommands } from '@baosky/platform/lib/browser/framework/menus/menus-data'
import { AbstractViewContribution } from "@theia/core/lib/browser";
import { BSXExtensionsViewContainer } from "../bsx-extensions-view-container";

/**
 * plugin view contribution
 * @date 2025/06/25 - 10:10:23 AM
 * @author wubing
 *
 * @export
 * @class BaoskyAboutContribution
 * @typedef {BaoskyAboutContribution}
 * @implements {MenuContribution}
 * @implements {CommandContribution}
 */
@injectable()
export class PluginViewContribution extends AbstractViewContribution<BSXExtensionsViewContainer> {

    private _pluginManager: BSXExtensionsViewContainer | undefined = undefined;
    private _visible: boolean = true;

    constructor() {
        super({
            widgetId: BSXExtensionsViewContainer.ID,
            widgetName: BSXExtensionsViewContainer.LABEL,
            defaultWidgetOptions: {
                area: "left",
                rank: 600
            },
        });

    }

    public registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CustomCommands.OPEN_CLOSE_PLUGIN_VIEW, {
            execute: async (prop) => {
                if (!this._visible) {
                    this._pluginManager = await this.openView({ activate: true, reveal: true, manual: true });
                    this._pluginManager.update();
                    this._visible = true
                }
                else {
                    this.closeView();
                    this._visible = false;
                }
            },
            isToggled: () => this._visible
        });
    }

    public registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CustomMenus.VIEW_PLUGIN, {
            commandId: CustomCommands.OPEN_CLOSE_PLUGIN_VIEW.id,
            order: "1",
        });
    }
}

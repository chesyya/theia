/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-11-26 17:29:36
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/plugin-frontend-contribution.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandRegistry, CommandContribution, Command } from '@theia/core/lib/common';
import { OpenUriCommandHandler } from './commands';
import URI from '@theia/core/lib/common/uri';
import { TreeViewWidget } from './view/tree-view-widget';
import { CompositeTreeNode, Widget, codicon } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { PluginViewWidget } from './view/plugin-view-widget';

@injectable()
export class PluginApiFrontendContribution implements CommandContribution, TabBarToolbarContribution {

    @inject(OpenUriCommandHandler)
    protected readonly openUriCommandHandler: OpenUriCommandHandler;

    static readonly COLLAPSE_ALL_COMMAND = Command.toDefaultLocalizedCommand({
        id: 'treeviews.collapseAll',
        iconClass: codicon('collapse-all'),
        label: 'Collapse All'
    });

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(OpenUriCommandHandler.COMMAND_METADATA, {
            execute: (arg: URI) => this.openUriCommandHandler.execute(arg),
            isVisible: () => false
        });
        commands.registerCommand(PluginApiFrontendContribution.COLLAPSE_ALL_COMMAND, {
            execute: (widget: Widget) => {
                if (widget instanceof PluginViewWidget && widget.widgets[0] instanceof TreeViewWidget) {
                    const model = widget.widgets[0].model;
                    if (CompositeTreeNode.is(model.root)) {
                        for (const child of model.root.children) {
                            if (CompositeTreeNode.is(child)) {
                                model.collapseAll(child);
                            }
                        }
                    }
                }
            },
            isVisible: (widget: Widget) => widget instanceof PluginViewWidget && widget.widgets[0] instanceof TreeViewWidget && widget.widgets[0].showCollapseAll
        });

    }

    registerToolbarItems(registry: TabBarToolbarRegistry): void {
        registry.registerItem({
            id: PluginApiFrontendContribution.COLLAPSE_ALL_COMMAND.id,
            command: PluginApiFrontendContribution.COLLAPSE_ALL_COMMAND.id,
            tooltip: PluginApiFrontendContribution.COLLAPSE_ALL_COMMAND.label,
            icon: PluginApiFrontendContribution.COLLAPSE_ALL_COMMAND.iconClass,
            priority: 1000
        });
    }
}

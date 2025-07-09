// *****************************************************************************
// Copyright (C) 2024 Eclipse Theia contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, nls, MenuContribution, MenuModelRegistry, MAIN_MENU_BAR } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser';
import { PluginDocumentationService } from '../plugin-documentation-frontend-service';

const TEST_MENU = [...MAIN_MENU_BAR, 'test'];
const PLUGINS_MENU = [...CommonMenus.HELP, 'plugins'];

export namespace PluginDocumentationCommands {
    export const SHOW_PLUGIN_DOCS: Command = {
        id: 'plugin.documentation.show',
        label: nls.localizeByDefault('Show Plugin Documentation'),
        category: 'Plugin'
    };

    export const LIST_PLUGIN_DOCS: Command = {
        id: 'plugin.documentation.list',
        label: nls.localizeByDefault('List Plugin Documentation'),
        category: 'Plugin'
    };

    export const GOTO_PLUGIN_DOCS: Command = {
        id: 'plugin.documentation.goto',
        label: nls.localizeByDefault('Goto Test Plugin API Doc'),
        category: 'Plugin'
    };
}

@injectable()
export class PluginDocumentationCommandContribution implements CommandContribution, MenuContribution {

    @inject(PluginDocumentationService)
    protected readonly documentationService: PluginDocumentationService;

    async registerCommands(commands: CommandRegistry): Promise<void> {
        commands.registerCommand(PluginDocumentationCommands.SHOW_PLUGIN_DOCS, {
            execute: async () => {
                const docs = await this.documentationService.getAllPluginDocumentation();
                if (docs.length === 0) {
                    console.log('No plugin documentation available');
                    return;
                }
                console.log('Available Plugin Documentation:');
                docs.forEach((doc: any) => {
                    console.log(`- ${doc.pluginName} (${doc.pluginId}): ${doc.baseUrl}`);
                });
                if (docs.length === 1) {
                    window.open(docs[0].baseUrl, '_blank');
                } else {
                    const docNames = docs.map((doc: any, index: number) => `${index + 1}. ${doc.pluginName}`);
                    const message = `Multiple plugins have documentation available:\n\n${docNames.join('\n')}\n\nPlease select a plugin (1-${docs.length}):`;
                    const selection = prompt(message);
                    if (selection) {
                        const index = parseInt(selection) - 1;
                        if (index >= 0 && index < docs.length) {
                            window.open(docs[index].baseUrl, '_blank');
                        } else {
                            console.log('Invalid selection');
                        }
                    }
                }
            }
        });

        commands.registerCommand(PluginDocumentationCommands.LIST_PLUGIN_DOCS, {
            execute: async () => {
                const docs = await this.documentationService.getAllPluginDocumentation();
                console.log('Plugin Documentation Report:');
                console.log('==========================');
                if (docs.length === 0) {
                    console.log('No plugins with documentation found.');
                    return;
                }
                docs.forEach((doc: any, index: number) => {
                    console.log(`${index + 1}. ${doc.pluginName}`);
                    console.log(`   ID: ${doc.pluginId}`);
                    console.log(`   URL: ${doc.baseUrl}`);
                    console.log(`   Navigation Paths: ${doc.navigationPaths.join(', ') || 'None'}`);
                    console.log('');
                });
                console.log(`Total: ${docs.length} plugin(s) with documentation`);
            }
        });

        // 注册精准跳转命令
        commands.registerCommand(PluginDocumentationCommands.GOTO_PLUGIN_DOCS, {
            execute: async () => {
                const docs = await this.documentationService.getAllPluginDocumentation();
                const doc = docs.find(d => d.pluginId.endsWith('test-plugin'));
                if (doc && doc.navigationPaths.includes('api')) {
                    window.open(`${doc.baseUrl}/api`, '_blank');
                } else if (doc) {
                    window.open(doc.baseUrl, '_blank');
                } else {
                    window.open('http://localhost:3001/usermanual/test-plugin/help', '_blank');
                }
            }
        });

        // 动态为每个插件文档注册 open 命令
        const docs = await this.documentationService.getAllPluginDocumentation();
        docs.forEach(doc => {
            const commandId = `plugin.documentation.open.${doc.pluginId}`;
            commands.registerCommand({ id: commandId, label: doc.title }, {
                execute: () => window.open(doc.baseUrl, '_blank')
            });
        });
    }

    async registerMenus(menus: MenuModelRegistry): Promise<void> {
        // 动态获取插件文档
        const docs = await this.documentationService.getAllPluginDocumentation();
        if (docs.length > 0) {
            // Help 下注册 Plugins 子菜单
            menus.registerSubmenu(PLUGINS_MENU, 'Plugins');
            // 直接在 Plugins 下注册每个插件的菜单项
            docs.forEach(doc => {
                const commandId = `plugin.documentation.open.${doc.pluginId}`;
                menus.registerMenuAction(PLUGINS_MENU, {
                    commandId,
                    label: doc.title,
                    order: 'a'
                });
            });
        }
        // Help 菜单原有项
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: PluginDocumentationCommands.SHOW_PLUGIN_DOCS.id,
            label: PluginDocumentationCommands.SHOW_PLUGIN_DOCS.label,
            order: 'z10'
        });
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: PluginDocumentationCommands.LIST_PLUGIN_DOCS.id,
            label: PluginDocumentationCommands.LIST_PLUGIN_DOCS.label,
            order: 'z11'
        });
        // 主菜单栏 test 顶层菜单
        menus.registerSubmenu(TEST_MENU, 'Test');
        menus.registerMenuAction(TEST_MENU, {
            commandId: PluginDocumentationCommands.GOTO_PLUGIN_DOCS.id,
            label: PluginDocumentationCommands.GOTO_PLUGIN_DOCS.label,
            order: 'a'
        });
    }
} 

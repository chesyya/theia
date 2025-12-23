/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-11-26 17:29:36
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/plugin-usermanual/plugin-usermanual-command.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
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
import { CommandRegistry, MenuModelRegistry, DisposableCollection } from '@theia/core';
import { PluginDocumentationService } from './plugin-usermanual-service';
import { USER_MANUAL_MENU } from '@baosky/platform/lib/browser/go-to-help-service/usermanual-general-function-command';
import { GoToHelpServiceTechImpl } from '@baosky/plugin-usermanual/lib/browser/go-to-help/go-to-help-service-impl'
import { Disposable } from '@theia/core/shared/vscode-languageserver-protocol';
import { DeployedPlugin, PluginUsermanual } from '../../../common';

@injectable()
export class UsermanualRegistry {

    @inject(PluginDocumentationService)
    protected readonly documentationService: PluginDocumentationService;
    @inject(GoToHelpServiceTechImpl) protected readonly goToHelpService: GoToHelpServiceTechImpl
    protected toDispose = new Map<string, Disposable[]>();

    registerCommandsAndMenus(plugin: DeployedPlugin, usermanual: PluginUsermanual, commands: CommandRegistry, menus: MenuModelRegistry): Disposable {
        // 动态为每个插件文档注册 open 命令
        // const docs = await this.documentationService.getAllPluginDocumentation();
        let dispose = new DisposableCollection();
        const pluginId = plugin.metadata.model.id;
        const name = plugin.metadata.model.name;
        //暂时不支持带route的帮助文档，等有实际需求再增加
        if (usermanual.route)
            return dispose;

        const commandId = `plugin.documentation.open.${pluginId}`;
        dispose.push(commands.registerCommand({ id: commandId, label: name }, {
            execute: () => this.goToHelpService.goToHelpRelativePath('', pluginId)
        }));

        //注册menus
        this.goToHelpService.registerBasePath({ productId: pluginId, basePath: pluginId });
        dispose.push(
            menus.registerMenuAction([...USER_MANUAL_MENU, name], {
                commandId,
                label: name,
                order: 'a'
            })
        );
        return dispose;
    }

    async registerMenus(): Promise<void> {
        // 动态获取插件文档
        const docs = await this.documentationService.getAllPluginDocumentation();

    }
}

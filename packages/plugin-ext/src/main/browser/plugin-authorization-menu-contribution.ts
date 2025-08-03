// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
import { MenuContribution, MenuModelRegistry, MAIN_MENU_BAR } from '@theia/core/lib/common/menu';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { PluginAuthorizationProvider } from '../../common/plugin-authorization';

export namespace PluginAuthorizationCommands {
    export const GRANT_TEST_PLUGIN: Command = {
        id: 'plugin.authorization.grant.test',
        label: '授权 Test Plugin'
    };
    export const REVOKE_TEST_PLUGIN: Command = {
        id: 'plugin.authorization.revoke.test',
        label: '撤销 Test Plugin'
    };
    export const RESET_AUTHORIZATION: Command = {
        id: 'plugin.authorization.reset',
        label: '重置授权状态'
    };
}

export const PLUGIN_AUTHORIZATION_MENU = [...MAIN_MENU_BAR, 'plugin_auth'];

@injectable()
export class PluginAuthorizationMenuContribution implements MenuContribution, CommandContribution {

    @inject(PluginAuthorizationProvider)
    protected readonly authorizationProvider: PluginAuthorizationProvider;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(PluginAuthorizationCommands.GRANT_TEST_PLUGIN, {
            execute: () => this.grantTestPlugin()
        });
        registry.registerCommand(PluginAuthorizationCommands.REVOKE_TEST_PLUGIN, {
            execute: () => this.revokeTestPlugin()
        });
        registry.registerCommand(PluginAuthorizationCommands.RESET_AUTHORIZATION, {
            execute: () => this.resetAuthorization()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(PLUGIN_AUTHORIZATION_MENU, '插件授权');

        menus.registerMenuAction(PLUGIN_AUTHORIZATION_MENU, {
            commandId: PluginAuthorizationCommands.GRANT_TEST_PLUGIN.id,
            label: PluginAuthorizationCommands.GRANT_TEST_PLUGIN.label,
            order: '1'
        });

        menus.registerMenuAction(PLUGIN_AUTHORIZATION_MENU, {
            commandId: PluginAuthorizationCommands.REVOKE_TEST_PLUGIN.id,
            label: PluginAuthorizationCommands.REVOKE_TEST_PLUGIN.label,
            order: '2'
        });

        menus.registerMenuAction(PLUGIN_AUTHORIZATION_MENU, {
            commandId: PluginAuthorizationCommands.RESET_AUTHORIZATION.id,
            label: PluginAuthorizationCommands.RESET_AUTHORIZATION.label,
            order: '3'
        });
    }

    private async grantTestPlugin(): Promise<void> {
        // 通过Backend RPC调用授权方法
        if (this.authorizationProvider.grantTestPluginAuthorization) {
            await this.authorizationProvider.grantTestPluginAuthorization();
        }
    }

    private async revokeTestPlugin(): Promise<void> {
        // 通过Backend RPC调用撤销方法
        if (this.authorizationProvider.revokeTestPluginAuthorization) {
            await this.authorizationProvider.revokeTestPluginAuthorization();
        }
    }

    private async resetAuthorization(): Promise<void> {
        // 通过Backend RPC调用重置方法
        if (this.authorizationProvider.resetAuthorizationState) {
            await this.authorizationProvider.resetAuthorizationState();
        }
    }
}

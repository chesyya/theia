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
import { IAuthorizationService } from '../../../common/services/authorization';

export namespace AuthorizationCommands {
    export const GRANT_TEST_PLUGIN: Command = {
        id: 'authorization.grantTestPlugin',
        label: '授权 Test Plugin'
    };
    export const REVOKE_TEST_PLUGIN: Command = {
        id: 'authorization.revokeTestPlugin',
        label: '撤销 Test Plugin'
    };
    export const RESET_AUTHORIZATION: Command = {
        id: 'authorization.resetToDefaults',
        label: '重置授权状态'
    };
}

export const AUTHORIZATION_MENU = [...MAIN_MENU_BAR, 'authorization'];

/**
 * Menu contribution for authorization testing and development.
 * 
 * Provides menu commands to:
 * - Grant authorization to the test plugin
 * - Revoke authorization from the test plugin  
 * - Reset all authorization states to defaults
 * 
 * Uses the new IAuthorizationService interface.
 */
@injectable()
export class AuthorizationMenuContribution implements MenuContribution, CommandContribution {

    constructor(
        @inject(IAuthorizationService) private readonly authorizationService: IAuthorizationService
    ) {
        console.log(`[AUTH-MENU] 🍔 AuthorizationMenuContribution initialized`);
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(AuthorizationCommands.GRANT_TEST_PLUGIN, {
            execute: () => this.handleGrantTestPlugin()
        });

        registry.registerCommand(AuthorizationCommands.REVOKE_TEST_PLUGIN, {
            execute: () => this.handleRevokeTestPlugin()
        });

        registry.registerCommand(AuthorizationCommands.RESET_AUTHORIZATION, {
            execute: () => this.handleResetAuthorization()
        });

        console.log(`[AUTH-MENU] 📝 Registered ${Object.keys(AuthorizationCommands).length} authorization commands`);
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerSubmenu(AUTHORIZATION_MENU, '授权管理');

        menus.registerMenuAction(AUTHORIZATION_MENU, {
            commandId: AuthorizationCommands.GRANT_TEST_PLUGIN.id,
            label: AuthorizationCommands.GRANT_TEST_PLUGIN.label,
            order: '1'
        });

        menus.registerMenuAction(AUTHORIZATION_MENU, {
            commandId: AuthorizationCommands.REVOKE_TEST_PLUGIN.id,
            label: AuthorizationCommands.REVOKE_TEST_PLUGIN.label,
            order: '2'
        });

        menus.registerMenuAction(AUTHORIZATION_MENU, {
            commandId: AuthorizationCommands.RESET_AUTHORIZATION.id,
            label: AuthorizationCommands.RESET_AUTHORIZATION.label,
            order: '3'
        });

        console.log(`[AUTH-MENU] 🍽️  Registered authorization menu with 3 actions`);
    }

    private async handleGrantTestPlugin(): Promise<void> {
        console.log(`[AUTH-MENU] 🎯 Executing grant test plugin command...`);
        try {
            await this.authorizationService.grantAuthorization('<unpublished>.test-plugin');
            console.log(`[AUTH-MENU] ✅ Test plugin authorization granted successfully`);
        } catch (error) {
            console.error(`[AUTH-MENU] ❌ Error granting test plugin authorization:`, error);
        }
    }

    private async handleRevokeTestPlugin(): Promise<void> {
        console.log(`[AUTH-MENU] 🎯 Executing revoke test plugin command...`);
        try {
            await this.authorizationService.revokeAuthorization('<unpublished>.test-plugin');
            console.log(`[AUTH-MENU] ✅ Test plugin authorization revoked successfully`);
        } catch (error) {
            console.error(`[AUTH-MENU] ❌ Error revoking test plugin authorization:`, error);
        }
    }

    private async handleResetAuthorization(): Promise<void> {
        console.log(`[AUTH-MENU] 🎯 Executing reset authorization command...`);
        try {
            // Note: resetToDefaults is a development helper method
            if ('resetToDefaults' in this.authorizationService) {
                await (this.authorizationService as any).resetToDefaults();
                console.log(`[AUTH-MENU] ✅ Authorization states reset successfully`);
            } else {
                console.warn(`[AUTH-MENU] ⚠️  resetToDefaults method not available on authorization service`);
            }
        } catch (error) {
            console.error(`[AUTH-MENU] ❌ Error resetting authorization states:`, error);
        }
    }
}

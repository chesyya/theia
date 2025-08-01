import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { PluginAuthorizationService } from '../common/plugin-authorization-service';
import { QuickPickService } from '@theia/core/lib/common/quick-pick-service';

export namespace PluginAuthorizationCommands {
    export const MANAGE_PLUGIN_AUTHORIZATION = {
        id: 'plugin-authorization:manage',
        label: 'Manage Plugin Authorization'
    };
}

@injectable()
export class PluginAuthorizationContribution implements CommandContribution, MenuContribution {
    @inject(PluginAuthorizationService)
    protected readonly authorizationService: PluginAuthorizationService;

    @inject(QuickPickService)
    protected readonly quickPickService: QuickPickService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(PluginAuthorizationCommands.MANAGE_PLUGIN_AUTHORIZATION, {
            execute: () => this.managePluginAuthorization()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: PluginAuthorizationCommands.MANAGE_PLUGIN_AUTHORIZATION.id,
            label: PluginAuthorizationCommands.MANAGE_PLUGIN_AUTHORIZATION.label
        });
    }

    private async managePluginAuthorization(): Promise<void> {
        // 实现授权管理界面
        // 这里可以使用QuickPickService或者创建一个对话框
    }
}

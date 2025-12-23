import { DisposableCollection, MenuModelRegistry } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { Disposable } from '@theia/core/shared/vscode-languageserver-protocol';
import { HostedPluginCustomRegistry, MenuOption } from '../../common/hosted-plugin-custom-registry';
import { bnls } from '@baosky/platform/lib/common/bnls';
import { Menu } from '../../common';

export type menuObj = { [location: string]: Menu[] };
@injectable()
export class HostedPluginCustomRegistryImpl implements HostedPluginCustomRegistry {

    @inject(MenuModelRegistry) protected readonly menuRegistry: MenuModelRegistry;

    public registerMenu(menuOption: MenuOption): Disposable {
        return this.menuRegistry.registerSubmenu(menuOption.menuPath, bnls.localizeByDefault(menuOption.lable));
    }

    public handleMenuRegistry(menus: [menuObj]): Disposable {
        let toDispose: DisposableCollection = new DisposableCollection();
        let menubarKeys = new Set<String>();
        menus.forEach(menuObj => {
            const menuKeys = Object.keys(menuObj).filter((key: string) => {
                if (!key.startsWith('menubar/')) return false;
                const parts = key.split('/');
                return parts.length === 2;
            });
            menuKeys.forEach(key => menubarKeys.add(key));
        });
        menubarKeys.forEach(key => {
            const label = key.replace(/^menubar\//, '');
            toDispose.push(this.registerMenu({ menuPath: ['menubar', label], lable: label }));
        })
        return toDispose;
    }
}

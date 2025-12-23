import { MenuPath } from "@theia/core"
import { Disposable } from "@theia/core/shared/vscode-languageserver-protocol"

export interface MenuOption {
    menuPath: MenuPath,
    lable: string
}

export interface HostedPluginCustomRegistry {
    registerMenu(menuOption: MenuOption): Disposable;
}
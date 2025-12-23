import { interfaces } from "@theia/core/shared/inversify";
import { PluginFolderNodeModelProvider } from "./folder-node/tree-node-model-data-provider";
import { DataProviderContribution } from "@baosky/platform/lib/browser/database/data-provider-contribution";
import { PluginFolderNodeDirectiveContribution } from "./folder-node/plugin-directive-contribution";
import { DirectiveProcessContribution } from "@baosky/platform/lib/browser/directive";
import { bindAddFolderNodeDirectiveHandlerFactory } from "./folder-node/add-plugin-tree-node-handle";
import { PluginFolderNodeModelViewDataProvider } from "./folder-node/tree-node-model-view-data-provider";
import { PluginFolderNodeModelContribution } from "./folder-node/folder-node-model-contribution";
import { FrontendApplicationContribution, KeybindingContribution } from "@theia/core/lib/browser";
import { MenuContribution } from "@theia/core";
import { ActionContribution } from "@baosky/platform/lib/browser/project";
import { bindPluginFolderNodeObject } from "./folder-node/plugin-folder-node-object";
import { PluginFileNodeDirectiveContribution } from "./file-node/plugin-file-node-directive-contribution";
import { bindPluginFileNodeObject } from "./file-node/plugin-file-node-object";
import { PluginFileNodeModelContribution } from "./file-node/plugin-file-node-model-contribution";
import { PluginFileNodeModelViewDataProvider } from "./file-node/plugin-file-node-model-view-data-provider";
import { PluginFileNodeModelProvider } from "./file-node/plugin-file-node-model-data-provider";
import { bindAddFileNodeDirectiveHandlerFactory } from "./file-node/plugin-file-node-handler";
import { PluginNodeMenuCommand } from "./register-menu-command";
import { FileManagerDirContribution } from "./file-node/file-node-manager-contribution";
import { ProjectSpecialFileOrDirectoryContribution } from "@baosky/platform/lib/browser/project/special-file-or-directory/project-special-file-or-directory-contribution";
import { FolderManagerDirContribution } from "./folder-node/folder-node-manager-contribution";
export function bindPluginNode(bind: interfaces.Bind) {
    bindPluginFolderNodeObject(bind);
    bindPluginFileNodeObject(bind);
    bind(FileManagerDirContribution).toSelf().inSingletonScope();
    bind(ProjectSpecialFileOrDirectoryContribution).toService(FileManagerDirContribution);
    bind(FolderManagerDirContribution).toSelf().inSingletonScope();
    bind(ProjectSpecialFileOrDirectoryContribution).toService(FolderManagerDirContribution);

    bind(PluginFolderNodeModelContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(PluginFolderNodeModelContribution);
    bind(MenuContribution).toService(PluginFolderNodeModelContribution);
    bind(KeybindingContribution).toService(PluginFolderNodeModelContribution);
    bind(ActionContribution).toService(PluginFolderNodeModelContribution);
    bind(PluginFileNodeModelContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(PluginFileNodeModelContribution);
    bind(MenuContribution).toService(PluginFileNodeModelContribution);
    bind(KeybindingContribution).toService(PluginFileNodeModelContribution);
    bind(ActionContribution).toService(PluginFileNodeModelContribution);

    bind(PluginFolderNodeModelViewDataProvider).toSelf().inSingletonScope();

    bind(PluginFileNodeModelViewDataProvider).toSelf().inSingletonScope();

    bind(PluginFolderNodeModelProvider).toSelf().inSingletonScope();
    bind(DataProviderContribution).toService(PluginFolderNodeModelProvider);
    bind(PluginFileNodeModelProvider).toSelf().inSingletonScope();
    bind(DataProviderContribution).toService(PluginFileNodeModelProvider);

    // bind(PluginFolderNodeDirectiveContribution).toSelf().inSingletonScope();
    // bind(PluginFileNodeDirectiveContribution).toSelf().inSingletonScope();
    // bind(DirectiveProcessContribution).toService(PluginFileNodeDirectiveContribution);
    // bind(DirectiveProcessContribution).toService(PluginFolderNodeDirectiveContribution);
    // bindAddFolderNodeDirectiveHandlerFactory(bind);
    // bindAddFileNodeDirectiveHandlerFactory(bind);

    bind(PluginNodeMenuCommand).toSelf().inSingletonScope();

}

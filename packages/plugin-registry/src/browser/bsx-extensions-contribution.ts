// *****************************************************************************
// Copyright (C) 2020 TypeFox and others.
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

import { CommonMenus, LabelProvider, PreferenceService, QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { CompoundMenuNodeRole, ILogger, MenuModelRegistry, MessageService, SelectionService } from '@theia/core/lib/common';
import { bnls } from '@baosky/platform/lib/common/bnls'
import { Color } from '@theia/core/lib/common/color';
import { Command, CommandRegistry } from '@theia/core/lib/common/command';
import URI from '@theia/core/lib/common/uri';
import { UriAwareCommandHandler } from '@theia/core/lib/common/uri-command-handler';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { FileDialogService, OpenFileDialogProps } from '@theia/filesystem/lib/browser';
import { NAVIGATOR_CONTEXT_MENU } from '@theia/navigator/lib/browser/navigator-contribution';
import { VSXExtensionRaw } from '@theia/ovsx-client';
import { VscodeCommands } from '@baosky/plugin-vscode/lib/browser/plugin-vscode-commands-contribution';
import { DateTime } from 'luxon';
import { OVSXClientProvider } from '../common/ovsx-client-provider';
import { IGNORE_RECOMMENDATIONS_ID } from './recommended-extensions/recommended-extensions-preference-contribution';
import { BSXExtension, BSXExtensionsContextMenu } from './bsx-extension';
import { BSXExtensionsCommands } from './bsx-extension-commands';
import { BSXExtensionsModelImpl } from './bsx-extensions-model';
import { BUILTIN_QUERY, INSTALLED_QUERY, RECOMMENDED_QUERY } from './bsx-extensions-search-model';
import { BSXExtensionsViewContainer } from './bsx-extensions-view-container';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import debounce = require('@theia/core/shared/lodash.debounce');
import { PluginInstallerDialogFactory, PluginInstallerDialogResult } from './plugin-installer-dialog';
import { ILogManagerService } from '@baosky/platform/lib/browser/log-manager/log-manager-service-protocol';
import { UUID } from '@theia/core/shared/@phosphor/coreutils';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { HTTP_UPLOAD_URL } from '@theia/filesystem/lib/browser/file-upload-service';
import { OVSXApiFilterProvider } from '../common/ovsx-api-filter';
import { UserLoginController } from '@baosky/project/lib/browser/es-server/controller/user-login-controller';

export namespace VSXCommands {
    export const TOGGLE_EXTENSIONS: Command = {
        id: 'vsxExtensions.toggle',
    };
}

@injectable()
export class BSXExtensionsContribution extends AbstractViewContribution<BSXExtensionsViewContainer> implements ColorContribution, FrontendApplicationContribution {


    private logger: ILogger;
    @inject(BSXExtensionsModelImpl) protected model: BSXExtensionsModelImpl;
    @inject(CommandRegistry) protected commandRegistry: CommandRegistry;
    @inject(MenuModelRegistry) protected menuRegistry: MenuModelRegistry;
    @inject(FileDialogService) protected fileDialogService: FileDialogService;
    @inject(MessageService) protected messageService: MessageService;
    @inject(LabelProvider) protected labelProvider: LabelProvider;
    @inject(ClipboardService) protected clipboardService: ClipboardService;
    @inject(PreferenceService) protected preferenceService: PreferenceService;
    @inject(OVSXClientProvider) protected clientProvider: OVSXClientProvider;
    @inject(OVSXApiFilterProvider) protected vsxApiFilter: OVSXApiFilterProvider;
    @inject(ApplicationServer) protected applicationServer: ApplicationServer;
    @inject(QuickInputService) protected quickInput: QuickInputService;
    @inject(SelectionService) protected readonly selectionService: SelectionService;
    @inject(ILogManagerService)
    protected readonly logManagerService: ILogManagerService;
    @inject(PluginInstallerDialogFactory)
    protected readonly pluginInstallerDialogFactory: PluginInstallerDialogFactory;
    @inject(FileService)
    private readonly fileService: FileService;
    @inject(UserLoginController)
    protected readonly userLoginController: UserLoginController;
    protected plugins: PluginInstallerDialogResult | undefined;
    private registeredUserCommands: Set<string> = new Set();

    constructor() {
        super({
            widgetId: BSXExtensionsViewContainer.ID,
            widgetName: BSXExtensionsViewContainer.LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 700
            },
            toggleCommandId: VSXCommands.TOGGLE_EXTENSIONS.id,
            toggleKeybinding: 'ctrlcmd+shift+x'
        });
    }

    @postConstruct()
    protected init(): void {
        const oneShotDisposable = this.model.onDidChange(debounce(() => {
            this.showRecommendedToast();
            oneShotDisposable.dispose();
        }, 5000, { trailing: true }));

        // Set up dynamic menu population callback
        (this.model as any).populateDisableUserMenu = this.populateDisableUserMenu.bind(this);
    }

    async initializeLayout(app: FrontendApplication): Promise<void> {
        await this.openView({ activate: false });
    }

    override registerCommands(commands: CommandRegistry): void {
        super.registerCommands(commands);
        commands.registerCommand(BSXExtensionsCommands.CLEAR_ALL, {
            execute: () => this.model.search.query = '',
            isEnabled: () => !!this.model.search.query,
            isVisible: () => true,
        });

        commands.registerCommand(BSXExtensionsCommands.INSTALL_FROM_BSX, {
            execute: () => this.installFromBSX()
        });

        commands.registerCommand(BSXExtensionsCommands.INSTALL_BSX_FILE,
            UriAwareCommandHandler.MonoSelect(this.selectionService, {
                execute: fileURI => this.installBsxFile(fileURI),
                isEnabled: fileURI => fileURI.scheme === 'file' && fileURI.path.ext === '.bsx'
            })
        );

        commands.registerCommand(BSXExtensionsCommands.INSTALL_ANOTHER_VERSION, {
            // Check downloadUrl to ensure we have an idea of where to look for other versions.
            isEnabled: (extension: BSXExtension) => !extension.builtin && !!extension.downloadUrl,
            execute: async (extension: BSXExtension) => this.installAnotherVersion(extension),
        });

        // commands.registerCommand(BSXExtensionsCommands.COPY, {
        //     execute: (extension: BSXExtension) => this.copy(extension)
        // });

        commands.registerCommand(BSXExtensionsCommands.COPY_EXTENSION_ID, {
            execute: (extension: BSXExtension) => this.copyExtensionId(extension)
        });

        commands.registerCommand(BSXExtensionsCommands.SHOW_BUILTINS, {
            execute: () => this.showBuiltinExtensions()
        });

        commands.registerCommand(BSXExtensionsCommands.SHOW_INSTALLED, {
            execute: () => this.showInstalledExtensions()
        });

        commands.registerCommand(BSXExtensionsCommands.SHOW_RECOMMENDATIONS, {
            execute: () => this.showRecommendedExtensions()
        });

        commands.registerCommand(BSXExtensionsCommands.ENABLE_PLUGIN, {
            isEnabled: (extension: BSXExtension) => extension.installed && !extension.builtin && !extension.enabled,
            isVisible: (extension: BSXExtension) => extension.installed && !extension.builtin,
            execute: async (extension: BSXExtension) => {
                await extension.enablePlugin();
                this.model.triggerUpdate(extension);
            }
        });

        commands.registerCommand(BSXExtensionsCommands.DISABLE_PLUGIN, {
            isEnabled: (extension: BSXExtension) => extension.installed && !extension.builtin && extension.enabled,
            isVisible: (extension: BSXExtension) => {
                // Only visible for non-admin users
                return !this.userLoginController.isAdminLogin() && extension.installed && !extension.builtin;
            },
            execute: async (extension: BSXExtension) => {
                await extension.disablePlugin();
                this.model.triggerUpdate(extension);
            }
        });
    }

    override registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerMenuAction(CommonMenus.MANAGE_SETTINGS, {
            commandId: VSXCommands.TOGGLE_EXTENSIONS.id,
            label: bnls.localizeByDefault('插件'),
            order: 'a20'
        });
        // menus.registerMenuAction(BSXExtensionsContextMenu.COPY, {
        //     commandId: BSXExtensionsCommands.COPY.id,
        //     label: bnls.localizeByDefault('复制'),
        //     order: '0'
        // });
        menus.registerMenuAction(BSXExtensionsContextMenu.COPY, {
            commandId: BSXExtensionsCommands.COPY_EXTENSION_ID.id,
            label: bnls.localizeByDefault('复制插件 ID'),
            order: '1'
        });
        menus.registerMenuAction(BSXExtensionsContextMenu.INSTALL, {
            commandId: BSXExtensionsCommands.INSTALL_ANOTHER_VERSION.id,
            label: bnls.localizeByDefault('安装其它版本...'),
        });
        menus.registerMenuAction(BSXExtensionsContextMenu.INSTALL, {
            commandId: BSXExtensionsCommands.ENABLE_PLUGIN.id,
            label: bnls.localizeByDefault('启用'),
            order: '2'
        });

        // For non-admin users, show simple disable menu item
        menus.registerMenuAction(BSXExtensionsContextMenu.INSTALL, {
            commandId: BSXExtensionsCommands.DISABLE_PLUGIN.id,
            label: bnls.localizeByDefault('禁用'),
            order: '3'
        });

        // For admin users, show submenu with user list
        // Always register the submenu, it will be populated dynamically
        menus.registerSubmenu(BSXExtensionsContextMenu.DISABLE_SUBMENU, bnls.localizeByDefault('为用户禁用'), {
            role: CompoundMenuNodeRole.Submenu,
            order: '4'
        });

        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU, {
            commandId: BSXExtensionsCommands.INSTALL_BSX_FILE.id,
            label: BSXExtensionsCommands.INSTALL_BSX_FILE.label,
            when: 'resourceScheme == file && resourceExtname == .bsx'
        });

        menus.registerSubmenu(BSXExtensionsContextMenu.CONTRIBUTION, '', {
            role: CompoundMenuNodeRole.Group,
        });
    }

    protected async populateDisableUserMenu(extension: BSXExtension): Promise<void> {
        try {
            // Only populate for admin users
            if (!this.userLoginController.isAdminLogin()) {
                return;
            }

            const loggedInUsers = await this.userLoginController.getSessionloggedInUsers();

            // Clear previously registered commands
            this.registeredUserCommands.forEach(commandId => {
                this.commandRegistry.unregisterCommand(commandId);
            });
            this.registeredUserCommands.clear();

            // Register commands and menus for each user
            loggedInUsers.forEach((user, index) => {
                const commandId = `bsx.extensions.disableForUser.${user.name}`;

                // Skip if already registered
                if (this.registeredUserCommands.has(commandId)) {
                    return;
                }

                // Register command for this user
                this.commandRegistry.registerCommand({ id: commandId }, {
                    execute: async (ext: BSXExtension) => {
                        await ext.disablePluginForUser(user.name);
                        this.model.triggerUpdate(ext);
                    },
                    isEnabled: (ext: BSXExtension) => ext.installed && !ext.builtin && ext.enabled,
                    isVisible: (ext: BSXExtension) => {
                        // Only visible for admin users
                        return this.userLoginController.isAdminLogin() && ext.installed && !ext.builtin;
                    }
                });

                // Register menu action
                this.menuRegistry.registerMenuAction(BSXExtensionsContextMenu.DISABLE_SUBMENU, {
                    commandId: commandId,
                    label: user.name,
                    order: index.toString()
                });

                this.registeredUserCommands.add(commandId);
            });
        } catch (error) {
            console.error('Failed to populate disable user menu:', error);
        }
    }

    registerColors(colors: ColorRegistry): void {
        // VS Code colors should be aligned with https://code.visualstudio.com/api/references/theme-color#extensions
        colors.register(
            {
                id: 'extensionButton.prominentBackground', defaults: {
                    dark: '#327e36',
                    light: '#327e36'
                }, description: 'Button background color for actions extension that stand out (e.g. install button).'
            },
            {
                id: 'extensionButton.prominentForeground', defaults: {
                    dark: Color.white,
                    light: Color.white
                }, description: 'Button foreground color for actions extension that stand out (e.g. install button).'
            },
            {
                id: 'extensionButton.prominentHoverBackground', defaults: {
                    dark: '#28632b',
                    light: '#28632b'
                }, description: 'Button background hover color for actions extension that stand out (e.g. install button).'
            },
            {
                id: 'extensionEditor.tableHeadBorder', defaults: {
                    dark: Color.transparent('#ffffff', 0.7),
                    light: Color.transparent('#000000', 0.7),
                    hcDark: Color.white,
                    hcLight: Color.black
                }, description: 'Border color for the table head row of the extension editor view'
            },
            {
                id: 'extensionEditor.tableCellBorder', defaults: {
                    dark: Color.transparent('#ffffff', 0.2),
                    light: Color.transparent('#000000', 0.2),
                    hcDark: Color.white,
                    hcLight: Color.black
                }, description: 'Border color for a table row of the extension editor view'
            },
            {
                id: 'extensionIcon.verifiedForeground', defaults: {
                    dark: '#40a6ff',
                    light: '#40a6ff'
                }, description: 'The icon color for extension verified publisher.'
            },
        );
    }

    /**
     * Installs a local .bsx file after prompting the `Open File` dialog. Resolves to the URI of the file.
     */
    protected async installFromBSX(): Promise<void> {
        // const props: OpenFileDialogProps = {
        //     title: BSXExtensionsCommands.INSTALL_FROM_BSX.dialogLabel,
        //     openLabel: bnls.localizeByDefault('安装'),
        //     filters: { 'BSX Extensions (*.bsx)': ['bsx'] },
        //     canSelectMany: false,
        //     canSelectFiles: true
        // };
        this.plugins = await this.pluginInstallerDialogFactory(
            {
                title: bnls.localizeByDefault('安装本地插件')
            }
        ).open();
        const tempUri = new URI('/root/.baosky/pluginTemp');
        const uri = tempUri.resolve(UUID.uuid4()).resolve(this.plugins?.uploadedFile.name!); // 构造一个临时路径以保证可以同时解压同一个项目
        try {
            await this.uploadPlugin(uri, this.plugins);
        } catch (error) {
            await this.deleteTempFolder(tempUri);
            this.logger.error(`上传文件夹到服务器失败: ${error}`);
            throw Error("UPLOAD_PLUGIN_FAILDED");
        }
        //const fakeUri = new URI(`/fakeUri/${this.plugins?.uploadedFile.name}`);
        try {
            if (this.plugins) {
                if (this.plugins.uploadedFile.name.endsWith('.bsx')) {
                    await this.installBsxFile(uri, this.plugins!.installForAll);
                } else {
                    this.messageService.error(bnls.localizeByDefault('所选文件不是有效的"*.bsx"插件。'));
                }
            }
            await this.deleteTempFolder(tempUri);
        } catch (error) {
            this.logger.error(`安装插件失败: ${error}`);
            await this.deleteTempFolder(tempUri);
        }

    }


    /**
     * Uploads the plugin to the server.
     * @date 2025/04/23 - 18:07:05 PM
     * @author wubing
     *
     * @private
     * @async
     * @param {URI} uri
     * @param {(PluginInstallerDialogResult | undefined)} props
     * @returns {Promise<void>}
     */
    private async uploadPlugin(uri: URI, props: PluginInstallerDialogResult | undefined): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const formData = new FormData();
            formData.set('uri', uri.toString(true));
            formData.set('file', props!.uploadedFile);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', HTTP_UPLOAD_URL, true);
            xhr.onload = (): void => {
                if (xhr.status !== 200) {
                    reject();
                } else {
                    resolve();
                }
            };
            xhr.onerror = (): void => {
                reject();
            };
            xhr.ontimeout = (): void => {
                reject(); // new Error('请求超时，上传失败')
            };
            try {
                xhr.send(formData);
            } catch (error) {
                reject(); // 捕捉发送请求时的错误 new Error(`发送请求时出错：${error.message}`)
            }
        })
    }

    public async deleteTempFolder(path: URI): Promise<void> {
        if (await this.fileService.exists(path)) {
            await this.fileService.delete(path, { recursive: true });
        }
    }

    /**
     * Installs a local vs-code extension file.
     * The implementation doesn't check if the file is a valid BSX file, or the URI has a *.bsx extension.
     * The caller should ensure the file is a valid BSX file.
     *
     * @param fileURI the URI of the file to install.
     */
    protected async installBsxFile(fileURI: URI, installForAll?: boolean): Promise<void> {
        const extensionName = this.labelProvider.getName(fileURI);
        try {
            await this.commandRegistry.executeCommand(VscodeCommands.INSTALL_FROM_VSIX.id, fileURI, installForAll ? 'shared' : undefined);
            this.messageService.info(bnls.localizeByDefault('安装插件 {0} 成功，即将加载.', extensionName));
        } catch (e) {
            this.messageService.error(bnls.localizeByDefault('安装插件 {0} 失败。{1}', extensionName, e));
            // console.warn(e.message);
        }
    }

    /**
     * Given an extension, displays a quick pick of other compatible versions and installs the selected version.
     *
     * @param extension a VSX extension.
     */
    protected async installAnotherVersion(extension: BSXExtension): Promise<void> {
        const pluginId = extension.id;
        const currentVersion = extension.version;
        const client = await this.clientProvider();
        const filter = await this.vsxApiFilter();
        const targetPlatform = await this.applicationServer.getApplicationPlatform();
        const { extensions } = await client.query({ pluginId, includeAllVersions: true });
        const latestCompatible = await filter.findLatestCompatibleExtension({
            pluginId,
            includeAllVersions: true,
            targetPlatform
        });
        let compatibleExtensions: VSXExtensionRaw[] = [];
        let activeItem: {
            label: string;
            description: string;
        } = {
            label: "",
            description: ""
        };
        if (latestCompatible) {
            compatibleExtensions = extensions.slice(extensions.findIndex(ext => ext.version === latestCompatible.version));
        }
        const items: QuickPickItem[] = compatibleExtensions.map(ext => {
            const item = {
                label: ext.version,
                description: DateTime.fromISO(ext.timestamp).toRelative({ locale: bnls.locale }) ?? ''
            };
            if (currentVersion === ext.version) {
                item.description += ` (${bnls.localizeByDefault('当前')})`;
                activeItem = item;
            }
            return item;
        });
        const selectedItem = await this.quickInput.showQuickPick(items, {
            placeholder: bnls.localizeByDefault('选择要安装的版本'),
            runIfSingle: false,
            activeItem
        });
        if (selectedItem) {
            const selectedExtension = this.model.getExtension(pluginId);
            if (selectedExtension) {
                await this.updateVersion(selectedExtension, selectedItem.label);
            }
        }
    }

    protected async copy(extension: BSXExtension): Promise<void> {
        this.clipboardService.writeText(await extension.serialize());
    }

    protected copyExtensionId(extension: BSXExtension): void {
        this.clipboardService.writeText(extension.id);
    }

    /**
     * Updates an extension to a specific version.
     *
     * @param extension the extension to update.
     * @param updateToVersion the version to update to.
     * @param revertToVersion the version to revert to (in case of failure).
     */
    protected async updateVersion(extension: BSXExtension, updateToVersion: string): Promise<void> {
        try {
            await extension.install({ version: updateToVersion, ignoreOtherVersions: true });
        } catch {
            this.messageService.warn(bnls.localizeByDefault('安装插件 {1} 的 {0} 版本失败。',
                updateToVersion, extension.displayName));
            return;
        }
        try {
            if (extension.version !== updateToVersion) {
                await extension.uninstall();
            }
        } catch {
            this.messageService.warn(bnls.localizeByDefault('移除插件时错误: {0}。',
                extension.displayName));
        }
    }

    protected async showRecommendedToast(): Promise<void> {
        if (!this.preferenceService.get(IGNORE_RECOMMENDATIONS_ID, false)) {
            const recommended = new Set([...this.model.recommended]);
            for (const installed of this.model.installed) {
                recommended.delete(installed);
            }
            if (recommended.size) {
                const install = bnls.localizeByDefault('安装');
                const showRecommendations = bnls.localizeByDefault('显示推荐');
                const userResponse = await this.messageService.info(
                    bnls.localizeByDefault('您想要安装推荐插件吗?'),
                    install,
                    showRecommendations
                );
                if (userResponse === install) {
                    for (const recommendation of recommended) {
                        this.model.getExtension(recommendation)?.install();
                    }
                } else if (userResponse === showRecommendations) {
                    await this.showRecommendedExtensions();
                }
            }
        }
    }

    protected async showBuiltinExtensions(): Promise<void> {
        await this.openView({ activate: true });
        this.model.search.query = BUILTIN_QUERY;
    }

    protected async showInstalledExtensions(): Promise<void> {
        await this.openView({ activate: true });
        this.model.search.query = INSTALLED_QUERY;
    }

    protected async showRecommendedExtensions(): Promise<void> {
        await this.openView({ activate: true });
        this.model.search.query = RECOMMENDED_QUERY;
    }
}

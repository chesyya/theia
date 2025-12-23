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

import * as React from '@theia/core/shared/react';
import * as DOMPurify from '@theia/core/shared/dompurify';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { TreeElement, TreeElementNode } from '@theia/core/lib/browser/source-tree';
import { OpenerService, open, OpenerOptions } from '@theia/core/lib/browser/opener-service';
import { HostedPluginSupport } from '@baosky/plugin-host/lib/hosted/browser/hosted-plugin';
import { PluginServer, DeployedPlugin, PluginType, PluginIdentifiers, PluginDeployOptions } from '@baosky/plugin-host/lib/common/plugin-protocol';
import { VSCodeExtensionUri } from '@baosky/plugin-vscode/lib/common/plugin-vscode-uri';
import { ProgressService } from '@theia/core/lib/common/progress-service';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import { BSXEnvironment } from '../common/bsx-environment';
import { BSXExtensionsSearchModel } from './bsx-extensions-search-model';
import { CommandRegistry, MenuPath } from '@theia/core/lib/common';
import { bnls } from '@baosky/platform/lib/common/bnls'
import { codicon, ContextMenuRenderer, HoverService, TreeWidget } from '@theia/core/lib/browser';
import { VSXExtensionNamespaceAccess, VSXUser } from '@theia/ovsx-client/lib/ovsx-types';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { MarkdownStringImpl } from '@theia/core/lib/common/markdown-rendering';
import { AuthorizationStatus, IAuthorizationService } from '@baosky/plugin-host/lib/common/authorization/i-authorization-service';
import {CommonConfirmDialogFactory} from '@baosky/platform/lib/browser/common-dialog/common-confirm-dialog';
import { UserLoginController } from '@baosky/project/lib/browser/es-server/controller/user-login-controller';
import { BaoskyConfigServer } from '@baosky/platform/lib/common/baosky-config/baosky-config-server';
import { SharedStorage } from '@baosky/platform/lib/common/storage-space/user-storage/user-storage-utils';
import { PluginStorageKey } from '@baosky/plugin-host/lib/main/common/user-plugin-management/user-plugin-environment-service';
export const EXTENSIONS_CONTEXT_MENU: MenuPath = ['extensions_context_menu'];
const localizeBuiltin = bnls.localizeByDefault('内置插件');
const localizeSystem = bnls.localizeByDefault('系统级');
const localizeUser = bnls.localizeByDefault('用户级');

export namespace BSXExtensionsContextMenu {
    export const INSTALL = [...EXTENSIONS_CONTEXT_MENU, '1_install'];
    export const COPY = [...EXTENSIONS_CONTEXT_MENU, '2_copy'];
    export const CONTRIBUTION = [...EXTENSIONS_CONTEXT_MENU, '3_contribution'];
    export const DISABLE_SUBMENU = [...EXTENSIONS_CONTEXT_MENU, '4_disable_submenu'];
}

@injectable()
export class BSXExtensionData {
    readonly version?: string;
    readonly iconUrl?: string;
    readonly publisher?: string;
    readonly name?: string;
    readonly displayName?: string;
    readonly description?: string;
    readonly averageRating?: number;
    readonly downloadCount?: number;
    readonly downloadUrl?: string;
    readonly readmeUrl?: string;
    readonly licenseUrl?: string;
    readonly repository?: string;
    readonly license?: string;
    readonly readme?: string;
    readonly preview?: boolean;
    readonly verified?: boolean;
    readonly namespaceAccess?: VSXExtensionNamespaceAccess;
    readonly publishedBy?: VSXUser;
    static KEYS: Set<(keyof BSXExtensionData)> = new Set([
        'version',
        'iconUrl',
        'publisher',
        'name',
        'displayName',
        'description',
        'averageRating',
        'downloadCount',
        'downloadUrl',
        'readmeUrl',
        'licenseUrl',
        'repository',
        'license',
        'readme',
        'preview',
        'verified',
        'namespaceAccess',
        'publishedBy'
    ]);
}

@injectable()
export class BSXExtensionOptions {
    readonly id: string;
}

export const BSXExtensionFactory = Symbol('BSXExtensionFactory');
export type BSXExtensionFactory = (options: BSXExtensionOptions) => BSXExtension;

@injectable()
export class BSXExtension implements BSXExtensionData, TreeElement {
    /**
     * Ensure the version string begins with `'v'`.
     */
    static formatVersion(version: string | undefined): string | undefined {
        if (version && !version.startsWith('v')) {
            return `v${version}`;
        }
        return version;
    }

    @inject(BSXExtensionOptions)
    protected readonly options: BSXExtensionOptions;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(HostedPluginSupport)
    protected readonly pluginSupport: HostedPluginSupport;

    @inject(PluginServer)
    protected readonly pluginServer: PluginServer;

    @inject(ProgressService)
    protected readonly progressService: ProgressService;

    @inject(ContextMenuRenderer)
    protected readonly contextMenuRenderer: ContextMenuRenderer;

    @inject(BSXEnvironment)
    readonly environment: BSXEnvironment;

    @inject(BSXExtensionsSearchModel)
    readonly search: BSXExtensionsSearchModel;

    @inject(HoverService)
    protected readonly hoverService: HoverService;

    // Forward declaration - will be injected by container
    model?: { triggerUpdate(extension: BSXExtension): void };

    @inject(WindowService)
    readonly windowService: WindowService;

    @inject(CommandRegistry)
    readonly commandRegistry: CommandRegistry;

    @inject(CommonConfirmDialogFactory)
    readonly commonConfirmDialogFactory: CommonConfirmDialogFactory;

    @inject(IAuthorizationService)
    protected readonly authorizationService: IAuthorizationService;

    @inject(UserLoginController) protected readonly userLoginController: UserLoginController;
    @inject(BaoskyConfigServer) protected readonly baoskyConfigServer: BaoskyConfigServer;

    protected readonly data: Partial<BSXExtensionData> = {};
    protected _authorized: boolean = true;
    protected _installed: boolean = false;
    protected _enabled: boolean = true;
    protected _needsRestart: boolean = false;
    protected _builtinVersion?: string;

    protected registryUri: Promise<string>;

     uninstalling = bnls.localizeByDefault('卸载中');
     installing = bnls.localizeByDefault('安装中');
     reload = bnls.localizeByDefault('重新刷新');
     undeploy = bnls.localizeByDefault('卸载');
     deploy = bnls.localizeByDefault('安装');
     enable = bnls.localizeByDefault('启用');
     disable = bnls.localizeByDefault('禁用');
     unauthorizedText = bnls.localizeByDefault('未授权');
     sharedText = bnls.localizeByDefault('共享');

    @postConstruct()
    protected postConstruct(): void {
        this.registryUri = this.environment.getRegistryUri();

        // Initialize authorization status
        // this.updateAuthorizationStatus();

        // Initialize enabled status
        this.updateEnabledStatus();

        // 监听授权状态变化
        // this.authorizationService.onDidUpdateAuthorizationStatus(event => {
        //     if (event.pluginId === this.id) {
        //         this.updateAuthorizationStatus();
        //         // 通知model更新视图
        //         if (this.model && this.model.triggerUpdate) {
        //             this.model.triggerUpdate(this);
        //         }
        //     }
        // });
    }

    get dataVersion(): string{
        return this.data.version || '';
    }

    get uri(): URI {
        return VSCodeExtensionUri.fromId(this.id);
    }

    get id(): string {
        return this.options.id;
    }

    get visible(): boolean {
        return !!this.name;
    }

    get plugin(): DeployedPlugin | undefined {
        return this.pluginSupport.getPlugin(this.id as PluginIdentifiers.UnversionedId);
    }

    get installed(): boolean {
        return !!this.plugin;
    }

    get isInstalledChanged(): boolean {
        return this._installed;
    }

    get builtin(): boolean {
        return !!this._builtinVersion || this.plugin?.type === PluginType.System;
    }

    get systemActive(): boolean {
        return this.plugin?.type === PluginType.System;
    }

    get builtinVersion(): string | undefined {
        return this._builtinVersion;
    }

    set builtinVersion(version: string | undefined) {
        this._builtinVersion = version;
    }

    get authorized(): boolean {
        return this._authorized;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get needsRestart(): boolean {
        return this._needsRestart;
    }

    async updateAuthorizationStatus(status?: AuthorizationStatus): Promise<void> {
        try {
            if(!status && this.installed)
                status = await this.authorizationService.getAuthorizationStatus(this.id);
            this._authorized = status === AuthorizationStatus.GRANTED;

        } catch (error) {
            console.warn(`Failed to check authorization status for ${this.id}:`, error);
            this._authorized = true;
        }
    }

    update(data: Partial<BSXExtensionData>): void {
        for (const key of BSXExtensionData.KEYS) {
            if (key in data) {
                Object.assign(this.data, { [key]: data[key] });
            }
        }
    }

    reloadWindow(): void {
        this.windowService.reload();
    }

    protected getData<K extends keyof BSXExtensionData>(key: K): BSXExtensionData[K] {
        const model = this.plugin?.metadata.model;
        if (model && key in model) {
            return model[key as keyof typeof model] as BSXExtensionData[K];
        }
        return this.data[key];
    }

    get iconUrl(): string | undefined {
        const plugin = this.plugin;
        const iconUrl = plugin && plugin.metadata.model.iconUrl;
        if (iconUrl) {
            return new Endpoint({ path: iconUrl }).getRestUrl().toString();
        }
        return this.data['iconUrl'];
    }

    get publisher(): string | undefined {
        return this.getData('publisher');
    }

    get name(): string | undefined {
        return this.getData('name');
    }

    get displayName(): string | undefined {
        return this.getData('displayName') || this.name;
    }

    get description(): string | undefined {
        return this.getData('description');
    }

    get version(): string | undefined {
        return this.getData('version');
    }

    get averageRating(): number | undefined {
        return this.getData('averageRating');
    }

    get downloadCount(): number | undefined {
        return this.getData('downloadCount');
    }

    get downloadUrl(): string | undefined {
        return this.getData('downloadUrl');
    }

    get readmeUrl(): string | undefined {
        const plugin = this.plugin;
        const readmeUrl = plugin && plugin.metadata.model.readmeUrl;
        if (readmeUrl) {
            return new Endpoint({ path: readmeUrl }).getRestUrl().toString();
        }
        return this.data['readmeUrl'];
    }

    get licenseUrl(): string | undefined {
        let licenseUrl = this.data['licenseUrl'];
        if (licenseUrl) {
            return licenseUrl;
        } else {
            const plugin = this.plugin;
            licenseUrl = plugin && plugin.metadata.model.licenseUrl;
            if (licenseUrl) {
                return new Endpoint({ path: licenseUrl }).getRestUrl().toString();
            }
        }
    }

    get repository(): string | undefined {
        return this.getData('repository');
    }

    get license(): string | undefined {
        return this.getData('license');
    }

    get readme(): string | undefined {
        return this.getData('readme');
    }

    get preview(): boolean | undefined {
        return this.getData('preview');
    }

    get verified(): boolean | undefined {
        return this.getData('verified');
    }

    get shared(): boolean{
        const plugin = this.plugin;
        if(plugin?.metadata.model.packagePath.includes(`/.baosky/${SharedStorage}/${PluginStorageKey}/`))
            return true;
        return false;
    }

    get namespaceAccess(): VSXExtensionNamespaceAccess | undefined {
        return this.getData('namespaceAccess');
    }

    get publishedBy(): VSXUser | undefined {
        return this.getData('publishedBy');
    }

    get tooltip(): string {
        let md = `__${this.displayName}__ ${BSXExtension.formatVersion(this.version)}\n\n${this.description}\n_____\n\n${bnls.localizeByDefault('发布者: {0}', this.publisher)}`;

        if (this.license) {
            md += `  \r${bnls.localizeByDefault('许可证: {0}', this.license)}`;
        }

        if (this.downloadCount) {
            md += `  \r${bnls.localizeByDefault('下载量: {0}', downloadCompactFormatter.format(this.downloadCount))}`;
        }

        if (this.averageRating) {
            md += `  \r${getAverageRatingTitle(this.averageRating)}`;
        }

        return md;
    }

    protected _busy = 0;
    get busy(): boolean {
        return !!this._busy;
    }

     async getUserId(): Promise<string | undefined>{
        if (await this.baoskyConfigServer.getESServerMode()){
            if(this.admin)
                return 'admin';
            else{
                const user = await this.userLoginController.getCurrentUser();
                return user?.username;
        }
    }}

    get admin(): boolean{
        return this.userLoginController.isAdminLogin();
    }

    async install(options?: PluginDeployOptions): Promise<void> {
        const status = await this.authorizationService.getAuthorizationStatus(this.id);
        const userId = await this.getUserId();
        if(userId){
            if(this.admin){
                const result = await this.commonConfirmDialogFactory({
                    title: bnls.localizeByDefault('是否安装到共享目录？'),
                    msg: bnls.localizeByDefault('插件 "{0}" 是否要安装到共享目录中,安装之后所有用户都能使用。', this.displayName)}).open();
                if(result){
                    options = Object.assign({}, options, { shared: true }, { userId });
                }
                else
                    options = Object.assign({}, options, {userId});
                    }
            else
                options = Object.assign({}, options, {userId});

        }

        // if (status == AuthorizationStatus.DENIED) { 
        //     // const choice = await new ConfirmDialog({
        //     //     title: bnls.localize('theia/vsx-registry/confirmDialogTitle', 'Are you sure you want to proceed with the installation ?'),
        //     //     msg: bnls.localize('theia/vsx-registry/confirmDialogMessage', 'The extension "{0}" is unverified and might pose a security risk.', this.displayName)
        //     // }).open();
        //     const choice = await this.commonConfirmDialogFactory({
        //         title: bnls.localizeByDefault('您确定要继续安装吗？'),
        //         msg: bnls.localizeByDefault('插件 "{0}" 在系统中未安装授权文件,安装之后将无法使用。', this.displayName)}).open();
        //     if (choice) {
        //         this.doInstall(options);
        //     }
        // } else {
            this.doInstall(options);
        // }
    }

    async uninstall(): Promise<void> {
        this._busy++;
        try {
            const { plugin } = this;
            if (plugin) {
                const userId = await this.getUserId();
                const shared = this.shared;
                await this.progressService.withProgress(
                    bnls.localizeByDefault('卸载中 {0}...', this.id), 'extensions',
                    () => this.pluginServer.uninstall(PluginIdentifiers.componentsToVersionedId(plugin.metadata.model), userId ? { userId, shared } : undefined)
                );
            }
        } finally {
            this._busy--;
        }
    }

    async enablePlugin(): Promise<void> {
        this._busy++;
        try {
            const { plugin } = this;
            if (plugin) {
                const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                await this.progressService.withProgress(
                    bnls.localizeByDefault('启用中 {0}...', this.id), 'extensions',
                    () => this.pluginServer.enablePlugin(versionedId)
                );
                this._enabled = true;
                this._needsRestart = false;

                // Reload the plugin - re-register contributions and activate it
                await this.pluginSupport.reloadPlugin(this.id);
            }
        } finally {
            this._busy--;
        }
    }

    async disablePlugin(): Promise<void> {
        this._busy++;
        try {
            const { plugin } = this;
            if (plugin) {
                const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                await this.progressService.withProgress(
                    bnls.localizeByDefault('禁用中 {0}...', this.id), 'extensions',
                    async () => {
                        await this.pluginServer.disablePlugin(versionedId);
                    }
                );
                this._enabled = false;
                this._needsRestart = true;

                // Trigger UI update
                if (this.model) {
                    this.model.triggerUpdate(this);
                }
            }
        } finally {
            this._busy--;
        }
    }

    async disablePluginForUser(username: string): Promise<void> {
        this._busy++;
        try {
            const { plugin } = this;
            if (plugin) {
                const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                await this.progressService.withProgress(
                    bnls.localizeByDefault('为用户 {0} 禁用插件 {1}...', username, this.id), 'extensions',
                    async () => {
                        await this.pluginServer.disablePluginForUser(versionedId, username);
                    }
                );
            }
        } finally {
            this._busy--;
        }
    }

    async restartPlugin(): Promise<void> {
        this._busy++;
        try {
            const { plugin } = this;
            if (plugin) {
                // Stop and cleanup this plugin
                await this.pluginSupport.stopPlugin(this.id);
                this._needsRestart = false;

                // Trigger UI update
                if (this.model) {
                    this.model.triggerUpdate(this);
                }
            }
        } finally {
            this._busy--;
        }
    }

    async updateEnabledStatus(): Promise<void> {
        try {
            const { plugin } = this;
            if (plugin) {
                const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
                this._enabled = await this.pluginServer.isPluginEnabled(versionedId);
            }
        } catch (error) {
            console.error('Failed to update plugin enabled status:', error);
        }
    }

    protected async doInstall(options?: PluginDeployOptions): Promise<void> {
        this._busy++;
        try {
            //原本是全部小写规范，在线商店目前不支持
            const uri = this.uri; // _URI 对象
            const originalAuthority = uri.authority; // 如果你有原始 authority
            const path = uri.path; // path 保留原样
            const query = uri.query ? `?${uri.query}` : '';
            const fragment = uri.fragment ? `#${uri.fragment}` : '';
            const originalCaseUri = `${uri.scheme}://${originalAuthority}${path}${query}${fragment}`;
            await this.progressService.withProgress(bnls.localizeByDefault("安装插件 '{0}' v{1}...", this.id, this.version ?? 0), 'extensions', () =>
                this.pluginServer.deploy(originalCaseUri, undefined, options)
            );
        } finally {
            this._busy--;
        }
    }

    async handleContextMenu(e: React.MouseEvent<HTMLElement, MouseEvent>): Promise<void> {
        e.preventDefault();

        // For admin users, dynamically populate the disable submenu
        if (this.userLoginController.isAdminLogin() && this.installed && !this.builtin) {
            await this.populateDisableUserMenu();
        }

        this.contextMenuRenderer.render({
            menuPath: EXTENSIONS_CONTEXT_MENU,
            anchor: {
                x: e.clientX,
                y: e.clientY,
            },
            args: [this]
        });
    }

    private async populateDisableUserMenu(): Promise<void> {
        // This will be implemented in the contribution to register dynamic menus
        if (this.model && (this.model as any).populateDisableUserMenu) {
            await (this.model as any).populateDisableUserMenu(this);
        }
    }

    /**
     * Get the registry link for the given extension.
     * @param path the url path.
     * @returns the registry link for the given extension at the path.
     */
    async getRegistryLink(path = ''): Promise<URI> {
        const registryUri = new URI(await this.registryUri);
        if (this.downloadUrl) {
            const downloadUri = new URI(this.downloadUrl);
            if (downloadUri.authority !== registryUri.authority) {
                throw new Error('cannot generate a valid URL');
            }
        }
        return registryUri.resolve('extension/' + this.id.replace('.', '/')).resolve(path);
    }

    async serialize(): Promise<string> {
        const serializedExtension: string[] = [];
        serializedExtension.push(`Name: ${this.displayName}`);
        serializedExtension.push(`Id: ${this.id}`);
        serializedExtension.push(`Description: ${this.description}`);
        serializedExtension.push(`Version: ${this.version}`);
        serializedExtension.push(`Publisher: ${this.publisher}`);
        if (this.downloadUrl !== undefined) {
            const registryLink = await this.getRegistryLink();
            serializedExtension.push(`Open BSX Link: ${registryLink.toString()}`);
        };
        return serializedExtension.join('\n');
    }

    async open(options: OpenerOptions = { mode: 'reveal' }): Promise<void> {
        await this.doOpen(this.uri, options);
    }

    async doOpen(uri: URI, options?: OpenerOptions): Promise<void> {
        await open(this.openerService, uri, options);
    }

    render(host: TreeWidget): React.ReactNode {
        return <BSXExtensionComponent extension={this} host={host} hoverService={this.hoverService} />;
    }
}

export abstract class AbstractBSXExtensionComponent<Props extends AbstractBSXExtensionComponent.Props = AbstractBSXExtensionComponent.Props> extends React.Component<Props> {

    readonly install = async (event?: React.MouseEvent) => {
        event?.stopPropagation();
        this.forceUpdate();
        try {
            const pending = this.props.extension.install();
            this.forceUpdate();
            await pending;
        } finally {
            this.forceUpdate();
        }
    };

    readonly uninstall = async (event?: React.MouseEvent) => {
        event?.stopPropagation();
        try {
            const pending = this.props.extension.uninstall();
            this.forceUpdate();
            await pending;
        } finally {
            this.forceUpdate();
        }
    };

    readonly reloadWindow = (event?: React.MouseEvent) => {
        event?.stopPropagation();
        this.props.extension.reloadWindow();
    };

    readonly enablePlugin = async (event?: React.MouseEvent) => {
        event?.stopPropagation();
        try {
            const pending = this.props.extension.enablePlugin();
            this.forceUpdate();
            await pending;
        } finally {
            this.forceUpdate();
        }
    };

    readonly disablePlugin = async (event?: React.MouseEvent) => {
        event?.stopPropagation();
        try {
            const pending = this.props.extension.disablePlugin();
            this.forceUpdate();
            await pending;
        } finally {
            this.forceUpdate();
        }
    };

    readonly restartPlugin = async (event?: React.MouseEvent) => {
        event?.stopPropagation();
        try {
            const pending = this.props.extension.restartPlugin();
            this.forceUpdate();
            await pending;
        } finally {
            this.forceUpdate();
        }
    };

    protected readonly manage = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation();
        this.props.extension.handleContextMenu(e);
    };

    protected renderAction(host?: TreeWidget): React.ReactNode {
        const { builtin, busy, plugin, enabled } = this.props.extension;
        const isFocused = (host?.model.getFocusedNode() as TreeElementNode)?.element === this.props.extension;
        const tabIndex = (!host || isFocused) ? 0 : undefined;
        const installed = !!plugin;
        const outOfSynch = plugin?.metadata.outOfSync;

        if (builtin) {
            return <div className="codicon codicon-settings-gear action" tabIndex={tabIndex} onClick={this.manage}></div>;
        }
        if (busy) {
            if (installed) {
                return <button className="theia-button action theia-mod-disabled">{this.props.extension.uninstalling}</button>;
            }
            return <button className="theia-button action prominent theia-mod-disabled">{this.props.extension.installing}</button>;
        }
        if (installed) {
            return <div>
                {enabled ? (
                    <button className="theia-button action" onClick={this.disablePlugin}>{this.props.extension.disable}</button>
                ) : (
                    <button className="theia-button action prominent" onClick={this.enablePlugin}>{this.props.extension.enable}</button>
                )}
                {outOfSynch ? (
                    <button className="theia-button action prominent" onClick={this.reloadWindow}>{this.props.extension.reload}</button>
                ) : (
                    <button className="theia-button action" onClick={this.uninstall}>{this.props.extension.undeploy}</button>
                )}
                <div className="codicon codicon-settings-gear action" onClick={this.manage}></div>
            </div>;
        }
        return <button className="theia-button prominent action" onClick={this.install}>{this.props.extension.deploy}</button>;
    }

}
export namespace AbstractBSXExtensionComponent {
    export interface Props {
        extension: BSXExtension;
    }
}

const downloadFormatter = new Intl.NumberFormat();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const downloadCompactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' } as any);
const averageRatingFormatter = (averageRating: number): number => Math.round(averageRating * 2) / 2;
const getAverageRatingTitle = (averageRating: number): string =>
    bnls.localizeByDefault('Average rating: {0} out of 5', averageRatingFormatter(averageRating));

export namespace BSXExtensionComponent {
    export interface Props extends AbstractBSXExtensionComponent.Props {
        host: TreeWidget;
        hoverService: HoverService;
    }
}

export class BSXExtensionComponent<Props extends BSXExtensionComponent.Props = BSXExtensionComponent.Props> extends AbstractBSXExtensionComponent<Props> {
    override render(): React.ReactNode {
        const { iconUrl, publisher, displayName, description, version, downloadCount, averageRating, tooltip, verified, authorized, shared, enabled } = this.props.extension;

        // 构建CSS类名，包含授权状态
        let className = 'theia-vsx-extension noselect';
        // 根据授权状态应用不同的样式
        if (!authorized) {
            className += ' unauthorized';
        }

        return <div
            className={className}
            onMouseEnter={event => {
                this.props.hoverService.requestHover({
                    content: new MarkdownStringImpl(tooltip),
                    target: event.currentTarget,
                    position: 'right'
                });
            }}
            onMouseUp={event => {
                if (event.button === 2) {
                    this.manage(event);
                }
            }}
        >
            {iconUrl ?
                <img className='theia-vsx-extension-icon' src={iconUrl} /> :
                <div className='theia-vsx-extension-icon placeholder' />}
            <div className='theia-vsx-extension-content'>
                <div className='title'>
                    <div className='noWrapInfo'>
                        <span className='name'>{displayName}</span> <span className='version'>{BSXExtension.formatVersion(version)}</span>
                        {/* 显示系统级/用户级状态 */}
                        {this.props.extension.builtin && (
                            <span className={this.props.extension.systemActive ? 'system-plugin' : 'user-plugin'}>
                                {this.props.extension.systemActive ? localizeSystem : localizeUser}
                            </span>
                        )}
                        {/* 显示授权和禁用状态 */}
                        {!authorized && <span className='unauthorized-status'>{this.props.extension.unauthorizedText}</span>}
                        {shared && <span className='shared-plugin'>{this.props.extension.sharedText}</span>}
                    </div>
                    <div className='stat'>
                        {!!downloadCount && <span className='download-count'><i className={codicon('cloud-download')} />{downloadCompactFormatter.format(downloadCount)}</span>}
                        {!!averageRating && <span className='average-rating'><i className={codicon('star-full')} />{averageRatingFormatter(averageRating)}</span>}
                    </div>
                </div>
                <div className='noWrapInfo theia-vsx-extension-description'>{description}</div>
                <div className='theia-vsx-extension-action-bar'>
                    <div className='theia-vsx-extension-publisher-container'>
                        {authorized === true ? (
                            <i className={codicon('verified-filled')} />
                        ) : authorized === false ? (
                            <i className={codicon('verified')} />
                        ) : (
                            <i className={codicon('question')} />
                        )}
                        {/* 禁用状态图标 */}
                        {enabled === false && (
                            <i className={codicon('circle-slash')} title={bnls.localizeByDefault('已禁用')} />
                        )}
                        <span className='noWrapInfo theia-vsx-extension-publisher'>{publisher}</span>
                    </div>
                    {this.renderAction(this.props.host)}
                </div>
            </div>
        </div >;
    }
}

export class BSXExtensionEditorComponent extends AbstractBSXExtensionComponent {
    protected header: HTMLElement | undefined;
    protected body: HTMLElement | undefined;
    protected _scrollContainer: HTMLElement | undefined;

    get scrollContainer(): HTMLElement | undefined {
        return this._scrollContainer;
    }

    override render(): React.ReactNode {
        const {
            builtin, preview, id, iconUrl, publisher, displayName, description, version,
            averageRating, downloadCount, repository, license, readme
        } = this.props.extension;

        const sanitizedReadme = !!readme ? DOMPurify.sanitize(readme) : undefined;

        return <React.Fragment>
            <div className='header' ref={ref => this.header = (ref || undefined)}>
                {iconUrl ?
                    <img className='icon-container' src={iconUrl} /> :
                    <div className='icon-container placeholder' />}
                <div className='details'>
                    <div className='title'>
                        <span title='Extension name' className='name'>{displayName}</span>
                    </div>
                    <div className='subtitle'>
                        {this.props.extension.builtin && (
                            <span className={this.props.extension.systemActive ? 'builtin' : 'user-plugin-label'}>
                                {this.props.extension.systemActive ? localizeSystem : localizeUser}
                            </span>
                        )}
                        <span title='Extension identifier' className='identifier'>ID : {id}</span>
                        {preview && <span className='preview'>Preview</span>}
                        <div className="codicon codicon-settings-gear action" onClick={this.manage}></div>
                    </div>
                    <div>
                        <span title='Publisher name' className='publisher'>
                            {this.renderNamespaceAccess()}
                            {publisher}
                        </span>
                        {!!downloadCount && <span className='download-count' onClick={this.openExtension}>
                            <i className={codicon('cloud-download')} />{downloadFormatter.format(downloadCount)}</span>}
                        {
                            averageRating !== undefined &&
                            <span className='average-rating' title={getAverageRatingTitle(averageRating)} onClick={this.openAverageRating}>{this.renderStars()}</span>
                        }
                        {repository && <span className='repository' onClick={this.openRepository}>Repository</span>}
                        {license && <span className='license' onClick={this.openLicense}>{license}</span>}
                        {version && <span className='version'>{BSXExtension.formatVersion(version)}</span>}
                    </div>
                    <div className='description noWrapInfo'>{description}</div>

                </div>
            </div>
            {
                sanitizedReadme &&
                <div className='scroll-container'
                    ref={ref => this._scrollContainer = (ref || undefined)}>
                    <div className='body'
                        ref={ref => this.body = (ref || undefined)}
                        onClick={this.openLink}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: sanitizedReadme }}
                    />
                </div>
            }
        </React.Fragment >;
    }

    protected renderNamespaceAccess(): React.ReactNode {
        const { publisher, namespaceAccess, publishedBy } = this.props.extension;
        if (namespaceAccess === undefined) {
            return undefined;
        }
        let tooltip = publishedBy ? ` Published by "${publishedBy.loginName}".` : '';
        let icon;
        if (namespaceAccess === 'public') {
            icon = 'globe';
            tooltip = `Everyone can publish to "${publisher}" namespace.` + tooltip;
        } else {
            icon = 'shield';
            tooltip = `Only verified owners can publish to "${publisher}" namespace.` + tooltip;
        }
        return <i className={`${codicon(icon)} namespace-access`} title={tooltip} onClick={this.openPublishedBy} />;
    }

    protected renderStars(): React.ReactNode {
        const rating = this.props.extension.averageRating || 0;

        const renderStarAt = (position: number) => position <= rating ?
            <i className={codicon('star-full')} /> :
            position > rating && position - rating < 1 ?
                <i className={codicon('star-half')} /> :
                <i className={codicon('star-empty')} />;
        return <React.Fragment>
            {renderStarAt(1)}{renderStarAt(2)}{renderStarAt(3)}{renderStarAt(4)}{renderStarAt(5)}
        </React.Fragment>;
    }

    // TODO replace with webview
    readonly openLink = (event: React.MouseEvent) => {
        if (!this.body) {
            return;
        }
        const target = event.nativeEvent.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        let node = target;
        while (node.tagName.toLowerCase() !== 'a') {
            if (node === this.body) {
                return;
            }
            if (!(node.parentElement instanceof HTMLElement)) {
                return;
            }
            node = node.parentElement;
        }
        const href = node.getAttribute('href');
        if (href && !href.startsWith('#')) {
            event.preventDefault();
            this.props.extension.doOpen(new URI(href));
        }
    };

    readonly openExtension = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const extension = this.props.extension;
        const uri = await extension.getRegistryLink();
        extension.doOpen(uri);
    };
    readonly searchPublisher = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const extension = this.props.extension;
        if (extension.publisher) {
            extension.search.query = extension.publisher;
        }
    };
    readonly openPublishedBy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const extension = this.props.extension;
        const homepage = extension.publishedBy && extension.publishedBy.homepage;
        if (homepage) {
            extension.doOpen(new URI(homepage));
        }
    };
    readonly openAverageRating = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const extension = this.props.extension;
        const uri = await extension.getRegistryLink('reviews');
        extension.doOpen(uri);
    };
    readonly openRepository = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const extension = this.props.extension;
        if (extension.repository) {
            extension.doOpen(new URI(extension.repository));
        }
    };
    readonly openLicense = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const extension = this.props.extension;
        const licenseUrl = extension.licenseUrl;
        if (licenseUrl) {
            extension.doOpen(new URI(licenseUrl));
        }
    };
}

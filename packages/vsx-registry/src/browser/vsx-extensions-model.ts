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

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import debounce from 'p-debounce';
import * as markdownit from '@theia/core/shared/markdown-it';
import * as DOMPurify from '@theia/core/shared/dompurify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { CancellationToken, CancellationTokenSource } from '@theia/core/lib/common/cancellation';
import { HostedPluginSupport } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin';
import { VSXExtension, VSXExtensionFactory } from './vsx-extension';
import { ProgressService } from '@theia/core/lib/common/progress-service';
import { VSXExtensionsSearchModel } from './vsx-extensions-search-model';
import { PreferenceInspectionScope, PreferenceService } from '@theia/core/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { RecommendedExtensions } from './recommended-extensions/recommended-extensions-preference-contribution';
import URI from '@theia/core/lib/common/uri';
import { OVSXClient, VSXAllVersions, VSXExtensionRaw, VSXResponseError, VSXSearchEntry, VSXSearchOptions, VSXTargetPlatform } from '@theia/ovsx-client/lib/ovsx-types';
import { OVSXClientProvider } from '../common/ovsx-client-provider';
import { RequestContext, RequestService } from '@theia/core/shared/@theia/request';
import { OVSXApiFilterProvider } from '@theia/ovsx-client';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import { HostedPluginServer, PluginIdentifiers } from '@theia/plugin-ext';
import { HostedPluginWatcher } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin-watcher';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { AuthorizationStatus, IAuthorizationService, IAuthorizationStatusChangeEvent } from '@theia/plugin-ext/lib/common/authorization/i-authorization-service';

@injectable()
export class VSXExtensionsModel {

    protected initialized: Promise<void>;
    /**
     * Single source for all extensions
     */
    protected readonly extensions = new Map<string, VSXExtension>();
    protected readonly onDidChangeEmitter = new Emitter<void>();
    protected disabled = new Set<PluginIdentifiers.UnversionedId>();
    protected uninstalled = new Set<PluginIdentifiers.UnversionedId>();
    protected deployed = new Set<PluginIdentifiers.UnversionedId>();
    protected _installed = new Set<string>();
    protected _recommended = new Set<string>();
    protected _searchResult = new Set<string>();
    protected builtins = new Set<PluginIdentifiers.UnversionedId>();
    protected _searchError?: string;

    protected searchCancellationTokenSource = new CancellationTokenSource();
    protected updateSearchResult = debounce(async () => {
        const { token } = this.resetSearchCancellationTokenSource();
        await this.doUpdateSearchResult({ query: this.search.query, includeAllVersions: true }, token);
    }, 500);

    @inject(OVSXClientProvider)
    protected clientProvider: OVSXClientProvider;

    @inject(HostedPluginSupport)
    protected readonly pluginSupport: HostedPluginSupport;

    @inject(HostedPluginWatcher)
    protected pluginWatcher: HostedPluginWatcher;

    @inject(HostedPluginServer)
    protected readonly pluginServer: HostedPluginServer;

    @inject(VSXExtensionFactory)
    protected readonly extensionFactory: VSXExtensionFactory;

    @inject(ProgressService)
    protected readonly progressService: ProgressService;

    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(VSXExtensionsSearchModel)
    readonly search: VSXExtensionsSearchModel;

    @inject(RequestService)
    protected request: RequestService;

    @inject(OVSXApiFilterProvider)
    protected vsxApiFilter: OVSXApiFilterProvider;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(ApplicationServer)
    protected readonly applicationServer: ApplicationServer;

    @inject(IAuthorizationService)
    protected readonly iAuthorizationService: IAuthorizationService;

    @postConstruct()
    protected init(): void {
        this.initialized = this.doInit().catch(console.error);

        // 使用新架构的 AuthorizationClient 监听授权状态变更
        this.iAuthorizationService.onDidUpdateAuthorizationStatus(event => {
            this.handleAuthorizationChange(event);
        });
    }

    protected async doInit(): Promise<void> {
        await Promise.all([
            this.initInstalled(),
            this.initSearchResult(),
            this.initRecommended(),
            this.initAuthorization(),
        ]);
    }

    get onDidChange(): Event<void> {
        return this.onDidChangeEmitter.event;
    }

    get installed(): IterableIterator<string> {
        return this._installed.values();
    }

    get searchError(): string | undefined {
        return this._searchError;
    }

    get searchResult(): IterableIterator<string> {
        return this._searchResult.values();
    }

    get recommended(): IterableIterator<string> {
        return this._recommended.values();
    }

    setOnlyShowVerifiedExtensions(bool: boolean): void {
        if (this.preferences.get('extensions.onlyShowVerifiedExtensions') !== bool) {
            this.preferences.updateValue('extensions.onlyShowVerifiedExtensions', bool);
        }
        this.updateSearchResult();
    }

    isInstalled(id: string): boolean {
        return this._installed.has(id);
    }

    isUninstalled(id: string): boolean {
        return this.uninstalled.has(id as PluginIdentifiers.UnversionedId);
    }

    isDeployed(id: string): boolean {
        return this.deployed.has(id as PluginIdentifiers.UnversionedId);
    }

    isDisabled(id: string): boolean {
        return this.disabled.has(id as PluginIdentifiers.UnversionedId);
    }

    getExtension(id: string): VSXExtension | undefined {
        return this.extensions.get(id);
    }

    resolve(id: string): Promise<VSXExtension> {
        return this.doChange(async () => {
            await this.initialized;
            const extension = await this.refresh(id);
            if (!extension) {
                throw new Error(`Failed to resolve ${id} extension.`);
            }
            if (extension.readmeUrl) {
                try {
                    const rawReadme = RequestContext.asText(await this.request.request({ url: extension.readmeUrl }));
                    const readme = this.compileReadme(rawReadme);
                    extension.update({ readme });
                } catch (e) {
                    if (!VSXResponseError.is(e) || e.statusCode !== 404) {
                        console.error(`[${id}]: failed to compile readme, reason:`, e);
                    }
                }
            }
            return extension;
        });
    }

    protected async initInstalled(): Promise<void> {
        await this.pluginSupport.willStart;
        this.pluginSupport.onDidChangePlugins(() => this.updateInstalled());
        this.pluginWatcher.onDidDeploy(() => {
            this.updateInstalled();
        });

        try {
            await this.updateInstalled();
        } catch (e) {
            console.error(e);
        }
    }

    protected async initSearchResult(): Promise<void> {
        this.search.onDidChangeQuery(() => this.updateSearchResult());
        try {
            await this.updateSearchResult();
        } catch (e) {
            console.error(e);
        }
    }

    protected async initRecommended(): Promise<void> {
        this.preferences.onPreferenceChanged(change => {
            if (change.preferenceName === 'extensions') {
                this.updateRecommended();
            }
        });
        await this.preferences.ready;
        try {
            await this.updateRecommended();
        } catch (e) {
            console.error(e);
        }
    }

    protected resetSearchCancellationTokenSource(): CancellationTokenSource {
        this.searchCancellationTokenSource.cancel();
        return this.searchCancellationTokenSource = new CancellationTokenSource();
    }

    protected setExtension(id: string, version?: string): VSXExtension {
        let extension = this.extensions.get(id);
        if (!extension) {
            extension = this.extensionFactory({ id, version });
            extension.setModel(this);
            this.extensions.set(id, extension);
        }
        return extension;
    }

    protected doChange<T>(task: () => Promise<T>): Promise<T>;
    protected doChange<T>(task: () => Promise<T>, token: CancellationToken): Promise<T | undefined>;
    protected doChange<T>(task: () => Promise<T>, token: CancellationToken = CancellationToken.None): Promise<T | undefined> {
        return this.progressService.withProgress('', 'extensions', async () => {
            if (token && token.isCancellationRequested) {
                return;
            }
            const result = await task();
            if (token && token.isCancellationRequested) {
                return;
            }
            this.onDidChangeEmitter.fire();
            return result;
        });
    }

    protected doUpdateSearchResult(param: VSXSearchOptions, token: CancellationToken): Promise<void> {
        return this.doChange(async () => {
            this._searchResult = new Set<string>();
            if (!param.query) {
                return;
            }
            const client = await this.clientProvider();
            const filter = await this.vsxApiFilter();
            try {
                const result = await client.search(param);

                if (token.isCancellationRequested) {
                    return;
                }
                for (const data of result.extensions) {
                    const id = data.namespace.toLowerCase() + '.' + data.name.toLowerCase();
                    const allVersions = filter.getLatestCompatibleVersion(data);
                    if (!allVersions) {
                        continue;
                    }
                    if (this.preferences.get('extensions.onlyShowVerifiedExtensions')) {
                        this.fetchVerifiedStatus(id, client, allVersions).then(verified => {
                            this.doChange(() => {
                                this.addExtensions(data, id, allVersions, !!verified);
                                return Promise.resolve();
                            });
                        });
                    } else {
                        this.addExtensions(data, id, allVersions);
                        this.fetchVerifiedStatus(id, client, allVersions).then(verified => {
                            this.doChange(() => {
                                let extension = this.getExtension(id);
                                extension = this.setExtension(id);
                                extension.update(Object.assign({
                                    verified: verified
                                }));
                                return Promise.resolve();
                            });
                        });
                    }
                }
            } catch (error) {
                this._searchError = error?.message || String(error);
            }

        }, token);
    }

    protected async fetchVerifiedStatus(id: string, client: OVSXClient, allVersions: VSXAllVersions): Promise<boolean | undefined> {
        try {
            const res = await client.query({ extensionId: id, extensionVersion: allVersions.version, includeAllVersions: true });
            const extension = res.extensions?.[0];
            let verified = extension?.verified;
            if (!verified && extension?.publishedBy.loginName === 'open-vsx') {
                verified = true;
            }
            return verified;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    protected addExtensions(data: VSXSearchEntry, id: string, allVersions: VSXAllVersions, verified?: boolean): void {
        if (!this.preferences.get('extensions.onlyShowVerifiedExtensions') || verified) {
            const extension = this.setExtension(id);
            extension.update(Object.assign(data, {
                publisher: data.namespace,
                downloadUrl: data.files.download,
                iconUrl: data.files.icon,
                readmeUrl: data.files.readme,
                licenseUrl: data.files.license,
                version: allVersions.version,
                verified: verified
            }));
            this._searchResult.add(id);
        }
    }

    protected async updateInstalled(): Promise<void> {
        // 获取所有状态：已部署、已卸载、已禁用
        const [deployed, uninstalled, disabled] = await Promise.all([
            this.pluginServer.getDeployedPluginIds(),
            this.pluginServer.getUninstalledPluginIds(),
            this.pluginServer.getDisabledPluginIds()
        ]);

        this.uninstalled = new Set();
        uninstalled.forEach(id => this.uninstalled.add(PluginIdentifiers.unversionedFromVersioned(id)));

        this.disabled = new Set();
        disabled.forEach(id => this.disabled.add(PluginIdentifiers.unversionedFromVersioned(id)));

        this.deployed = new Set();
        deployed.forEach(id => this.deployed.add(PluginIdentifiers.unversionedFromVersioned(id)));

        const prevInstalled = this._installed;
        return this.doChange(async () => {
            const currInstalled = new Set<string>();
            const refreshing = [];

            // 处理已部署的插件
            for (const versionedId of deployed) {
                const idAndVersion = PluginIdentifiers.idAndVersionFromVersionedId(versionedId);
                if (idAndVersion && idAndVersion.id) {
                    this._installed.delete(idAndVersion.id);
                    this.setExtension(idAndVersion.id);
                    currInstalled.add(idAndVersion.id);
                    refreshing.push(this.refresh(idAndVersion.id, idAndVersion.version));
                }
            }

            // 处理已禁用的插件（仍然算作已安装，但不是已部署）
            for (const versionedId of disabled) {
                const idAndVersion = PluginIdentifiers.idAndVersionFromVersionedId(versionedId);
                if (idAndVersion && idAndVersion.id && !this.isUninstalled(idAndVersion.id)) {
                    if (!currInstalled.has(idAndVersion.id)) {
                        this._installed.delete(idAndVersion.id);
                        this.setExtension(idAndVersion.id);
                        currInstalled.add(idAndVersion.id);
                        refreshing.push(this.refresh(idAndVersion.id, idAndVersion.version));
                    }
                }
            }

            for (const id of this._installed) {
                const extension = this.getExtension(id);
                if (!extension) { continue; }
                refreshing.push(this.refresh(id, extension.version));
            }

            const installed = new Set([...prevInstalled, ...currInstalled]);
            const installedSorted = Array.from(installed).sort((a, b) => this.compareExtensions(a, b));
            this._installed = new Set(installedSorted.values());

            await Promise.all(refreshing);
        });
    }

    protected updateRecommended(): Promise<Array<VSXExtension | undefined>> {
        return this.doChange<Array<VSXExtension | undefined>>(async () => {
            const allRecommendations = new Set<string>();
            const allUnwantedRecommendations = new Set<string>();

            const updateRecommendationsForScope = (scope: PreferenceInspectionScope, root?: URI) => {
                const { recommendations, unwantedRecommendations } = this.getRecommendationsForScope(scope, root);
                recommendations.forEach(recommendation => allRecommendations.add(recommendation));
                unwantedRecommendations.forEach(unwantedRecommendation => allUnwantedRecommendations.add(unwantedRecommendation));
            };

            updateRecommendationsForScope('defaultValue'); // In case there are application-default recommendations.
            const roots = await this.workspaceService.roots;
            for (const root of roots) {
                updateRecommendationsForScope('workspaceFolderValue', root.resource);
            }
            if (this.workspaceService.saved) {
                updateRecommendationsForScope('workspaceValue');
            }
            const recommendedSorted = new Set(Array.from(allRecommendations).sort((a, b) => this.compareExtensions(a, b)));
            allUnwantedRecommendations.forEach(unwantedRecommendation => recommendedSorted.delete(unwantedRecommendation));
            this._recommended = recommendedSorted;
            return Promise.all(Array.from(recommendedSorted, plugin => this.refresh(plugin)));
        });
    }

    protected getRecommendationsForScope(scope: PreferenceInspectionScope, root?: URI): Required<RecommendedExtensions> {
        const configuredValue = this.preferences.inspect<Required<RecommendedExtensions>>('extensions', root?.toString())?.[scope];
        return {
            recommendations: configuredValue?.recommendations ?? [],
            unwantedRecommendations: configuredValue?.unwantedRecommendations ?? [],
        };
    }

    protected compileReadme(readmeMarkdown: string): string {
        const readmeHtml = markdownit({ html: true }).render(readmeMarkdown);
        return DOMPurify.sanitize(readmeHtml);
    }

    protected async refresh(id: string, version?: string): Promise<VSXExtension | undefined> {
        try {
            let extension = this.getExtension(id);
            if (!this.shouldRefresh(extension)) {
                return extension;
            }
            const filter = await this.vsxApiFilter();
            const targetPlatform = await this.applicationServer.getApplicationPlatform() as VSXTargetPlatform;
            let data: VSXExtensionRaw | undefined;
            if (version === undefined) {
                data = await filter.findLatestCompatibleExtension({
                    extensionId: id,
                    includeAllVersions: true,
                    targetPlatform
                });
            } else {
                data = await filter.findLatestCompatibleExtension({
                    extensionId: id,
                    extensionVersion: version,
                    includeAllVersions: true,
                    targetPlatform
                });
            }
            if (!data) {
                return;
            }
            if (data.error) {
                return this.onDidFailRefresh(id, data.error);
            }
            if (!data.verified) {
                if (data.publishedBy.loginName === 'open-vsx') {
                    data.verified = true;
                }
            }
            extension = this.setExtension(id);
            extension.update(Object.assign(data, {
                publisher: data.namespace,
                downloadUrl: data.files.download,
                iconUrl: data.files.icon,
                readmeUrl: data.files.readme,
                licenseUrl: data.files.license,
                version: data.version,
                verified: data.verified
            }));
            return extension;
        } catch (e) {
            return this.onDidFailRefresh(id, e);
        }
    }

    /**
     * Determines if the given extension should be refreshed.
     * @param extension the extension to refresh.
     */
    protected shouldRefresh(extension?: VSXExtension): boolean {
        if (extension === undefined) {
            return true;
        }
        return !extension.builtin;
    }

    protected onDidFailRefresh(id: string, error: unknown): VSXExtension | undefined {
        const cached = this.getExtension(id);
        if (cached && cached.installed) {
            return cached;
        }
        console.error(`[${id}]: failed to refresh, reason:`, error);
        return undefined;
    }

    /**
     * Compare two extensions based on their display name, and publisher if applicable.
     * @param a the first extension id for comparison.
     * @param b the second extension id for comparison.
     */
    protected compareExtensions(a: string, b: string): number {
        const extensionA = this.getExtension(a);
        const extensionB = this.getExtension(b);
        if (!extensionA || !extensionB) {
            return 0;
        }
        if (extensionA.displayName && extensionB.displayName) {
            return extensionA.displayName.localeCompare(extensionB.displayName);
        }
        if (extensionA.publisher && extensionB.publisher) {
            return extensionA.publisher.localeCompare(extensionB.publisher);
        }
        return 0;
    }

    /**
     * 初始化授权状态 - 按新架构实现
     * 使用 AuthorizationClient.getAll() 批量拉取授权并填充 extension.authorized 字段
     */
    protected async initAuthorization(): Promise<void> {
        try {
            // 批量拉取所有授权状态
            const allAuthorizations = await this.iAuthorizationService.getAllAuthorizationStatuses();

            // 填充每个 extension 的 authorized 字段
            for (const pluginId of Object.keys(allAuthorizations)) {
                const extension = this.getExtension(pluginId);
                if (extension) {
                    await extension.updateAuthorizationStatus();
                }
            }

            console.log(`[VSX-MODEL] 初始化 ${Object.keys(allAuthorizations).length} 个插件的授权状态`);
        } catch (error) {
            console.error('[VSX-MODEL] 初始化授权状态失败', error);
        }
    }

    /**
     * 处理授权状态变化 - 新架构实现
     * 按 pluginId 更新 extension.authorized 并触发单条刷新
     */
    protected async handleAuthorizationChange(event: IAuthorizationStatusChangeEvent): Promise<void> {
        console.log(`[VSX-MODEL] 授权状态变化: ${event.pluginId} -> ${event.previousStatus == AuthorizationStatus.GRANTED ? 'authorized' : 'denied'}`);

        const extension = this.getExtension(event.pluginId);
        if (extension) {
            // 更新扩展的授权状态
            await extension.updateAuthorizationStatus();

            // 触发视图刷新
            this.onDidChangeEmitter.fire();
            console.log(`[VSX-MODEL] 插件 ${event.pluginId} 授权状态更新完成，UI已刷新`);
        } else {
            console.log(`[VSX-MODEL] 插件 ${event.pluginId} 不在当前扩展列表中`);
        }
    }

    /**
     * 提供给 VSXExtension 的更新触发方法
     */
    triggerUpdate(extension: VSXExtension): void {
        console.log(`[VSX-MODEL] 触发扩展 ${extension.id} 的UI更新`);
        this.onDidChangeEmitter.fire();
    }

}

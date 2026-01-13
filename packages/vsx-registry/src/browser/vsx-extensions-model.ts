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
import * as semver from 'semver';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { CancellationToken, CancellationTokenSource } from '@theia/core/lib/common/cancellation';
import { HostedPluginSupport } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin';
import { VSXExtension, VSXExtensionFactory } from './vsx-extension';
import { ProgressService } from '@theia/core/lib/common/progress-service';
import { VSXExtensionsSearchModel, VSXSearchMode } from './vsx-extensions-search-model';
import { PreferenceInspectionScope, PreferenceService } from '@theia/core/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { RecommendedExtensions } from './recommended-extensions/recommended-extensions-preference-contribution';
import URI from '@theia/core/lib/common/uri';
import { OVSXClient, VSXAllVersions, VSXExtensionRaw, VSXResponseError, VSXSearchEntry, VSXSearchOptions, VSXTargetPlatform } from '@theia/ovsx-client/lib/ovsx-types';
import { OVSXClientProvider } from '../common/ovsx-client-provider';
import { RequestContext, RequestService } from '@theia/core/shared/@theia/request';
import { OVSXApiFilterProvider } from '@theia/ovsx-client';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import { VSXRecommendedApiService } from '../common/vsx-recommended-api';

@injectable()
export class VSXExtensionsModel {

    protected initialized: Promise<void>;
    /**
     * Single source for all extensions
     */
    protected readonly extensions = new Map<string, VSXExtension>();
    protected readonly onDidChangeEmitter = new Emitter<void>();
    protected _installed = new Set<string>();
    protected _recommended = new Set<string>();
    protected _searchResult = new Set<string>();
    protected _searchError?: string;

    protected searchCancellationTokenSource = new CancellationTokenSource();
    protected updateSearchResult = debounce(async () => {
        const { token } = this.resetSearchCancellationTokenSource();
        // Convert special queries to actual API query options
        const searchOptions = this.convertToApiQuery(this.search.query);
        if (searchOptions) {
            await this.doUpdateSearchResult(searchOptions, token);
        }
    }, 500);

    @inject(OVSXClientProvider)
    protected clientProvider: OVSXClientProvider;

    @inject(HostedPluginSupport)
    protected readonly pluginSupport: HostedPluginSupport;

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

    @inject(ApplicationServer)
    protected readonly applicationServer: ApplicationServer;

    @inject(VSXRecommendedApiService)
    protected readonly recommendedApiService: VSXRecommendedApiService;

    @postConstruct()
    protected init(): void {
        this.initialized = this.doInit().catch(console.error);
    }

    protected async doInit(): Promise<void> {
        // 优先初始化已安装的插件，避免与在线商店数据冲突
        await this.initInstalled();

        // 然后并行初始化搜索结果和推荐列表
        await Promise.all([
            this.initSearchResult(),
            this.initRecommended(),
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

    protected setExtension(id: string): VSXExtension {
        let extension = this.extensions.get(id);
        if (!extension) {
            extension = this.extensionFactory({ id });
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

    /**
     * Returns a default search query to show popular extensions when no specific search is performed.
     * An empty string query to Open VSX API will return the most popular/downloaded extensions.
     */
    protected getDefaultSearchQuery(): string {
        // Empty string query returns popular extensions from Open VSX
        return '';
    }

    /**
     * Converts special client-side queries (like @popular, @builtin, etc.) to actual API query options.
     * Special queries that represent local data (@builtin, @installed, @recommended) should not
     * trigger API calls, so they return undefined.
     *
     * @param query The user's search query
     * @returns VSXSearchOptions to send to the API, or undefined if no API call should be made
     */
    protected convertToApiQuery(query: string): VSXSearchOptions | undefined {
        const mode = this.search.getModeForQuery();

        switch (mode) {
            case VSXSearchMode.Builtin:
            case VSXSearchMode.Installed:
            case VSXSearchMode.Recommended:
                // These modes use local data, don't query the API
                return undefined;

            case VSXSearchMode.Popular:
                // For popular extensions, query with download count sorting
                return {
                    query: '',
                    sortBy: 'downloadCount',
                    sortOrder: 'desc',
                    size: 50,  // Get top 50 popular extensions
                    includeAllVersions: true
                };

            case VSXSearchMode.Search:
                // Normal search, use the query as-is with relevance sorting
                return {
                    query,
                    sortBy: 'relevance',
                    includeAllVersions: true
                };

            case VSXSearchMode.None:
            case VSXSearchMode.Initial:
                // Default state: show popular extensions
                return {
                    query: '',
                    sortBy: 'downloadCount',
                    sortOrder: 'desc',
                    size: 50,
                    includeAllVersions: true
                };

            default:
                return {
                    query,
                    includeAllVersions: true
                };
        }
    }

    protected doUpdateSearchResult(param: VSXSearchOptions, token: CancellationToken): Promise<void> {
        return this.doChange(async () => {
            this._searchResult = new Set<string>();
            // Now we allow empty query to show popular extensions by default
            // Only skip if query is explicitly undefined (initial state)
            if (param.query === undefined) {
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
        const prevInstalled = this._installed;
        return this.doChange(async () => {
            const plugins = this.pluginSupport.plugins;
            const currInstalled = new Set<string>();
            const refreshing = [];
            for (const plugin of plugins) {
                if (plugin.model.engine.type === 'vscode') {
                    const version = plugin.model.version;
                    const id = plugin.model.id;
                    this._installed.delete(id);
                    const extension = this.setExtension(id);
                    currInstalled.add(extension.id);
                    refreshing.push(this.refresh(id, version));
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
            this.checkForUpdates().then(() => this.onDidChangeEmitter.fire());
        });
    }

    protected async checkForUpdates(): Promise<void> {
        const checkUpdates: Promise<void>[] = [];
        for (const id of this._installed) {
            const extension = this.getExtension(id);
            if (extension && !extension.builtin) {
                checkUpdates.push(this.refreshLatestVersion(id));
            }
        }
        await Promise.all(checkUpdates);
    }

    protected async refreshLatestVersion(id: string): Promise<void> {
        try {
            const filter = await this.vsxApiFilter();
            const targetPlatform = await this.applicationServer.getApplicationPlatform() as VSXTargetPlatform;

            const data = await filter.findLatestCompatibleExtension({
                extensionId: id,
                includeAllVersions: true,
                targetPlatform
            });

            if (data && data.version) {
                const extension = this.getExtension(id);
                if (extension) {
                    extension.update({ latestVersion: data.version });
                }
            }
        } catch (e) {
            console.error(`Failed to check for updates for ${id}`, e);
        }
    }

    protected updateRecommended(): Promise<Array<VSXExtension | undefined>> {
        return this.doChange<Array<VSXExtension | undefined>>(async () => {
            const allRecommendations = new Set<string>();
            const allUnwantedRecommendations = new Set<string>();

            // 1. 从配置文件中获取推荐列表（保留原有逻辑）
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

            // 2. 从接口动态获取推荐列表（新增逻辑）
            try {
                const apiRecommendations = await this.recommendedApiService.fetchRecommendedExtensions();
                if (apiRecommendations) {
                    apiRecommendations.recommendations.forEach(recommendation => allRecommendations.add(recommendation));
                    apiRecommendations.unwantedRecommendations?.forEach(unwantedRecommendation => allUnwantedRecommendations.add(unwantedRecommendation));
                }
            } catch (error) {
                console.error('[VSXExtensionsModel] 从接口获取推荐插件失败:', error);
                // 即使接口失败，也继续使用配置文件中的推荐列表
            }

            // 3. 合并、排序并应用
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

}

/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-06-17 13:23:43
 * @FilePath: /workdir/packages/plugin-registry/src/common/ovsx-http-client.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 */
// *****************************************************************************
// Copyright (C) 2023 Ericsson and others.
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

import { OVSX_RATE_LIMIT, VSXSearchEntry } from '@theia/ovsx-client';
import { OVSXClient, VSXExtensionRaw, VSXQueryOptions, VSXQueryResult, VSXSearchOptions, VSXSearchResult } from './ovsx-types';
import { RequestContext, RequestService } from '@theia/request';
import { RateLimiter } from 'limiter';
import { DEFAULT_PLUGINS_STORE_URL, DOWNLOAD, QUERY_BY_ID, QUERY_BY_TAG, SEARCH } from './bsx-environment';
import { bnls } from '@baosky/platform/lib/common/bnls';
export class OVSXHttpClient implements OVSXClient {

    /**
     * @param requestService
     * @returns factory that will cache clients based on the requested input URL.
     */
    static createClientFactory(requestService: RequestService, rateLimiter?: RateLimiter): (url: string) => OVSXClient {
        // eslint-disable-next-line no-null/no-null
        const cachedClients: Record<string, OVSXClient> = Object.create(null);
        return url => cachedClients[url] ??= new this(url, requestService, rateLimiter);
    }

    constructor(
        protected vsxRegistryUrl: string,
        protected requestService: RequestService,
        protected rateLimiter = new RateLimiter({ tokensPerInterval: OVSX_RATE_LIMIT, interval: 'second' })
    ) { }

    async search(searchOptions?: VSXSearchOptions): Promise<VSXSearchResult> {
        if (searchOptions && searchOptions.id) {
            const result: any = await this.requestJson(this.buildUrl(QUERY_BY_ID, { pluginId: searchOptions.id }));
            return this.parseResult({
                rows: result.data || []
            });
        }
        const result: any = await this.requestJson(this.buildUrl(SEARCH, searchOptions));
        return this.parseResult({
            rows: result.data || []
        });
    }

    public async queryPlguinStoreList(pluginStoreUrl: string, range?: [number, number]): Promise<VSXSearchResult> {
        //TODO:未来等待其api支持传递参数 支持只获取部分数据 现阶段先获取全部
        const request: any = await this.requestJson(`http://${pluginStoreUrl.replace("http://", "")}`);
        return this.parseResult(request);
    }

    // Parses the result from the OVSX API into a VSXSearchResult format.
    parseResult(result: any) {
        const res: VSXSearchResult = {
            offset: 0,
            extensions: result.rows.map((row) => {
                for (let prop in row) {
                    if (typeof row[prop] === "string") {
                        try {
                            const newValue = JSON.parse(row[prop]);
                            row[prop] = newValue;
                        } catch (e) {
                            continue
                        }
                    }
                }

                const item: VSXSearchEntry = {
                    url: row.allVersions ? Array.isArray(row.allVersions) ? row.allVersions[0].fileUrl : row.allVersions : "",
                    files: {
                        download: row.allVersions ? Array.isArray(row.allVersions) ? `${DEFAULT_PLUGINS_STORE_URL}${DOWNLOAD}${row.allVersions[0].bsxRelativePath}` : row.allVersions : '',
                        manifest: undefined,
                        readme: undefined,
                        license: undefined,
                        icon: undefined
                    },
                    name: row.name,
                    namespace: row.namespace ?? '',
                    version: row.latestVersion,
                    timestamp: "",
                    downloadCount: 0
                }
                return item
            })
        }
        return res;
    }

    toVSXSearchEntry() {

    }

    //
    async query(queryOptions?: VSXQueryOptions): Promise<VSXQueryResult> {
        const result: any = await this.requestJson(this.buildUrl(QUERY_BY_ID, queryOptions));
        if (!result.data || !Array.isArray(result.data) || result.data.length == 0) {
            throw new Error(bnls.localizeByDefault('可能网络异常，天行在线商店返回内容为空。'));
        }
        return this.parseQueryResult({
            rows: result.data
        });
    }

    // Parses the result from the OVSX API into a VSXSearchResult format.
    parseQueryResult(result: any): VSXQueryResult {
        const res: VSXQueryResult = {
            offset: result.offset || 0,
            totalSize: result.totalSize || result.extensions?.length || 0,
            extensions: (('extensions' in result && result.extensions) || result.rows || []).map((row: any) => {
                // 尝试解析所有字符串类型的JSON字段
                for (const prop in row) {
                    if (typeof row[prop] === 'string') {
                        try {
                            row[prop] = JSON.parse(row[prop]);
                        } catch (e) {
                            // 解析失败保持原值
                        }
                    }
                }

                const extension: VSXExtensionRaw = {
                    namespaceUrl: row.namespaceUrl || '',
                    reviewsUrl: row.reviewsUrl || '',
                    name: row.name || '',
                    namespace: row.authorNick ?? '',
                    targetPlatform: row.targetPlatform,
                    publishedBy: row.publishedBy || {
                        loginName: '',
                        fullName: '',
                        avatarUrl: '',
                        homepageUrl: ''
                    },
                    preRelease: !!row.preRelease,
                    namespaceAccess: row.namespaceAccess || 'public',
                    files: {
                        download: `${DEFAULT_PLUGINS_STORE_URL}${DOWNLOAD}${row.files.download}`,
                        readme: `${DEFAULT_PLUGINS_STORE_URL}${DOWNLOAD}${row.files.readme}`,
                        license: `${DEFAULT_PLUGINS_STORE_URL}${DOWNLOAD}${row.files.license}`,
                        icon: `${DEFAULT_PLUGINS_STORE_URL}${DOWNLOAD}${row.files.icon}`
                    },
                    allVersions: row.allVersions || {},
                    allVersionsUrl: row.allVersionsUrl,
                    averageRating: row.averageRating,
                    downloadCount: row.downloadCount || 0,
                    reviewCount: row.reviewCount || 0,
                    version: row.version || row.latestVersion || '',
                    timestamp: row.timestamp || '',
                    preview: !!row.preview,
                    verified: !!row.verified,
                    displayName: row.displayName,
                    namespaceDisplayName: row.namespaceDisplayName || row.namespace || '',
                    description: row.description,
                    categories: row.categories || [],
                    extensionKind: row.extensionKind || [],
                    tags: row.tags || [],
                    license: row.license,
                    homepage: row.homepage,
                    repository: row.repository,
                    sponsorLink: row.sponsorLink,
                    bugs: row.bugs,
                    markdown: row.markdown,
                    galleryColor: row.galleryColor,
                    galleryTheme: row.galleryTheme,
                    localizedLanguages: row.localizedLanguages || [],
                    qna: row.qna,
                    badges: row.badges || [],
                    dependencies: row.dependencies || [],
                    bundledExtensions: row.bundledExtensions || [],
                    allTargetPlatformVersions: row.allTargetPlatformVersions || [],
                    url: row.url || '',
                    engines: row.engines || {}
                };

                // 处理可能的错误字段
                if (row.error) {
                    extension.error = row.error;
                }

                return extension;
            })
        };

        // 处理可能的成功/警告/错误信息
        if (result.success) res.success = result.success;
        if (result.warning) res.warning = result.warning;
        if (result.error) res.error = result.error;

        return res;
    }

    protected async requestJson<R>(url: string): Promise<R> {
        const attempts = 5;
        for (let i = 0; i < attempts; i++) {
            // Use 1, 2, 4, 8, 16 tokens for each attempt
            const tokenCount = Math.pow(2, i);
            await this.rateLimiter.removeTokens(tokenCount);
            const context = await this.requestService.request({
                url,
                headers: { 'Accept': 'application/json' }
            });
            if (context.res.statusCode === 429) {
                console.warn('OVSX rate limit exceeded. Consider reducing the rate limit.');
                // If there are still more attempts left, retry the request with a higher token count
                if (i < attempts - 1) {
                    continue;
                }
            }
            return RequestContext.asJson<R>(context);
        }
        throw new Error('Failed to fetch data from OVSX.');
    }

    protected buildUrl(url: string, query?: object): string {
        return new URL(`${url}${this.buildQueryString(query)}`, this.vsxRegistryUrl).toString();
    }

    protected buildQueryString(searchQuery?: object): string {
        if (!searchQuery) {
            return '';
        }
        let queryString = '';
        for (const [key, value] of Object.entries(searchQuery)) {
            if (typeof value === 'string') {
                queryString += `&${key}=${encodeURIComponent(value)}`;
            } else if (typeof value === 'boolean' || typeof value === 'number') {
                queryString += `&${key}=${value}`;
            }
        }
        return queryString && '?' + queryString.slice(1);
    }
}

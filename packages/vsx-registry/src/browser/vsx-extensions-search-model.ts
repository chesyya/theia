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

import { injectable } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';

export enum VSXSearchMode {
    Initial,
    None,
    Search,
    Installed,
    Builtin,
    Recommended,
}

export const BUILTIN_QUERY = '@builtin';
export const INSTALLED_QUERY = '@installed';
export const RECOMMENDED_QUERY = '@recommended';

@injectable()
export class VSXExtensionsSearchModel {

    protected readonly onDidChangeQueryEmitter = new Emitter<string>();
    readonly onDidChangeQuery = this.onDidChangeQueryEmitter.event;
    protected readonly specialQueries = new Map<string, VSXSearchMode>([
        [BUILTIN_QUERY, VSXSearchMode.Builtin],
        [INSTALLED_QUERY, VSXSearchMode.Installed],
        [RECOMMENDED_QUERY, VSXSearchMode.Recommended],
    ]);

    protected _query = '';
    set query(query: string) {
        if (this._query === query) {
            return;
        }
        this._query = query;
        this.onDidChangeQueryEmitter.fire(this._query);
    }
    get query(): string {
        return this._query;
    }

    getModeForQuery(): VSXSearchMode {
        return this.query
            ? this.specialQueries.get(this.query) ?? VSXSearchMode.Search
            : VSXSearchMode.None;
    }

    /**
     * 解析搜索字符串，返回结构化过滤对象。
     * @param input 搜索框输入
     */
    static parseQuery(input: string): {
        id?: string;
        status?: string[];
        category?: string;
        tag?: string[];
        sort?: string;
        raw?: string;
    } {
        const result: {
            id?: string;
            status?: string[];
            category?: string;
            tag?: string[];
            sort?: string;
            raw?: string;
        } = {};
        result.raw = input;
        const statusFilters = ['installed', 'disabled', 'builtin', 'recommended', 'popular'];
        const sortFilters = ['installs', 'rating', 'name', 'downloadCount', 'updateDate', 'relevance'];
        // 正则提取 @id:xxx
        const idMatch = input.match(/@id:([\w\-.]+)/);
        if (idMatch) {
            result.id = idMatch[1];
            return result; // id 优先，直接返回
        }
        // 提取所有 @xxx 或 tag:xxx 过滤器
        // 支持引号包裹多词分类
        const regex = /(@\w+)(:(("[^"]+")|([^\s]+)))?|tag:(("[^"]+")|([^\s]+))/g;
        let match;
        while ((match = regex.exec(input)) !== null) {
            if (match[1]) {
                const key = match[1].replace('@', '');
                let value = match[3] || '';
                value = value.replace(/^"|"$/g, '');
                if (statusFilters.includes(key)) {
                    result.status = result.status || [];
                    if (!result.status.includes(key)) result.status.push(key);
                } else if (key === 'category') {
                    result.category = value;
                } else if (key === 'sort') {
                    if (sortFilters.includes(value)) {
                        result.sort = value;
                    }
                }
            } else if (match[6]) {
                let tagValue = match[6] || match[7] || '';
                tagValue = tagValue.replace(/^"|"$/g, '');
                result.tag = result.tag || [];
                if (!result.tag.includes(tagValue)) result.tag.push(tagValue);
            }
        }
        return result;
    }
}

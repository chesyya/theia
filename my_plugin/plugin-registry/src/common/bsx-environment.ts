/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-06-12 17:07:48
 * @FilePath: /workdir/packages/plugin-registry/src/common/bsx-environment.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 */
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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

import type { OVSXRouterConfig } from '@theia/ovsx-client';

export const BSX_ENVIRONMENT_PATH = '/services/vsx-environment';

//仓库地址
export const DEFAULT_PLUGINS_STORE_URL = "http://10.25.111.169:8083";
//通过参数查询
export const QUERY_BY_TAG = "/plugin/selectList";
//通过id查询
export const QUERY_BY_ID = "/plugin/query";
//通过search查询
export const SEARCH = "/plugin/search"
//下载
export const DOWNLOAD = "/plugin/download?relativePath="

export const OVSX_RATE_LIMIT = 15;

export const BSXEnvironment = Symbol('BSXEnvironment');
export interface BSXEnvironment {
    getRateLimit(): Promise<number>;
    getRegistryUri(): Promise<string>;
    getRegistryApiUri(): Promise<string>;
    getVscodeApiVersion(): Promise<string>;
    getOvsxRouterConfig?(): Promise<OVSXRouterConfig | undefined>;

    /**
     * @description 获取插件商店的url
     */
    getPluginStoreUrl(): Promise<string>;
}

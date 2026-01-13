// *****************************************************************************
// Copyright (C) 2024 and others.
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

/**
 * 推荐插件接口响应数据结构
 */
export interface VSXRecommendedExtensionsResponse {
    recommendations: string[];
    unwantedRecommendations?: string[];
}

/**
 * 推荐插件 API 服务
 */
export const VSXRecommendedApiService = Symbol('VSXRecommendedApiService');
export interface VSXRecommendedApiService {
    /**
     * 从接口获取推荐插件列表
     * @returns 推荐插件 ID 列表和不推荐的插件列表
     */
    fetchRecommendedExtensions(): Promise<VSXRecommendedExtensionsResponse>;

    /**
     * 配置推荐插件接口的 URL
     * 可以通过 preferences 或环境变量配置
     */
    getApiUrl(): Promise<string | undefined>;
}

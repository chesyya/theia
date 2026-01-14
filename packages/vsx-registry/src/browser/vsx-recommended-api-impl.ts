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

import { injectable, inject } from '@theia/core/shared/inversify';
import { PreferenceService } from '@theia/core/lib/browser';
import { RequestService, RequestContext } from '@theia/core/shared/@theia/request';
import { VSXRecommendedApiService, VSXRecommendedExtensionsResponse } from '../common/vsx-recommended-api';

/**
 * 推荐插件 API 服务的浏览器端实现
 */
@injectable()
export class VSXRecommendedApiServiceImpl implements VSXRecommendedApiService {

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(RequestService)
    protected readonly requestService: RequestService;

    async getApiUrl(): Promise<string | undefined> {
        // 从 preferences 中读取推荐插件接口 URL
        // 你可以在 vsx-extensions-preferences.ts 中添加这个配置项
        const apiUrl = this.preferenceService.get<string>('extensions.recommendedApiUrl');

        // 如果没有配置，可以返回默认值或 undefined
        return apiUrl;
    }

    async fetchRecommendedExtensions(): Promise<VSXRecommendedExtensionsResponse> {
        try {
            const apiUrl = await this.getApiUrl();

            if (!apiUrl) {
                console.warn('[VSXRecommendedApi] 推荐插件接口 URL 未配置，返回空列表');
                return { recommendations: [] };
            }

            console.log(`[VSXRecommendedApi] 从接口获取推荐插件列表: ${apiUrl}`);

            const response = await this.requestService.request({
                url: apiUrl,
                type: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.res.statusCode !== 200) {
                throw new Error(`接口返回错误状态码: ${response.res.statusCode}`);
            }

            const data = RequestContext.asJson<VSXRecommendedExtensionsResponse>(response);

            // 验证返回数据格式
            if (!data || !Array.isArray(data.recommendations)) {
                throw new Error('接口返回数据格式错误，缺少 recommendations 字段');
            }

            console.log(`[VSXRecommendedApi] 成功获取 ${data.recommendations.length} 个推荐插件`);
            return {
                recommendations: data.recommendations,
                unwantedRecommendations: data.unwantedRecommendations || []
            };

        } catch (error) {
            console.error('[VSXRecommendedApi] 获取推荐插件列表失败:', error);
            // 发生错误时返回空列表，不影响其他功能
            return { recommendations: [] };
        }
    }
}

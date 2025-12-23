/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-06-12 17:07:48
 * @FilePath: /workdir/packages/plugin-registry/src/common/bsx-registry-common-module.ts
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

import { ContainerModule } from '@theia/core/shared/inversify';
import { RequestService } from '@theia/core/shared/@theia/request';
import { BSXEnvironment } from './bsx-environment';
import { RateLimiter } from 'limiter';
import { OVSXClientProvider, OVSXUrlResolver } from './ovsx-client-provider';
import { OVSXHttpClient } from './ovsx-http-client';
import { OVSXApiFilter, OVSXApiFilterImpl, OVSXApiFilterProvider } from './ovsx-api-filter';
import { ExtensionIdMatchesFilterFactory, OVSXClient, OVSXRouterClient, RequestContainsFilterFactory } from '@theia/ovsx-client';

export default new ContainerModule(bind => {
    bind(OVSXUrlResolver)
        .toFunction((url: string) => url);
    bind(OVSXClientProvider)
        .toDynamicValue(ctx => {
            const bsxEnvironment = ctx.container.get<BSXEnvironment>(BSXEnvironment);
            const requestService = ctx.container.get<RequestService>(RequestService);
            const urlResolver = ctx.container.get<OVSXUrlResolver>(OVSXUrlResolver);
            const clientPromise = Promise
                .all([
                    bsxEnvironment.getRegistryUri(),
                    bsxEnvironment.getOvsxRouterConfig?.(),
                    bsxEnvironment.getRateLimit()
                ])
                .then<OVSXClient>(async ([apiUrl, ovsxRouterConfig, rateLimit]) => {
                    const rateLimiter = new RateLimiter({
                        interval: 'second',
                        tokensPerInterval: rateLimit
                    });
                    if (ovsxRouterConfig) {
                        const clientFactory = OVSXHttpClient.createClientFactory(requestService, rateLimiter);
                        return OVSXRouterClient.FromConfig(
                            ovsxRouterConfig,
                            async url => clientFactory(await urlResolver(url)),
                            [RequestContainsFilterFactory, ExtensionIdMatchesFilterFactory]
                        );
                    }
                    return new OVSXHttpClient(
                        await urlResolver(apiUrl),
                        requestService,
                        rateLimiter
                    );
                });
            // reuse the promise for subsequent calls to this provider
            return () => clientPromise;
        })
        .inSingletonScope();
    bind(OVSXApiFilter)
        .toDynamicValue(ctx => {
            const bsxEnvironment = ctx.container.get<BSXEnvironment>(BSXEnvironment);
            const apiFilter = new OVSXApiFilterImpl(undefined!, '-- temporary invalid version value --');
            bsxEnvironment.getVscodeApiVersion()
                .then(apiVersion => apiFilter.supportedApiVersion = apiVersion);
            const clientProvider = ctx.container.get<OVSXClientProvider>(OVSXClientProvider);
            Promise.resolve(clientProvider()).then(client => {
                apiFilter.client = client;
            });
            return apiFilter;
        })
        .inSingletonScope();
    bind(OVSXApiFilterProvider)
        .toProvider(ctx => async () => {
            const bsxEnvironment = ctx.container.get<BSXEnvironment>(BSXEnvironment);
            const clientProvider = ctx.container.get<OVSXClientProvider>(OVSXClientProvider);
            const client = await clientProvider();
            const apiVersion = await bsxEnvironment.getVscodeApiVersion();
            const apiFilter = new OVSXApiFilterImpl(client, apiVersion);
            return apiFilter;
        });
});

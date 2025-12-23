/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-06-12 17:07:48
 * @FilePath: /workdir/packages/plugin-registry/src/node/bsx-environment-impl.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 */
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

import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { OVSXRouterConfig } from '@theia/ovsx-client';
import { PluginVsCodeCliContribution } from '@baosky/plugin-vscode/lib/node/plugin-vscode-cli-contribution';
import { BSXEnvironment, DEFAULT_PLUGINS_STORE_URL, OVSX_RATE_LIMIT } from '../common/bsx-environment';
import { BsxCli } from './bsx-cli';
import { RateLimiter } from 'limiter';
import { RequestService } from '@theia/core/shared/@theia/request';

@injectable()
export class BSXEnvironmentImpl implements BSXEnvironment {

    //static VSX_REGISTRY_URL = 'http://10.25.25.169:8083'  || 'https://open-vsx.org';
    protected _registryUri = new URI(DEFAULT_PLUGINS_STORE_URL);

    @inject(PluginVsCodeCliContribution)
    protected readonly pluginVscodeCli: PluginVsCodeCliContribution;

    @inject(BsxCli)
    protected bsxCli: BsxCli;

    @inject(RequestService)
    protected requestService: RequestService;


    protected rateLimiter: RateLimiter = new RateLimiter({ tokensPerInterval: OVSX_RATE_LIMIT, interval: 'second' })

    async getRateLimit(): Promise<number> {
        return this.bsxCli.ovsxRateLimit;
    }

    async getRegistryUri(): Promise<string> {
        return this._registryUri.toString(true);
    }

    async getRegistryApiUri(): Promise<string> {
        return this._registryUri.resolve('plugin').toString(true);
    }

    async getVscodeApiVersion(): Promise<string> {
        return this.pluginVscodeCli.vsCodeApiVersionPromise;
    }

    async getOvsxRouterConfig(): Promise<OVSXRouterConfig | undefined> {
        return this.bsxCli.ovsxRouterConfig;
    }

    public async getPluginStoreUrl(): Promise<string> {
        return process.env["PLUGINS_STORE_URL"] ?? DEFAULT_PLUGINS_STORE_URL;
    }

}

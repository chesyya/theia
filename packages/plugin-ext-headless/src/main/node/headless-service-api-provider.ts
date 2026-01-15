// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * Headless Service API Provider
 *
 * This provider registers the Headless Service API with the plugin system.
 * It tells the plugin host where to find the API initialization script.
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import { ExtPluginApiProvider, ExtPluginApi, MainPluginApiProvider } from '@theia/plugin-ext';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { HeadlessServiceMainImpl } from './headless-service-main-impl';
import { HEADLESS_SERVICE_PLUGIN_RPC_CONTEXT } from '../../common/headless-service-api-rpc';

/**
 * Provides the Headless Service API extension to the plugin system.
 */
@injectable()
export class HeadlessServiceExtPluginApiProvider implements ExtPluginApiProvider {

    provideApi(): ExtPluginApi {
        // Use dynamic require to prevent webpack from resolving at compile time
        // This ensures the path is resolved at runtime to an absolute path
        const modulePath = '@theia/plugin-ext-headless/lib/plugin/headless-service-init';
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const resolvedPath = require('module').createRequire(__filename).resolve(modulePath);
        return {
            // Path to the initialization script that will be loaded in the headless plugin host
            // This script exports the containerModule that sets up the API
            headlessInitPath: resolvedPath
        };
    }
}

/**
 * Provides the main-side implementation of the Headless Service API.
 * This is called when the RPC connection is established with the plugin host.
 */
@injectable()
export class HeadlessServiceMainPluginApiProvider implements MainPluginApiProvider {

    @inject(HeadlessServiceMainImpl)
    protected readonly headlessServiceMain: HeadlessServiceMainImpl;

    initialize(rpc: RPCProtocol): void {
        // Initialize the main implementation with RPC
        this.headlessServiceMain.initialize(rpc);

        // Register the main implementation so plugin host can call it
        rpc.set(HEADLESS_SERVICE_PLUGIN_RPC_CONTEXT.HEADLESS_SERVICE_MAIN, this.headlessServiceMain);
    }
}

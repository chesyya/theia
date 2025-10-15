// *****************************************************************************
// Copyright (C) 2025 and others.
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

import { RPCProtocol } from '../common/rpc-protocol';
import { PLUGIN_RPC_CONTEXT, PluginRegistryMain, PluginRegistryExt, VersionInfo } from '../common/plugin-api-rpc';
import { Emitter, Event } from '@theia/core/lib/common/event';

export class PluginRegistryExtImpl implements PluginRegistryExt {

    protected rpc: RPCProtocol;
    protected proxy: PluginRegistryMain;

    private readonly onDidFocusPluginEmitter = new Emitter<string>();
    readonly onDidFocusPlugin: Event<string> = this.onDidFocusPluginEmitter.event;

    constructor(rpc: RPCProtocol) {
        this.rpc = rpc;
        this.proxy = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.PLUGIN_REGISTRY_MAIN);
    }

    $focusPlugin(pluginId: string): void {
        this.onDidFocusPluginEmitter.fire(pluginId);
    }

    checkUpdates(pluginId: string): Promise<VersionInfo> {
        return this.proxy.$checkUpdates(pluginId);
    }

    openReadme(pluginId: string): Promise<void> {
        return this.proxy.$openReadme(pluginId);
    }
}

// *****************************************************************************
// Copyright (C) 2024 Eclipse Theia contributors.
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
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';

export interface PluginDocumentationInfo {
    pluginId: string;
    pluginName: string;
    docPath: string;
    mainMdName: string; // 主文档名（无扩展名）
    baseUrl: string; // 现在为 /usermanual/{pluginId}/{mainMdName}
    navigationPaths: string[];
    title: string;
}

export const PluginDocumentationService = Symbol('PluginDocumentationService');
export interface PluginDocumentationService {
    getPluginDocumentation(pluginId: string): Promise<PluginDocumentationInfo | undefined>;
    getAllPluginDocumentation(): Promise<PluginDocumentationInfo[]>;
}

export const pluginDocumentationServicePath = '/services/plugin-documentation';

@injectable()
export class PluginDocumentationFrontendService implements PluginDocumentationService {
    protected proxy: PluginDocumentationService | undefined;

    @inject(WebSocketConnectionProvider)
    protected readonly connectionProvider: WebSocketConnectionProvider;

    async getPluginDocumentation(pluginId: string): Promise<PluginDocumentationInfo | undefined> {
        if (!this.proxy) {
            this.proxy = this.connectionProvider.createProxy<PluginDocumentationService>(pluginDocumentationServicePath);
        }
        return this.proxy.getPluginDocumentation(pluginId);
    }

    async getAllPluginDocumentation(): Promise<PluginDocumentationInfo[]> {
        if (!this.proxy) {
            this.proxy = this.connectionProvider.createProxy<PluginDocumentationService>(pluginDocumentationServicePath);
        }
        return this.proxy.getAllPluginDocumentation();
    }
} 

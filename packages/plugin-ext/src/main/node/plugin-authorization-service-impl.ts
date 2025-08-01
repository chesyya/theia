// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
import { PluginAuthorizationProvider, Event, PluginAuthorizationChangeEvent } from '@theia/core';
import { PluginAuthorizationService } from '../../common/plugin-authorization-service';

/**
 * 插件授权服务实现
 * 作为core包PluginAuthorizationProvider的包装器
 */
@injectable()
export class PluginAuthorizationServiceImpl implements PluginAuthorizationService {

    @inject(PluginAuthorizationProvider)
    protected readonly authorizationProvider: PluginAuthorizationProvider;

    async isAuthorized(pluginId: string): Promise<boolean> {
        return this.authorizationProvider.isAuthorized(pluginId);
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        return this.authorizationProvider.getUnauthorizedPluginIds();
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        return this.authorizationProvider.getAuthorizedPluginIds();
    }

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.authorizationProvider.onAuthorizationChanged;
    }
}
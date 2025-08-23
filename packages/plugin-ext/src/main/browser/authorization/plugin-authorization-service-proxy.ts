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
import { Event } from '@theia/core/lib/common/event';
import { PluginAuthorizationProvider, PluginAuthorizationService, PluginAuthorizationChangeEvent, PluginIdentifier, AuthorizationStatus, IAuthorizationStatusChangeEvent } from '../../../common/services/authorization';

/**
 * 前端代理，将core包的PluginAuthorizationProvider包装为plugin-ext的PluginAuthorizationService
 */
@injectable()
export class PluginAuthorizationServiceProxy implements PluginAuthorizationService {

    @inject(PluginAuthorizationProvider)
    protected readonly authorizationProvider: PluginAuthorizationProvider;

    get onDidUpdateAuthorizationStatus(): Event<IAuthorizationStatusChangeEvent> {
        return this.authorizationProvider.onDidUpdateAuthorizationStatus;
    }

    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
        return this.authorizationProvider.getAuthorizationStatus(pluginId);
    }

    async grantAuthorization(pluginId: PluginIdentifier): Promise<void> {
        return this.authorizationProvider.grantAuthorization(pluginId);
    }

    async revokeAuthorization(pluginId: PluginIdentifier): Promise<void> {
        return this.authorizationProvider.revokeAuthorization(pluginId);
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        const authorized = await this.authorizationProvider.getAuthorizedPluginIds();
        const unauthorized = await this.authorizationProvider.getUnauthorizedPluginIds();
        
        const statuses = new Map<PluginIdentifier, AuthorizationStatus>();
        authorized.forEach(id => statuses.set(id, AuthorizationStatus.GRANTED));
        unauthorized.forEach(id => statuses.set(id, AuthorizationStatus.DENIED));
        
        return statuses;
    }

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

    async grantTestPluginAuthorization(): Promise<void> {
        // 通过类型断言调用后端方法
        const provider = this.authorizationProvider as any;
        if (provider.grantTestPluginAuthorization) {
            return provider.grantTestPluginAuthorization();
        }
    }

    async revokeTestPluginAuthorization(): Promise<void> {
        // 通过类型断言调用后端方法
        const provider = this.authorizationProvider as any;
        if (provider.revokeTestPluginAuthorization) {
            return provider.revokeTestPluginAuthorization();
        }
    }
}

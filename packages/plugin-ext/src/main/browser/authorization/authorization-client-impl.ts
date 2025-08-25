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

import { injectable } from '@theia/core/shared/inversify';
import { IAuthorizationClient, IAuthorizationStatusChangeEvent } from '../../../common/authorization/i-authorization-service';

/**
 * 独立的客户端实现类，用于接收后端RPC调用
 * 避免与AuthorizationFrontendProxy的循环依赖
 */
@injectable()
export class AuthorizationClientImpl implements IAuthorizationClient {
    
    private service: IAuthorizationClient | undefined;

    $onDidUpdateAuthorizationStatus(event: IAuthorizationStatusChangeEvent): void {
        if (this.service) {
            this.service.$onDidUpdateAuthorizationStatus(event);
        }
    }

    setService(service: IAuthorizationClient): void {
        this.service = service;
    }
}
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

import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';
import { CliContribution } from '@theia/core/lib/node';
import { ContainerModule } from '@theia/core/shared/inversify';
import { PluginDeployerParticipant, PluginDeployerResolver } from '@baosky/plugin-host/lib/common/plugin-protocol';
import { BSXEnvironment, BSX_ENVIRONMENT_PATH } from '../common/bsx-environment';
import { BsxCli } from './bsx-cli';
import { BSXEnvironmentImpl } from './bsx-environment-impl';
import { BSXExtensionResolver } from './bsx-extension-resolver';
import { BsxCliDeployerParticipant } from './bsx-cli-deployer-participant';

export default new ContainerModule(bind => {
    bind(BSXEnvironment).to(BSXEnvironmentImpl).inSingletonScope();
    bind(BsxCli).toSelf().inSingletonScope();
    bind(CliContribution).toService(BsxCli);
    bind(ConnectionHandler)
        .toDynamicValue(ctx => new JsonRpcConnectionHandler(BSX_ENVIRONMENT_PATH, () => ctx.container.get(BSXEnvironment)))
        .inSingletonScope();
    bind(BSXExtensionResolver).toSelf().inSingletonScope();
    bind(PluginDeployerResolver).toService(BSXExtensionResolver);
    bind(BsxCliDeployerParticipant).toSelf().inSingletonScope();
    bind(PluginDeployerParticipant).toService(BsxCliDeployerParticipant);
});

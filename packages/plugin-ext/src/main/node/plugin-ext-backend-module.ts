// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
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

import { interfaces } from '@theia/core/shared/inversify';
import { PluginApiContribution } from './plugin-service';
import { BackendApplicationContribution, CliContribution } from '@theia/core/lib/node';
import { WsRequestValidatorContribution } from '@theia/core/lib/node/ws-request-validators';
import { PluginsKeyValueStorage } from './plugins-key-value-storage';
import { PluginDeployerContribution } from './plugin-deployer-contribution';
import {
    PluginDeployer, PluginDeployerResolver, PluginDeployerFileHandler,
    PluginDeployerDirectoryHandler, PluginServer, pluginServerJsonRpcPath, PluginDeployerParticipant
} from '../../common/plugin-protocol';
import { PluginDeployerImpl } from './plugin-deployer-impl';
import { LocalDirectoryPluginDeployerResolver } from './resolvers/local-directory-plugin-deployer-resolver';
import { PluginTheiaFileHandler } from './handlers/plugin-theia-file-handler';
import { PluginTheiaDirectoryHandler } from './handlers/plugin-theia-directory-handler';
import { GithubPluginDeployerResolver } from './plugin-github-resolver';
import { HttpPluginDeployerResolver } from './plugin-http-resolver';
import { ConnectionHandler, RpcConnectionHandler, bindContributionProvider } from '@theia/core';
import { PluginPathsService, pluginPathsServicePath } from '../common/plugin-paths-protocol';
import { PluginPathsServiceImpl } from './paths/plugin-paths-service';
import { PluginServerImpl } from './plugin-server-impl';
import { PluginCliContribution } from './plugin-cli-contribution';
import { PluginTheiaEnvironment } from '../common/plugin-theia-environment';
import { PluginTheiaDeployerParticipant } from './plugin-theia-deployer-participant';
import { WebviewBackendSecurityWarnings } from './webview-backend-security-warnings';
import { PluginUninstallationManager } from './plugin-uninstallation-manager';
import { LocalizationServerImpl } from '@theia/core/lib/node/i18n/localization-server';
import { PluginLocalizationServer } from './plugin-localization-server';
import { PluginMgmtCliContribution } from './plugin-mgmt-cli-contribution';
import { PluginRemoteCliContribution } from './plugin-remote-cli-contribution';
import { RemoteCliContribution } from '@theia/core/lib/node/remote/remote-cli-contribution';
import { PluginRemoteCopyContribution } from './plugin-remote-copy-contribution';
import { RemoteCopyContribution } from '@theia/core/lib/node/remote/remote-copy-contribution';
import { PluginDocumentationServer } from './plugin-documentation-server';
import { PluginDocumentationService, pluginDocumentationServicePath } from '../browser/plugin-documentation-frontend-service';
import { PluginAuthorizationProvider, pluginAuthorizationPath } from '../../common/plugin-authorization';
import { PluginAuthorizationProviderImpl } from './plugin-authorization-provider-impl';
import { IAuthorizationService, authorizationServicePath, PluginAuthorizationManager } from '../../common/services/authorization';
import { AuthorizationRPCServer } from './authorization-rpc-server';
import { AuthorizationEnforcementService } from './authorization-enforcement-service';
import { AuthorizationServiceBackendImpl } from './authorization-service-backend-impl';

export function bindMainBackend(bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind): void {
    bind(PluginApiContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginApiContribution);
    bind(WsRequestValidatorContribution).toService(PluginApiContribution);

    bindContributionProvider(bind, PluginDeployerParticipant);
    bind(PluginDeployer).to(PluginDeployerImpl).inSingletonScope();
    bind(PluginDeployerContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginDeployerContribution);

    bind(PluginUninstallationManager).toSelf().inSingletonScope();

    bind(PluginDeployerResolver).to(LocalDirectoryPluginDeployerResolver).inSingletonScope();
    bind(PluginDeployerResolver).to(GithubPluginDeployerResolver).inSingletonScope();
    bind(PluginDeployerResolver).to(HttpPluginDeployerResolver).inSingletonScope();

    bind(PluginTheiaEnvironment).toSelf().inSingletonScope();
    bind(PluginTheiaDeployerParticipant).toSelf().inSingletonScope();
    bind(PluginDeployerParticipant).toService(PluginTheiaDeployerParticipant);

    bind(PluginDeployerFileHandler).to(PluginTheiaFileHandler).inSingletonScope();
    bind(PluginDeployerDirectoryHandler).to(PluginTheiaDirectoryHandler).inSingletonScope();

    bind(PluginServer).to(PluginServerImpl).inSingletonScope();

    bind(PluginsKeyValueStorage).toSelf().inSingletonScope();

    bind(PluginPathsService).to(PluginPathsServiceImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(pluginPathsServicePath, () =>
            ctx.container.get(PluginPathsService)
        )
    ).inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(pluginServerJsonRpcPath, () =>
            ctx.container.get(PluginServer)
        )
    ).inSingletonScope();

    bind(PluginCliContribution).toSelf().inSingletonScope();
    bind(CliContribution).toService(PluginCliContribution);

    bind(PluginMgmtCliContribution).toSelf().inSingletonScope();
    bind(CliContribution).toService(PluginMgmtCliContribution);

    bind(PluginRemoteCliContribution).toSelf().inSingletonScope();
    bind(RemoteCliContribution).toService(PluginRemoteCliContribution);
    bind(PluginRemoteCopyContribution).toSelf().inSingletonScope();
    bind(RemoteCopyContribution).toService(PluginRemoteCopyContribution);

    bind(WebviewBackendSecurityWarnings).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(WebviewBackendSecurityWarnings);

    rebind(LocalizationServerImpl).to(PluginLocalizationServer).inSingletonScope();

    // Plugin Documentation Server
    bind(PluginDocumentationServer).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginDocumentationServer);
    bind(PluginDocumentationService).toService(PluginDocumentationServer);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(pluginDocumentationServicePath, () =>
            ctx.container.get(PluginDocumentationService)
        )
    ).inSingletonScope();

    // Legacy 插件授权提供者绑定 (保持向后兼容)
    bind(PluginAuthorizationProviderImpl).toSelf().inSingletonScope();
    bind(PluginAuthorizationProvider).toService(PluginAuthorizationProviderImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(pluginAuthorizationPath, () => ctx.container.get(PluginAuthorizationProvider))
    ).inSingletonScope();

    // 新的基于类的授权管理器 (不依赖数据库)
    bind(PluginAuthorizationManager).toSelf().inSingletonScope();
    
    // 新的授权服务后端实现
    bind(AuthorizationServiceBackendImpl).toSelf().inSingletonScope();
    bind(IAuthorizationService).toService(AuthorizationServiceBackendImpl);
    
    // RPC 服务器绑定 (保留旧的，用于向后兼容)
    if (isBound(AuthorizationRPCServer)) {
        rebind(AuthorizationRPCServer).toSelf().inSingletonScope();
    } else {
        bind(AuthorizationRPCServer).toSelf().inSingletonScope();
    }
    
    bind(ConnectionHandler).toDynamicValue(ctx => {
        return new RpcConnectionHandler(authorizationServicePath, (client: any) => {
            const rpcServer = ctx.container.get(AuthorizationRPCServer);
            if (rpcServer.setClient) {
                rpcServer.setClient(client);
            }
            return rpcServer;
        });
    }).inSingletonScope();

    // 授权强制执行服务 (如果存在)
    if (isBound(AuthorizationEnforcementService)) {
        rebind(AuthorizationEnforcementService).toSelf().inSingletonScope();
    } else {
        try {
            bind(AuthorizationEnforcementService).toSelf().inSingletonScope();
            bind(BackendApplicationContribution).toService(AuthorizationEnforcementService);
        } catch (e) {
            console.log('[AUTH-MODULE] AuthorizationEnforcementService binding skipped:', e.message);
        }
    }
}

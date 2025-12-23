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
import { DefaultPluginDeployerFileHandler } from './handlers/plugin-file-handler';
import { DefaultPluginDirectoryHandler } from './handlers/plugin-directory-handler';
import { GithubPluginDeployerResolver } from './plugin-github-resolver';
import { HttpPluginDeployerResolver } from './plugin-http-resolver';
import { ConnectionHandler, RpcConnectionHandler, bindContributionProvider } from '@theia/core';
import { PluginPathsService, pluginPathsServicePath } from '../common/plugin-paths-protocol';
import { PluginPathsServiceImpl } from './paths/plugin-paths-service';
import { PluginServerHandler } from './plugin-server-handler';
import { PluginCliContribution } from './plugin-cli-contribution';
import { PluginEnvironment } from '../common/plugin-environment';
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
import { PluginDocumentationServiceImpl } from './plugin-usermanual/plugin-documentation-service';
import { UserPluginDirectoryResolver } from './resolvers/user-plugin-directory-resolver';
import { UserPluginDeployerParticipant } from './user-plugin-management/user-plugin-deployer-participant';
import { UserPluginEnvironment } from '../common/user-plugin-management/user-plugin-environment-service';
import { bindUserStorage } from './plugin-adapter/bind';

export function bindMainBackend(bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind): void {
    bind(PluginApiContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginApiContribution);
    bind(WsRequestValidatorContribution).toService(PluginApiContribution);

    bindContributionProvider(bind, PluginDeployerParticipant);
    bind(PluginDeployer).to(PluginDeployerImpl).inSingletonScope();
    bind(PluginDeployerContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginDeployerContribution);

    bind(PluginUninstallationManager).toSelf().inSingletonScope();

    //绑定plugin resolver
    bind(PluginDeployerResolver).to(LocalDirectoryPluginDeployerResolver).inSingletonScope();
    bind(PluginDeployerResolver).to(GithubPluginDeployerResolver).inSingletonScope();
    bind(PluginDeployerResolver).to(HttpPluginDeployerResolver).inSingletonScope();
    bind(PluginDeployerResolver).to(UserPluginDirectoryResolver).inSingletonScope();

    //绑定plugin participant
    bind(PluginEnvironment).toSelf().inSingletonScope();
    bind(UserPluginEnvironment).toSelf().inSingletonScope();
    // bind(PluginTheiaDeployerParticipant).toSelf().inSingletonScope();
    // bind(PluginDeployerParticipant).toService(PluginTheiaDeployerParticipant);
    bind(UserPluginDeployerParticipant).toSelf().inSingletonScope();
    bind(PluginDeployerParticipant).toService(UserPluginDeployerParticipant);

    bind(PluginDeployerFileHandler).to(DefaultPluginDeployerFileHandler).inSingletonScope();
    bind(PluginDeployerDirectoryHandler).to(DefaultPluginDirectoryHandler).inSingletonScope();

    bind(PluginServer).to(PluginServerHandler).inSingletonScope();

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
    bind(PluginDocumentationServiceImpl).toSelf().inSingletonScope();

    bindUserStorage(bind);

}

import * as path from 'path';
import { interfaces } from '@theia/core/shared/inversify';
import { bindContributionProvider } from '@theia/core/lib/common/contribution-provider';
import { CliContribution } from '@theia/core/lib/node/cli';
import { ConnectionContainerModule } from '@theia/core/lib/node/messaging/connection-container-module';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { MetadataScanner } from './metadata-scanner';
import { BackendPluginHostableFilter, HostedPluginServerImpl } from './plugin-service';
import { HostedPluginReader } from './plugin-reader';
import { HostedPluginSupport } from './hosted-plugin';
import { DefaultPluginScanner } from './scanners/default-scanner';
import { HostedPluginServer, PluginScanner, HostedPluginClient, hostedServicePath, PluginDeployerHandler, PluginHostEnvironmentVariable, PluginDeployerResolver, PluginDeployerDirectoryHandler } from '../../common/plugin-protocol';
import { GrammarsReader } from './scanners/grammars-reader';
import { HostedPluginProcess, HostedPluginProcessConfiguration } from './hosted-plugin-process';
import { ExtPluginApiProvider } from '../../common/plugin-ext-api-contribution';
import { HostedPluginCliContribution } from './hosted-plugin-cli-contribution';
import { HostedPluginDeployerHandler } from './hosted-plugin-deployer-handler';
import { PluginUriFactory } from './scanners/plugin-uri-factory';
import { FilePluginUriFactory } from './scanners/file-plugin-uri-factory';
import { HostedPluginLocalizationService } from './hosted-plugin-localization-service';
import { LanguagePackService, languagePackServicePath } from '../../common/language-pack-service';
import { PluginLanguagePackService } from './plugin-language-pack-service';
import { RpcConnectionHandler } from '@theia/core/lib/common/messaging/proxy-factory';
import { ConnectionHandler } from '@theia/core/lib/common/messaging/handler';
import { isConnectionScopedBackendPlugin } from '../common/hosted-plugin';
import { PluginDeployerFileHandler } from '../../common/plugin-protocol';
import { PluginBaoskyFileHandler } from '../../main/node/handlers/plugin-baosky-file-handle';
import { LocalBSXFilePluginDeployerResolver } from '../../main/node/resolvers/local-bsx-file-plugin-deployer-reslover';
import { PluginBaoskyDirectoryHandler } from '../../main/node/handlers/plugin-baosky-directory-handles';
import { PluginBaoskyEnvironment } from '../../main/node/plugin-baosky-environment';
import { PluginApiCompatibilityService } from './plugin-api-compatibility-service';

const commonHostedConnectionModule = ConnectionContainerModule.create(({ bind, bindBackendService }) => {

    bind(HostedPluginProcess).toSelf().inSingletonScope();
    bind(HostedPluginSupport).toSelf().inSingletonScope();

    bindContributionProvider(bind, Symbol.for(ExtPluginApiProvider));
    bindContributionProvider(bind, PluginHostEnvironmentVariable);

    bind(HostedPluginServerImpl).toSelf().inSingletonScope();
    bind(HostedPluginServer).toService(HostedPluginServerImpl);
    bind(BackendPluginHostableFilter).toConstantValue(isConnectionScopedBackendPlugin);
    bindBackendService<HostedPluginServer, HostedPluginClient>(hostedServicePath, HostedPluginServer, (server, client) => {
        server.setClient(client);
        client.onDidCloseConnection(() => server.dispose());
        return server;
    });
});

export function bindCommonHostedBackend(bind: interfaces.Bind): void {
    bind(PluginBaoskyEnvironment).toSelf().inSingletonScope();
    bind(PluginDeployerDirectoryHandler).to(PluginBaoskyDirectoryHandler).inSingletonScope();
    bind(PluginDeployerFileHandler).to(PluginBaoskyFileHandler).inSingletonScope();
    bind(PluginDeployerResolver).to(LocalBSXFilePluginDeployerResolver).inSingletonScope();
    bind(HostedPluginCliContribution).toSelf().inSingletonScope();
    bind(CliContribution).toService(HostedPluginCliContribution);

    bind(PluginApiCompatibilityService).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PluginApiCompatibilityService);

    bind(MetadataScanner).toSelf().inSingletonScope();
    bind(HostedPluginReader).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(HostedPluginReader);

    bind(HostedPluginLocalizationService).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(HostedPluginLocalizationService);
    bind(HostedPluginDeployerHandler).toSelf().inSingletonScope();
    bind(PluginDeployerHandler).toService(HostedPluginDeployerHandler);

    bind(PluginLanguagePackService).toSelf().inSingletonScope();
    bind(LanguagePackService).toService(PluginLanguagePackService);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler(languagePackServicePath, () =>
            ctx.container.get(LanguagePackService)
        )
    ).inSingletonScope();

    bind(GrammarsReader).toSelf().inSingletonScope();
    bind(HostedPluginProcessConfiguration).toConstantValue({
        path: path.join(__dirname, 'plugin-host'),
    });

    bind(ConnectionContainerModule).toConstantValue(commonHostedConnectionModule);
    bind(PluginUriFactory).to(FilePluginUriFactory).inSingletonScope();
}

export function bindHostedBackend(bind: interfaces.Bind): void {
    bindCommonHostedBackend(bind);

    bind(PluginScanner).to(DefaultPluginScanner).inSingletonScope();
}

import '@theia/core/shared/reflect-metadata';
import { ContainerModule } from '@theia/core/shared/inversify';
import { RPCProtocol, RPCProtocolImpl } from '../../common/rpc-protocol';
import { AbstractPluginHostRPC, PluginHostRPC, PluginContainerModuleLoader } from './plugin-host-rpc';
import { AbstractPluginManagerExtImpl, MinimalTerminalServiceExt, PluginManagerExtImpl } from '../../plugin/plugin-manager';
import { IPCChannel } from '@theia/core/lib/node';
import { InternalPluginContainerModule } from '../../plugin/node/plugin-container-module';
import { LocalizationExt } from '../../common/plugin-api-rpc';
import { EnvExtImpl } from '../../plugin/env';
import { EnvNodeExtImpl } from '../../plugin/node/env-node-ext';
import { LocalizationExtImpl } from '../../plugin/localization-ext';
import { PreferenceRegistryExtImpl } from '../../plugin/preference-registry';
import { DebugExtImpl } from '../../plugin/debug/debug-ext';
import { EditorsAndDocumentsExtImpl } from '../../plugin/editors-and-documents';
import { WorkspaceExtImpl } from '../../plugin/workspace';
import { MessageRegistryExt } from '../../plugin/message-registry';
import { ClipboardExt } from '../../plugin/clipboard-ext';
import { KeyValueStorageProxy, InternalStorageExt } from '../../plugin/plugin-storage';
import { WebviewsExtImpl } from '../../plugin/webviews';
import { TerminalServiceExtImpl } from '../../plugin/terminal-ext';
import { InternalSecretsExt, SecretsExtImpl } from '../../plugin/secrets-ext';
import { ProjectRegistryExt } from '../../plugin/project/project-registry';

export default new ContainerModule((bind, unbind, isBound, rebind, unbindAsync, onActivation) => {
    const channel = new IPCChannel();
    bind(RPCProtocol).toConstantValue(new RPCProtocolImpl(channel));


    bind(PluginContainerModuleLoader).toDynamicValue(({ container }) =>
        (module: ContainerModule) => {
            container.load(module);
            const internalModule = module as InternalPluginContainerModule;
            const pluginApiCache = internalModule.initializeApi?.(container);
            return pluginApiCache;
        }).inSingletonScope();

    bind(AbstractPluginHostRPC).toService(PluginHostRPC);
    bind(AbstractPluginManagerExtImpl).toService(PluginManagerExtImpl);
    bind(PluginManagerExtImpl).toSelf().inSingletonScope();
    bind(PluginHostRPC).toSelf().inSingletonScope();
    bind(EnvExtImpl).to(EnvNodeExtImpl).inSingletonScope();
    bind(LocalizationExt).to(LocalizationExtImpl).inSingletonScope();
    bind(InternalStorageExt).toService(KeyValueStorageProxy);
    bind(KeyValueStorageProxy).toSelf().inSingletonScope();
    bind(InternalSecretsExt).toService(SecretsExtImpl);
    bind(SecretsExtImpl).toSelf().inSingletonScope();
    bind(PreferenceRegistryExtImpl).toSelf().inSingletonScope();
    bind(DebugExtImpl).toSelf().inSingletonScope();
    bind(EditorsAndDocumentsExtImpl).toSelf().inSingletonScope();
    bind(WorkspaceExtImpl).toSelf().inSingletonScope();
    bind(MessageRegistryExt).toSelf().inSingletonScope();
    bind(ProjectRegistryExt).toSelf().inSingletonScope();
    bind(ClipboardExt).toSelf().inSingletonScope();
    bind(WebviewsExtImpl).toSelf().inSingletonScope();
    bind(MinimalTerminalServiceExt).toService(TerminalServiceExtImpl);
    bind(TerminalServiceExtImpl).toSelf().inSingletonScope();
});

// eslint-disable-next-line import/no-extraneous-dependencies
import 'reflect-metadata';
import { ContainerModule } from '@theia/core/shared/inversify';
import { BasicChannel } from '@theia/core/lib/common/message-rpc/channel';
import { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } from '@theia/core/lib/common/message-rpc/uint8-array-message-buffer';
import { LocalizationExt } from '../../../common/plugin-api-rpc';
import { RPCProtocol, RPCProtocolImpl } from '../../../common/rpc-protocol';
import { ClipboardExt } from '../../../plugin/clipboard-ext';
import { EditorsAndDocumentsExtImpl } from '../../../plugin/editors-and-documents';
import { MessageRegistryExt } from '../../../plugin/message-registry';
import { MinimalTerminalServiceExt, PluginManagerExtImpl } from '../../../plugin/plugin-manager';
import { InternalStorageExt, KeyValueStorageProxy } from '../../../plugin/plugin-storage';
import { PreferenceRegistryExtImpl } from '../../../plugin/preference-registry';
import { InternalSecretsExt, SecretsExtImpl } from '../../../plugin/secrets-ext';
import { TerminalServiceExtImpl } from '../../../plugin/terminal-ext';
import { WebviewsExtImpl } from '../../../plugin/webviews';
import { WorkspaceExtImpl } from '../../../plugin/workspace';
import { createDebugExtStub } from './debug-stub';
import { EnvExtImpl } from '../../../plugin/env';
import { WorkerEnvExtImpl } from './worker-env-ext';
import { DebugExtImpl } from '../../../plugin/debug/debug-ext';
import { LocalizationExtImpl } from '../../../plugin/localization-ext';
import { ProjectRegistryExt } from '../../../plugin/project/project-registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = self as any;

export default new ContainerModule(bind => {
    const channel = new BasicChannel(() => {
        const writeBuffer = new Uint8ArrayWriteBuffer();
        writeBuffer.onCommit(buffer => {
            ctx.postMessage(buffer);
        });
        return writeBuffer;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addEventListener('message', (message: any) => {
        channel.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(message.data));
    });

    const rpc = new RPCProtocolImpl(channel);

    bind(RPCProtocol).toConstantValue(rpc);

    bind(PluginManagerExtImpl).toSelf().inSingletonScope();
    bind(EnvExtImpl).to(WorkerEnvExtImpl).inSingletonScope();
    bind(LocalizationExtImpl).toSelf().inSingletonScope();
    bind(LocalizationExt).toService(LocalizationExtImpl);
    bind(KeyValueStorageProxy).toSelf().inSingletonScope();
    bind(InternalStorageExt).toService(KeyValueStorageProxy);
    bind(SecretsExtImpl).toSelf().inSingletonScope();
    bind(InternalSecretsExt).toService(SecretsExtImpl);
    bind(PreferenceRegistryExtImpl).toSelf().inSingletonScope();
    bind(DebugExtImpl).toDynamicValue(({ container }) => {
        const child = container.createChild();
        child.bind(DebugExtImpl).toSelf();
        return createDebugExtStub(child);
    }).inSingletonScope();
    bind(EditorsAndDocumentsExtImpl).toSelf().inSingletonScope();
    bind(WorkspaceExtImpl).toSelf().inSingletonScope();
    bind(MessageRegistryExt).toSelf().inSingletonScope();
    bind(ProjectRegistryExt).toSelf().inSingletonScope();
    bind(ClipboardExt).toSelf().inSingletonScope();
    bind(WebviewsExtImpl).toSelf().inSingletonScope();
    bind(TerminalServiceExtImpl).toSelf().inSingletonScope();
    bind(MinimalTerminalServiceExt).toService(TerminalServiceExtImpl);
});

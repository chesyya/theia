import { injectable } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { HostedPluginClient } from '../../common/plugin-protocol';
import { LogPart } from '../../common/types';

@injectable()
export class HostedPluginWatcher {
    private onPostMessage = new Emitter<{ pluginHostId: string, message: Uint8Array }>();

    private onLogMessage = new Emitter<LogPart>();

    private readonly onDidDeployEmitter = new Emitter<string | undefined>();
    readonly onDidDeploy = this.onDidDeployEmitter.event;

    private readonly onDidUninstallEmitter = new Emitter<string | undefined>();
    readonly onDidUninstall = this.onDidUninstallEmitter.event;

    getHostedPluginClient(): HostedPluginClient {
        const messageEmitter = this.onPostMessage;
        const logEmitter = this.onLogMessage;
        return {
            postMessage(pluginHostId, message: Uint8Array): Promise<void> {
                messageEmitter.fire({ pluginHostId, message });
                return Promise.resolve();
            },
            log(logPart: LogPart): Promise<void> {
                logEmitter.fire(logPart);
                return Promise.resolve();
            },
            onDidDeploy: (userId?: string) => this.onDidDeployEmitter.fire(userId),
            onDidUninstall: (userId?: string) => this.onDidUninstallEmitter.fire(userId)
        };
    }

    get onPostMessageEvent(): Event<{ pluginHostId: string, message: Uint8Array }> {
        return this.onPostMessage.event;
    }

    get onLogMessageEvent(): Event<LogPart> {
        return this.onLogMessage.event;
    }
}

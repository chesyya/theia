import { DebugExt } from '../../../common/plugin-api-rpc';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-configuration';
import { MaybePromise } from '@theia/core/lib/common/types';
import { DebuggerDescription } from '@theia/debug/lib/common/debug-service';
import { HostedPluginSupport } from '../../../hosted/browser/hosted-plugin';

/**
 * Plugin [DebugAdapterContribution](#DebugAdapterContribution).
 */
export class PluginDebugAdapterContribution {
    constructor(
        protected readonly description: DebuggerDescription,
        protected readonly debugExt: DebugExt,
        protected readonly pluginService: HostedPluginSupport) { }

    get type(): string {
        return this.description.type;
    }

    get label(): MaybePromise<string | undefined> {
        return this.description.label;
    }

    async createDebugSession(config: DebugConfiguration, workspaceFolder: string | undefined): Promise<string> {
        await this.pluginService.activateByDebug('onDebugAdapterProtocolTracker', config.type);
        return this.debugExt.$createDebugSession(config, workspaceFolder);
    }

    async terminateDebugSession(sessionId: string): Promise<void> {
        this.debugExt.$terminateDebugSession(sessionId);
    }
}

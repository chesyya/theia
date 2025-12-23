import { MaybePromise } from '@theia/core';
import { RemoteCliContext, RemoteCliContribution } from '@theia/core/lib/node/remote/remote-cli-contribution';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PluginCliContribution } from './plugin-cli-contribution';

@injectable()
export class PluginRemoteCliContribution implements RemoteCliContribution {

    @inject(PluginCliContribution)
    protected readonly pluginCliContribution: PluginCliContribution;

    enhanceArgs(context: RemoteCliContext): MaybePromise<string[]> {
        const pluginsFolder = this.pluginCliContribution.localDir();
        const defaultPlugins = process.env.THEIA_DEFAULT_PLUGINS;
        if (pluginsFolder || defaultPlugins) {
            return ['--plugins=local-dir:./plugins'];
        }
        return [];

    }
}

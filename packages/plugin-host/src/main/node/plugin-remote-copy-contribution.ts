import { RemoteCopyContribution, RemoteCopyRegistry } from '@theia/core/lib/node/remote/remote-copy-contribution';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PluginCliContribution } from './plugin-cli-contribution';
import { FileUri } from '@theia/core/lib/common/file-uri';

@injectable()
export class PluginRemoteCopyContribution implements RemoteCopyContribution {

    @inject(PluginCliContribution)
    protected readonly pluginCliContribution: PluginCliContribution;

    async copy(registry: RemoteCopyRegistry): Promise<void> {
        const localDir = this.pluginCliContribution.localDir();
        const defaultPlugins = process.env.THEIA_DEFAULT_PLUGINS?.split(',') ?? [];

        await Promise.all([localDir, ...defaultPlugins]
            .filter(pluginDir => pluginDir && pluginDir.startsWith('local-dir:'))
            .map(async (pluginDir: string) => {
                const fsPath = FileUri.fsPath(pluginDir);
                await registry.directory(fsPath, 'plugins');
            }));
    }
}

import { PluginDeployerFileHandler, PluginDeployerEntry, PluginDeployerFileHandlerContext, PluginDeployOptions } from '../../../common';
import filenamify from 'filenamify';
import { inject, injectable } from '@theia/core/shared/inversify';
import * as fs from '@theia/core/shared/fs-extra';
import { PluginBaoskyEnvironment } from '../plugin-baosky-environment';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { unpackToDeploymentDir } from '../../../utils/plugin-baosky-utils';
import { UserPluginEnvironment } from '../../common/user-plugin-management/user-plugin-environment-service';

export const isBaoskyPluginFile = (pluginPath?: string) => Boolean(pluginPath && (pluginPath.endsWith('.bsx') || pluginPath.endsWith('.tgz')));

@injectable()
export class PluginBaoskyFileHandler implements PluginDeployerFileHandler {
    @inject(PluginBaoskyEnvironment)
    protected readonly environment: PluginBaoskyEnvironment;
    @inject(UserPluginEnvironment)
    protected readonly userPluginEnvironment: UserPluginEnvironment;

    async accept(resolvedPlugin: PluginDeployerEntry): Promise<boolean> {
        return resolvedPlugin.isFile().then(file => {
            if (!file) {
                return false;
            }
            return isBaoskyPluginFile(resolvedPlugin.path());
        });
    }

    async handle(context: PluginDeployerFileHandlerContext, options?: PluginDeployOptions): Promise<void> {
        const id = this.getNormalizedExtensionId(context.pluginEntry().id());
        let extensionDeploymentDir: string;
        if (options && options.userId) {
            extensionDeploymentDir = await unpackToDeploymentDir(this.userPluginEnvironment, context.pluginEntry().path(), id, options);
        }
        else
            extensionDeploymentDir = await unpackToDeploymentDir(this.environment, context.pluginEntry().path(), id);
        context.pluginEntry().updatePath(extensionDeploymentDir);
        console.log(`root path: ${context.pluginEntry().rootPath}`);
        const originalPath = context.pluginEntry().originalPath();
        if (originalPath && originalPath !== extensionDeploymentDir) {
            const tempDirUri = await this.environment.getTempDirUri();
            if (originalPath.startsWith(FileUri.fsPath(tempDirUri))) {
                try {
                    await fs.remove(FileUri.fsPath(originalPath));
                } catch (e) {
                    console.error(`[${id}]: failed to remove temporary files: "${originalPath}"`, e);
                }
            }
        }
    }

    protected getNormalizedExtensionId(pluginId: string): string {
        return filenamify(pluginId, { replacement: '_' }).replace(/\.bsx$/, '');
    }
}

import { PluginDeployerFileHandler, PluginDeployerEntry, PluginDeployerFileHandlerContext, PluginDeployOptions } from '../../../common';
import filenamify from 'filenamify';
import { inject, injectable } from '@theia/core/shared/inversify';
import * as fs from '@theia/core/shared/fs-extra';
import { PluginBaoskyEnvironment } from '../plugin-baosky-environment';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { unpackToDeploymentDir } from '../../../utils/plugin-baosky-utils';
import { PluginStorageKey, UserPluginEnvironment } from '../../common/user-plugin-management/user-plugin-environment-service';
import { PluginUserStorageAdapterFactory } from '../plugin-adapter/plugin-adapter-control';
import { DEFAULT_USER_NAME } from '@baosky/platform/lib/common/es-server/user-protocol';

export const isBaoskyPluginFile = (pluginPath?: string) => Boolean(pluginPath && (pluginPath.endsWith('.bsx') || pluginPath.endsWith('.tgz')));

@injectable()
export class PluginBaoskyFileHandler implements PluginDeployerFileHandler {
    @inject(PluginBaoskyEnvironment)
    protected readonly environment: PluginBaoskyEnvironment;
    @inject(UserPluginEnvironment)
    protected readonly userPluginEnvironment: UserPluginEnvironment;
    @inject(PluginUserStorageAdapterFactory)
    private readonly userStorageAdapterFactory: PluginUserStorageAdapterFactory;

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
        let userName = DEFAULT_USER_NAME;
        if (options && options.userId) {
            userName = options.userId;
        }
        const adapter = this.userStorageAdapterFactory({
            type: PluginStorageKey,
            userName: userName,
            shared: options?.shared,
        });
        extensionDeploymentDir = await adapter.setPluginData(id, {
            env: options?.userId ? this.userPluginEnvironment : this.environment,
            sourcePath: context.pluginEntry().path(),
            extensionId: id,
            options: options?.userId ? options : undefined,
        });
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

import { injectable } from '@theia/core/shared/inversify';
import { PluginDeployerResolver, PluginDeployerResolverContext, PluginDeployOptions } from '../../../common/plugin-protocol';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/node';
import URI from '@theia/core/lib/common/uri';

@injectable()
export abstract class LocalPluginDeployerResolver implements PluginDeployerResolver {
    async resolve(pluginResolverContext: PluginDeployerResolverContext, options?: PluginDeployOptions): Promise<void> {
        const localPath = await this.resolveLocalPluginPath(pluginResolverContext, this.supportedScheme);
        if (localPath) {
            await this.resolveFromLocalPath(pluginResolverContext, localPath, options);
        }
    }

    accept(pluginId: string): boolean {
        return pluginId.startsWith(this.supportedScheme);
    }

    protected abstract get supportedScheme(): string;

    protected abstract resolveFromLocalPath(pluginResolverContext: PluginDeployerResolverContext, localPath: string, options?: PluginDeployOptions): Promise<void>;

    private async resolveLocalPluginPath(pluginResolverContext: PluginDeployerResolverContext, expectedScheme: string): Promise<string | null> {
        const localUri = new URI(pluginResolverContext.getOriginId());
        if (localUri.scheme !== expectedScheme) {
            return null;
        }
        let fsPath = FileUri.fsPath(localUri);
        if (!path.isAbsolute(fsPath)) {
            fsPath = path.resolve(process.cwd(), fsPath);
        }
        if (!await fs.pathExists(fsPath)) {
            console.warn(`The local plugin referenced by ${pluginResolverContext.getOriginId()} does not exist.`);
            return null;
        }
        return fsPath;
    }
}

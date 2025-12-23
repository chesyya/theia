import { PluginDeployerResolverContext } from '../../../common/plugin-protocol';
import { injectable } from '@theia/core/shared/inversify';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import { LocalPluginDeployerResolver } from './local-plugin-deployer-resolver';

@injectable()
export class LocalDirectoryPluginDeployerResolver extends LocalPluginDeployerResolver {
    static LOCAL_DIR = 'local-dir';

    protected get supportedScheme(): string {
        return LocalDirectoryPluginDeployerResolver.LOCAL_DIR;
    }

    protected async resolveFromLocalPath(pluginResolverContext: PluginDeployerResolverContext, localPath: string): Promise<void> {
        const files = await fs.readdir(localPath);
        files.forEach(file =>
            pluginResolverContext.addPlugin(file, path.resolve(localPath, file))
        );
    }
}

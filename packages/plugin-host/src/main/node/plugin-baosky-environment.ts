import { injectable, inject } from '@theia/core/shared/inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class PluginBaoskyEnvironment {

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    protected _userExtensionsDirUri: URI | undefined;
    protected _deployedPluginsUri: URI | undefined;
    protected _tmpDirUri: URI | undefined;

    async getUserExtensionsDirUri(): Promise<URI> {
        if (!this._userExtensionsDirUri) {
            const configDir = new URI(await this.environments.getConfigDirUri());
            this._userExtensionsDirUri = configDir.resolve('extensions');
        }
        return this._userExtensionsDirUri;
    }

    async getDeploymentDirUri(): Promise<URI> {
        if (!this._deployedPluginsUri) {
            const configDir = new URI(await this.environments.getConfigDirUri());
            this._deployedPluginsUri = configDir.resolve('deployedPlugins');
        }
        return this._deployedPluginsUri;
    }

    async getTempDirUri(prefix?: string): Promise<URI> {
        if (!this._tmpDirUri) {
            const configDir: URI = new URI(await this.environments.getConfigDirUri());
            this._tmpDirUri = configDir.resolve('tmp');
        }

        if (prefix) {
            return this._tmpDirUri.resolve(prefix);
        }

        return this._tmpDirUri;
    }
}

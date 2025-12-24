import { RequestContext, RequestService } from '@theia/core/shared/@theia/request';
import { inject, injectable } from '@theia/core/shared/inversify';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as url from 'url';
import { PluginDeployerResolver, PluginDeployerResolverContext } from '../../common';
import { getTempDirPathAsync } from './temp-dir-util';

/**
 * Resolver that handle the http(s): protocol
 * http://path/to/my.plugin
 * https://path/to/my.plugin
 */
@injectable()
export class HttpPluginDeployerResolver implements PluginDeployerResolver {

    private unpackedFolder: Deferred<string>;

    @inject(RequestService)
    protected readonly request: RequestService;

    constructor() {
        this.unpackedFolder = new Deferred();
        getTempDirPathAsync('http-remote').then(async unpackedFolder => {
            try {
                await fs.mkdir(unpackedFolder, { recursive: true });
                this.unpackedFolder.resolve(unpackedFolder);
            } catch (err) {
                this.unpackedFolder.reject(err);
            }
        });
    }

    /**
     * Grab the remote file specified by the given URL
     */
    async resolve(pluginResolverContext: PluginDeployerResolverContext): Promise<void> {

        // download the file
        // keep filename of the url
        const urlPath = pluginResolverContext.getOriginId();
        const link = url.parse(urlPath);
        if (!link.pathname) {
            throw new Error('invalid link URI' + urlPath);
        }

        const dirname = path.dirname(link.pathname);
        const basename = path.basename(link.pathname);
        const filename = dirname.replace(/\W/g, '_') + ('-') + basename;
        const unpackedFolder = await this.unpackedFolder.promise;
        const unpackedPath = path.resolve(unpackedFolder, path.basename(filename));

        try {
            await fs.access(unpackedPath);
            // use of cache. If file is already there use it directly
            return;
        } catch { }

        const response = await this.request.request({ url: pluginResolverContext.getOriginId() });
        if (RequestContext.isSuccess(response)) {
            await fs.writeFile(unpackedPath, response.buffer);
            pluginResolverContext.addPlugin(pluginResolverContext.getOriginId(), unpackedPath);
        } else {
            throw new Error(`Could not download the plugin from ${pluginResolverContext.getOriginId()}. HTTP status code: ${response.res.statusCode}`);
        }

    }

    /**
     * Handle only the plugins that starts with http or https:
     */
    accept(pluginId: string): boolean {
        return /^http[s]?:\/\/.*$/gm.test(pluginId);
    }
}

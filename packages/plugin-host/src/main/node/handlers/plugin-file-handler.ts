import { PluginDeployerFileHandler, PluginDeployerEntry, PluginDeployerFileHandlerContext, PluginType, PluginDeployOptions } from '../../../common/plugin-protocol';
import type { URI } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { getTempDirPathAsync } from '../temp-dir-util';
import * as fs from '@theia/core/shared/fs-extra';
import filenamify from 'filenamify';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { PluginEnvironment } from '../../common/plugin-environment';

@injectable()
export class DefaultPluginDeployerFileHandler implements PluginDeployerFileHandler {

    private readonly systemPluginsDirUri: Deferred<URI>;

    @inject(PluginEnvironment)
    protected readonly environment: PluginEnvironment;

    constructor() {
        this.systemPluginsDirUri = new Deferred();
        getTempDirPathAsync('plugin-unpacked')
            .then(systemPluginsDirPath => this.systemPluginsDirUri.resolve(FileUri.create(systemPluginsDirPath)));
    }

    async accept(resolvedPlugin: PluginDeployerEntry): Promise<boolean> {
        if (resolvedPlugin.path() !== null && resolvedPlugin.path().endsWith('.theia')) {
            return resolvedPlugin.isFile();
        }
        return false;
    }

    async handle(context: PluginDeployerFileHandlerContext, options?: PluginDeployOptions): Promise<void> {
        const id = context.pluginEntry().id();
        const pluginDir = await this.getPluginDir(context);
        console.log(`[${id}]: trying to decompress into "${pluginDir}"...`);
        if (context.pluginEntry().type === PluginType.User && await fs.pathExists(pluginDir)) {
            console.log(`[${id}]: already found`);
            context.pluginEntry().updatePath(pluginDir);
            return;
        }
        await context.unzip(context.pluginEntry().path(), pluginDir);
        console.log(`[${id}]: decompressed`);
        context.pluginEntry().updatePath(pluginDir);
    }

    protected async getPluginDir(context: PluginDeployerFileHandlerContext): Promise<string> {
        const systemPluginsDirUri = await this.systemPluginsDirUri.promise;
        return FileUri.fsPath(systemPluginsDirUri.resolve(filenamify(context.pluginEntry().id(), { replacement: '_' })));
    }
}

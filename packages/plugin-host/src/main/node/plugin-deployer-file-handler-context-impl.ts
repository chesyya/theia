import { PluginDeployerEntry, PluginDeployerFileHandlerContext } from '../../common/plugin-protocol';
import decompress from 'decompress';

export class PluginDeployerFileHandlerContextImpl implements PluginDeployerFileHandlerContext {

    constructor(private readonly pluginDeployerEntry: PluginDeployerEntry) {

    }

    async unzip(sourcePath: string, destPath: string): Promise<void> {
        await decompress(sourcePath, destPath);
    }

    pluginEntry(): PluginDeployerEntry {
        return this.pluginDeployerEntry;
    }
}

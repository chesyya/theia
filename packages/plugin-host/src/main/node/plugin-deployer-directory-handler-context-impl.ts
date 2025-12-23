import * as path from 'path';
import { promises as fs } from 'fs';
import { PluginDeployerEntry, PluginDeployerDirectoryHandlerContext } from '../../common/plugin-protocol';

export class PluginDeployerDirectoryHandlerContextImpl implements PluginDeployerDirectoryHandlerContext {

    constructor(private readonly pluginDeployerEntry: PluginDeployerEntry) { }

    async copy(origin: string, target: string): Promise<void> {
        const entries = await fs.readdir(origin, { withFileTypes: true });
        await fs.mkdir(target, { recursive: true });
        await Promise.all(entries.map(async entry => {
            const item = entry.name;
            const itemPath = path.resolve(origin, item);
            const targetPath = path.resolve(target, item);
            if (entry.isDirectory()) {
                return this.copy(itemPath, targetPath);
            }
            if (entry.isFile()) {
                return fs.copyFile(itemPath, targetPath);
            }
        }));
    }

    pluginEntry(): PluginDeployerEntry {
        return this.pluginDeployerEntry;
    }

}

import * as path from 'path';
import * as fs from '@theia/core/shared/fs-extra';
import { PluginIdentifiers, PluginPackage } from '../../common';
import { updateActivationEvents } from './plugin-activation-events';

export async function loadManifest(pluginPath: string): Promise<PluginPackage> {
    const manifest = await fs.readJson(path.join(pluginPath, 'package.json'));
    // translate vscode builtins, as they are published with a prefix. See https://github.com/theia-ide/vscode-builtin-extensions/blob/master/src/republish.js#L50
    const built_prefix = '@theia/vscode-builtin-';
    if (manifest && manifest.name && manifest.name.startsWith(built_prefix)) {
        manifest.name = manifest.name.substring(built_prefix.length);
    }
    manifest.publisher ??= PluginIdentifiers.UNPUBLISHED;
    updateActivationEvents(manifest);
    return manifest;
}

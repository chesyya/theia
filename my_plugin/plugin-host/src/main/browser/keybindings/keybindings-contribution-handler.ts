import { injectable, inject } from '@theia/core/shared/inversify';
import { PluginContribution, Keybinding as PluginKeybinding } from '../../../common';
import { Keybinding } from '@theia/core/lib/common/keybinding';
import { KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { OS } from '@theia/core/lib/common/os';
import { Disposable } from '@theia/core/lib/common/disposable';
import { DisposableCollection } from '@theia/core';

@injectable()
export class KeybindingsContributionPointHandler {

    @inject(KeybindingRegistry)
    private readonly keybindingRegistry: KeybindingRegistry;

    handle(contributions: PluginContribution): Disposable {
        if (!contributions || !contributions.keybindings) {
            return Disposable.NULL;
        }
        const toDispose = new DisposableCollection();
        for (const raw of contributions.keybindings) {
            const keybinding = this.toKeybinding(raw);
            if (keybinding) {
                toDispose.push(this.keybindingRegistry.registerKeybinding(keybinding));
            }
        }
        return toDispose;
    }

    protected toKeybinding(pluginKeybinding: PluginKeybinding): Keybinding | undefined {
        const keybinding = this.toOSKeybinding(pluginKeybinding);
        if (!keybinding) {
            return undefined;
        }
        const { command, when, args } = pluginKeybinding;
        return { keybinding, command, when, args };
    }

    protected toOSKeybinding(pluginKeybinding: PluginKeybinding): string | undefined {
        let keybinding: string | undefined;
        const os = OS.type();
        if (os === OS.Type.Windows) {
            keybinding = pluginKeybinding.win;
        } else if (os === OS.Type.OSX) {
            keybinding = pluginKeybinding.mac;
        } else {
            keybinding = pluginKeybinding.linux;
        }
        return keybinding || pluginKeybinding.keybinding;
    }
}

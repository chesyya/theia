// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { interfaces } from '@theia/core/shared/inversify';
import { CommandRegistry } from '@theia/core/lib/common/command';
import * as theia from '@theia/plugin';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { CommandRegistryMain, CommandRegistryExt, MAIN_RPC_CONTEXT } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { KeybindingRegistry, SingleTextInputDialog, KeySequence } from '@theia/core/lib/browser';
import { PluginContributionHandler } from './plugin-contribution-handler';
import { ArgumentProcessor } from '../../common/commands';
import { ContributionProvider } from '@theia/core';
import { KeymapsService } from '@theia/keymaps/lib/browser/keymaps-service';
import { nls } from '@theia/core/lib/common/nls';

export const ArgumentProcessorContribution = Symbol('ArgumentProcessorContribution');

export class CommandRegistryMainImpl implements CommandRegistryMain, Disposable {
    private readonly proxy: CommandRegistryExt;
    private readonly commands = new Map<string, Disposable>();
    private readonly handlers = new Map<string, Disposable>();
    private readonly delegate: CommandRegistry;
    private readonly keyBinding: KeybindingRegistry;
    private readonly contributions: PluginContributionHandler;
    private readonly keymapsService: KeymapsService;

    private readonly argumentProcessors: ArgumentProcessor[] = [];

    protected readonly toDispose = new DisposableCollection();

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.COMMAND_REGISTRY_EXT);
        this.delegate = container.get(CommandRegistry);
        this.keyBinding = container.get(KeybindingRegistry);
        this.contributions = container.get(PluginContributionHandler);
        this.keymapsService = container.get(KeymapsService);

        container.getNamed<ContributionProvider<ArgumentProcessor>>(ContributionProvider, ArgumentProcessorContribution).getContributions().forEach(processor => {
            this.registerArgumentProcessor(processor);
        });
    }

    dispose(): void {
        this.toDispose.dispose();
    }

    registerArgumentProcessor(processor: ArgumentProcessor): Disposable {
        this.argumentProcessors.push(processor);
        return Disposable.create(() => {
            const index = this.argumentProcessors.lastIndexOf(processor);
            if (index >= 0) {
                this.argumentProcessors.splice(index, 1);
            }
        });
    }

    $registerCommand(command: theia.CommandDescription): void {
        const id = command.id;
        this.commands.set(id, this.contributions.registerCommand(command));
        this.toDispose.push(Disposable.create(() => this.$unregisterCommand(id)));
    }
    $unregisterCommand(id: string): void {
        const command = this.commands.get(id);
        if (command) {
            command.dispose();
            this.commands.delete(id);
        }
    }

    $registerHandler(id: string): void {
        this.handlers.set(id, this.contributions.registerCommandHandler(id, (...args) =>
            this.proxy.$executeCommand(id, ...args.map(arg => this.argumentProcessors.reduce((currentValue, processor) => processor.processArgument(currentValue), arg)))
        ));
        this.toDispose.push(Disposable.create(() => this.$unregisterHandler(id)));
    }
    $unregisterHandler(id: string): void {
        const handler = this.handlers.get(id);
        if (handler) {
            handler.dispose();
            this.handlers.delete(id);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async $executeCommand<T>(id: string, ...args: any[]): Promise<T | undefined> {
        if (!this.delegate.getCommand(id)) {
            throw new Error(`Command with id '${id}' is not registered.`);
        }
        try {
            return await this.delegate.executeCommand<T>(id, ...args);
        } catch (e) {
            // Command handler may be not active at the moment so the error must be caught. See https://github.com/eclipse-theia/theia/pull/6687#discussion_r354810079
            if ('code' in e && e['code'] === 'NO_ACTIVE_HANDLER') {
                return;
            } else {
                throw e;
            }
        }
    }

    $getKeyBinding(commandId: string): PromiseLike<theia.CommandKeyBinding[] | undefined> {
        try {
            const keyBindings = this.keyBinding.getKeybindingsForCommand(commandId);
            if (keyBindings) {
                // transform inner type to CommandKeyBinding
                return Promise.resolve(keyBindings.map(keyBinding => ({ id: commandId, value: keyBinding.keybinding })));
            } else {
                return Promise.resolve(undefined);
            }

        } catch (e) {
            return Promise.reject(e);
        }
    }

    $getCommands(): PromiseLike<string[]> {
        return Promise.resolve(this.delegate.commandIds);
    }

    async $editKeybinding(commandId: string): Promise<void> {
        try {
            // Get command
            const command = this.delegate.getCommand(commandId);
            if (!command) {
                throw new Error(`Command '${commandId}' not found`);
            }

            // Get current keybindings
            const keybindings = this.keyBinding.getKeybindingsForCommand(commandId);
            const oldKeybinding = keybindings.length > 0 ? keybindings[0] : undefined;

            // Get command label for dialog title
            const commandLabel = command.label
                ? (command.category ? `${command.category}: ${command.label}` : command.label)
                : command.id;

            // Create and open dialog
            const dialog = new SingleTextInputDialog({
                title: nls.localize('theia/keymaps/editKeybindingTitle', 'Edit Keybinding for {0}', commandLabel),
                maxWidth: 400,
                initialValue: oldKeybinding?.keybinding,
                validate: newKeybinding => this.validateKeybinding(commandId, oldKeybinding?.keybinding, newKeybinding),
            });

            const newKeybinding = await dialog.open();

            // Save keybinding if changed
            if (newKeybinding && newKeybinding !== oldKeybinding?.keybinding) {
                await this.keymapsService.setKeybinding({
                    ...oldKeybinding,
                    command: commandId,
                    keybinding: newKeybinding
                }, oldKeybinding);
            }
        } catch (e) {
            throw new Error(`Failed to edit keybinding for command '${commandId}': ${e}`);
        }
    }

    /**
     * Validate the provided keybinding value.
     * @param command the command id.
     * @param oldKeybinding the old keybinding value.
     * @param keybinding the new keybinding value.
     * @returns error message or empty string if valid.
     */
    protected validateKeybinding(command: string, oldKeybinding: string | undefined, keybinding: string): string {
        if (!keybinding) {
            return nls.localize('theia/keymaps/requiredKeybindingValidation', 'keybinding value is required');
        }
        try {
            const binding = { command, keybinding };
            KeySequence.parse(keybinding);
            if (oldKeybinding === keybinding) {
                return ''; // if old and new keybindings match, quietly reject update
            }

            // Check for collisions only with framework keybindings (DEFAULT scope = 0)
            // Plugin keybindings (USER/WORKSPACE scope) are allowed to conflict with each other
            if (this.keyBinding.containsKeybindingInScope(binding, 0)) {
                return nls.localize('theia/keymaps/keybindingCollidesValidation', 'keybinding currently collides');
            }

            return '';
        } catch (error) {
            return error;
        }
    }

}

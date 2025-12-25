/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as theia from '@baosky/plugin';
import * as model from '../common/plugin-api-rpc-model';
import { CommandRegistryExt, PLUGIN_RPC_CONTEXT as Ext, CommandRegistryMain, PluginManager } from '../common/plugin-api-rpc';
import { RPCProtocol } from '../common/rpc-protocol';
import { Disposable } from './types-impl';
import { DisposableCollection } from '@theia/core';
import { KnownCommands } from './known-commands';
import { ArgumentProcessor } from '../common/commands';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = <T>(...args: any[]) => T | PromiseLike<T | undefined>;

export class CommandRegistryImpl implements CommandRegistryExt {

    private proxy: CommandRegistryMain;
    private readonly commands = new Set<string>();
    private readonly handlers = new Map<string, theia.CommandHandler>();
    private readonly argumentProcessors: ArgumentProcessor[];
    private readonly commandsConverter: CommandsConverter;
    private readonly pluginCommands = new Map<string, string>()

    constructor(rpc: RPCProtocol, private pluginManager: PluginManager) {
        this.proxy = rpc.getProxy(Ext.COMMAND_REGISTRY_MAIN);
        this.argumentProcessors = [];
        this.commandsConverter = new CommandsConverter(this);
    }

    get converter(): CommandsConverter {
        return this.commandsConverter;
    }
    private _pluginId: string;

    public setPluginId(pluginId: string): void {
        this._pluginId = pluginId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerCommand(command: theia.CommandDescription, handler?: theia.CommandHandler, thisArg?: any): Disposable {
        if (this.commands.has(command.id)) {
            throw new Error(`Command ${command.id} already exist`);
        }
        this.commands.add(command.id);
        this.proxy.$registerCommand(command, this._pluginId);

        const toDispose: Disposable[] = [];
        if (handler) {
            toDispose.push(this.registerHandler(command.id, handler));
        }
        toDispose.push(Disposable.create(() => {
            this.commands.delete(command.id);
            this.proxy.$unregisterCommand(command.id);
        }));
        return Disposable.from(...toDispose);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerHandler(commandId: string, handler: theia.CommandHandler): Disposable {
        if (this.handlers.has(commandId)) {
            throw new Error(`Command "${commandId}" already has handler`);
        }
        this.proxy.$registerHandler(commandId);
        this.handlers.set(commandId, handler);
        this.pluginCommands.set(commandId, this._pluginId);
        return Disposable.create(() => {
            this.handlers.delete(commandId);
            this.pluginCommands.delete(commandId);
            this.proxy.$unregisterHandler(commandId);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $executeCommand<T>(id: string, ...args: any[]): Promise<T | undefined> {
        if (this.handlers.has(id)) {
            return this.executeLocalCommand(id, ...args);
        } else {
            return Promise.reject(new Error(`Command: ${id} does not exist.`));
        }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    executeCommand<T>(id: string, ...args: any[]): PromiseLike<T | undefined> {
        if (this.handlers.has(id)) {
            if (this.pluginCommands.get(id) === this._pluginId || this.pluginManager.hasCommand(id))
                return this.executeLocalCommand(id, ...args);
            return Promise.reject(new Error(`Command ${id} not found or not exported`));
        } else if (KnownCommands.mapped(id)) {
            // Using the KnownCommand exclusions, convert the commands manually
            return KnownCommands.map(id, args, (mappedId: string, mappedArgs: any[] | undefined, mappedResult: KnownCommands.ConversionFunction) => {
                const mr: KnownCommands.ConversionFunction = mappedResult;
                return this.proxy.$executeCommand({ commandId: mappedId, pluginId: this._pluginId }, ...mappedArgs || []).then((result: any) => {
                    if (!result) {
                        return undefined;
                    }
                    if (!mr) {
                        return result;
                    }
                    return mr(result);
                });
            }
            );
        } else {
            return this.proxy.$executeCommand({ commandId: id, pluginId: this._pluginId }, ...args);
        }
    }

    $isEnabled(id: string, ...args: any[]): Promise<boolean> {
        if (this.handlers.has(id)) {
            const handler = this.handlers.get(id);

            if (handler && typeof handler.isEnabled === 'function') {
                return Promise.resolve(handler.isEnabled(...args));
            }

            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    getKeyBindingForCommand(commandId: string): PromiseLike<theia.CommandKeyBinding[] | undefined> {
        return this.proxy.$getKeyBindingForCommand(commandId);
    }

    getKeyBindingForKeybinding(keyBinding: string): PromiseLike<theia.CommandKeyBinding[] | undefined> {
        return this.proxy.$getKeyBindingForKeybinding(keyBinding);
    }

    editKeybinding(keyBinding: theia.CommandKeyBinding): PromiseLike<boolean> {
        return this.proxy.$editKeybinding(keyBinding);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async executeLocalCommand<T>(id: string, ...args: any[]): Promise<T | undefined> {
            const handler = this.handlers.get(id);

            if (handler) {
                const processedArgs = args.map(arg =>
                    this.argumentProcessors.reduce((currentValue, processor) => processor.processArgument(currentValue), arg)
                );

                if (typeof handler === 'function') {
                    return (handler as Function)(...processedArgs);
                }
                else if (typeof handler === 'object' && handler.execute) {
                    return handler.execute(...processedArgs);
                }
                else {
                    throw new Error(`Invalid handler format for command '${id}'`);
                }
            } else {
                throw new Error(`No handler exists for command '${id}'`);
            }
        }

    async getCommands(filterUnderscoreCommands: boolean = false): Promise<string[]> {
        const result = await this.proxy.$getCommands();
        if (filterUnderscoreCommands) {
            return result.filter(command => command[0] !== '_');
        }
        return result;
    }

    registerArgumentProcessor(processor: ArgumentProcessor): void {
        this.argumentProcessors.push(processor);
    }
}

// copied and modified from https://github.com/microsoft/vscode/blob/1.37.1/src/vs/workbench/api/common/extHostCommands.ts#L217-L259
export class CommandsConverter {

    private readonly safeCommandId: string;
    private readonly commands: CommandRegistryImpl;
    private readonly commandsMap = new Map<number, theia.Command>();
    private handle = 0;
    private isSafeCommandRegistered: boolean;

    constructor(commands: CommandRegistryImpl) {
        this.safeCommandId = `theia_safe_cmd_${Date.now().toString()}`;
        this.commands = commands;
        this.isSafeCommandRegistered = false;
    }

    /**
     * Convert to a command that can be safely passed over JSON-RPC.
     */
    toSafeCommand(command: undefined, disposables: DisposableCollection): undefined;
    toSafeCommand(command: theia.Command, disposables: DisposableCollection): model.Command;
    toSafeCommand(command: theia.Command | undefined, disposables: DisposableCollection): model.Command | undefined;
    toSafeCommand(command: theia.Command | undefined, disposables: DisposableCollection): model.Command | undefined {
        if (!command) {
            return undefined;
        }

        const result = this.toInternalCommand(command);
        if (KnownCommands.mapped(result.id)) {
            return result;
        }

        if (!this.isSafeCommandRegistered) {
            this.commands.registerCommand(
                { id: this.safeCommandId },
                {
                    execute: (...args: any[]) => Promise.resolve(this.executeSafeCommand(...args))
                }
            );
            this.isSafeCommandRegistered = true;
        }

        if (command.arguments && command.arguments.length > 0) {
            const id = this.handle++;
            this.commandsMap.set(id, command);
            disposables.push(new Disposable(() => this.commandsMap.delete(id)));
            result.id = this.safeCommandId;
            result.arguments = [id];
        }

        return result;
    }

    protected toInternalCommand(external: theia.Command): model.Command {
        // we're deprecating Command.id, so it has to be optional.
        // Existing code will have compiled against a non - optional version of the field, so asserting it to exist is ok
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return KnownCommands.map(external.command, external.arguments, (mappedId: string, mappedArgs: any[]) =>
        ({
            id: mappedId,
            title: external.title || ' ',
            tooltip: external.tooltip,
            arguments: mappedArgs
        }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private executeSafeCommand<R>(...args: any[]): PromiseLike<R | undefined> {
        const handle = args[0];
        if (typeof handle !== 'number') {
            return Promise.reject(`Invalid handle ${handle}`);
        }
        const command = this.commandsMap.get(handle);
        if (!command || !command.command) {
            return Promise.reject(`Safe command with handle ${handle} not found`);
        }
        const allArgs = (command.arguments ?? []).concat(args.slice(1));
        return this.commands.executeCommand(command.command, ...allArgs);
    }

}

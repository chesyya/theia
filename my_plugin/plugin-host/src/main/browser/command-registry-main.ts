import { interfaces } from '@theia/core/shared/inversify';
import { CommandRegistry } from '@theia/core/lib/common/command';
import * as theia from '@baosky/plugin';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { CommandRegistryMain, CommandRegistryExt, MAIN_RPC_CONTEXT } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { KeybindingRegistry, KeybindingScope, KeySequence } from '@theia/core/lib/browser';
import { PluginContributionHandler } from './plugin-contribution-handler';
import { ArgumentProcessor } from '../../common/commands';
import { ContributionProvider } from '@theia/core';
import * as common from '@theia/core/lib/common/keybinding';
import { KeymapsService } from '@theia/keymaps/lib/browser/keymaps-service';
import { IPluginCommandManager } from './command/plugin-command-manager-protocol';

export const ArgumentProcessorContribution = Symbol('ArgumentProcessorContribution');

export class CommandRegistryMainImpl implements CommandRegistryMain, Disposable {
    private readonly proxy: CommandRegistryExt;
    private readonly commands = new Map<string, Disposable>();
    private readonly handlers = new Map<string, Disposable>();
    private readonly delegate: CommandRegistry;
    private readonly keyBinding: KeybindingRegistry;
    private readonly contributions: PluginContributionHandler;
    private readonly keymapsService: KeymapsService;
    private readonly commandManager: IPluginCommandManager;

    private readonly argumentProcessors: ArgumentProcessor[] = [];

    protected readonly toDispose = new DisposableCollection();

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.COMMAND_REGISTRY_EXT);
        this.delegate = container.get(CommandRegistry);
        this.keyBinding = container.get(KeybindingRegistry);
        this.contributions = container.get(PluginContributionHandler);
        this.keymapsService = container.get(KeymapsService);
        this.commandManager = container.get(IPluginCommandManager);

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

    $registerCommand(command: theia.CommandDescription, pluginId?: string): void {
        const id = command.id;
        this.commands.set(id, this.contributions.registerCommand(command, undefined, pluginId));
        this.toDispose.push(Disposable.create(() => this.$unregisterCommand(id)));
    }
    $unregisterCommand(id: string, pluginId?: string): void {
        this.commandManager.unregisterCommand(id, pluginId);
        const command = this.commands.get(id);
        if (command) {
            command.dispose();
            this.commands.delete(id);
        }
    }

    $registerHandler(id: string): void {
        const proxyHandler: theia.CommandHandler = {
            execute: (...args) => {
                const convertedArgs = args.map(arg =>
                    this.argumentProcessors.reduce((val, processor) => processor.processArgument(val), arg)
                );
                return this.proxy.$executeCommand(id, ...convertedArgs);
            },

            isEnabled: (...args) => {
                const convertedArgs = args.map(arg =>
                    this.argumentProcessors.reduce((val, processor) => processor.processArgument(val), arg)
                );
                return this.proxy.$isEnabled(id, ...convertedArgs);
            }
        };

        this.handlers.set(id, this.contributions.registerCommandHandler(id, proxyHandler));

        this.toDispose.push(Disposable.create(() => this.$unregisterHandler(id)));
    }

    $unregisterHandler(id: string): void {
        this.commandManager.unregisterPluginHandler(id);
        const handler = this.handlers.get(id);
        if (handler) {
            handler.dispose();
            this.handlers.delete(id);
        }

    }


    /**
     * @description 1.内置插件的command目前是全部允许直接调用的，后续会应用命令级别的不同权限管理
     * 2.自己的组件比如说语言服务这些有一个白名单
     * @date 2025-12-02
     * @author 滕志宇
     *
     * @async
     * @template T
     * @param {string} id
     * @param {...any[]} args
     * @returns {Promise<T | undefined>}
     */
    public async $executeCommand<T>(id: string | { commandId: string, pluginId: string }, ...args: any[]): Promise<T | undefined> {
        return this.commandManager.executeCommand(id, ...args)
    }

    $getKeyBindingForCommand(commandId: string): PromiseLike<theia.CommandKeyBinding[] | undefined> {
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


    /**
     * 获取指定快捷键对应的命令列表
     * @date 2025/10/20 - 15:16:05 PM
     * @author wubing
     *
     * @async
     * @param {string} keybinding
     * @returns {Promise<theia.CommandKeyBinding[]>}
     */
    async $getKeyBindingForKeybinding(keybinding: string): Promise<theia.CommandKeyBinding[]> {
        const result: theia.CommandKeyBinding[] = [];
        const candidateSeq = this.keyBinding.resolveKeybinding({ keybinding } as any); // 规范化输入

        for (let scope = KeybindingScope.END - 1; scope >= KeybindingScope.DEFAULT; scope--) {
            const bindings = this.keyBinding.getKeybindingsByScope(scope);
            for (const binding of bindings) {
                const bindingSeq = this.keyBinding.resolveKeybinding(binding);
                if (KeySequence.equals(candidateSeq, bindingSeq)) {
                    result.push({
                        id: binding.command,
                        value: binding.keybinding
                    });
                }
            }
        }

        return result;
    }


    /**
     * 为指定命令设置快捷键
     * @date 2025/10/20 - 15:16:14 PM
     * @author wubing
     *
     * @async
     * @param {theia.CommandKeyBinding} keyBinding
     * @returns {Promise<boolean>}
     */
    async $editKeybinding(keyBinding: theia.CommandKeyBinding): Promise<boolean> {
        try {
            const keybindings = this.keyBinding.getKeybindingsForCommand(keyBinding.id);
            const oldKeybinding = keybindings.length > 0 ? keybindings[0] : undefined;

            if (keyBinding.checkConflict) {
                // 冲突检查
                const { value } = keyBinding;
                const keybinding: common.Keybinding = {
                    command: keyBinding.id,
                    keybinding: keyBinding.value
                }

                const defaultBindings = this.keyBinding.getKeybindingsByScope(KeybindingScope.DEFAULT);
                const candidate = this.keyBinding.resolveKeybinding(keybinding);
                const result = new KeybindingRegistry.KeybindingsResult();
                for (const binding of defaultBindings) {
                    const bindingKeySequence = this.keyBinding.resolveKeybinding(binding);
                    const compareResult = KeySequence.compare(candidate, bindingKeySequence);
                    switch (compareResult) {
                        case KeySequence.CompareResult.FULL: {
                            result.full.push(binding);
                            break;
                        }
                        case KeySequence.CompareResult.PARTIAL: {
                            result.partial.push(binding);
                            break;
                        }
                        case KeySequence.CompareResult.SHADOW: {
                            result.shadow.push(binding);
                            break;
                        }
                    }
                }

                if (result.full.length > 0 || result.partial.length > 0 || result.shadow.length > 0) {
                    console.warn(`禁止修改，快捷键 ${value} 的修改将导致冲突:`, result);
                    return false;
                }
            }

            await this.keymapsService.setKeybinding({
                ...oldKeybinding,
                command: keyBinding.id,
                keybinding: keyBinding.value
            }, oldKeybinding);
            return true;
        } catch (e) {
            throw new Error(`为命令 '${keyBinding.id}' 设置快捷键失败: ${e}`);
        }
    }

    $getCommands(): PromiseLike<string[]> {
        return Promise.resolve(this.delegate.commandIds);
    }

}

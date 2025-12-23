/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-02 14:29:06
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/command/plugin-command-manager.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { CommonConfirmDialog } from "@baosky/platform/lib/browser/common-dialog/common-confirm-dialog";
import { CommandHandler, CommandRegistry, Disposable } from "@theia/core";
import { IPluginCommandManager } from "./plugin-command-manager-protocol";
import { inject, injectable } from "@theia/core/shared/inversify";
import { BaoskyCommand, CommandPermissionLevel } from "@baosky/platform/lib/browser/framework/command/baosky-command";
import { bnls } from '@baosky/platform/lib/common/bnls';


const PERMITTED_PLUGIN_COMMANDS: string[] = [
    "lsp.statusbar.change",
    "extension.st.lsp.ready",
    "extension.st.lsp.prepare",
    "st.languageService.startArgs",
    "lsp.symbolChanges",
    "lsp.addressChange",
    "lsp.ldBodyReferenceChanged",
    "lsp.subscribedComments",
];



//TODO:这里的plugin的undefined配置项等后续  所有plugin适配后再改成强制string
/**
 * @description 插件command管理服务 
 * @date 2025-12-02
 * @author 滕志宇
 *
 * @class PluginCommandManagerImp
 * @typedef {PluginCommandManagerImp}
 * @implements {IPluginCommandManager}
 */
@injectable()
export class PluginCommandManagerImp implements IPluginCommandManager {

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    private readonly _commandHandlers = new Map<string, CommandHandler['execute'] | undefined>();
    private pluginCommands = new Map<string, { [commandId: string]: string }>();

    /**
     * @description 获取插件command权限 
     */
    public getPluginPermission(pluginId: string): boolean {
        //TODO:待确认
        return true;
    }


    //内置的  有天行授权的并且是天行自己的  有天行授权并且是第三方    

    public registerCommand(pluginId: string | undefined, command: BaoskyCommand, handler?: CommandHandler): Disposable {
        if (command.permissionLevel === undefined) {
            command.permissionLevel = CommandPermissionLevel.PLUGIN_PUBLIC;
        }

        if (pluginId) {
            const dictionary = this.pluginCommands.get(pluginId);
            if (dictionary) {
                dictionary[command.id] = command.id;
            } else {
                this.pluginCommands.set(pluginId, { [command.id]: command.id })
            }
        }

        this._commandHandlers.set(command.id, undefined);
        return this.commandRegistry.registerCommand(command, handler);
    }

    public unregisterCommand(pluginId: string | undefined, commandId: string): void {
        if (pluginId) {
            const dictionary = this.pluginCommands.get(pluginId);
            if (dictionary && dictionary[commandId]) {
                delete dictionary[commandId]
            }
        }
        this._commandHandlers.set(commandId, undefined);
        this.commandRegistry.unregisterCommand(commandId)
    }

    public registerCommandHandler(id: string, handler: CommandHandler): Disposable {
        return this.commandRegistry.registerHandler(id, handler);
    }

    public registerPluginHandler(id: string, handler: CommandHandler['execute']): void {
        this._commandHandlers.set(id, handler);
    }

    public unregisterPluginHandler(id: string): void {
        this._commandHandlers.delete(id);
    }

    public getPluginHandler(id: string): CommandHandler['execute'] | undefined {
        return this._commandHandlers.get(id);
    }

    public async tryGetCommandPermission(pluginId: string | undefined, commandId: string): Promise<boolean> {
        const command: BaoskyCommand = this.commandRegistry.getCommand(commandId) as BaoskyCommand;
        if (command) {
            if (command.permissionLevel === CommandPermissionLevel.BAOSKY_PRIVATE) {
                return false;
            } else if (command.permissionLevel === CommandPermissionLevel.BAOSKY_PROTECTED) {
                if (pluginId) {
                    if (this.getPluginPermission(pluginId)) {
                        return true;
                    } else {
                        //TODO:弹窗
                        // const confirmDialog = new CommonConfirmDialog({
                        //     msg: "请授权是否允许插件操作文件",
                        //     title: "用户授权"
                        // });
                        // return await confirmDialog.open() ?? false;
                        return false;
                    }
                } else {
                    return true;
                }
            } else if (command.permissionLevel === CommandPermissionLevel.PLUGIN_PUBLIC) {
                return true;
            } else if (command.permissionLevel === CommandPermissionLevel.PLUGIN_PRIVATE) {
                const dictionary = pluginId ? (this.pluginCommands.get(pluginId) ?? {}) : {};
                return dictionary[commandId] !== undefined;
            }
        }
        return false;
    }

    public async executeCommand<T>(id: string | { commandId: string, pluginId: string }, ...args: any[]): Promise<T | undefined> {
        let realCommandId = ""; let realPluginId: string | undefined = undefined;
        if (typeof id === "string") {
            realCommandId = id;
        } else if (typeof id === "object") {
            realCommandId = id.commandId;
            realPluginId = id.pluginId;
        } else {
            throw new Error(`Command id is illegal!!`)
        }

        if (!this.commandRegistry.getCommand(realCommandId)) {
            throw new Error(`Command with id '${realCommandId}' is not registered.`);
        }
        try {
            if (await this.tryGetCommandPermission(realPluginId, realCommandId)) {
                return await this.commandRegistry.executeCommand<T>(realCommandId, ...args);
            } else {
                throw new Error(bnls.localizeByDefault(`用户授权失败，无法执行该命令,id为${realCommandId}`))
            }
        } catch (e) {
            // Command handler may be not active at the moment so the error must be caught. See https://github.com/eclipse-theia/theia/pull/6687#discussion_r354810079
            if ('code' in e && e['code'] === 'NO_ACTIVE_HANDLER') {
                return;
            } else {
                throw e;
            }
        }
    }
}



/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-08 09:16:12
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/command/mock-plugin-command-manager.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */

import { BaoskyCommand } from "@baosky/platform/lib/browser/framework/command/baosky-command";
import { CommandHandler, Disposable } from "@theia/core";
import { IPluginCommandManager } from "./plugin-command-manager-protocol";


export class MockPluginCommandManager implements IPluginCommandManager {
    executeCommand<T>(id: string | { commandId: string; pluginId: string; }, ...args: any[]): Promise<T | undefined> {
        throw new Error("Method not implemented.");
    }
    registerCommand(pluginId: string | undefined, command: BaoskyCommand, handler?: CommandHandler): Disposable {
        throw new Error("Method not implemented.");
    }
    unregisterCommand(commandId: string, pluginId: string | undefined): void {
        throw new Error("Method not implemented.");
    }
    registerCommandHandler(id: string, handler: CommandHandler): Disposable {
        throw new Error("Method not implemented.");
    }
    registerPluginHandler(id: string, handler: CommandHandler["execute"]): void {
        throw new Error("Method not implemented.");
    }
    unregisterPluginHandler(id: string): void {
        throw new Error("Method not implemented.");
    }
    getPluginHandler(id: string): CommandHandler["execute"] | undefined {
        throw new Error("Method not implemented.");
    }
    tryGetCommandPermission(commandId: string, pluginId: string | undefined): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}

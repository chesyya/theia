/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-02 15:59:01
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/command/plugin-command-manager-protocol.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */

import { BaoskyCommand } from "@baosky/platform/lib/browser/framework/command/baosky-command";
import { CommandHandler, Disposable } from "@theia/core";

export const IPluginCommandManager = Symbol("IPluginCommandManager");
/**
 * @description Description 
 * @date 2025-12-02
 * @author 滕志宇
 *
 * @interface IPluginCommandManager
 * @typedef {IPluginCommandManager}
 */
export interface IPluginCommandManager {
    /**
     * @description 注册plugin内命令 
     */
    registerCommand(pluginId: string | undefined, command: BaoskyCommand, handler?: CommandHandler): Disposable
    /**
     * @description 取消注册plugin内命令 
     */
    unregisterCommand(commandId: string, pluginId: string | undefined): void
    /**
     * @description 注册command的handler 
     */
    registerCommandHandler(id: string, handler: CommandHandler): Disposable
    /**
     * @description 注册plugin内command的实际handler 
     */
    registerPluginHandler(id: string, handler: CommandHandler['execute']): void
    /**
     * @description 取消注册plugin内command的handler 
     */
    unregisterPluginHandler(id: string): void
    /**
     * @description 获取plugin内command的handler 
     */
    getPluginHandler(id: string): CommandHandler['execute'] | undefined
    /**
     * @description 尝试获取命令权限    当前逻辑：plugin注册命令可以免确认直接相互调用，但是plugin外命令需要用户二次确认授权才能调用
     */
    tryGetCommandPermission(commandId: string, pluginId: string | undefined): Promise<boolean>
    /**
     * @description 执行命令  会做命令权限判断 
     */
    executeCommand<T>(id: string | { commandId: string, pluginId: string }, ...args: any[]): Promise<T | undefined>
}


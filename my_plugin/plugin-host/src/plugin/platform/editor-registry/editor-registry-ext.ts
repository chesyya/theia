/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-12 15:08:12
 * @FilePath: /workdir/packages/plugin-host/src/plugin/platform/editor-registry/editor-registry-ext.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { PLUGIN_RPC_CONTEXT, EditorRegistryExt, EditorRegistryMain } from "../../../common";
import * as baosky from '@baosky/plugin'
import { RPCProtocol } from "../../../common/rpc-protocol";
import { Disposable } from "@theia/core/shared/vscode-languageserver-protocol";
import { ToolbarInfo } from "../../../main/browser/platform/editor-registry/editor-registry-main";

export class EditorRegistryExtImpl implements EditorRegistryExt {
    protected readonly proxy: EditorRegistryMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.EDITOR_REGISTRY_MAIN);
    }

    async registerToolbar(toolbarItems: baosky.ToolbarItem[]): Promise<Disposable[]> {
        const toolbarInfos: ToolbarInfo[] = await this.proxy.$registerToolbar(toolbarItems);
        return toolbarInfos.map(info => {
            return {
                dispose: () => {
                    this.proxy.$unregisterToolbar(info);
                }
            };
        });
    }

}

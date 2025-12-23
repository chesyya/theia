/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-11-27 10:52:31
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/plc/plc-main.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { interfaces } from "@theia/core/shared/inversify";
import { PlcMain } from "../../../common";
import { MaybePromise, URI } from '@theia/core';
import { GlobalQuickfixProvider } from '@baosky/plc-protocol/lib/browser/quick-fix/quick-fix-interface';
import * as baosky from '@baosky/plugin';
import { CreateProps, OpenPLCVariableService } from '@baosky/plc-protocol/lib/browser/variable-table/service/open-plc-variable-service';
import { CreateProps as CreateTaskProps, OpenPLCTaskService } from '@baosky/plc-protocol/lib/browser/software/task/open-plc-task-service';
import { NameSpaceService } from "@baosky/plc-protocol/lib/browser/software/namespace/namespace-service";

export class PlcMainImpl implements PlcMain {

    protected readonly globalQuickfixProvider: GlobalQuickfixProvider;
    protected readonly nameSpaceService: NameSpaceService;
    protected openPLCVariableService: OpenPLCVariableService;
    protected openPLCTaskService: OpenPLCTaskService;

    callbacks = new Map<number, () => MaybePromise<void>>();
    private callbackCounter = 0;

    constructor(container: interfaces.Container) {
        this.globalQuickfixProvider = container.get(GlobalQuickfixProvider);
        this.nameSpaceService = container.get(NameSpaceService);

        this.openPLCVariableService = container.get(OpenPLCVariableService);
        this.openPLCTaskService = container.get(OpenPLCTaskService);
    }

    public async $provideQuickFixAction(plcName: string) {
        const callbackId = this.callbackCounter++;
        const fn = await this.globalQuickfixProvider.provideQuickFixAction(plcName);
        this.callbacks.set(callbackId, fn);
        return callbackId;
    }

    /**
     * @description 获取plc下默认的namespace 
     */
    public async $getDefaultNamespace(plcName: string): Promise<string> {
        return this.nameSpaceService.getDefaultNamespace(plcName);
    }

    $importPLCopen(options: baosky.ImportPLCopenOptions): Promise<void> {
        if (options.type === 'task')
            return this.openPLCTaskService.create(URI.fromComponents(options.targetUri), options.plcName, options.props as CreateTaskProps);
        return this.openPLCVariableService.create(URI.fromComponents(options.targetUri), options.props as CreateProps);
    }

    async $invokeFunction(callbackId: number) {
        const callback = this.callbacks.get(callbackId);
        if (!callback) {
            throw new Error(`Callback ${callbackId} 未找到。`);
        }

        return await callback();
    }

}

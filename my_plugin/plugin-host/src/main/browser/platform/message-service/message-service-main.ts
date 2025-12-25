/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-12 15:08:12
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/platform/message-service/message-service-main.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { PlatformMessageServiceMain } from "../../../../common";
import * as baosky from '@baosky/plugin';
import { RoutineInfoService } from '@baosky/platform/lib/browser/info-view/routine/routine-info-service'
import { interfaces } from "@theia/core/shared/inversify";

export class PlatformMessageServiceMainImpl implements PlatformMessageServiceMain {
    protected readonly routineInfoService: RoutineInfoService;

    constructor(container: interfaces.Container) {
        this.routineInfoService = container.get(RoutineInfoService);
    }
    $pushRoutineInfo(routineInfo: baosky.RoutineInfo): void {
        this.routineInfoService.pushInformation(routineInfo);
    }

}

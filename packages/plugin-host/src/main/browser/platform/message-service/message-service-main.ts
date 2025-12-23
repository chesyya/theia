import { PlatformMessageServiceMain } from "../../../../common";
import * as baosky from '@baosky/plugin';
import { RoutineInfoService } from '@baosky/platform/lib/browser/info-view/routine/routine-info-service'
import { interfaces } from "@theia/core/shared/inversify";

export class PlatformMessageServiceMainImpl implements PlatformMessageServiceMain {
    protected readonly routineInfoService: RoutineInfoService;

    constructor(container: interfaces.Container) {
        this.routineInfoService = container.get(RoutineInfoService);
    }
    $pushRoutineInfo(routineInfo: baosky.platform.RoutineInfo): void {
        this.routineInfoService.pushInformation(routineInfo);
    }

}

import * as baosky from '@baosky/plugin';
import { RoutineInfoService } from '@baosky/platform/lib/browser/info-view/routine/routine-info-service'
import { interfaces } from "@theia/core/shared/inversify";
import { UserServiceMain } from "../../../common";
import { UserLoginController } from '@baosky/project/lib/browser/es-server/controller/user-login-controller'

export class UserServiceMainImpl implements UserServiceMain {

    protected readonly userLoginController: UserLoginController;
    constructor(container: interfaces.Container) {
        this.userLoginController = container.get(UserLoginController);
    }

    $isAdminUser(): boolean {
        return this.userLoginController.isAdminLogin();
    }

    async $getUserInfo(): Promise<baosky.platform.UserInfo | undefined> {
        const userInfo = await this.userLoginController.getCurrentUser();
        return userInfo ?? undefined;
    }
}

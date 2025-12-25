/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-12-12 15:08:12
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/project/user-service-main.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import * as baosky from '@baosky/plugin';
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

    async $getUserInfo(): Promise<baosky.UserInfo | undefined> {
        const userInfo = await this.userLoginController.getCurrentUser();
        return userInfo ?? undefined;
    }
}

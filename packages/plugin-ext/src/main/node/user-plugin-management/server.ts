import { MaybePromise } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/src/node';
import { injectable } from '@theia/core/shared/inversify';
import * as os from 'os';

@injectable()
export class ServerModel implements BackendApplicationContribution {
    private _isAdmin: boolean = false;
    private _user: string = 'default';

    onStart(): MaybePromise<void> {
        this.initializeUserInfo();
    }

    private initializeUserInfo(): void {
        // 获取系统用户信息
        const userInfo = os.userInfo();
        this._user = userInfo.username || 'default';
        
        // 检查是否为管理员（简单判断：root用户或具有管理员权限）
        this._isAdmin = userInfo.username === 'root' || 
                       userInfo.uid === 0 || 
                       process.getuid?.() === 0;
        
        // 也可以从环境变量覆盖
        if (process.env.THEIA_CURRENT_USER) {
            this._user = process.env.THEIA_CURRENT_USER;
        }
        
        if (process.env.THEIA_IS_ADMIN === 'true') {
            this._isAdmin = true;
        } else if (process.env.THEIA_IS_ADMIN === 'false') {
            this._isAdmin = false;
        }
        
        console.log(`[ServerModel] 用户信息初始化: user=${this._user}, isAdmin=${this._isAdmin}, uid=${userInfo.uid}`);
    }

    public getCurrentUser(): string {
        return this._user;
    }

    public isAdmin(): boolean {
        return this._isAdmin;
    }
}

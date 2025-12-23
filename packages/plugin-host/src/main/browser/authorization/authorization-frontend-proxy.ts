import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { ILogger } from '@theia/core/lib/common/logger';
import { AuthorizationStatus, IAuthorizationClient, IAuthorizationService, IAuthorizationStatusChangeEvent, PluginIdentifier, IAuthorizationRPC } from '../../../common/authorization/i-authorization-service';
// import { AuthorizationClientImpl } from './authorization-client-impl';
import { SystemEventSubscriber } from '@baosky/platform/lib/browser/events/system-event-subscriber';
import { EventId } from '@baosky/platform/lib/browser/events/events';
import { LicenseServiceImpl } from '@baosky/platform/lib/browser/license/impl/license-service-impl'
import { RESOURCE_IDS } from '@baosky/platform/lib/common/license/license-server';
import { HostedPluginServer, PluginIdentifiers } from '../../../common';
import { LicenseableResource } from '@baosky/platform/lib/common/license/license-data-struct';
import { BaoskyConfigServer } from '@baosky/platform/lib/common/baosky-config/baosky-config-server';
import { UserLoginController } from '@baosky/project/lib/browser/es-server/controller/user-login-controller';
import { USER_NAME } from '@baosky/project/lib/browser/es-server/controller/impl/user-login-controller-impl';
import { HostedPluginWatcher } from '../../../hosted/browser/hosted-plugin-watcher';


/**
 * AuthorizationFrontendProxy
 * 初始化的时候会从platform拿attributes 并维护map
 * 每次许可证更新，过滤出所有与插件有关的id，发送事件给所有监听的插件更新status
 * @date 2025-11-27 , 2:05:52 pm
 * @author 南天远
 *
 * @export
 * @class AuthorizationFrontendProxy
 * @typedef {AuthorizationFrontendProxy}
 * @implements {IAuthorizationService}
 * @implements {IAuthorizationClient}
 */
@injectable()
export class AuthorizationFrontendProxy implements IAuthorizationService, IAuthorizationClient {
    @inject(SystemEventSubscriber) protected readonly subscriber: SystemEventSubscriber;
    @inject(LicenseServiceImpl) protected readonly licenseServiceImpl: LicenseServiceImpl;
    @inject(HostedPluginServer) protected readonly pluginServer: HostedPluginServer;
    @inject(UserLoginController) protected readonly userLoginController: UserLoginController;
    @inject(BaoskyConfigServer) protected readonly baoskyConfigServer: BaoskyConfigServer;
    @inject(HostedPluginWatcher) protected readonly hostedPluginWatcher: HostedPluginWatcher;
    private readonly _onDidUpdateAuthorizationStatus = new Emitter<IAuthorizationStatusChangeEvent>();
    private readonly disposables = new DisposableCollection();
    public initialized: Promise<void>;
    // 本地缓存的授权状态存储
    private readonly authorizationCache = new Map<PluginIdentifier, AuthorizationStatus>();
    private logger: ILogger;

    constructor(
        @inject(ILogger) protected readonly rootLogger: ILogger,
        // @inject(IAuthorizationRPC) protected readonly rpcProxy: IAuthorizationService,
        // @inject(AuthorizationClientImpl) protected readonly client: AuthorizationClientImpl
    ) {
        this.logger = this.rootLogger.child(`[PLUGIN-HOST] ${AuthorizationFrontendProxy.name}`);
    }

    @postConstruct()
    protected init(): void {
        this.doInit();

        //监听授权变更系统事件
        this.subscriber.subscribe(
            EventId.LICENSE_UPDATE_DATA, {
            notify: async (event) => {
                const pluginId: string[] = event.get(RESOURCE_IDS);
                for( const id of pluginId){
                    if (this.authorizationCache.has(id)) {
                        const status = await this.getAuthorizationStatus(id);
                        if (status == AuthorizationStatus.GRANTED){
                            this.grantAuthorization(id);
                        }else{
                            this.revokeAuthorization(id);
                        }
                    }
                }
            }
        });
        this.logger.info('AuthorizationFrontendProxy 初始化完成');
    }

    /**
     * 异步初始化
     * @date 2025-11-27 , 2:51:43 pm
     * @author 南天远
     *
     * @protected
     * @async
     * @returns {Promise<void>}
     */
    protected async doInit(): Promise<void> {
         //一次性获取当前部署插件的授权状态
        if (await this.baoskyConfigServer.getESServerMode()) {
            this.subscriber.subscribe(
            EventId.LOGIN, {
                notify: async (event) => {
                    let username = event.get(USER_NAME);
                    await this.initializeDefaultStates(username);
                }
            }
         )
        }else{
            await this.initializeDefaultStates();
        }
    }

    get onDidUpdateAuthorizationStatus() {
        return this._onDidUpdateAuthorizationStatus.event;
    }

    updateAuthorizationStatus(event: IAuthorizationStatusChangeEvent): void {
        this._onDidUpdateAuthorizationStatus.fire(event);
    }

    //从platform获取授权状态
    // async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {
    //     try {
    //         const result = await this.rpcProxy.getAuthorizationStatus(pluginId);
    //         return result;
    //         // const result = await this.licenseServiceImpl.getAttributesByIDEResource([pluginId]);
    //         // return result[0].attributes.length == 0 ? AuthorizationStatus.DENIED : AuthorizationStatus.GRANTED;
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    /**
     * 获取授权状态
     * @date 2025-11-27 , 2:20:24 pm
     * @author 南天远
     *
     * @async
     * @param {PluginIdentifier} pluginId
     * @returns {Promise<AuthorizationStatus>}
     */
    async getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus> {

        // 检查缓存
        const cachedStatus = this.authorizationCache.get(pluginId);
        if (cachedStatus) {
        return cachedStatus;
        }

        // 缓存中没有，从platform获取并存储
        try {
        const authState: LicenseableResource[] =
            await this.licenseServiceImpl.getAttributesByIDEResource([pluginId]);
        if (authState.length === 0) return AuthorizationStatus.DENIED;
        // attributeKey: 'enable', attributeValue : true
        const status =
            authState?.[0]?.attributes?.some(
            (att) => att.attributeKey === "enable" && att.attributeValue === true
            ) ?? false;
        const authorizationStatus = this.convertToAuthorizationStatus(status);
        this.authorizationCache.set(pluginId, authorizationStatus);
        return authorizationStatus;

        // const result = await this.rpcProxy.getAuthorizationStatus(pluginId);
        // this.authorizationCache.set(pluginId, { status: result });
        // return result;
        } catch (error) {
        this.logger.error(`获取授权状态失败:`, error);
        return AuthorizationStatus.DENIED;
        }
    }

    grantAuthorization(pluginId: PluginIdentifier): void {
        try {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId: pluginId,
                status: AuthorizationStatus.GRANTED,
                previousStatus: this.authorizationCache.get(pluginId)
            }
            this.updateAuthorizationStatus(event);
        } catch (error) {
            throw error;
        }
    }

    revokeAuthorization(pluginId: PluginIdentifier): void {
        try {
            const event: IAuthorizationStatusChangeEvent = {
                pluginId: pluginId,
                status: AuthorizationStatus.DENIED,
                previousStatus: this.authorizationCache.get(pluginId)
            }
            this.updateAuthorizationStatus(event);
        } catch (error) {
            throw error;
        }
    }

    async getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>> {
        try {
            return this.authorizationCache;
        } catch (error) {
            throw error;
        }
    }

    /**
    * 初始化默认授权状态
    */
    async initializeDefaultStates(userName?: string): Promise<void> {

        const deployedPluginIds = await this.pluginServer.getDeployedPluginIds(userName);
        const pluginIds: string[] = deployedPluginIds.map(id => PluginIdentifiers.unversionedFromVersioned(id));

        // 通过platform服务的接口获取每个id的授权状态
        const result: LicenseableResource[] = await this.licenseServiceImpl.getAttributesByIDEResource(pluginIds);
        // this.client.setService(this);

        // 处理从服务获取的授权状态数据
        for (const authState of result) {
            const { resourceId, attributes } = authState;
            const status =
            attributes?.some(
            (att) => att.attributeKey === "enable" && att.attributeValue === true
            ) ?? false;

            // 根据attributes判断是否授权，插件只定义属性列表大于0及授权
            const authorizationStatus = this.convertToAuthorizationStatus(status);

            // 存储到本地缓存
            this.authorizationCache.set(resourceId, authorizationStatus);

            this.logger.debug(`插件 ${resourceId} 的授权状态: ${authorizationStatus}`);
        }

    }

    /**
     * 处理授权变更事件,待和platform讨论是否只监听一个事件
     */
    // handleAuthorizationChangeEvent(authorizationChanges: LicenseableResource[]): void {
    //     this.logger.info('收到授权状态变更事件...');
    //     const pluginIds = authorizationChanges.map(id => id.resourceId);

    //     const deployedPluginIds = this.pluginServer.getDeployedPlugins(pluginIds);
    //     for (const change of authorizationChanges) {
    //         const { resourceId, attributes } = change;

    //         if (this.authorizationCache.has(resourceId)) {}

    //     }
    // }

    //将状态转换为 AuthorizationStatus 枚举
    convertToAuthorizationStatus(status: boolean): AuthorizationStatus {
        return status ? AuthorizationStatus.GRANTED : AuthorizationStatus.DENIED;
    }

    dispose(): void {
        this._onDidUpdateAuthorizationStatus.dispose();
        this.disposables.dispose();
        this.authorizationCache.clear();
    }
}

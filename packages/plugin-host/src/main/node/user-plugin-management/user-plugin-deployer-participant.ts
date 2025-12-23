import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { PluginDeployerParticipant, PluginDeployerStartContext } from '../../../common/plugin-protocol';
import { BaoskyConfigServer } from '@baosky/platform/lib/common/baosky-config/baosky-config-server'
import { UserPluginEnvironment } from '../../common/user-plugin-management/user-plugin-environment-service';

/**
 * 用户插件部署参与者
 */
@injectable()
export class UserPluginDeployerParticipant implements PluginDeployerParticipant {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(BaoskyConfigServer)
    protected readonly baoskyConfigServer: BaoskyConfigServer;
    @inject(UserPluginEnvironment)
    protected readonly userPluginEnvironment: UserPluginEnvironment;

    /**
     * 按需加载用户插件
     */
    async onWillStart(context: PluginDeployerStartContext): Promise<void> {

        const enableUserPlugins = await this.baoskyConfigServer.getESServerMode();

        if (!enableUserPlugins) {
            this.logger.info('[PLUGIN-HOST] 非server版本IDE，使用原生插件管理模式');
            return;
        }

        try {
            // 只添加共享插件目录扫描任务
            const sharedPluginsDirUrithis = await this.userPluginEnvironment.getSharedPluginsDirUri();
            context.userEntries.push(sharedPluginsDirUrithis.withScheme('shared-plugins').toString());
            // context.userEntries.push('shared-plugins://');
        } catch (error) {
            this.logger.error('[PLUGIN-HOST] 注册共享插件目录扫描失败:', error);
        }
    }

    /**
     * 扫描用户插件目录
     */
    async scanUserPlugins(userId: string): Promise<string[]> {

        return [`user-plugins://${userId}`];
    }

    /**
     * 扫描共享插件目录
     */
    async scanSharedPluginsOnly(): Promise<string[]> {

        return ['shared-plugins://'];
    }

}

import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { FileUri } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import { PluginDeployerResolver, PluginDeployerResolverContext, PluginDeployerEntry } from '../../../common/plugin-protocol';
import { UserPluginEnvironment } from '../../common/user-plugin-management/user-plugin-environment-service';
import { PluginDeployerResolverContextImpl } from '../plugin-deployer-resolver-context-impl';

/**
 * 用户插件目录解析器
 */
@injectable()
export class UserPluginDirectoryResolver implements PluginDeployerResolver {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserPluginEnvironment)
    protected readonly userPluginEnvironment: UserPluginEnvironment;

    accept(pluginId: string): boolean {
        return pluginId.startsWith('user-plugins:/') ||
            pluginId.startsWith('shared-plugins:/');
    }

    async resolve(pluginResolverContext: PluginDeployerResolverContext): Promise<void> {
        const pluginId = pluginResolverContext.getOriginId();

        try {
            if (pluginId.startsWith('shared-plugins:/')) {
                await this.resolveSharedPlugins(pluginResolverContext);
            } else if (pluginId.startsWith('user-plugins:/')) {
                const userId = this.extractUserIdFromPluginId(pluginId);
                if (userId) {
                    await this.resolveUserPlugins(pluginResolverContext, userId);
                }
            }
        } catch (error) {
            this.logger.error(`[PLUGIN-HOST] 解析插件失败: ${pluginId}`, error);
        }
    }

    /**
     * 解析共享插件目录
     */
    private async resolveSharedPlugins(pluginResolverContext: PluginDeployerResolverContext): Promise<void> {
        const sharedPluginDir = await this.userPluginEnvironment.getSharedPluginsDirUri();
        const sharedPluginPath = FileUri.fsPath(sharedPluginDir);

        await this.scanPluginDirectory(pluginResolverContext, sharedPluginPath, 'shared');
    }

    /**
     * 解析特定用户的插件目录
     */
    private async resolveUserPlugins(pluginResolverContext: PluginDeployerResolverContext, userId: string): Promise<void> {
        const userPluginDir = await this.userPluginEnvironment.getUserPluginsDirUri(userId);
        const userPluginPath = FileUri.fsPath(userPluginDir);

        await this.scanPluginDirectory(pluginResolverContext, userPluginPath, `user:${userId}`);
    }

    /**
     * 扫描插件目录
     */
    private async scanPluginDirectory(
        pluginResolverContext: PluginDeployerResolverContext,
        directoryPath: string,
        source: string
    ): Promise<void> {
        if (!await fs.pathExists(directoryPath)) {
            this.logger.debug(`[PLUGIN-HOST] 目录不存在，跳过: ${directoryPath}`);
            return;
        }

        try {
            const files = await fs.readdir(directoryPath);

            for (const file of files) {
                const filePath = path.resolve(directoryPath, file);
                const stat = await fs.stat(filePath);

                if (stat.isDirectory() || this.isPluginFile(file)) {
                    const pluginName = `${source}:${file}`;
                    pluginResolverContext.addPlugin(pluginName, filePath);
                }
            }

        } catch (error) {
            this.logger.error(`[PLUGIN-HOST] 扫描目录失败: ${directoryPath}`, error);
        }
    }

    /**
     * 判断文件是否为插件文件
     */
    private isPluginFile(filename: string): boolean {
        const ext = path.extname(filename).toLowerCase();
        return ext === '.vsix' || ext === '.tgz' || ext === '.tar.gz';
    }

    /**
     * 从插件ID中提取用户ID
     */
    private extractUserIdFromPluginId(pluginId: string): string | undefined {
        let actualPath = pluginId;
        if (pluginId.startsWith('user-plugins:')) {
            actualPath = pluginId.slice('user-plugins:'.length);
        }

        // 先获取父目录：/root/.baosky/userStorage/admin
        const parentDir = path.dirname(actualPath);
        // 再取父目录的 basename：admin
        return path.basename(parentDir);
    }

    /**
     * 按需解析特定用户的插件（用于会话级加载）
     */
    async resolveUserPluginsOnDemand(userId: string): Promise<PluginDeployerEntry[]> {
        this.logger.info(`[USER-PLUGIN-RESOLVER] 按需解析用户插件: ${userId}`);

        try {
            const context = new PluginDeployerResolverContextImpl(this, `user-plugins://${userId}`);
            await this.resolveUserPlugins(context, userId);

            const plugins = context.getPlugins();
            this.logger.info(`[USER-PLUGIN-RESOLVER] 为用户 ${userId} 解析到 ${plugins.length} 个插件`);

            return plugins;
        } catch (error) {
            this.logger.error(`[USER-PLUGIN-RESOLVER] 按需解析用户插件失败: ${userId}`, error);
            return [];
        }
    }

    /**
     * 按需解析共享插件（用于会话级加载）
     */
    async resolveSharedPluginsOnDemand(): Promise<PluginDeployerEntry[]> {
        this.logger.info('[USER-PLUGIN-RESOLVER] 按需解析共享插件');

        try {
            const context = new PluginDeployerResolverContextImpl(this, 'shared-plugins://');
            await this.resolveSharedPlugins(context);

            const plugins = context.getPlugins();
            this.logger.info(`[USER-PLUGIN-RESOLVER] 解析到 ${plugins.length} 个共享插件`);

            return plugins;
        } catch (error) {
            this.logger.error('[USER-PLUGIN-RESOLVER] 按需解析共享插件失败', error);
            return [];
        }
    }

}

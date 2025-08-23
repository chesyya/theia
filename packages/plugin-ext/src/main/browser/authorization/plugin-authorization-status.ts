import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core';
import { nls } from '@theia/core/lib/common/nls';
import { PluginAuthorizationService, PluginAuthorizationChangeEvent } from '../../../common/authorization';

@injectable()
export class PluginAuthorizationStatus implements FrontendApplicationContribution {
    @inject(PluginAuthorizationService)
    protected readonly authorizationService: PluginAuthorizationService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @postConstruct()
    protected init(): void {
        // 监听授权状态变更
        this.authorizationService.onAuthorizationChanged(event => {
            this.handleAuthorizationChange(event);
        });
    }

    async initialize(): Promise<void> {
        // 获取未授权的插件列表
        const unauthorizedPlugins = await this.authorizationService.getUnauthorizedPluginIds();

        // 如果有未授权的插件，显示提示
        if (unauthorizedPlugins.length > 0) {
            const pluginCount = unauthorizedPlugins.length;
            const message = pluginCount === 1
                ? nls.localize('theia/plugin-ext/single-unauthorized',
                    'Plugin "{0}" is not authorized and has been disabled.',
                    unauthorizedPlugins[0])
                : nls.localize('theia/plugin-ext/multiple-unauthorized',
                    '{0} plugins are not authorized and have been disabled: {1}',
                    pluginCount,
                    unauthorizedPlugins.slice(0, 3).join(', ') + (pluginCount > 3 ? '...' : ''));

            this.messageService.warn(message);
        }
    }

    private handleAuthorizationChange(event: PluginAuthorizationChangeEvent): void {
        const { pluginId, status, previousStatus } = event;

        if (status === 'granted' && previousStatus !== 'granted') {
            // 授权被授予
            const message = nls.localize('theia/plugin-ext/authorization-granted-single',
                'Plugin "{0}" has been authorized and activated.',
                pluginId);
            this.messageService.info(message);
        } else if (status === 'denied' && previousStatus === 'granted') {
            // 授权被撤销
            const message = nls.localize('theia/plugin-ext/authorization-revoked-single',
                'Plugin "{0}" authorization has been revoked and the plugin has been disabled.',
                pluginId);
            this.messageService.warn(message);

            // 对于授权撤销，建议用户重新加载窗口
            this.messageService.warn(
                nls.localize('theia/plugin-ext/reload-suggestion',
                    'Consider reloading the window to ensure complete cleanup of disabled plugins.')
            );
        }
    }
}

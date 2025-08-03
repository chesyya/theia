import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PluginAuthorizationService } from '../common/plugin-authorization-service';
import { MessageService } from '@theia/core';
import { PluginAuthorizationChangeEvent } from '../common/plugin-authorization';
import { nls } from '@theia/core/lib/common/nls';

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
        const { changedPluginIds, changeType } = event;
        
        if (changeType === 'granted') {
            // 授权被授予
            const message = changedPluginIds.length === 1
                ? nls.localize('theia/plugin-ext/authorization-granted-single', 
                    'Plugin "{0}" has been authorized and activated.', 
                    changedPluginIds[0])
                : nls.localize('theia/plugin-ext/authorization-granted-multiple', 
                    '{0} plugins have been authorized and activated.', 
                    changedPluginIds.length);
            
            this.messageService.info(message);
        } else if (changeType === 'revoked') {
            // 授权被撤销
            const message = changedPluginIds.length === 1
                ? nls.localize('theia/plugin-ext/authorization-revoked-single', 
                    'Plugin "{0}" authorization has been revoked and the plugin has been disabled.', 
                    changedPluginIds[0])
                : nls.localize('theia/plugin-ext/authorization-revoked-multiple', 
                    '{0} plugins have had their authorization revoked and have been disabled.', 
                    changedPluginIds.length);
            
            this.messageService.warn(message);
            
            // 对于授权撤销，建议用户重新加载窗口
            if (changedPluginIds.length > 0) {
                this.messageService.warn(
                    nls.localize('theia/plugin-ext/reload-suggestion', 
                        'Consider reloading the window to ensure complete cleanup of disabled plugins.')
                );
            }
        }
    }
}
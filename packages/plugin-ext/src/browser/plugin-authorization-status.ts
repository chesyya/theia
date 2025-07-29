import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PluginAuthorizationService } from '../common/plugin-authorization-service';
import { MessageService } from '@theia/core';

@injectable()
export class PluginAuthorizationStatus implements FrontendApplicationContribution {
    @inject(PluginAuthorizationService)
    protected readonly authorizationService: PluginAuthorizationService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    async initialize(): Promise<void> {
        // 获取未授权的插件列表
        const unauthorizedPlugins = await this.authorizationService.getUnauthorizedPluginIds();
        
        // 如果有未授权的插件，显示提示
        if (unauthorizedPlugins.length > 0) {
            this.messageService.warn(
                `Some plugins are not authorized: ${unauthorizedPlugins.join(', ')}. ` +
                'These plugins are installed but not activated.'
            );
        }
    }
}
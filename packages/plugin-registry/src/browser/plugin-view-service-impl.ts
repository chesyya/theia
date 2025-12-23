import { inject, injectable, interfaces } from "@theia/core/shared/inversify";
import { ApplicationShell, WidgetManager } from "@theia/core/lib/browser";
import { MessageService } from "@theia/core";
import * as semver from 'semver';
import { bnls } from "@baosky/platform/lib/common/bnls";
import { BSXExtensionsModel } from '../common/bsx-extensions-model';
import { CommonConfirmDialogFactory } from '@baosky/platform/lib/browser/common-dialog/common-confirm-dialog';
import { PluginViewService } from '@baosky/plugin-host/lib/common/plugin-view-service'
import { PluginIdentifiers } from "@baosky/plugin-host";
import { BSXExtensionsWidget } from "./bsx-extensions-widget";

@injectable()
export class PluginViewServiceImpl implements PluginViewService{

    @inject(BSXExtensionsModel) protected readonly bSXExtensionsModel: BSXExtensionsModel;
    @inject(CommonConfirmDialogFactory) protected readonly commonConfirmDialogFactory: CommonConfirmDialogFactory;
    @inject(MessageService) protected readonly messageService: MessageService;
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;
    @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell;
        /**
     * 检查插件更新
     * @date 2025/10/15 - 16:18:01 PM
     * @author wubing
     *
     * @async
     * @param {PluginIdentifiers.UnversionedId} pluginId
     * @returns {Promise<void>}
     */
    async checkAndPromptPluginUpdate(pluginId: PluginIdentifiers.UnversionedId): Promise<void> {

            const extension = this.bSXExtensionsModel.getExtension(pluginId);
            if (!extension) {
                throw new Error(`未找到插件: ${pluginId} `);
            }
            if(extension.builtin){
                throw new Error(`内置插件 ${pluginId} 不支持更新`);
            }

            const currentVersion = extension.version || '0.0.1';
            const latestExtension = await this.bSXExtensionsModel.refresh(pluginId);
            if (!latestExtension) {
                throw new Error(`从在线插件商店获取插件 {0} 版本失败 ${pluginId}`);
            }
            const latestVersion = latestExtension.dataVersion || currentVersion;

            const result = semver.compare(latestVersion, currentVersion);
            const hasUpdate = result === 1;
            if(hasUpdate){
                const choice = await this.commonConfirmDialogFactory({
                    title: bnls.localizeByDefault('更新插件'),
                    msg: bnls.localizeByDefault('是否更新插件 {0} 到最新版本: {1} ?', pluginId, latestVersion)}).open();
                if (choice) {
                    await extension.install();
                }
            }
            else
                this.messageService.info(bnls.localizeByDefault('插件 {0} 已是最新版本 {1}。', pluginId, currentVersion));
    }


    /**
     * 打开插件的readme视图
     * @date 2025/10/15 - 13:42:24 PM
     * @author wubing
     *
     * @async
     * @param {PluginIdentifiers.UnversionedId} pluginId
     * @returns {*}
     */
    async openPluginReadme(pluginId: PluginIdentifiers.UnversionedId){

            const extension = this.bSXExtensionsModel.getExtension(pluginId);
            if (!extension) {
                throw new Error(`未找到插件: ${pluginId} `);
            }
            // const widgetOptions: ApplicationShell.WidgetOptions = { area: 'main'};
            // this.applicationShell.addWidget(extension, widgetOptions)
            // await this.applicationShell.activateWidget(extension.id);
            const type = 'installed';
            await extension.open({ mode: 'activate' });
            await this.focusPluginView(pluginId, type);
    }


    /**
     * 根据pluginId聚焦插件视图对应插件
     * @date 2025/10/15 - 13:41:41 PM
     * @author wubing
     *
     * @async
     * @param {string} pluginId
     * @param {string} type
     * @returns {Promise<boolean>}
     */
    async focusPluginView(pluginId: string, type: string): Promise<boolean> {
        const widget = await this.widgetManager.getWidget('bsx-extensions', { id: type }) as BSXExtensionsWidget;
        const success = await widget.focusAndReveal(pluginId);

        if (success) {
            this.applicationShell.expandPanel('left');
            await this.applicationShell.activateWidget(widget.id);
            return true;
        }

        return false;
    }
}

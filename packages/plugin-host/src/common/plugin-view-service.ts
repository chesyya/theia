export interface PluginViewService {
    /**
     * 打开插件详情视图并显示其 README。
     * 相当于用户在插件视图中点击该插件。
     */
    openPluginReadme(pluginId: string): Promise<void>;


    /**
     * 从插件商店检查当前插件是否有最新版本
     * 有的话弹窗是否更新的确定框
     */
    checkAndPromptPluginUpdate(pluginId: string): Promise<void>;
}
export const PluginViewService = Symbol('PluginViewService')

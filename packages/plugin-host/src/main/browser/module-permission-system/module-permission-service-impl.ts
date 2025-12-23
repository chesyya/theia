import { injectable } from '@theia/core/shared/inversify';
import { BaoskyAPI_TO_SCOPE_MAP, getSensitiveModuleConfig, ModuleOperation, ModulePermissionService } from '../../../common/file-system/module-permission-service';
import { Plugin } from '../../../common/plugin-api-rpc';

@injectable()
export class ModulePermissionServiceImpl implements ModulePermissionService {

    /**
     * 检查模块操作权限
     * @date 2025/11/10 - 14:06:31 PM
     * @author wubing
     *
     * @async
     * @param {ModuleOperation} operation
     * @returns {Promise<void>}
     */
    async $checkModulePermission(operation: ModuleOperation, plugin: Plugin): Promise<void> {

        // 使用通用权限请求服务
        try {

            const granted = await this.checkPluginModulePermission(operation, plugin, );

            if (!granted) {
                throw new Error(`插件 "${operation.pluginName}" (ID: ${operation.pluginId}) 无权访问敏感模块 "${operation.moduleId}"`);
            }

            console.dir(`[PLUGIN] 权限通过： ${operation.pluginId} - ${operation.moduleId}.${operation.functionName}`);

        } catch (error) {
            console.error(`[PLUGIN] 权限拒绝： ${operation.pluginId} - ${operation.moduleId}.${operation.functionName}`);
            throw error;
        }
    }


    /**
     * 通过插件api的权限文件判断操作权限
     * @date 2025/11/10 - 16:16:48 PM
     * @author wubing
     *
     * @async
     * @param {ModuleOperation} operation
     * @param {Plugin} plugin
     * @returns {Promise<void>}
     */
    async checkPluginModulePermission(operation: ModuleOperation, plugin: Plugin): Promise<boolean> {
        const moduleConfig = getSensitiveModuleConfig(operation.moduleId?? '');
        const baoskyApiScope = BaoskyAPI_TO_SCOPE_MAP[operation.functionName];
        if(moduleConfig){
            return plugin.rawModel.apiAccess?.includes(moduleConfig.moduleId) ?? false;
        }
        if(baoskyApiScope){
            return plugin.rawModel.apiAccess?.includes(baoskyApiScope) ?? false;
        }

        return true;
    }

}

import URI from '@theia/core/lib/common/uri';

export type FileSystemOperation = 'read' | 'write' | 'delete' | 'stat' | 'mkdir' | 'rename' | 'copy' | 'readdir';

export interface FileSystemPermissionContext {

    pluginId?: string;

    pluginMetadata?: {
        version?: string;
        displayName?: string;
        isBuiltin?: boolean;
    };
}

export interface FileSystemPermissionChecker {
    checkPermission(operation: FileSystemOperation, uri: URI, context?: FileSystemPermissionContext): Promise<void>;

    isPathAllowed(uri: URI, context?: FileSystemPermissionContext): boolean;
}

export abstract class BaseFileSystemPermissionService implements FileSystemPermissionChecker {


    /**
     * 检查操作权限
     * @date 2025/10/21 - 15:18:34 PM
     * @author wubing
     *
     * @async
     * @param {FileSystemOperation} operation
     * @param {URI} uri
     * @param {?FileSystemPermissionContext} [context]
     * @returns {Promise<void>}
     */
    async checkPermission(operation: FileSystemOperation, uri: URI, context?: FileSystemPermissionContext): Promise<void> {

        if (!this.isPluginAllowedOperation(operation, context)) {
            throw new Error(`插件 ${context?.pluginId || 'unknown'} 未拥有操作： ${operation} 的权限 `);
        }

        if (!this.isPathAllowed(uri, context)) {
            throw new Error(`插件 ${context?.pluginId || 'unknown'} 未拥有访问路径 ${uri.toString()} 的权限 `);
        }
    }


    /**
     * 检查某个路径是否允许访问
     * @date 2025/10/21 - 14:39:57 PM
     * @author wubing
     *
     * @param {URI} uri
     * @param {?FileSystemPermissionContext} [context]
     * @returns {boolean}
     */
    isPathAllowed(uri: URI, context?: FileSystemPermissionContext): boolean {
        const path = uri.path.toString();

        const pluginAllowedPaths = this.getPluginAllowedPaths(context?.pluginId);
        if (pluginAllowedPaths && pluginAllowedPaths.length > 0) {
            const isInAllowedPath = pluginAllowedPaths.some(allowedPath => path.startsWith(allowedPath));
            if (!isInAllowedPath) {
                return false;
            }
        }

        return true;
    }


    /**
     * 检查插件是否允许执行某个文件系统操作
     * @date 2025/10/21 - 14:35:12 PM
     * @author wubing
     *
     * @protected
     * @param {FileSystemOperation} operation
     * @param {?FileSystemPermissionContext} [context]
     * @returns {boolean}
     */
    protected isPluginAllowedOperation(operation: FileSystemOperation, context?: FileSystemPermissionContext): boolean {
        //如果没有设置context，表示默认允许所有插件操作
        if (!context?.pluginId) {
            return true;
        }

        //TODO：实现为特定插件分配操作权限
        return true;
    }


    /**
     * 获取某个插件允许访问的路径列表
     * @date 2025/10/21 - 14:38:05 PM
     * @author wubing
     *
     * @protected
     * @param {?string} [pluginId]
     * @returns {(string[] | null)}
     */
    protected getPluginAllowedPaths(pluginId?: string): string[] | null {
        if (!pluginId) {
            return ['/root/Workspaces/bsprojects/'];
        }
        //TODO：实现为特定插件分配允许访问的路径
        return ['/root/Workspaces/bsprojects/'];
    }
}

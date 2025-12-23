export const pluginPathsServicePath = '/services/plugin-paths';

// Service to create plugin configuration folders for different purpose.
export const PluginPathsService = Symbol('PluginPathsService');
export interface PluginPathsService {
    /** Returns hosted log path. Create directory by this path if it is not exist on the file system. */
    getHostLogPath(): Promise<string>;
    /** Returns storage path for given workspace */
    getHostStoragePath(workspaceUri: string | undefined, rootUris: string[]): Promise<string | undefined>;
}

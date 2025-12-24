import { injectable, inject } from '@theia/core/shared/inversify';
import { CancellationToken } from '@theia/core/lib/common/cancellation';
import { PluginDeployerImpl } from './plugin-deployer-impl';
import { PluginsKeyValueStorage } from './plugins-key-value-storage';
import { PluginServer, PluginDeployer, PluginStorageKind, PluginType, UnresolvedPluginEntry, PluginIdentifiers, PluginDeployOptions, PluginUninstallOptions, DeployedResult, DISABLED_PLUGINS_STORAGE_KEY } from '../../common/plugin-protocol';
import { KeysToAnyValues, KeysToKeysToAnyValue } from '../../common/types';
import { PluginUninstallationManager } from './plugin-uninstallation-manager';

@injectable()
export class PluginServerHandler implements PluginServer {

    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployerImpl;

    @inject(PluginsKeyValueStorage)
    protected readonly pluginsKeyValueStorage: PluginsKeyValueStorage;

    @inject(PluginUninstallationManager)
    protected readonly uninstallationManager: PluginUninstallationManager;

    async deploy(pluginEntry: string, arg2?: PluginType | CancellationToken, options?: PluginDeployOptions): Promise<DeployedResult[]> {
        const type = typeof arg2 === 'number' ? arg2 as PluginType : undefined;
        const deployedResult = await this.doDeploy({
            id: pluginEntry,
            type: type ?? PluginType.User
        }, options);
        return deployedResult;
    }

    protected doDeploy(pluginEntry: UnresolvedPluginEntry, options?: PluginDeployOptions): Promise<DeployedResult[]> {
        return this.pluginDeployer.deploy(pluginEntry, options);
    }

    async deployPluginsForUser(userId: string): Promise<void> {
        await this.pluginDeployer.deployPluginsForUser(userId);
    }

    uninstall(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): Promise<void> {
        return this.pluginDeployer.uninstall(pluginId, options);
    }

    undeploy(pluginId: PluginIdentifiers.VersionedId): Promise<void> {
        return this.pluginDeployer.undeploy(pluginId);
    }

    setStorageValue(key: string, value: KeysToAnyValues, kind: PluginStorageKind): Promise<boolean> {
        return this.pluginsKeyValueStorage.set(key, value, kind);
    }

    getStorageValue(key: string, kind: PluginStorageKind): Promise<KeysToAnyValues> {
        return this.pluginsKeyValueStorage.get(key, kind);
    }

    getAllStorageValues(kind: PluginStorageKind): Promise<KeysToKeysToAnyValue> {
        return this.pluginsKeyValueStorage.getAll(kind);
    }

    async enablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<void> {
        // Use PluginUninstallationManager for default (system-level) disable
        await this.uninstallationManager.markAsEnabled(undefined, pluginId);
    }

    async disablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<void> {
        // Use PluginUninstallationManager for default (system-level) disable
        await this.uninstallationManager.markAsDisabled(undefined, pluginId);
    }

    async disablePluginForUser(pluginId: PluginIdentifiers.VersionedId, username: string): Promise<void> {
        // Use PluginUninstallationManager for user-specific disable
        await this.uninstallationManager.markAsDisabled({ userId: username }, pluginId);
    }

    async getDisabledPluginsForUser(username: string): Promise<string[]> {
        // Use PluginUninstallationManager
        const disabledPlugins = await this.uninstallationManager.getDisabledPluginIds({ userId: username });
        return Array.from(disabledPlugins);
    }

    async isPluginEnabled(pluginId: PluginIdentifiers.VersionedId): Promise<boolean> {
        // Check if plugin is disabled (default scope)
        return !(await this.uninstallationManager.isDisabled(pluginId, undefined));
    }

    async getDisabledPlugins(): Promise<string[]> {
        // Use PluginUninstallationManager for default (system-level) disabled plugins
        const disabledPlugins = await this.uninstallationManager.getDisabledPluginIds(undefined);
        return Array.from(disabledPlugins);
    }

}

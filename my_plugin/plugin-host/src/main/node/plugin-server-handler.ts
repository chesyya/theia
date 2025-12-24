import { injectable, inject } from '@theia/core/shared/inversify';
import { CancellationToken } from '@theia/core/lib/common/cancellation';
import { PluginDeployerImpl } from './plugin-deployer-impl';
import { PluginsKeyValueStorage } from './plugins-key-value-storage';
import { PluginServer, PluginDeployer, PluginStorageKind, PluginType, UnresolvedPluginEntry, PluginIdentifiers, PluginDeployOptions, PluginUninstallOptions, DeployedResult, DISABLED_PLUGINS_STORAGE_KEY } from '../../common/plugin-protocol';
import { KeysToAnyValues, KeysToKeysToAnyValue } from '../../common/types';

@injectable()
export class PluginServerHandler implements PluginServer {

    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployerImpl;

    @inject(PluginsKeyValueStorage)
    protected readonly pluginsKeyValueStorage: PluginsKeyValueStorage;

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
        const disabledPlugins = await this.getDisabledPlugins();
        const index = disabledPlugins.indexOf(pluginId);
        if (index > -1) {
            disabledPlugins.splice(index, 1);
            await this.setStorageValue(DISABLED_PLUGINS_STORAGE_KEY, { plugins: disabledPlugins }, undefined);
        }
    }

    async disablePlugin(pluginId: PluginIdentifiers.VersionedId): Promise<void> {
        const disabledPlugins = await this.getDisabledPlugins();
        if (!disabledPlugins.includes(pluginId)) {
            disabledPlugins.push(pluginId);
            await this.setStorageValue(DISABLED_PLUGINS_STORAGE_KEY, { plugins: disabledPlugins }, undefined);
        }
    }

    async disablePluginForUser(pluginId: PluginIdentifiers.VersionedId, username: string): Promise<void> {
        const storageKey = `${DISABLED_PLUGINS_STORAGE_KEY}.user.${username}`;
        const disabledPlugins = await this.getDisabledPluginsForUser(username);
        if (!disabledPlugins.includes(pluginId)) {
            disabledPlugins.push(pluginId);
            await this.setStorageValue(storageKey, { plugins: disabledPlugins }, undefined);
        }
    }

    async getDisabledPluginsForUser(username: string): Promise<string[]> {
        try {
            const storageKey = `${DISABLED_PLUGINS_STORAGE_KEY}.user.${username}`;
            const storage = await this.getStorageValue(storageKey, undefined);
            if (storage && storage['plugins']) {
                return storage['plugins'] as string[];
            }
        } catch (e) {
            console.error('Failed to get disabled plugins for user:', username, e);
        }
        return [];
    }

    async isPluginEnabled(pluginId: PluginIdentifiers.VersionedId): Promise<boolean> {
        const disabledPlugins = await this.getDisabledPlugins();
        return !disabledPlugins.includes(pluginId);
    }

    async getDisabledPlugins(): Promise<string[]> {
        try {
            const storage = await this.getStorageValue(DISABLED_PLUGINS_STORAGE_KEY, undefined);
            return (storage && storage.plugins as string[]) || [];
        } catch (error) {
            return [];
        }
    }

}

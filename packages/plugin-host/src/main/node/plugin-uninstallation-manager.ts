import { Emitter, Event } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { PluginIdentifiers, PluginUninstallOptions } from '../../common';
import { PluginStorageService } from './plugin-storage-service';
import { Deferred } from '@theia/core/lib/common/promise-util';

type PluginEvent =
    | { type: "default"; versionIds: readonly PluginIdentifiers.VersionedId[] }
    | { type: "user"; userId: string; versionIds: readonly PluginIdentifiers.VersionedId[] };

@injectable()
export class PluginUninstallationManager {
    protected readonly onDidChangeUninstalledPluginsEmitter = new Emitter<PluginEvent>();
    protected readonly onDidChangeDisabledPluginsEmitter = new Emitter<PluginEvent>();

    @inject(PluginStorageService)
    protected readonly storageService: PluginStorageService;

    get onDidChangeUninstalledPlugins(): Event<PluginEvent> {
        return this.onDidChangeUninstalledPluginsEmitter.event;
    }

    get onDidChangeDisabledPlugins(): Event<PluginEvent> {
        return this.onDidChangeDisabledPluginsEmitter.event;
    }

    protected uninstalledPluginsMap = new Map<string, Set<PluginIdentifiers.VersionedId>>();
    protected disabledPluginsMap = new Map<string, Set<PluginIdentifiers.VersionedId>>();
    protected readonly initialized = new Deferred<void>();

    @postConstruct()
    protected init(): void {
        this.loadDisabledPlugins().then(() => this.initialized.resolve());
    }

    /** 根据 userId/shared/default 取 key */
    protected resolveKey(options?: PluginUninstallOptions): string {
        if (!options?.userId) {
            return 'default';
        }
        if (options.userId === 'admin') {
            return options.shared ? 'shared' : 'admin';
        }
        return options.userId;
    }

    protected fireDidChange(options?: PluginUninstallOptions): void {
        const key = this.resolveKey(options);
        const plugins = this.uninstalledPluginsMap.get(key);
        const versionIds = Object.freeze(plugins ? [...plugins] : []);
        if (key === 'default') {
            this.onDidChangeUninstalledPluginsEmitter.fire({ type: 'default', versionIds });
        } else {
            this.onDidChangeUninstalledPluginsEmitter.fire({ type: 'user', userId: key, versionIds });
        }
    }

    markAsUninstalled(options: PluginUninstallOptions | undefined, ...pluginIds: PluginIdentifiers.VersionedId[]): boolean {
        let didChange = false;
        for (const id of pluginIds) {
            didChange = this.markOneAsUninstalled(id, options) || didChange;
        }
        if (didChange) {
            this.fireDidChange(options);
        }
        // Auto-enable plugins when uninstalled (clear disabled state)
        this.markAsEnabled(options, ...pluginIds);
        return didChange;
    }

    protected markOneAsUninstalled(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): boolean {
        const key = this.resolveKey(options);
        let plugins = this.uninstalledPluginsMap.get(key);
        if (!plugins) {
            plugins = new Set();
            this.uninstalledPluginsMap.set(key, plugins);
        }
        if (!plugins.has(pluginId)) {
            plugins.add(pluginId);
            return true;
        }
        return false;
    }

    markAsInstalled(options: PluginUninstallOptions | undefined, ...pluginIds: PluginIdentifiers.VersionedId[]): boolean {
        let didChange = false;
        const key = this.resolveKey(options);
        const plugins = this.uninstalledPluginsMap.get(key);
        if (!plugins) {
            return false;
        }
        for (const id of pluginIds) {
            if (plugins.has(id)) {
                plugins.delete(id);
                didChange = true;
            }
        }
        if (didChange) {
            this.fireDidChange(options);
        }
        return didChange;
    }

    isUninstalled(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): boolean {
        const key = this.resolveKey(options);
        const plugins = this.uninstalledPluginsMap.get(key);
        return plugins ? plugins.has(pluginId) : false;
    }

    getUninstalledPluginIds(options?: PluginUninstallOptions): readonly PluginIdentifiers.VersionedId[] {
        const userId = options?.userId ?? 'default';
        // 总是包含 default (系统插件) 的卸载列表
        const defaultUninstalled = this.uninstalledPluginsMap.get('default');
        const sharedUninstalled = this.uninstalledPluginsMap.get('shared');
        const userUninstalled = userId && userId !== 'default' ? this.uninstalledPluginsMap.get(userId) : undefined;

        // 合并所有相关的卸载列表，去重
        const result = new Set<PluginIdentifiers.VersionedId>();
        if (defaultUninstalled) defaultUninstalled.forEach(id => result.add(id));
        if (sharedUninstalled) sharedUninstalled.forEach(id => result.add(id));
        if (userUninstalled) userUninstalled.forEach(id => result.add(id));

        return Object.freeze([...result]);
    }

    // ========== Disabled Plugin Management ==========

    /**
     * Load disabled plugins from storage
     */
    protected async loadDisabledPlugins(): Promise<void> {
        try {
            // Load default disabled plugins
            const defaultData = await this.storageService.get('plugins.disabled.default');
            if (defaultData) {
                const plugins: PluginIdentifiers.VersionedId[] = JSON.parse(defaultData);
                this.disabledPluginsMap.set('default', new Set(plugins));
            }

            // Load shared disabled plugins
            const sharedData = await this.storageService.get('plugins.disabled.shared');
            if (sharedData) {
                const plugins: PluginIdentifiers.VersionedId[] = JSON.parse(sharedData);
                this.disabledPluginsMap.set('shared', new Set(plugins));
            }

            // TODO: Load user-specific disabled plugins from database
            console.log('[PluginUninstallationManager] Loaded disabled plugins from storage');
        } catch (error) {
            console.error('[PluginUninstallationManager] Failed to load disabled plugins:', error);
        }
    }

    /**
     * Save disabled plugins to storage
     */
    protected async saveDisabledPlugins(key: string): Promise<void> {
        try {
            const plugins = this.disabledPluginsMap.get(key);
            const storageKey = `plugins.disabled.${key}`;

            if (plugins && plugins.size > 0) {
                await this.storageService.set(storageKey, JSON.stringify([...plugins]));
            } else {
                await this.storageService.delete(storageKey);
            }

            console.log(`[PluginUninstallationManager] Saved disabled plugins for ${key}:`, plugins ? [...plugins] : []);
        } catch (error) {
            console.error(`[PluginUninstallationManager] Failed to save disabled plugins for ${key}:`, error);
        }
    }

    protected fireDisabledChange(options?: PluginUninstallOptions): void {
        const key = this.resolveKey(options);
        const plugins = this.disabledPluginsMap.get(key);
        const versionIds = Object.freeze(plugins ? [...plugins] : []);
        if (key === 'default') {
            this.onDidChangeDisabledPluginsEmitter.fire({ type: 'default', versionIds });
        } else {
            this.onDidChangeDisabledPluginsEmitter.fire({ type: 'user', userId: key, versionIds });
        }
    }

    async markAsDisabled(options: PluginUninstallOptions | undefined, ...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean> {
        await this.initialized.promise;
        let didChange = false;
        for (const id of pluginIds) {
            didChange = this.markOneAsDisabled(id, options) || didChange;
        }
        if (didChange) {
            const key = this.resolveKey(options);
            await this.saveDisabledPlugins(key);
            this.fireDisabledChange(options);
        }
        return didChange;
    }

    protected markOneAsDisabled(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): boolean {
        const key = this.resolveKey(options);
        let plugins = this.disabledPluginsMap.get(key);
        if (!plugins) {
            plugins = new Set();
            this.disabledPluginsMap.set(key, plugins);
        }
        if (!plugins.has(pluginId)) {
            plugins.add(pluginId);
            return true;
        }
        return false;
    }

    async markAsEnabled(options: PluginUninstallOptions | undefined, ...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean> {
        await this.initialized.promise;
        let didChange = false;
        const key = this.resolveKey(options);
        const plugins = this.disabledPluginsMap.get(key);
        if (!plugins) {
            return false;
        }
        for (const id of pluginIds) {
            if (plugins.has(id)) {
                plugins.delete(id);
                didChange = true;
            }
        }
        if (didChange) {
            await this.saveDisabledPlugins(key);
            this.fireDisabledChange(options);
        }
        return didChange;
    }

    async isDisabled(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): Promise<boolean> {
        await this.initialized.promise;
        const key = this.resolveKey(options);
        const plugins = this.disabledPluginsMap.get(key);
        return plugins ? plugins.has(pluginId) : false;
    }

    async getDisabledPluginIds(options?: PluginUninstallOptions): Promise<readonly PluginIdentifiers.VersionedId[]> {
        await this.initialized.promise;
        const userId = options?.userId ?? 'default';
        // 总是包含 default (系统级别) 的禁用列表
        const defaultDisabled = this.disabledPluginsMap.get('default');
        const sharedDisabled = this.disabledPluginsMap.get('shared');
        const userDisabled = userId && userId !== 'default' ? this.disabledPluginsMap.get(userId) : undefined;

        // 合并所有相关的禁用列表，去重
        const result = new Set<PluginIdentifiers.VersionedId>();
        if (defaultDisabled) defaultDisabled.forEach(id => result.add(id));
        if (sharedDisabled) sharedDisabled.forEach(id => result.add(id));
        if (userDisabled) userDisabled.forEach(id => result.add(id));

        return Object.freeze([...result]);
    }

}

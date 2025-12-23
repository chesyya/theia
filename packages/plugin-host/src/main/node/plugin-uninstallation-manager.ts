import { Emitter, Event } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';
import { PluginIdentifiers, PluginUninstallOptions } from '../../common';

type PluginEvent =
    | { type: "default"; versionIds: readonly PluginIdentifiers.VersionedId[] }
    | { type: "user"; userId: string; versionIds: readonly PluginIdentifiers.VersionedId[] };

@injectable()
export class PluginUninstallationManager {
    protected readonly onDidChangeUninstalledPluginsEmitter = new Emitter<PluginEvent>();

    get onDidChangeUninstalledPlugins(): Event<PluginEvent> {
        return this.onDidChangeUninstalledPluginsEmitter.event;
    }

    protected uninstalledPluginsMap = new Map<string, PluginIdentifiers.VersionedId[]>();

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
        const versionIds = Object.freeze([...(this.uninstalledPluginsMap.get(key) || [])]);
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
        return didChange;
    }

    protected markOneAsUninstalled(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): boolean {
        const key = this.resolveKey(options);
        let plugins = this.uninstalledPluginsMap.get(key);
        if (!plugins) {
            plugins = [];
            this.uninstalledPluginsMap.set(key, plugins);
        }
        if (!plugins.includes(pluginId)) {
            plugins.push(pluginId);
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
            const index = plugins.indexOf(id);
            if (index !== -1) {
                plugins.splice(index, 1);
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
        const plugins = this.uninstalledPluginsMap.get(key) || [];
        return plugins.includes(pluginId);
    }

    getUninstalledPluginIds(options?: PluginUninstallOptions): readonly PluginIdentifiers.VersionedId[] {
        const userId = options?.userId ?? 'default';
        // 总是包含 default (系统插件) 的卸载列表
        const defaultUninstalled = this.uninstalledPluginsMap.get('default') || [];
        const sharedUninstalled = this.uninstalledPluginsMap.get('shared') || [];
        const userUninstalled = userId && userId !== 'default' ? (this.uninstalledPluginsMap.get(userId) || []) : [];

        // 合并所有相关的卸载列表，去重
        const result = Array.from(new Set([...defaultUninstalled, ...sharedUninstalled, ...userUninstalled]));

        return Object.freeze(result);
    }

}

import * as fs from '@theia/core/shared/fs-extra';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common';
import {
    PluginDeployerHandler, PluginDeployerEntry, PluginEntryPoint, DeployedPlugin,
    PluginDependencies, PluginType, PluginIdentifiers,
    PluginUninstallOptions,
    PluginDeployOptions,
    PluginScope,
    DeployedResult
} from '../../common/plugin-protocol';
import { HostedPluginReader } from './plugin-reader';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { HostedPluginLocalizationService } from './hosted-plugin-localization-service';
import { Stopwatch } from '@theia/core/lib/common';
import { PluginUninstallationManager } from '../../main/node/plugin-uninstallation-manager';
import { Emitter } from '@theia/core/shared/vscode-languageserver-protocol';
import { PluginDocumentationServiceImpl } from '../../main/node/plugin-usermanual/plugin-documentation-service';
import { PluginUserStorageAdapterFactory } from '../../main/node/plugin-adapter/plugin-adapter-control';
import { PluginStorageKey } from '../../main/common/user-plugin-management/user-plugin-environment-service';
import { SharedStorage } from '@baosky/platform/lib/common/storage-space/user-storage/user-storage-utils';
import { PluginApiCompatibilityService } from './plugin-api-compatibility-service';
import { verifyIntegrity } from '../../utils/plugin-baosky-utils';

@injectable()
export class HostedPluginDeployerHandler implements PluginDeployerHandler {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(HostedPluginReader)
    private readonly reader: HostedPluginReader;

    @inject(HostedPluginLocalizationService)
    private readonly localizationService: HostedPluginLocalizationService;

    @inject(Stopwatch)
    protected readonly stopwatch: Stopwatch;

    @inject(PluginUninstallationManager)
    protected readonly uninstallationManager: PluginUninstallationManager;

    @inject(PluginDocumentationServiceImpl)
    protected readonly documentationService: PluginDocumentationServiceImpl;

    @inject(PluginUserStorageAdapterFactory)private readonly userStorageAdapterFactory: PluginUserStorageAdapterFactory;


    @inject(PluginApiCompatibilityService)
    protected readonly compatibilityService: PluginApiCompatibilityService;

    private readonly deployedLocations = new Map<PluginIdentifiers.VersionedId, Set<string>>();
    protected readonly sourceLocations = new Map<PluginIdentifiers.VersionedId, Set<string>>();

    private readonly onDidUninstallEmitter = new Emitter<void>();
    readonly onDidUninstall = this.onDidUninstallEmitter.event;

    /**
     * Managed plugin metadata backend entries.
     */
    private readonly deployedBackendPlugins = new Map<string, Map<PluginIdentifiers.VersionedId, DeployedPlugin>>();

    /**
     * Managed plugin metadata frontend entries.
     */
    private readonly deployedFrontendPlugins = new Map<string, Map<PluginIdentifiers.VersionedId, DeployedPlugin>>();

    private backendPluginsMetadataDeferred = new Deferred<void>();

    private frontendPluginsMetadataDeferred = new Deferred<void>();

    /**
     * 从插件存储里收集 keys 或 values
     */
    collectFromStore<K, V>(
        store: Map<string, Map<K, V>>,
        userId?: string,
        values?: boolean
    ): (K | V)[] {
        const keysToCollect = userId ? ["system", "shared", userId] : ["default", "system"];

        if (values) {
            // 收集 values
            return keysToCollect.flatMap(key => {
                const inner = store.get(key);
                return inner ? Array.from(inner.values()) : [];
            });
        } else {
            // 收集 keys
            return keysToCollect.flatMap(key => {
                const inner = store.get(key);
                return inner ? Array.from(inner.keys()) : [];
            });
        }
    }

    async getDeployedFrontendPluginIds(userId?: string): Promise<PluginIdentifiers.VersionedId[]> {
        // await first deploy
        await this.frontendPluginsMetadataDeferred.promise;
        // fetch the last deployed state
        // const pluginIds = this.deployedFrontendPlugins.get(userId ?? 'default');
        return this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedFrontendPlugins, userId, false) as PluginIdentifiers.VersionedId[];

    }

    async getDeployedBackendPluginIds(userId?: string): Promise<PluginIdentifiers.VersionedId[]> {
        // await first deploy
        await this.backendPluginsMetadataDeferred.promise;
        // fetch the last deployed state
        // const pluginIds = this.deployedBackendPlugins.get(userId ?? 'default');
        // return pluginIds ? Array.from(pluginIds.keys()) : [];
        return this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedBackendPlugins, userId, false) as PluginIdentifiers.VersionedId[];
    }

    async getDeployedBackendPlugins(userId?: string): Promise<DeployedPlugin[]> {
        // await first deploy
        await this.backendPluginsMetadataDeferred.promise;
        // fetch the last deployed state
        // const plugins = this.deployedBackendPlugins.get(userId ?? 'default');
        // return plugins ? Array.from(plugins.values()) : [];
        return this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedBackendPlugins, userId, true) as DeployedPlugin[];
    }

    async getDeployedPlugins(userId?: string): Promise<DeployedPlugin[]> {
        await Promise.all([
            this.frontendPluginsMetadataDeferred.promise,
            this.backendPluginsMetadataDeferred.promise
        ]);
        // const key = userId ?? 'default';
        // const frontend = Array.from(this.deployedFrontendPlugins.get(key)?.values() ?? []);
        // const backend = Array.from(this.deployedBackendPlugins.get(key)?.values() ?? []);
        const backend = this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedBackendPlugins, userId, true) as DeployedPlugin[];
        const frontend = this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedFrontendPlugins, userId, true) as DeployedPlugin[];
        return [...frontend, ...backend];
    }

    getDeployedPluginsById(pluginId: string, userId?: string): DeployedPlugin[] {
        const matches: DeployedPlugin[] = [];
        const handle = (plugins: Iterable<DeployedPlugin>): void => {
            for (const plugin of plugins) {
                if (PluginIdentifiers.componentsToVersionWithId(plugin.metadata.model).id === pluginId) {
                    matches.push(plugin);
                }
            }
        };
        // const key = userId ?? 'default';
        const backend = this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedBackendPlugins, userId, true) as DeployedPlugin[];
        const frontend = this.collectFromStore<PluginIdentifiers.VersionedId, DeployedPlugin>(this.deployedFrontendPlugins, userId, true) as DeployedPlugin[];
        handle(backend);
        handle(frontend);
        return matches;
    }

    getDeployedPlugin(pluginId: PluginIdentifiers.VersionedId, userId?: string): DeployedPlugin | undefined {
        const key = userId ?? 'default';
        let plugin = this.deployedBackendPlugins.get('system')?.get(pluginId) ?? this.deployedFrontendPlugins.get('system')?.get(pluginId);
        if (plugin) { return plugin; }
        plugin = this.deployedBackendPlugins.get('shared')?.get(pluginId) ?? this.deployedFrontendPlugins.get('shared')?.get(pluginId);
        if (plugin) { return plugin; }
        return this.deployedBackendPlugins.get(key)?.get(pluginId) ?? this.deployedFrontendPlugins.get(key)?.get(pluginId);
    }

    /**
     * @throws never! in order to isolate plugin deployment
     */
    async getPluginDependencies(entry: PluginDeployerEntry): Promise<PluginDependencies | undefined> {
        const pluginPath = entry.path();
        try {
            const manifest = await this.reader.readPackage(pluginPath);
            if (!manifest) {
                return undefined;
            }
            const metadata = this.reader.readMetadata(manifest);
            const dependencies: PluginDependencies = { metadata };
            // Do not resolve system (aka builtin) plugins because it should be done statically at build time.
            if (entry.type !== PluginType.System) {
                dependencies.mapping = this.reader.readDependencies(manifest);
            }
            return dependencies;
        } catch (e) {
            console.error(`Failed to load plugin dependencies from '${pluginPath}' path`, e);
            return undefined;
        }
    }

    async deployFrontendPlugins(frontendPlugins: PluginDeployerEntry[], options?: PluginDeployOptions): Promise<DeployedResult[]> {
        let result:DeployedResult[] = [];
        for (const plugin of frontendPlugins) {
            const deployedResult = await this.deployPlugin(plugin, 'frontend', options);
            result.push(deployedResult);
        }
        // resolve on first deploy
        this.frontendPluginsMetadataDeferred.resolve(undefined);
        return result;
    }

    async deployBackendPlugins(backendPlugins: PluginDeployerEntry[], options?: PluginDeployOptions): Promise<DeployedResult[]> {
        let result:DeployedResult[] = [];
        for (const plugin of backendPlugins) {
            const deployedResult = await this.deployPlugin(plugin, 'backend', options);
            result.push(deployedResult);
        }
        // rebuild translation config after deployment
        const key = options?.userId ?? 'default';
        const values = this.deployedBackendPlugins.get(key)?.values() ?? [];
        await this.localizationService.buildTranslationConfig([...values]);

        // resolve on first deploy
        this.backendPluginsMetadataDeferred.resolve(undefined);
        return result;
    }

    /**
     * @throws never! in order to isolate plugin deployment.
     * @returns whether the plugin is deployed after running this function. If the plugin was already installed, will still return `true`.
     */
    protected async deployPlugin(entry: PluginDeployerEntry, entryPoint: keyof PluginEntryPoint, options?: PluginDeployOptions): Promise<DeployedResult> {
        const pluginPath = entry.path();
        //根据插件来源的不同，设定其存放的key值
        let key = 'default';
        switch (entry.type) {
            case PluginType.System:
                key = 'system';
                break;
            case PluginType.User:
                if(!options)
                    key = pluginPath.includes(`${SharedStorage}`) ? 'shared' : 'default';
                else
                    key = options?.shared ? 'shared' : options?.userId ?? 'default';
                break;
        }
        if(entry.type !== PluginType.System){
            // TODO: 验证签名文件，如果签名出错，直接返回
            // 暂时弹warning 下个sp 改为直接返回
            const result = await verifyIntegrity(pluginPath);
            if(!result){
                // return {
                //         success: false
                //     }
                console.error(pluginPath)
                console.error('签名验证失败, sp2515将不支持签名验证失败的插件安装')
            }
        }

        const deployPlugin = this.stopwatch.start('deployPlugin');
        let id;
        let success = true;
        try {
            const manifest = await this.reader.readPackage(pluginPath);
            if (!manifest) {
                deployPlugin.error(`Failed to read ${entryPoint} plugin manifest from '${pluginPath}''`);
                return {
                    success: false
                }
            }

            // API 兼容性检查（系统插件跳过检查）
            const isSystemPlugin = entry.type === PluginType.System;
            const compatibilityResult = await this.compatibilityService.checkCompatibility(pluginPath, isSystemPlugin);
            // if (!compatibilityResult.compatible) {
            //     this.logger.error(
            //         `[API Compatibility] 跳过部署，兼容性检查未通过 '${pluginPath}'`
            //     );
            //     await fs.remove(entry.originalPath()).catch((err) =>console.error(`Failed to remove plugin`,err));
            //     return {
            //         success: false,
            //         pluginId: entry.id(),
            //         reason: compatibilityResult.errors
            //     }
            // }

            const metadata = this.reader.readMetadata(manifest);
            metadata.isUnderDevelopment = entry.getValue('isUnderDevelopment') ?? false;

            id = PluginIdentifiers.componentsToVersionedId(metadata.model);

            const deployedLocations = this.deployedLocations.get(id) ?? new Set<string>();
            deployedLocations.add(entry.rootPath);
            this.deployedLocations.set(id, deployedLocations);
            this.setSourceLocationsForPlugin(id, entry);

            const deployedPlugins = entryPoint === 'backend' ? this.deployedBackendPlugins : this.deployedFrontendPlugins;
            const userPlugins = deployedPlugins.get(key);
            const deployedPlugin = userPlugins?.get(id);
            if (deployedPlugin) {
                deployPlugin.debug(`Skipped ${entryPoint} plugin ${metadata.model.name} already deployed`);
                return {
                    success: true
                }
            }

            const { type } = entry;
            const deployed: DeployedPlugin = { metadata, type };
            deployed.contributes = await this.reader.readContribution(manifest);
            // 读取插件帮助文档到内存
            if (deployed.contributes?.usermanual) {
                this.documentationService.registerPluginDocumentation(deployed);
            }
            await this.localizationService.deployLocalizations(deployed);
            if (!userPlugins) {
                const pluginMap = new Map<PluginIdentifiers.VersionedId, DeployedPlugin>();
                pluginMap.set(id, deployed);
                deployedPlugins.set(key, pluginMap)
            }
            else
                userPlugins.set(id, deployed);
            deployPlugin.debug(`Deployed ${entryPoint} plugin "${id}" from "${metadata.model.entryPoint[entryPoint] || pluginPath}"`);
        } catch (e) {
            deployPlugin.error(`Failed to deploy ${entryPoint} plugin from '${pluginPath}' path`, e);
            return {
                success: false
            }
        } finally {
            if (success && id) {
                this.markAsInstalled(id, options ?? undefined);
            }
        }
        return {
            success: success
        }
    }

    async uninstallPlugin(pluginId: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): Promise<boolean> {
        try {
            const sourceLocations = this.sourceLocations.get(pluginId);
            if (!sourceLocations) {
                return false;
            }
            if (options && options.userId) {
                // 通过个人空间适配器删除文件
              const adapter = await this.userStorageAdapterFactory({
                type: PluginStorageKey,
                userName: options.userId,
                shared: options.shared
              });
              // 解构这个set 拿到和设置时一样的key
              // 此处传入的pluginId 与设置时不一样
              const [location] = sourceLocations;
              const key =  location.split('/').pop() || '';
              await adapter.delete([key]);
            } else {
              await Promise.all(
                Array.from(sourceLocations, (location) =>
                  fs
                    .remove(location)
                    .catch((err) =>
                      console.error(
                        `Failed to remove source for ${pluginId} at ${location}`,
                        err
                      )
                    )
                )
              );
            }
            this.sourceLocations.delete(pluginId);
            this.documentationService.unregisterPluginDocumentation(pluginId);
            this.localizationService.undeployLocalizations(pluginId);
            const key = this.resolveKey(options);
            const scopesToCheck: string[] =
                options?.userId === PluginScope.Admin
                ? [PluginScope.Admin, PluginScope.Shared]
                : [key]; // 其他用户只查自己对应的作用域
            scopesToCheck.forEach(key => {
                // Don't delete from deployed plugins - keep them for outOfSync mechanism
                // this.deployedBackendPlugins.get(key)?.delete(pluginId);
                // this.deployedFrontendPlugins.get(key)?.delete(pluginId);
                this.uninstallationManager.markAsUninstalled(options, pluginId);
            })
            this.onDidUninstallEmitter.fire();
            return true;
        } catch (e) {
            console.error('Error uninstalling plugin', e);
            return false;
        }
    }

    protected markAsInstalled(id: PluginIdentifiers.VersionedId, options?: PluginUninstallOptions): void {
        const key = this.resolveKey(options);
        const metadata = PluginIdentifiers.idAndVersionFromVersionedId(id);
        if (metadata) {
            const toMarkAsUninstalled: PluginIdentifiers.VersionedId[] = [];
            const checkForDifferentVersions = (others: Iterable<PluginIdentifiers.VersionedId>) => {
                for (const other of others) {
                    const otherMetadata = PluginIdentifiers.idAndVersionFromVersionedId(other);
                    if (metadata.id === otherMetadata?.id && metadata.version !== otherMetadata.version) {
                        toMarkAsUninstalled.push(other);
                    }
                }
            };
            const scopesToCheck: string[] =
                options?.userId === PluginScope.Admin
                    ? [PluginScope.Admin, PluginScope.Shared]
                    : [key]; // 其他用户只查自己对应的作用域

            for (const scope of scopesToCheck) {
                const frontendPlugins = this.deployedFrontendPlugins.get(scope)?.keys() ?? [];
                const backendPlugins = this.deployedBackendPlugins.get(scope)?.keys() ?? [];
                checkForDifferentVersions(frontendPlugins);
                checkForDifferentVersions(backendPlugins);
            }
            this.uninstallationManager.markAsUninstalled(options, ...toMarkAsUninstalled);
            this.uninstallationManager.markAsInstalled(options, id);
            toMarkAsUninstalled.forEach(pluginToUninstall => this.uninstallPlugin(pluginToUninstall, options));
        }
    }

    protected resolveKey(options?: PluginUninstallOptions): string {
        if (!options?.userId) {
            return PluginScope.Default;
        }
        if (options.userId === PluginScope.Admin) {
            return options.shared ? PluginScope.Shared : PluginScope.Admin;
        }
        return options.userId;
    }

    async undeployPlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean> {
        this.deployedBackendPlugins.delete(pluginId);
        this.deployedFrontendPlugins.delete(pluginId);
        this.documentationService.unregisterPluginDocumentation(pluginId);
        const deployedLocations = this.deployedLocations.get(pluginId);
        if (!deployedLocations) {
            return false;
        }

        const undeployPlugin = this.stopwatch.start('undeployPlugin');
        this.deployedLocations.delete(pluginId);

        for (const location of deployedLocations) {
            try {
                await fs.remove(location);
                undeployPlugin.log(`[${pluginId}]: undeployed from "${location}"`);
            } catch (e) {
                undeployPlugin.error(`[${pluginId}]: failed to undeploy from location "${location}". reason:`, e);
            }
        }

        return true;
    }

    protected setSourceLocationsForPlugin(id: PluginIdentifiers.VersionedId, entry: PluginDeployerEntry): void {
        const knownLocations = this.sourceLocations.get(id) ?? new Set();
        const maybeStoredLocations = entry.getValue('sourceLocations');
        const storedLocations = Array.isArray(maybeStoredLocations) && maybeStoredLocations.every(location => typeof location === 'string')
            ? maybeStoredLocations.concat(entry.rootPath)
            : [entry.rootPath];
        storedLocations.forEach(location => knownLocations.add(location));
        this.sourceLocations.set(id, knownLocations);
    }
}

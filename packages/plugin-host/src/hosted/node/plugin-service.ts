import { injectable, inject, named, optional, postConstruct } from '@theia/core/shared/inversify';
import { HostedPluginServer, HostedPluginClient, PluginDeployer, GetDeployedPluginsParams, DeployedPlugin, PluginIdentifiers, DeployedPluginWithInitpath } from '../../common/plugin-protocol';
import { HostedPluginSupport } from './hosted-plugin';
import { ILogger, Disposable, ContributionProvider, DisposableCollection } from '@theia/core';
import { ExtPluginApiProvider, ExtPluginApi } from '../../common/plugin-ext-api-contribution';
import { HostedPluginDeployerHandler } from './hosted-plugin-deployer-handler';
import { PluginDeployerImpl } from '../../main/node/plugin-deployer-impl';
import { HostedPluginLocalizationService } from './hosted-plugin-localization-service';
import { PluginUninstallationManager } from '../../main/node/plugin-uninstallation-manager';

export const BackendPluginHostableFilter = Symbol('BackendPluginHostableFilter');
/**
 * A filter matching backend plugins that are hostable in my plugin host process.
 * Only if at least one backend plugin is deployed that matches my filter will I
 * start the host process.
 */
export type BackendPluginHostableFilter = (plugin: DeployedPlugin) => boolean;

@injectable()
export class HostedPluginServerImpl implements HostedPluginServer {
    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(HostedPluginDeployerHandler)
    protected readonly deployerHandler: HostedPluginDeployerHandler;

    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployerImpl;

    @inject(HostedPluginLocalizationService)
    protected readonly localizationService: HostedPluginLocalizationService;

    @inject(ContributionProvider)
    @named(Symbol.for(ExtPluginApiProvider))
    protected readonly extPluginAPIContributions: ContributionProvider<ExtPluginApiProvider>;

    @inject(PluginUninstallationManager) protected readonly uninstallationManager: PluginUninstallationManager;

    @inject(BackendPluginHostableFilter)
    @optional()
    protected backendPluginHostableFilter: BackendPluginHostableFilter;

    protected client: HostedPluginClient | undefined;
    protected toDispose = new DisposableCollection();

    protected _ignoredPlugins?: Map<string, Set<PluginIdentifiers.VersionedId>>;

    // We ignore any plugins that are marked as uninstalled the first time the frontend requests information about deployed plugins.
    protected get ignoredPlugins(): Map<string, Set<PluginIdentifiers.VersionedId>> {
        if (!this._ignoredPlugins) {
            this._ignoredPlugins = new Map();
            // 初始化 default（系统级别）
            this._ignoredPlugins.set('default', new Set(this.uninstallationManager.getUninstalledPluginIds()));
        }
        return this._ignoredPlugins;
    }

    protected readonly pluginVersions = new Map<PluginIdentifiers.UnversionedId, string>();

    constructor(
        @inject(HostedPluginSupport) private readonly hostedPlugin: HostedPluginSupport) {
    }

    @postConstruct()
    protected init(): void {
        if (!this.backendPluginHostableFilter) {
            this.backendPluginHostableFilter = () => true;
        }

        this.toDispose.pushAll([
            this.pluginDeployer.onDidDeploy((userId) => this.client?.onDidDeploy(userId)),

            this.uninstallationManager.onDidChangeUninstalledPlugins(event => {
                const currentUninstalled = event.versionIds;

                if (this._ignoredPlugins) {
                    const uninstalled = new Set(currentUninstalled);

                    let ignoredForKey = this._ignoredPlugins.get(
                        event.type === 'default' ? 'default' : event.userId
                    );
                    if (!ignoredForKey) {
                        ignoredForKey = new Set();
                        this._ignoredPlugins.set(
                            event.type === 'default' ? 'default' : event.userId,
                            ignoredForKey
                        );
                    }

                    for (const previouslyUninstalled of [...ignoredForKey]) {
                        if (!uninstalled.has(previouslyUninstalled)) {
                            ignoredForKey.delete(previouslyUninstalled);
                        }
                    }
                }

                if (event.type === "user") {
                    this.client?.onDidDeploy(event.userId);
                } else {
                    this.client?.onDidDeploy();
                }
            }),
            this.deployerHandler.onDidUninstall(() => this.client?.onDidUninstall()),
            this.deployerHandler.onDidUninstallSharedPlugin((pluginId) => this.client?.onDidUninstallSharedPlugin(pluginId)),
            Disposable.create(() => this.hostedPlugin.clientClosed()),
        ]);
    }

    protected getServerName(): string {
        return 'hosted-plugin';
    }

    dispose(): void {
        this.toDispose.dispose();
    }

    setClient(client: HostedPluginClient): void {
        this.client = client;
        this.hostedPlugin.setClient(client);
    }

    async getDeployedPluginIds(userId?: string): Promise<PluginIdentifiers.VersionedId[]> {
        const backendPlugins = (await this.deployerHandler.getDeployedBackendPlugins(userId))
            .filter(this.backendPluginHostableFilter);
        if (backendPlugins.length > 0) {
            this.hostedPlugin.runPluginServer(this.getServerName());
        }
        const plugins = new Set<PluginIdentifiers.VersionedId>();
        const addIds = async (identifiers: PluginIdentifiers.VersionedId[]): Promise<void> => {
            for (const pluginId of identifiers) {
                if (this.isRelevantPlugin(pluginId, userId)) {
                    plugins.add(pluginId);
                }
            }
        };
        addIds(await this.deployerHandler.getDeployedFrontendPluginIds(userId));
        addIds(await this.deployerHandler.getDeployedBackendPluginIds(userId));
        addIds(await this.hostedPlugin.getExtraDeployedPluginIds());
        return Array.from(plugins);
    }

    /**
     * Ensures that the plugin was not uninstalled when this session was started
     * and that it matches the first version of the given plugin seen by this session.
     *
     * The deployment system may have multiple versions of the same plugin available, but
     * a single session should only ever activate one of them.
     */
    protected isRelevantPlugin(identifier: PluginIdentifiers.VersionedId, userId?: string): boolean {
        const versionAndId = PluginIdentifiers.idAndVersionFromVersionedId(identifier);
        if (!versionAndId) {
            return false;
        }
        const knownVersion = this.pluginVersions.get(versionAndId.id);
        if (knownVersion !== undefined && knownVersion !== versionAndId.version) {
            // return false;
            console.log(`[PLUGIN-HOST] 插件版本成功从 ${knownVersion} 变更为 ${identifier}`);
        }

        const key = userId || 'default';
        const ignoredForKey = this.ignoredPlugins.get(key);
        if (ignoredForKey?.has(identifier)) {
            return false;
        }

        if (knownVersion === undefined) {
            this.pluginVersions.set(versionAndId.id, versionAndId.version);
        }
        return true;
    }

    getUninstalledPluginIds(userId?: string): Promise<readonly PluginIdentifiers.VersionedId[]> {
        return Promise.resolve(this.uninstallationManager.getUninstalledPluginIds({ userId }));
    }

    async getDeployedPlugins({ pluginIds }: GetDeployedPluginsParams, userId?: string): Promise<DeployedPluginWithInitpath[]> {
        if (!pluginIds.length) {
            return [];
        }
        const plugins: DeployedPluginWithInitpath[] = [];
        let extraDeployedPlugins: Map<string, DeployedPlugin> | undefined;
        for (const versionedId of pluginIds) {
            if (!this.isRelevantPlugin(versionedId, userId)) {
                continue;
            }
            let plugin = this.deployerHandler.getDeployedPlugin(versionedId, userId);
            if (!plugin) {
                if (!extraDeployedPlugins) {
                    extraDeployedPlugins = new Map<string, DeployedPlugin>();
                    for (const extraDeployedPlugin of await this.hostedPlugin.getExtraDeployedPlugins()) {
                        extraDeployedPlugins.set(PluginIdentifiers.componentsToVersionedId(extraDeployedPlugin.metadata.model), extraDeployedPlugin);
                    }
                }
                plugin = extraDeployedPlugins.get(versionedId);
            }
            if (plugin) {
                plugins.push({ deployed: plugin, backendInitPath: plugin.metadata.lifecycle.backendInitPath, frontendInitPath: plugin.metadata.lifecycle.frontendInitPath });
            }
        }
        return Promise.all(plugins.map(async plugin => {
            const loc = await this.localizationService.localizePlugin(plugin.deployed);
            return {
                deployed: loc,
                backendInitPath: plugin.backendInitPath,
                frontendInitPath: plugin.frontendInitPath
            }
        }));
    }

    onMessage(pluginHostId: string, message: Uint8Array): Promise<void> {
        this.hostedPlugin.onMessage(pluginHostId, message);
        return Promise.resolve();
    }

    getExtPluginAPI(): Promise<ExtPluginApi[]> {
        return Promise.resolve(this.extPluginAPIContributions.getContributions().map(p => p.provideApi()));
    }
}

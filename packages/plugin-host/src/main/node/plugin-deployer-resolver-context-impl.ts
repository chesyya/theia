import { PluginDeployerResolverContext, PluginDeployerEntry, PluginDeployerResolverInit } from '../../common/plugin-protocol';
import { PluginDeployerEntryImpl } from './plugin-deployer-entry-impl';

export class PluginDeployerResolverContextImpl<T> implements PluginDeployerResolverContext {

    /**
     * Name of the resolver for this context
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private resolverName: any;

    private pluginEntries: PluginDeployerEntry[];

    constructor(resolver: T, private readonly sourceId: string) {
        this.pluginEntries = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.resolverName = (resolver as any).constructor.name;

    }

    addPlugin(pluginId: string, path: string): void {
        const pluginEntry = new PluginDeployerEntryImpl(this.sourceId, pluginId, path);
        pluginEntry.setResolvedBy(this.resolverName);
        this.pluginEntries.push(pluginEntry);
    }

    getPlugins(): PluginDeployerEntry[] {
        return this.pluginEntries;
    }

    getOriginId(): string {
        return this.sourceId;
    }

}

export class PluginDeployerResolverInitImpl implements PluginDeployerResolverInit {

}

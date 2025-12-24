import { inject, injectable, multiInject } from '@theia/core/shared/inversify';
import { PluginPackage, PluginScanner, PluginMetadata, PLUGIN_HOST_BACKEND, PluginIdentifiers } from '../../common/plugin-protocol';
import { PluginUninstallationManager } from '../../main/node/plugin-uninstallation-manager';
@injectable()
export class MetadataScanner {
    private scanners: Map<string, PluginScanner> = new Map();

    @inject(PluginUninstallationManager) protected readonly uninstallationManager: PluginUninstallationManager;

    constructor(@multiInject(PluginScanner) scanners: PluginScanner[]) {
        scanners.forEach((scanner: PluginScanner) => {
            this.scanners.set(scanner.apiType, scanner);
        });
    }

    getPluginMetadata(plugin: PluginPackage): PluginMetadata {
        const scanner = this.getScanner(plugin);
        return {
            host: PLUGIN_HOST_BACKEND,
            model: scanner.getModel(plugin),
            lifecycle: scanner.getLifecycle(plugin),
            outOfSync: this.uninstallationManager.isUninstalled(PluginIdentifiers.componentsToVersionedId(plugin)),
        };
    }

    /**
     * Returns the first suitable scanner.
     *
     * Throws if no scanner was found.
     *
     * @param {PluginPackage} plugin
     * @returns {PluginScanner}
     */
    getScanner(plugin: PluginPackage): PluginScanner {
        let scanner: PluginScanner | undefined;
        if (plugin && plugin.engines) {
            const scanners = Object.keys(plugin.engines)
                .filter(engineName => this.scanners.has(engineName))
                .map(engineName => this.scanners.get(engineName)!);
            // get the first suitable scanner from the list
            scanner = scanners[0];
        }
        if (!scanner) {
            throw new Error('There is no suitable scanner found for ' + plugin.name);
        }
        return scanner;
    }
}

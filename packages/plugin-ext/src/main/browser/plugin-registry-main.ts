// *****************************************************************************
// Copyright (C) 2025 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { interfaces } from '@theia/core/shared/inversify';
import { PluginRegistryMain, VersionInfo } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { RequestService } from '@theia/core/shared/@theia/request';
import { WidgetManager, ApplicationShell } from '@theia/core/lib/browser';
import { VSXExtensionsWidget } from '@theia/vsx-registry/lib/browser/vsx-extensions-widget';
import { VSXExtensionsSourceOptions } from '@theia/vsx-registry/lib/browser/vsx-extensions-source';

export class PluginRegistryMainImpl implements PluginRegistryMain {

    // private readonly proxy: PluginRegistryExt;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly vsxExtensionsModel: any;
    private readonly requestService: RequestService;
    private readonly widgetManager: WidgetManager;
    private readonly shell: ApplicationShell;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        // this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.PLUGIN_REGISTRY_EXT);
        // Dynamically resolve VSXExtensionsModel to avoid hard dependency
        this.vsxExtensionsModel = this.tryGetService(container, 'VSXExtensionsModel');
        this.requestService = container.get(RequestService);
        this.widgetManager = container.get(WidgetManager);
        this.shell = container.get(ApplicationShell);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private tryGetService(container: interfaces.Container, serviceName: string): any {
        try {
            // Try to get the service by its class name
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const services = (container as any)._bindingDictionary?._map;
            if (services) {
                for (const [key] of services) {
                    if (key.toString().includes(serviceName)) {
                        return container.get(key);
                    }
                }
            }
        } catch {
            // Service not available
        }
        return null;
    }

    /**
     * Check if there's an update available for a plugin.
     * @param pluginId The id of the plugin to check (e.g., 'publisher.name')
     * @returns Version information including current version, latest version, and whether an update is available
     */
    async $checkUpdates(pluginId: string): Promise<VersionInfo> {
        try {
            if (!this.vsxExtensionsModel) {
                throw new Error('VSXExtensionsModel service not available');
            }

            // Get the currently installed extension
            const extension = this.vsxExtensionsModel.getExtension(pluginId);
            if (!extension) {
                throw new Error(`Plugin ${pluginId} not found`);
            }

            const currentVersion = extension.version || '0.0.0';

            // Use the model's refresh method to get the latest available version
            // This will query the registry and return the latest compatible version
            const latestExtension = await this.vsxExtensionsModel.refresh(pluginId);

            if (!latestExtension) {
                throw new Error(`Failed to fetch latest version for ${pluginId}`);
            }

            const latestVersion = latestExtension.version || currentVersion;
            const hasUpdate = this.compareVersions(currentVersion, latestVersion) < 0;

            return {
                currentVersion,
                latestVersion,
                hasUpdate
            };
        } catch (error) {
            console.error(`Failed to check updates for ${pluginId}:`, error);
            throw error;
        }
    }

    async $openReadme(pluginId: string): Promise<void> {
        try {
            if (!this.vsxExtensionsModel) {
                throw new Error('VSXExtensionsModel service not available');
            }

            const extension = this.vsxExtensionsModel.getExtension(pluginId);
            if (!extension) {
                throw new Error(`Plugin ${pluginId} not found`);
            }

            // Open the extension editor (which shows the README by default)
            await extension.open({ mode: 'activate' });

            // Focus the plugin in the extensions list
            await this.focusPluginAnywhere(pluginId);
        } catch (error) {
            console.error('Failed to open readme:', error);
            throw error;
        }
    }

    /**
     * Focus a plugin in the extensions list across all possible widget instances.
     * Automatically opens the left side panel and expands the appropriate container.
     * @param pluginId The id of the plugin to focus
     * @returns true if the plugin was successfully focused, false otherwise
     */
    async focusPluginAnywhere(pluginId: string): Promise<boolean> {
        // List of all possible VSXExtensionsWidget option ids
        const optionsList: string[] = [
            VSXExtensionsSourceOptions.INSTALLED,
            VSXExtensionsSourceOptions.BUILT_IN,
            VSXExtensionsSourceOptions.RECOMMENDED,
            VSXExtensionsSourceOptions.SEARCH_RESULT
        ];

        // Try to find the plugin in each widget
        for (const idOption of optionsList) {
            const widget = await this.widgetManager.getWidget('vsx-extensions', { id: idOption }) as VSXExtensionsWidget;

            if (!widget) {
                continue;
            }

            // Try to focus and reveal the plugin in this widget
            const success = await widget.focusAndReveal(pluginId);

            if (success) {
                // Open the left side panel if it's collapsed
                this.shell.expandPanel('left');

                // Activate the widget to ensure its container is visible
                await this.shell.activateWidget(widget.id);

                return true;
            }
        }

        return false;
    }




    private compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;

            if (part1 > part2) {
                return 1;
            }
            if (part1 < part2) {
                return -1;
            }
        }

        return 0;
    }
}

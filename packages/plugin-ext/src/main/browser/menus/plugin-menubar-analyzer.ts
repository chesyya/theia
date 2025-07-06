// *****************************************************************************
// Copyright (C) 2024 Eclipse Theia contributors.
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

import { injectable } from '@theia/core/shared/inversify';
import { DeployedPlugin } from '../../../common';

export interface PluginMenubarInfo {
    pluginId: string;
    pluginName: string;
    hasMenubarPlugin: boolean;
    menubarItems: Array<{
        command?: string;
        submenu?: string;
        group?: string;
        order?: string;
        when?: string;
    }>;
}

@injectable()
export class PluginMenubarAnalyzer {

    /**
     * 分析插件是否包含menubar/plugin配置
     */
    analyzePlugin(plugin: DeployedPlugin): PluginMenubarInfo {
        const pluginId = plugin.metadata.model.id;
        const pluginName = plugin.metadata.model.displayName || plugin.metadata.model.name || pluginId;
        const allMenus = plugin.contributes?.menus;

        const menubarItems: PluginMenubarInfo['menubarItems'] = [];
        let hasMenubarPlugin = false;

        if (allMenus) {
            for (const [contributionPoint, items] of Object.entries(allMenus)) {
                if (contributionPoint === 'menubar/plugin' || contributionPoint.includes('menubar/plugin')) {
                    hasMenubarPlugin = true;
                    for (const item of items) {
                        menubarItems.push({
                            command: item.command,
                            submenu: item.submenu,
                            group: item.group,
                            order: this.parseGroup(item.group).order,
                            when: item.when
                        });
                    }
                }
            }
        }

        return {
            pluginId,
            pluginName,
            hasMenubarPlugin,
            menubarItems
        };
    }

    /**
     * 分析所有插件并返回包含menubar/plugin配置的插件列表
     */
    analyzeAllPlugins(plugins: DeployedPlugin[]): PluginMenubarInfo[] {
        const results: PluginMenubarInfo[] = [];

        for (const plugin of plugins) {
            const info = this.analyzePlugin(plugin);
            if (info.hasMenubarPlugin) {
                results.push(info);
            }
        }

        return results;
    }

    /**
     * 生成插件menubar配置报告
     */
    generateReport(plugins: DeployedPlugin[]): string {
        const menubarPlugins = this.analyzeAllPlugins(plugins);

        if (menubarPlugins.length === 0) {
            return 'No plugins found with menubar/plugin configuration.';
        }

        let report = `Found ${menubarPlugins.length} plugin(s) with menubar/plugin configuration:\n\n`;

        for (const plugin of menubarPlugins) {
            report += `Plugin: ${plugin.pluginName} (${plugin.pluginId})\n`;
            report += `Menubar Items: ${plugin.menubarItems.length}\n`;

            for (const item of plugin.menubarItems) {
                report += `  - ${item.command || item.submenu || 'Unknown'}`;
                if (item.group) {
                    report += ` (group: ${item.group})`;
                }
                if (item.order) {
                    report += ` (order: ${item.order})`;
                }
                report += '\n';
            }
            report += '\n';
        }

        return report;
    }

    /**
     * 检查插件是否应该注册到menubar
     */
    shouldRegisterToMenubar(plugin: DeployedPlugin): boolean {
        const allMenus = plugin.contributes?.menus;
        if (!allMenus) {
            return false;
        }

        return Object.keys(allMenus).some(contributionPoint =>
            contributionPoint === 'menubar/plugin' ||
            contributionPoint.includes('menubar/plugin')
        );
    }

    private parseGroup(rawGroup?: string): { group?: string, order?: string } {
        if (!rawGroup) { return {}; }
        const separatorIndex = rawGroup.lastIndexOf('@');
        if (separatorIndex > -1) {
            return { group: rawGroup.substring(0, separatorIndex), order: rawGroup.substring(separatorIndex + 1) || undefined };
        }
        return { group: rawGroup };
    }
} 

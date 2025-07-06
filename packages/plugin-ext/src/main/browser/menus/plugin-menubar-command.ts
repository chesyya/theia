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

import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, nls } from '@theia/core';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { PluginMenubarAnalyzer } from './plugin-menubar-analyzer';
import { DeployedPlugin } from '../../../common';

export namespace PluginMenubarCommands {
    export const ANALYZE_PLUGIN_MENUBAR: Command = {
        id: 'plugin.menubar.analyze',
        label: nls.localizeByDefault('Analyze Plugin Menubar Contributions'),
        category: 'Plugin'
    };
}

@injectable()
export class PluginMenubarCommandContribution implements CommandContribution, FrontendApplicationContribution {

    @inject(PluginMenubarAnalyzer)
    protected readonly menubarAnalyzer: PluginMenubarAnalyzer;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(PluginMenubarCommands.ANALYZE_PLUGIN_MENUBAR, {
            execute: () => this.analyzePluginMenubar()
        });
    }

    onStart(app: FrontendApplication): void {
        // 应用启动时自动分析插件menubar配置
        setTimeout(() => {
            this.analyzePluginMenubar();
        }, 5000); // 延迟5秒执行，确保插件都已加载
    }

    private analyzePluginMenubar(): void {
        // 这里需要获取已部署的插件列表
        // 由于插件系统比较复杂，这里提供一个示例实现
        console.log('Analyzing plugin menubar contributions...');

        // 在实际实现中，你需要从插件管理器中获取插件列表
        // const plugins = this.pluginManager.getDeployedPlugins();
        // const report = this.menubarAnalyzer.generateReport(plugins);
        // console.log(report);

        // 临时实现：显示分析功能已启用
        console.log('Plugin menubar analysis is enabled. Check console for detailed reports.');
    }

    /**
     * 手动分析指定插件的menubar配置
     */
    analyzeSpecificPlugin(plugin: DeployedPlugin): void {
        const info = this.menubarAnalyzer.analyzePlugin(plugin);
        console.log(`Plugin Analysis for ${info.pluginName}:`, info);

        if (info.hasMenubarPlugin) {
            console.log(`✓ Plugin ${info.pluginName} has menubar/plugin configuration`);
            console.log(`  Menubar items: ${info.menubarItems.length}`);
        } else {
            console.log(`✗ Plugin ${info.pluginName} does not have menubar/plugin configuration`);
        }
    }
} 

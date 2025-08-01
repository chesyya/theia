// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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
import { Emitter, Event } from '../common/event';
import { PluginAuthorizationProvider, PluginAuthorizationChangeEvent } from '../common/plugin-authorization';

/**
 * Mock实现的插件授权提供者
 * 模拟插件授权状态的管理和变更通知
 */
@injectable()
export class PluginAuthorizationProviderImpl implements PluginAuthorizationProvider {

    private readonly onAuthorizationChangedEmitter = new Emitter<PluginAuthorizationChangeEvent>();
    
    // Mock数据：模拟已授权和未授权的插件列表
    private authorizedPlugins: Set<string> = new Set([
        'vscode.typescript-language-features',
        'vscode.json-language-features',
        'vscode.html-language-features',
        'vscode.css-language-features'
    ]);
    
    private unauthorizedPlugins: Set<string> = new Set([
        'test-plugin', // 初始状态：test-plugin未授权
        'test.unauthorized-plugin',
        'example.blocked-extension'
    ]);

    private demoTimersStarted = false;

    get onAuthorizationChanged(): Event<PluginAuthorizationChangeEvent> {
        return this.onAuthorizationChangedEmitter.event;
    }

    async isAuthorized(pluginId: string): Promise<boolean> {
        // 启动demo定时器（只启动一次）
        if (!this.demoTimersStarted) {
            this.startDemoTimers();
        }

        // 模拟异步查询
        await this.delay(10);
        
        // 如果在未授权列表中，返回false
        if (this.unauthorizedPlugins.has(pluginId)) {
            return false;
        }
        
        // 如果在已授权列表中，返回true
        if (this.authorizedPlugins.has(pluginId)) {
            return true;
        }
        
        // 默认情况下，认为插件是已授权的（兼容现有插件）
        return true;
    }

    async getAuthorizedPluginIds(): Promise<string[]> {
        await this.delay(10);
        return Array.from(this.authorizedPlugins);
    }

    async getUnauthorizedPluginIds(): Promise<string[]> {
        await this.delay(10);
        return Array.from(this.unauthorizedPlugins);
    }

    /**
     * Mock方法：用于测试授权状态变更
     * 在实际实现中，这应该由授权管理系统调用
     */
    mockGrantAuthorization(pluginIds: string[]): void {
        const changedIds: string[] = [];
        
        for (const pluginId of pluginIds) {
            if (this.unauthorizedPlugins.has(pluginId)) {
                this.unauthorizedPlugins.delete(pluginId);
                this.authorizedPlugins.add(pluginId);
                changedIds.push(pluginId);
            }
        }
        
        if (changedIds.length > 0) {
            this.onAuthorizationChangedEmitter.fire({
                changedPluginIds: changedIds,
                changeType: 'granted'
            });
        }
    }

    /**
     * Mock方法：用于测试授权撤销
     * 在实际实现中，这应该由授权管理系统调用
     */
    mockRevokeAuthorization(pluginIds: string[]): void {
        const changedIds: string[] = [];
        
        for (const pluginId of pluginIds) {
            if (this.authorizedPlugins.has(pluginId)) {
                this.authorizedPlugins.delete(pluginId);
                this.unauthorizedPlugins.add(pluginId);
                changedIds.push(pluginId);
            }
        }
        
        if (changedIds.length > 0) {
            this.onAuthorizationChangedEmitter.fire({
                changedPluginIds: changedIds,
                changeType: 'revoked'
            });
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 启动Demo定时器 - 用于测试授权状态变更
     */
    private startDemoTimers(): void {
        this.demoTimersStarted = true;
        
        console.log('[DEMO] Authorization demo started. test-plugin is initially UNAUTHORIZED.');
        
        // 1分钟后：test-plugin获得授权
        setTimeout(() => {
            console.log('[DEMO] Granting authorization to test-plugin...');
            this.mockGrantAuthorization(['test-plugin']);
        }, 60000); // 60秒
        
        // 2分钟后：test-plugin授权失效
        setTimeout(() => {
            console.log('[DEMO] Revoking authorization from test-plugin...');
            this.mockRevokeAuthorization(['test-plugin']);
        }, 120000); // 120秒
    }
}
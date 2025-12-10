// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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

import { Emitter, Event } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { PluginIdentifiers } from '../../common';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { FileSystemLocking } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';

@injectable()
export class PluginUninstallationManager {
    private configFilePath: string | undefined;

    @inject(EnvVariablesServer)
    protected readonly envServer: EnvVariablesServer;

    @inject(FileSystemLocking)
    protected readonly fsLocking: FileSystemLocking;

    protected readonly onDidChangeUninstalledPluginsEmitter = new Emitter<readonly PluginIdentifiers.VersionedId[]>();
    onDidChangeUninstalledPlugins: Event<readonly PluginIdentifiers.VersionedId[]> = this.onDidChangeUninstalledPluginsEmitter.event;

    protected readonly onDidChangeDisabledPluginsEmitter = new Emitter<readonly PluginIdentifiers.VersionedId[]>();
    onDidChangeDisabledPlugins: Event<readonly PluginIdentifiers.VersionedId[]> = this.onDidChangeDisabledPluginsEmitter.event;

    protected uninstalledPlugins: Set<PluginIdentifiers.VersionedId> = new Set();
    protected disabledPlugins: Set<PluginIdentifiers.VersionedId> = new Set();

    protected readonly initialized = new Deferred<void>();

    @postConstruct()
    protected init(): void {
        this.doInit().catch(e => {
            console.error('Failed to initialize PluginUninstallationManager', e);
            this.initialized.resolve();
        });
    }

    protected async doInit(): Promise<void> {
        try {
            const configDirUri = await this.envServer.getConfigDirUri();
            const configDir = FileUri.fsPath(configDirUri);
            await fs.ensureDir(configDir);
            this.configFilePath = path.join(configDir, 'disabled-plugins.json');
            await this.load();
        } finally {
            this.initialized.resolve();
        }
    }

    protected async load(): Promise<void> {
        if (this.configFilePath && await fs.pathExists(this.configFilePath)) {
            try {
                const content = await fs.readJSON(this.configFilePath);
                if (Array.isArray(content)) {
                    content.forEach(id => this.disabledPlugins.add(id));
                }
            } catch (e) {
                console.warn('Failed to load disabled plugins', e);
            }
        }
    }

    protected async save(): Promise<void> {
        if (this.configFilePath) {
            await this.fsLocking.lockPath(this.configFilePath, async filePath => {
                await fs.writeJSON(filePath, await this.getDisabledPluginIds());
            });
        }
    }

    async markAsUninstalled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean> {
        let didChange = false;
        for (const id of pluginIds) {
            if (!this.uninstalledPlugins.has(id)) {
                didChange = true;
                this.uninstalledPlugins.add(id);
            }
        }
        if (didChange) {
            this.onDidChangeUninstalledPluginsEmitter.fire(this.getUninstalledPluginIds());
        }
        this.markAsEnabled(...pluginIds);
        return didChange;
    }

    async markAsInstalled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean> {
        let didChange = false;
        for (const id of pluginIds) {
            didChange = this.uninstalledPlugins.delete(id) || didChange;
        }
        if (didChange) {
            this.onDidChangeUninstalledPluginsEmitter.fire(this.getUninstalledPluginIds());
        }
        return didChange;
    }

    isUninstalled(pluginId: PluginIdentifiers.VersionedId): boolean {
        return this.uninstalledPlugins.has(pluginId);
    }

    getUninstalledPluginIds(): readonly PluginIdentifiers.VersionedId[] {
        return [...this.uninstalledPlugins];
    }

    async markAsDisabled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean> {
        await this.initialized.promise;
        let didChange = false;
        for (const id of pluginIds) {
            if (!this.disabledPlugins.has(id)) {
                this.disabledPlugins.add(id);
                didChange = true;
            }
        }
        if (didChange) {
            await this.save();
            this.onDidChangeDisabledPluginsEmitter.fire([...this.disabledPlugins]);
        }
        return didChange;
    }

    async markAsEnabled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean> {
        await this.initialized.promise;
        let didChange = false;
        for (const id of pluginIds) {
            didChange = this.disabledPlugins.delete(id) || didChange;
        }
        if (didChange) {
            await this.save();
            this.onDidChangeDisabledPluginsEmitter.fire([...this.disabledPlugins]);
        }
        return didChange;
    }

    async isDisabled(pluginId: PluginIdentifiers.VersionedId): Promise<boolean> {
        await this.initialized.promise;
        return this.disabledPlugins.has(pluginId);
    }

    async getDisabledPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]> {
        await this.initialized.promise;
        return [...this.disabledPlugins];
    }
}

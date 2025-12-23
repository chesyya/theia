/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-05 09:22:09
 * @FilePath: /workdir/packages/plugin-host/src/main/common/plugin-environment.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-10 14:29:32
 */
import { injectable, inject } from '@theia/core/shared/inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import URI from '@theia/core/lib/common/uri';

@injectable()
export class PluginEnvironment {
    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    protected _pluginsDirUri: URI | undefined;
    async getPluginsDirUri(): Promise<URI> {
        if (!this._pluginsDirUri) {
            const configDir = new URI(await this.environments.getConfigDirUri());
            this._pluginsDirUri = configDir.resolve('userStorage');
        }
        return this._pluginsDirUri;
    }

}

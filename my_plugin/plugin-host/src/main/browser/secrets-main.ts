/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// code copied and modified from https://github.com/microsoft/vscode/blob/1.55.2/src/vs/workbench/api/browser/mainThreadSecretState.ts

import { SecretsExt, SecretsMain } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { interfaces } from '@theia/core/shared/inversify';
import { MAIN_RPC_CONTEXT } from '../../common';
import { CredentialsService } from '@theia/core/lib/browser/credentials-service';

export class SecretsMainImpl implements SecretsMain {

    private readonly proxy: SecretsExt;
    private readonly credentialsService: CredentialsService;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.SECRETS_EXT);
        this.credentialsService = container.get(CredentialsService);
        this.credentialsService.onDidChangePassword(e => {
            const extensionId = e.service.substring(window.location.hostname.length + 1);
            this.proxy.$onDidChangePassword({ extensionId, key: e.account });
        });
    }

    private static getFullKey(extensionId: string): string {
        return `${window.location.hostname}-${extensionId}`;
    }

    async $getPassword(extensionId: string, key: string): Promise<string | undefined> {
        const fullKey = SecretsMainImpl.getFullKey(extensionId);
        const passwordData = await this.credentialsService.getPassword(fullKey, key);

        if (passwordData) {
            try {
                const data = JSON.parse(passwordData);
                if (data.extensionId === extensionId) {
                    return data.content;
                }
            } catch (e) {
                throw new Error('Cannot get password');
            }
        }

        return undefined;
    }

    async $setPassword(extensionId: string, key: string, value: string): Promise<void> {
        const fullKey = SecretsMainImpl.getFullKey(extensionId);
        const passwordData = JSON.stringify({
            extensionId,
            content: value
        });
        return this.credentialsService.setPassword(fullKey, key, passwordData);
    }

    async $deletePassword(extensionId: string, key: string): Promise<void> {
        try {
            const fullKey = SecretsMainImpl.getFullKey(extensionId);
            await this.credentialsService.deletePassword(fullKey, key);
        } catch (e) {
            throw new Error('Cannot delete password');
        }
    }
}

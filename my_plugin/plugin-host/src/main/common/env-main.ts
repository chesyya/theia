import { interfaces } from '@theia/core/shared/inversify';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { RPCProtocol } from '../../common/rpc-protocol';
import { EnvMain } from '../../common/plugin-api-rpc';
import { isWindows, isOSX } from '@theia/core';
import { OperatingSystem } from '../../plugin/types-impl';

export class EnvMainImpl implements EnvMain {
    private envVariableServer: EnvVariablesServer;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.envVariableServer = container.get(EnvVariablesServer);
    }

    $getEnvVariable(envVarName: string): Promise<string | undefined> {
        return this.envVariableServer.getValue(envVarName).then(result => result ? result.value : undefined);
    }

    async $getClientOperatingSystem(): Promise<OperatingSystem> {
        if (isWindows) {
            return OperatingSystem.Windows;
        }
        if (isOSX) {
            return OperatingSystem.OSX;
        }
        return OperatingSystem.Linux;
    }
}

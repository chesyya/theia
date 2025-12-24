import { BackendApplicationContribution } from '@theia/core/lib/node';
import { injectable, inject } from '@theia/core/shared/inversify';
import { PluginDeployer } from '../../common/plugin-protocol';
import { ILogger } from '@theia/core';

@injectable()
export class PluginDeployerContribution implements BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(PluginDeployer)
    protected pluginDeployer: PluginDeployer;

    initialize(): Promise<void> {
        this.pluginDeployer.start().catch(error => this.logger.error('Initializing plugin deployer failed.', error));
        return Promise.resolve();
    }
}

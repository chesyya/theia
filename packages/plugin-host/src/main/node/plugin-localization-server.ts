import { inject, injectable } from '@theia/core/shared/inversify';
import { PluginDeployer } from '../../common/plugin-protocol';
import { PluginDeployerImpl } from './plugin-deployer-impl';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { LocalizationServerImpl } from '@theia/core/lib/node/i18n/localization-server';

@injectable()
export class PluginLocalizationServer extends LocalizationServerImpl {
    @inject(PluginDeployer)
    protected readonly pluginDeployer: PluginDeployerImpl;
    protected readonly pluginsDeployed = new Deferred();

    override async initialize(): Promise<void> {
        this.pluginDeployer.onDidDeploy(() => {
            this.pluginsDeployed.resolve();
        });
        await super.initialize();
    }

    override async waitForInitialization(): Promise<void> {
        await Promise.all([
            super.waitForInitialization(),
            this.pluginsDeployed.promise,
        ]);
    }
}

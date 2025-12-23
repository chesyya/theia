import { injectable, inject } from '@theia/core/shared/inversify';
import { PluginEnvironment } from '../common/plugin-environment';
import { PluginDeployerParticipant, PluginDeployerStartContext } from '../../common/plugin-protocol';

@injectable()
export class PluginTheiaDeployerParticipant implements PluginDeployerParticipant {

    @inject(PluginEnvironment)
    protected readonly environments: PluginEnvironment;

    async onWillStart(context: PluginDeployerStartContext): Promise<void> {
        const pluginsDirUri = await this.environments.getPluginsDirUri();
        context.userEntries.push(pluginsDirUri.withScheme('local-dir').toString());
    }

}

import { inject, injectable } from '@theia/core/shared/inversify';
import { Argv, Arguments } from '@theia/core/shared/yargs';
import { CliContribution } from '@theia/core/lib/node/cli';
import { HostedPluginDeployerHandler } from '../../hosted/node/hosted-plugin-deployer-handler';
import { PluginType } from '../../common';

@injectable()
export class PluginMgmtCliContribution implements CliContribution {

    static LIST_PLUGINS = 'list-plugins';
    static SHOW_VERSIONS = '--show-versions';
    static SHOW_BUILTINS = '--show-builtins';

    @inject(HostedPluginDeployerHandler)
    protected deployerHandler: HostedPluginDeployerHandler;

    configure(conf: Argv): void {
        conf.command([PluginMgmtCliContribution.LIST_PLUGINS, 'list-extensions'],
            'List the installed plugins',
            yargs => yargs.option(PluginMgmtCliContribution.SHOW_VERSIONS, {
                description: 'List the versions of the installed plugins',
                type: 'boolean',
                default: false,
            }).option(PluginMgmtCliContribution.SHOW_BUILTINS, {
                description: 'List the built-in plugins',
                type: 'boolean',
                default: false,
            }),

            async yargs => {
                const showVersions = yargs[PluginMgmtCliContribution.SHOW_VERSIONS];
                const deployedIds = await this.deployerHandler.getDeployedBackendPlugins();
                const pluginType = yargs[PluginMgmtCliContribution.SHOW_BUILTINS] ? PluginType.System : PluginType.User;
                process.stdout.write('installed plugins:\n');
                deployedIds.filter(plugin => plugin.type === pluginType).forEach(plugin => {
                    if (showVersions) {
                        process.stdout.write(`${plugin.metadata.model.id}@${plugin.metadata.model.version}\n`);
                    } else {
                        process.stdout.write(`${plugin.metadata.model.id}\n`);
                    }
                });
            }
        );
    }

    setArguments(args: Arguments): void {
    }
}

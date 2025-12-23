import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandService } from '@theia/core/lib/common/command';
import { OutputCommands } from '@theia/output/lib/browser/output-commands';
import { OutputChannelRegistryMain, PluginInfo } from '../../common/plugin-api-rpc';

@injectable()
export class OutputChannelRegistryMainImpl implements OutputChannelRegistryMain {

    @inject(CommandService)
    protected readonly commandService: CommandService;

    $append(name: string, text: string, pluginInfo: PluginInfo): PromiseLike<void> {
        this.commandService.executeCommand(OutputCommands.APPEND.id, { name, text });
        return Promise.resolve();
    }

    $clear(name: string): PromiseLike<void> {
        this.commandService.executeCommand(OutputCommands.CLEAR.id, { name });
        return Promise.resolve();
    }

    $dispose(name: string): PromiseLike<void> {
        this.commandService.executeCommand(OutputCommands.DISPOSE.id, { name });
        return Promise.resolve();
    }

    async $reveal(name: string, preserveFocus: boolean): Promise<void> {
        const options = { preserveFocus };
        this.commandService.executeCommand(OutputCommands.SHOW.id, { name, options });
    }

    $close(name: string): PromiseLike<void> {
        this.commandService.executeCommand(OutputCommands.HIDE.id, { name });
        return Promise.resolve();
    }

}

/*
 * @Author: tengzhiyu tengzhiyu@baosight.com
 * @Date: 2025-11-26 17:29:36
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/selection-provider-command.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved. 
 * @Description: 
 */
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { inject, injectable } from '@theia/core/shared/inversify';
import { UriAwareCommandHandler, UriCommandHandler } from '@theia/core/lib/common/uri-command-handler';
import URI from '@theia/core/lib/common/uri';
import { SelectionService } from '@theia/core';

export namespace SelectionProviderCommands {
    export const GET_SELECTED_CONTEXT: Command = {
        id: 'theia.plugin.workspace.selectedContext'
    };
}

@injectable()
export class SelectionProviderCommandContribution implements CommandContribution {

    @inject(SelectionService) protected readonly selectionService: SelectionService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SelectionProviderCommands.GET_SELECTED_CONTEXT, this.newMultiUriAwareCommandHandler({
            isEnabled: () => true,
            isVisible: () => false,
            execute: (selectedUris: URI[]) => selectedUris.map(uri => uri.toComponents())
        }));
    }

    protected newMultiUriAwareCommandHandler(handler: UriCommandHandler<URI[]>): UriAwareCommandHandler<URI[]> {
        return UriAwareCommandHandler.MultiSelect(this.selectionService, handler);
    }
}

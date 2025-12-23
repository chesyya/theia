import { Directive } from '@baosky/platform/lib/browser/directive/directive'
import { DirectiveHandler } from '@baosky/platform/lib/browser/directive/directive-handler'
import { DirectiveProcessContribution } from '@baosky/platform/lib/browser/directive/directive-process-contribution'
import { URI } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { AddFolderNodeDirectiveHandlerFactory } from './add-plugin-tree-node-handle';
import { BaseLoadDataHandlerFactory, DataProps } from "@baosky/platform/lib/browser/database/directive/handlers/base-load-data-handler";
import {
    LoadDataHandler,
    LoadDataProps,
} from "@baosky/platform/lib/browser/database/directive/handlers/base-load-data-handler";
import { FocusTreeNodeDirectiveHandlerFactory } from "@baosky/platform/lib/browser/project/project-tree/directive/status/focus-tree-node-directive-handler";

@injectable()
export class PluginFolderNodeDirectiveContribution implements DirectiveProcessContribution {
    @inject(AddFolderNodeDirectiveHandlerFactory)
    private addNodeDirectiveHandler: AddFolderNodeDirectiveHandlerFactory;
    @inject(BaseLoadDataHandlerFactory)
    private readonly baseLoadDataHandlerFactory: BaseLoadDataHandlerFactory<DataProps>;
    @inject(FocusTreeNodeDirectiveHandlerFactory)
    protected readonly focusTreeNodeDirectiveHandlerFactory: FocusTreeNodeDirectiveHandlerFactory;

    async prepare<T extends Directive>(directive: T): Promise<DirectiveHandler[] | undefined> {
        if (directive instanceof AddFolderNodeDirective) {
            return await this.buildAddNodeHandler<T>(directive);
        }
        return undefined;
    }

    private async buildAddNodeHandler<T extends Directive>(directive: T & AddFolderNodeDirective): Promise<DirectiveHandler[]> {
        const handlers: DirectiveHandler[] = [];
        if (!directive.resource) {
            return handlers;
        }
        handlers.push(this.addNodeDirectiveHandler().initPayload({
            parentDir: directive.resource,
            dirName: directive.name
        }));
        const uri = URI.fromFilePath(directive.resource).resolve(directive.name);
        //加载object
        handlers.push(this.baseLoadDataHandlerFactory(LoadDataHandler).initPayload(
            { rootDir: uri, recursion: false } as LoadDataProps
        ));
        //聚焦项目树的节点
        handlers.push(
            this.focusTreeNodeDirectiveHandlerFactory().initPayload({
                path: uri,
            }),
        );
        return handlers;
    }
}



export class AddFolderNodeDirective extends Directive {
    constructor(id: number, title: string, resource: string, category: string, private _name: string) {
        super(id, title, resource, category);
    };

    public get name(): string {
        return this._name;
    }
}
import { Directive } from '@baosky/platform/lib/browser/directive/directive'
import { DirectiveHandler } from '@baosky/platform/lib/browser/directive/directive-handler'
import { DirectiveProcessContribution } from '@baosky/platform/lib/browser/directive/directive-process-contribution'
import { URI } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { AddFileNodeDirectiveHandlerFactory } from './plugin-file-node-handler';
import { BaseLoadDataHandlerFactory, DataProps } from "@baosky/platform/lib/browser/database/directive/handlers/base-load-data-handler";
import {
    LoadDataHandler,
    LoadDataProps,
} from "@baosky/platform/lib/browser/database/directive/handlers/base-load-data-handler";
import { FocusTreeNodeDirectiveHandlerFactory } from "@baosky/platform/lib/browser/project/project-tree/directive/status/focus-tree-node-directive-handler";
import { CreateFileDirectiveHandlerFactory } from '@baosky/platform/lib/browser/directive/handlers/create-file-directive-handler'
import { CreateFileAction } from '@baosky/platform/lib/browser/directive/handlers/create-file-action';
import { HBSAction } from '@baosky/platform/lib/browser/templates/handlers/hbs-action'

export const TEMPLATEFILENAME = "template.json";
export enum OperateType {
    CREATE,
    DELETE
}
type ActionType = "CREATE_FILE" | "CREATE_BY_HBS" | "CREATE_DIR";
/**
 * Description placeholder
 * @date 9/27/2023 - 5:00:37 AM
 * @author 沈杰
 *
 * @interface TemplateAction
 * @typedef {TemplateAction}
 * @extends {CreateFileAction}
 * @extends {HBSAction}
 */
interface TemplateAction extends CreateFileAction, HBSAction {
    type: ActionType,
}
@injectable()
export class PluginFileNodeDirectiveContribution implements DirectiveProcessContribution {
    @inject(BaseLoadDataHandlerFactory)
    private readonly baseLoadDataHandlerFactory: BaseLoadDataHandlerFactory<DataProps>;
    @inject(FocusTreeNodeDirectiveHandlerFactory)
    protected readonly focusTreeNodeDirectiveHandlerFactory: FocusTreeNodeDirectiveHandlerFactory;
    @inject(CreateFileDirectiveHandlerFactory) private readonly createFileDirectiveHandlerFactory: CreateFileDirectiveHandlerFactory;

    async prepare<T extends Directive>(directive: T): Promise<DirectiveHandler[] | undefined> {
        if (directive instanceof AddFileNodeDirective) {
            return await this.buildPluginFileNodeHandler<T>(directive);
        }
        return undefined;
    }

    private async buildPluginFileNodeHandler<T extends Directive>(directive: T & AddFileNodeDirective): Promise<DirectiveHandler[]> {
        const handlers: DirectiveHandler[] = [];
        if (!directive.resource) {
            return handlers;
        }

        const arg0 = [{
            type: "CREATE_FILE",
            fileDir: directive.resource,
            fileName: directive.name,
            content: directive.data
        }];
        const handler = this.createFileDirectiveHandlerFactory();
        handler.initPayload({
            actions: arg0
        });
        handlers.push(handler);
        const uri = URI.fromFilePath(directive.resource).resolve(directive.name);
        //加载object
        handlers.push(this.baseLoadDataHandlerFactory(LoadDataHandler).initPayload(
            { path: uri, recursion: false } as LoadDataProps
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

export class AddFileNodeDirective extends Directive {
    data: string;
    constructor(id: number, title: string, resource: string, category: string, data: string, private _name: string) {
        super(id, title, resource, category);
        this.data = data;
    };

    public get name(): string {
        return this._name;
    }
}
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import {
    PLUGIN_RPC_CONTEXT as Ext,
    ProjectRegistryMain
} from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import * as baosky from '@baosky/plugin';

@injectable()
export class ProjectRegistryExt {
    @inject(RPCProtocol)
    protected readonly rpc: RPCProtocol;

    private proxy: ProjectRegistryMain;

    @postConstruct()
    initialize(): void {
        this.proxy = this.rpc.getProxy(Ext.PROJECT_REGISTRY_MAIN);
    }

    async getCurrentProject(): Promise<baosky.projects.Project | undefined> {
        return await this.proxy.$getCurrentProject();
    };

    doRefactor(refactorOptions: baosky.projects.RefactorOptions): void {
        this.proxy.$doRefactor(refactorOptions);
    }

    focusNode(path: string): void {
        this.proxy.$focusNode(path);
    }

    saveProject(): void {
        this.proxy.$saveProject();
    }

    async countNode(queryOptions: baosky.projects.NodeObjectType[]): Promise<baosky.projects.ProjectNodeCount[]> {
        return this.proxy.$countNode(queryOptions)
    }
}

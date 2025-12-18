import { injectable, interfaces } from '@theia/core/shared/inversify';
import { AsyncActionBackendService, AsyncActionItem, ActionContext, ASYNC_ACTION_RPC_CONTEXT } from '../../common/async-action-protocol';
import { RPCProtocol } from '../../common/rpc-protocol';
import { MainPluginApiProvider } from '../../common/plugin-ext-api-contribution';

@injectable()
export class AsyncActionFrontendService implements MainPluginApiProvider {

    protected backendProxy: AsyncActionBackendService | undefined;

    initialize(rpc: RPCProtocol, container: interfaces.Container): void {
        this.backendProxy = rpc.getProxy(ASYNC_ACTION_RPC_CONTEXT.ASYNC_ACTION_BACKEND);
    }

    async fetchActions(context: ActionContext): Promise<AsyncActionItem[]> {
        if (!this.backendProxy) {
            return [];
        }
        return this.backendProxy.$getActions(context);
    }

    async run(item: AsyncActionItem, context: ActionContext): Promise<void> {
        if (!this.backendProxy || !item._providerId) {
            return;
        }
        await this.backendProxy.$executeAction(item._providerId, item.id, context);
    }
}

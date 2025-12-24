import { DisposableCollection } from '@theia/core';
import { interfaces } from '@theia/core/shared/inversify';
import { NotebookRendererMessagingService } from '@theia/notebook/lib/browser';
import { MAIN_RPC_CONTEXT, NotebookRenderersExt, NotebookRenderersMain } from '../../../common';
import { RPCProtocol } from '../../../common/rpc-protocol';

export class NotebookRenderersMainImpl implements NotebookRenderersMain {
    private readonly proxy: NotebookRenderersExt;
    private readonly rendererMessagingService: NotebookRendererMessagingService;

    private readonly disposables = new DisposableCollection();

    constructor(
        rpc: RPCProtocol,
        container: interfaces.Container
    ) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.NOTEBOOK_RENDERERS_EXT);
        this.rendererMessagingService = container.get(NotebookRendererMessagingService);
        this.rendererMessagingService.onPostMessage(e => {
            this.proxy.$postRendererMessage(e.editorId, e.rendererId, e.message);
        });
    }

    $postMessage(editorId: string | undefined, rendererId: string, message: unknown): Promise<boolean> {
        return this.rendererMessagingService.receiveMessage(editorId, rendererId, message);
    }

    dispose(): void {
        this.disposables.dispose();
    }
}

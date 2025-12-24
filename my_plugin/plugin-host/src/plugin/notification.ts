import { PLUGIN_RPC_CONTEXT, NotificationExt, NotificationMain } from '../common/plugin-api-rpc';
import { CancellationToken, Progress, ProgressOptions } from '@baosky/plugin';
import { RPCProtocol } from '../common/rpc-protocol';
import { CancellationTokenSource } from '@theia/core/lib/common/cancellation';
import { ProgressLocation } from './types-impl';
import { Deferred } from '@theia/core/lib/common/promise-util';

export class NotificationExtImpl implements NotificationExt {
    private readonly proxy: NotificationMain;
    private mapProgressIdToCancellationSource: Map<string, CancellationTokenSource> = new Map();

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.NOTIFICATION_MAIN);
    }

    async withProgress<R>(
        options: ProgressOptions,
        task: (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => PromiseLike<R>
    ): Promise<R> {
        const source = new CancellationTokenSource();
        const id = new Deferred<string>();
        const progress = task({ report: async item => this.proxy.$updateProgress(await id.promise, item) }, source.token);
        const title = options.title ? options.title : '';
        const location = this.mapLocation(options.location);
        const cancellable = options.cancellable;

        id.resolve(await this.proxy.$startProgress({ title, location, cancellable }));

        if (cancellable) {
            const progressId = await id.promise;
            this.mapProgressIdToCancellationSource.set(progressId, source);
        }

        const stop = async () => this.proxy.$stopProgress(await id.promise);
        const promise = Promise.all([
            progress,
            new Promise(resolve => setTimeout(resolve, 250)) // try to show even if it's done immediately
        ]);
        promise.then(stop, stop);
        return progress;
    }

    public $acceptProgressCanceled(id: string): void {
        const source = this.mapProgressIdToCancellationSource.get(id);
        if (source) {
            source.cancel();
            this.mapProgressIdToCancellationSource.delete(id);
        }
    }

    protected mapLocation(location: ProgressLocation | { viewId: string }): string | undefined {
        if (typeof location === 'object') {
            return location.viewId;
        }

        switch (location) {
            case ProgressLocation.Notification: return 'notification';
            case ProgressLocation.SourceControl: return 'scm';
            case ProgressLocation.Window: return 'window';
            default: return undefined;
        }
    }

}

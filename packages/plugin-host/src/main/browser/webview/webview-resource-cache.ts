import { injectable } from '@theia/core/shared/inversify';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { MaybePromise } from '@theia/core/lib/common/types';

export interface WebviewResourceResponse {
    eTag: string | undefined,
    body(): MaybePromise<Uint8Array>
}

/**
 * Browser based cache of webview resources across all instances.
 */
@injectable()
export class WebviewResourceCache {

    protected readonly cache = new Deferred<Cache | undefined>();

    constructor() {
        this.resolveCache();
    }

    protected async resolveCache(): Promise<void> {
        try {
            this.cache.resolve(await caches.open('webview:v1'));
        } catch (e) {
            console.error('Failed to enable webview caching: ', e);
            this.cache.resolve(undefined);
        }
    }

    async match(url: string): Promise<WebviewResourceResponse | undefined> {
        const cache = await this.cache.promise;
        if (!cache) {
            return undefined;
        }
        const response = await cache.match(url);
        if (!response) {
            return undefined;
        }
        return {
            eTag: response.headers.get('ETag') || undefined,
            body: async () => {
                const buffer = await response.arrayBuffer();
                return new Uint8Array(buffer);
            }
        };
    }

    async delete(url: string): Promise<boolean> {
        const cache = await this.cache.promise;
        if (!cache) {
            return false;
        }
        return cache.delete(url);
    }

    async put(url: string, response: WebviewResourceResponse): Promise<void> {
        if (!response.eTag) {
            return;
        }
        const cache = await this.cache.promise;
        if (!cache) {
            return;
        }
        const body = await response.body();
        await cache.put(url, new Response(body, {
            status: 200,
            headers: { 'ETag': response.eTag }
        }));
    }

}

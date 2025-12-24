// eslint-disable-next-line @theia/runtime-import-check
import { interfaces } from '@theia/core/shared/inversify';
import { DebugExtImpl } from '../../../plugin/debug/debug-ext';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function createDebugExtStub(container: interfaces.Container): DebugExtImpl {
    const delegate = container.get(DebugExtImpl);
    return new Proxy(delegate, {
        apply: function (target, that, args): void {
            console.error('Debug API works only in plugin container');
        }
    });
}

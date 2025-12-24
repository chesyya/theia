import '@theia/core/shared/reflect-metadata';
import { Container } from '@theia/core/shared/inversify';
import { ConnectionClosedError, RPCProtocol } from '../../common/rpc-protocol';
import { ProcessTerminatedMessage, ProcessTerminateMessage } from './hosted-plugin-protocol';
import { PluginHostRPC } from './plugin-host-rpc';
import pluginHostModule from './plugin-host-module';

console.log('PLUGIN_HOST(' + process.pid + ') starting instance');

// override exit() function, to do not allow plugin kill this node
process.exit = function (code?: number): void {
    const err = new Error('An plugin call process.exit() and it was prevented.');
    console.warn(err.stack);
} as (code?: number) => never;

// same for 'crash'(works only in electron)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proc = process as any;
if (proc.crash) {
    proc.crash = function (): void {
        const err = new Error('An plugin call process.crash() and it was prevented.');
        console.warn(err.stack);
    };
}

process.on('uncaughtException', (err: Error) => {
    console.error(err);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unhandledPromises: Promise<any>[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    unhandledPromises.push(promise);
    setTimeout(() => {
        const index = unhandledPromises.indexOf(promise);
        if (index >= 0) {
            promise.catch(err => {
                unhandledPromises.splice(index, 1);
                if (terminating && (ConnectionClosedError.is(err) || ConnectionClosedError.is(reason))) {
                    // during termination it is expected that pending rpc request are rejected
                    return;
                }
                console.error(`Promise rejection not handled in one second: ${err} , reason: ${reason}`);
                if (err && err.stack) {
                    console.error(`With stack trace: ${err.stack}`);
                }
            });
        }
    }, 1000);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('rejectionHandled', (promise: Promise<any>) => {
    const index = unhandledPromises.indexOf(promise);
    if (index >= 0) {
        unhandledPromises.splice(index, 1);
    }
});

let terminating = false;

const container = new Container();
container.load(pluginHostModule);

const rpc: RPCProtocol = container.get(RPCProtocol);
const pluginHostRPC = container.get(PluginHostRPC);

process.on('message', async (message: string) => {
    if (terminating) {
        return;
    }
    try {
        const msg = JSON.parse(message);
        if (ProcessTerminateMessage.is(msg)) {
            terminating = true;
            if (msg.stopTimeout) {
                await Promise.race([
                    pluginHostRPC.terminate(),
                    new Promise(resolve => setTimeout(resolve, msg.stopTimeout))
                ]);
            } else {
                await pluginHostRPC.terminate();
            }
            rpc.dispose();
            if (process.send) {
                process.send(JSON.stringify({ type: ProcessTerminatedMessage.TYPE }));
            }

        }
    } catch (e) {
        console.error(e);
    }
});

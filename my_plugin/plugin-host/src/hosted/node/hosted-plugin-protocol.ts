// Custom message protocol between `HostedPluginProcess` and its `PluginHost` child process.

/**
 * Sent to initiate termination of the counterpart process.
 */
export interface ProcessTerminateMessage {
    type: typeof ProcessTerminateMessage.TYPE,
    stopTimeout?: number
}

export namespace ProcessTerminateMessage {
    export const TYPE = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function is(object: any): object is ProcessTerminateMessage {
        return typeof object === 'object' && object.type === TYPE;
    }
}

/**
 * Sent to inform the counter part process that the process termination has been completed.
 */
export interface ProcessTerminatedMessage {
    type: typeof ProcessTerminateMessage.TYPE,
}

export namespace ProcessTerminatedMessage {
    export const TYPE = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function is(object: any): object is ProcessTerminateMessage {
        return typeof object === 'object' && object.type === TYPE;
    }
}


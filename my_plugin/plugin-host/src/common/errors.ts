import { isObject } from '@theia/core/lib/common/types';

export function illegalArgument(message?: string): Error {
    if (message) {
        return new Error(`Illegal argument: ${message}`);
    } else {
        return new Error('Illegal argument');
    }
}

export function readonly(name?: string): Error {
    if (name) {
        return new Error(`readonly property '${name} cannot be changed'`);
    } else {
        return new Error('readonly property cannot be changed');
    }
}

export function disposed(what: string): Error {
    const result = new Error(`${what} has been disposed`);
    result.name = 'DISPOSED';
    return result;
}

interface Errno {
    readonly code: string;
    readonly errno: number
}
const ENOENT = 'ENOENT' as const;

type ErrnoException = Error & Errno;
function isErrnoException(arg: unknown): arg is ErrnoException {
    return arg instanceof Error
        && isObject<Partial<Errno>>(arg)
        && typeof arg.code === 'string'
        && typeof arg.errno === 'number';
}

/**
 * _(No such file or directory)_: Commonly raised by `fs` operations to indicate that a component of the specified pathname does not exist — no entity (file or directory) could be
 * found by the given path.
 */
export function isENOENT(
    arg: unknown
): arg is ErrnoException & Readonly<{ code: typeof ENOENT }> {
    return isErrnoException(arg) && arg.code === ENOENT;
}

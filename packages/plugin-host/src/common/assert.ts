
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ok(val?: any, message?: string): void {
    if (!val || val === null) {
        throw new Error(message ? `Assertion failed (${message})` : 'Assertion failed');
    }
}

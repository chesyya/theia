export interface Disposable {
    dispose(): void;
}

export function dispose<T extends Disposable>(disposable: T): T | undefined;
export function dispose<T extends Disposable>(...disposables: T[]): T[] | undefined;
export function dispose<T extends Disposable>(disposables: T[]): T[] | undefined;
export function dispose<T extends Disposable>(first: T | T[], ...rest: T[]): T | T[] | undefined {
    if (Array.isArray(first)) {
        first.forEach(d => d && d.dispose());
        return [];
    } else if (rest.length === 0) {
        if (first) {
            first.dispose();
            return first;
        }
        return undefined;
    } else {
        dispose(first);
        dispose(rest);
        return [];
    }
}

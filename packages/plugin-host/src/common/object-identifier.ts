export interface ObjectIdentifier {
    $ident: number;
}

export namespace ObjectIdentifier {
    export const name = '$ident';

    export function mixin<T>(obj: T, id: number): T & ObjectIdentifier {
        Object.defineProperty(obj, name, { value: id, enumerable: true });
        return <T & ObjectIdentifier>obj;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function of(obj: any): number {
        return obj[name];
    }
}

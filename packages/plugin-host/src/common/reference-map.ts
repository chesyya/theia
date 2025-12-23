// copied from hhttps://github.com/microsoft/vscode/blob/6261075646f055b99068d3688932416f2346dd3b/src/vs/workbench/api/common/extHostLanguageFeatures.ts#L1291-L1310.

export class ReferenceMap<T> {
    private readonly _references = new Map<number, T>();
    private _idPool = 1;

    createReferenceId(value: T): number {
        const id = this._idPool++;
        this._references.set(id, value);
        return id;
    }

    disposeReferenceId(referenceId: number): T | undefined {
        const value = this._references.get(referenceId);
        this._references.delete(referenceId);
        return value;
    }

    get(referenceId: number): T | undefined {
        return this._references.get(referenceId);
    }
}

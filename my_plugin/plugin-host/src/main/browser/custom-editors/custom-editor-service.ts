/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// copied and modified from https://github.com/microsoft/vscode/blob/53eac52308c4611000a171cc7bf1214293473c78/src/vs/workbench/contrib/customEditor/browser/customEditors.ts

import { injectable } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { Reference } from '@theia/core/lib/common/reference';
import { CustomEditorModel } from './custom-editors-main';

@injectable()
export class CustomEditorService {
    protected _models = new CustomEditorModelManager();
    get models(): CustomEditorModelManager { return this._models; }
}

export class CustomEditorModelManager {

    private readonly references = new Map<string, {
        readonly viewType: string,
        readonly model: Promise<CustomEditorModel>,
        counter: number
    }>();

    add(resource: URI, viewType: string, model: Promise<CustomEditorModel>): Promise<Reference<CustomEditorModel>> {
        const key = this.key(resource, viewType);
        const existing = this.references.get(key);
        if (existing) {
            throw new Error('Model already exists');
        }

        this.references.set(key, { viewType, model, counter: 0 });
        return this.tryRetain(resource, viewType)!;
    }

    async get(resource: URI, viewType: string): Promise<CustomEditorModel | undefined> {
        const key = this.key(resource, viewType);
        const entry = this.references.get(key);
        return entry?.model;
    }

    tryRetain(resource: URI, viewType: string): Promise<Reference<CustomEditorModel>> | undefined {
        const key = this.key(resource, viewType);

        const entry = this.references.get(key);
        if (!entry) {
            return undefined;
        }

        entry.counter++;

        return entry.model.then(model => ({
            object: model,
            dispose: once(() => {
                if (--entry!.counter <= 0) {
                    entry.model.then(x => x.dispose());
                    this.references.delete(key);
                }
            }),
        }));
    }

    disposeAllModelsForView(viewType: string): void {
        for (const [key, value] of this.references) {
            if (value.viewType === viewType) {
                value.model.then(x => x.dispose());
                this.references.delete(key);
            }
        }
    }

    private key(resource: URI, viewType: string): string {
        return `${resource.toString()}@@@${viewType}`;
    }
}

export function once<T extends Function>(this: unknown, fn: T): T {
    const _this = this;
    let didCall = false;
    let result: unknown;

    return function (): unknown {
        if (didCall) {
            return result;
        }

        didCall = true;
        result = fn.apply(_this, arguments);

        return result;
    } as unknown as T;
}

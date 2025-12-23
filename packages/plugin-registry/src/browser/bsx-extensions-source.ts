// *****************************************************************************
// Copyright (C) 2020 TypeFox and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { TreeSource, TreeElement } from '@theia/core/lib/browser/source-tree';
import { BSXExtensionsModelImpl } from './bsx-extensions-model';
import debounce = require('@theia/core/shared/lodash.debounce');

@injectable()
export class BSXExtensionsSourceOptions {
    static INSTALLED = 'installed';
    static BUILT_IN = 'builtin';
    static SEARCH_RESULT = 'searchResult';
    static RECOMMENDED = 'recommended';
    readonly id: string;
}

@injectable()
export class BSXExtensionsSource extends TreeSource {

    @inject(BSXExtensionsSourceOptions)
    protected readonly options: BSXExtensionsSourceOptions;

    @inject(BSXExtensionsModelImpl)
    protected readonly model: BSXExtensionsModelImpl;

    @postConstruct()
    protected init(): void {
        this.fireDidChange();
        this.toDispose.push(this.model.onDidChange(() => this.scheduleFireDidChange()));
    }

    protected scheduleFireDidChange = debounce(() => this.fireDidChange(), 100, { leading: false, trailing: true });

    getModel(): BSXExtensionsModelImpl {
        return this.model;
    }

    *getElements(): IterableIterator<TreeElement> {
        for (const id of this.doGetElements()) {
            const extension = this.model.getExtension(id);
            if (!extension) {
                continue;
            }
            if (this.options.id === BSXExtensionsSourceOptions.RECOMMENDED) {
                if (this.model.isInstalled(id)) {
                    continue;
                }
            }
            if (this.options.id === BSXExtensionsSourceOptions.BUILT_IN) {
                if (extension.builtin) {
                    yield extension;
                }
            } else if (!extension.builtin) {
                yield extension;
            }
        }
    }

    protected doGetElements(): IterableIterator<string> {
        if (this.options.id === BSXExtensionsSourceOptions.SEARCH_RESULT) {
            return this.model.searchResult;
        }
        if (this.options.id === BSXExtensionsSourceOptions.RECOMMENDED) {
            return this.model.recommended;
        }
        return this.model.installed;
    }

}

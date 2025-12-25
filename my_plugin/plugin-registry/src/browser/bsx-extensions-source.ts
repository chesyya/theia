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
import { BSXExtension } from './bsx-extension';

@injectable()
export class BSXExtensionsSourceOptions {
    static INSTALLED = 'installed';
    static BUILT_IN = 'builtin';
    static SEARCH_RESULT = 'searchResult';
    static RECOMMENDED = 'recommended';
    static SYSTEM_LEVEL = 'systemLevel';
    static USER_LEVEL = 'userLevel';
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
                if (this.shouldShowInBuiltin(extension)) {
                    yield extension;
                }
            } else if (this.options.id === BSXExtensionsSourceOptions.INSTALLED) {
                if (this.shouldShowInInstalled(extension)) {
                    yield extension;
                }
            } else if (this.options.id === BSXExtensionsSourceOptions.SYSTEM_LEVEL) {
                if (this.shouldShowInSystemLevel(extension)) {
                    yield extension;
                }
            } else if (this.options.id === BSXExtensionsSourceOptions.USER_LEVEL) {
                if (this.shouldShowInUserLevel(extension)) {
                    yield extension;
                }
            } else if (!extension.builtin) {
                yield extension;
            }
        }
    }

    protected shouldShowInInstalled(extension: BSXExtension): boolean {
        // 🆕 已安装视图：显示用户或管理员主动安装的插件
        // 排除纯内置插件（只有 builtin，没有 user/shared）

        // 有用户级版本，一定显示
        if (extension.hasUserVersion) {
            return true;
        }

        // 有共享版本，且当前用户是管理员，显示
        if (extension.hasSharedVersion && extension.admin) {
            return true;
        }

        // 纯内置插件不显示
        return false;
    }

    protected shouldShowInBuiltin(extension: BSXExtension): boolean {
        // 🆕 内置视图：显示所有有内置版本的插件
        return extension.hasBuiltinVersion;
    }

    protected shouldShowInSystemLevel(extension: BSXExtension): boolean {
        // 🆕 系统级视图：当前激活的是系统级或共享级
        return extension.isSystemLevel;
    }

    protected shouldShowInUserLevel(extension: BSXExtension): boolean {
        // 🆕 用户级视图：当前激活的是用户级
        return extension.isUserLevel;
    }

    protected doGetElements(): IterableIterator<string> {
        if (this.options.id === BSXExtensionsSourceOptions.SEARCH_RESULT) {
            return this.model.searchResult;
        }
        if (this.options.id === BSXExtensionsSourceOptions.RECOMMENDED) {
            return this.model.recommended;
        }
        if (this.options.id === BSXExtensionsSourceOptions.SYSTEM_LEVEL) {
            return this.model.systemLevel;
        }
        if (this.options.id === BSXExtensionsSourceOptions.USER_LEVEL) {
            return this.model.userLevel;
        }
        return this.model.installed;
    }

}

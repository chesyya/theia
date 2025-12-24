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

    protected shouldShowInInstalled(extension: any): boolean {
        // 已安装视图：显示从在线商店或手动安装的插件（用户级和共享级）
        // 不显示：纯内置插件（只有系统级版本）

        const plugin = extension.plugin;
        if (!plugin) {
            return false;
        }

        // 如果是内置插件（type=0）
        if (extension.builtin) {
            // 关键：检查当前激活的版本类型，而不是 allVersions 数组
            // 因为 allVersions 在卸载后可能没有及时更新
            const activeOriginType = plugin.overrideInfo?.activeOriginType || plugin.originType;

            // 调试日志
            console.debug(
                `[shouldShowInInstalled] ${extension.id}: type=${plugin.type}, ` +
                `originType=${plugin.originType}, activeOriginType=${activeOriginType}, ` +
                `isActive=${plugin.isActive}, ` +
                `allVersions=${JSON.stringify(plugin.overrideInfo?.allVersions || [])}`
            );

            // 如果当前激活的是用户级或共享级版本，说明有覆盖安装，显示在已安装视图
            if (activeOriginType === 'user' || activeOriginType === 'shared') {
                return true;
            }

            // 如果当前激活的是系统级版本，说明是纯内置插件，不显示在已安装视图
            return false;
        }

        // 非内置插件（共享插件或用户插件），显示在已安装视图
        return true;
    }

    protected shouldShowInBuiltin(extension: any): boolean {
        // 1. 如果当前激活的就是内置版本（System类型），直接显示
        if (extension.builtin) {
            return true;
        }

        // 2. 如果当前激活的不是内置版本（例如被 User 版本覆盖了，导致 extension.builtin 为 false），
        // 我们需要检查它是否"原本"是内置插件。
        // 方法是：检查 overrideInfo 中是否存在 'system' 来源的版本。
        const plugin = extension.plugin;
        if (plugin && plugin.overrideInfo) {
            const hasSystemVersion = plugin.overrideInfo.allVersions?.some((v: any) =>
                v.originType === 'system' // 只要历史版本中包含 system，它就属于内置插件列表
            );
            if (hasSystemVersion) {
                return true;
            }
        }

        return false;
    }

    protected shouldShowInSystemLevel(extension: any): boolean {
        // 系统级视图：仅显示当前激活版本是系统级（system/shared）的插件
        // 一个插件只能在系统级或用户级其中一个

        const plugin = extension.plugin;
        if (!plugin) {
            return false;
        }

        // 优先使用 overrideInfo 中的 activeOriginType
        if (plugin.overrideInfo && plugin.overrideInfo.activeOriginType) {
            const activeOriginType = plugin.overrideInfo.activeOriginType;
            return activeOriginType === 'system' || activeOriginType === 'shared';
        }

        // 如果没有覆盖信息，使用 originType
        if (plugin.originType) {
            return plugin.originType === 'system' || plugin.originType === 'shared';
        }

        // 回退逻辑：检查当前插件的类型
        // 只有在插件是激活状态时才返回true
        if (plugin.isActive === false) {
            return false;
        }

        // 内置插件或共享插件
        if (extension.builtin || extension.shared) {
            return true;
        }

        // 检查路径是否包含共享标识
        if (plugin.metadata && plugin.metadata.model) {
            const packagePath = plugin.metadata.model.packagePath || '';
            return packagePath.includes('/.baosky/shared/');
        }

        return false;
    }

    protected shouldShowInUserLevel(extension: any): boolean {
        // 用户级视图：仅显示当前激活版本是用户级（user）的插件
        // 一个插件只能在系统级或用户级其中一个

        const plugin = extension.plugin;
        if (!plugin) {
            return false;
        }

        // 优先使用 overrideInfo 中的 activeOriginType
        if (plugin.overrideInfo && plugin.overrideInfo.activeOriginType) {
            return plugin.overrideInfo.activeOriginType === 'user';
        }

        // 如果没有覆盖信息，使用 originType
        if (plugin.originType) {
            return plugin.originType === 'user';
        }

        // 回退逻辑：检查当前插件的类型
        // 只有在插件是激活状态时才返回true
        if (plugin.isActive === false) {
            return false;
        }

        // 内置插件或共享插件默认不是用户级
        if (extension.builtin || extension.shared) {
            return false;
        }

        // 检查路径，如果包含共享标识则不是用户级
        if (plugin.metadata && plugin.metadata.model) {
            const packagePath = plugin.metadata.model.packagePath || '';
            if (packagePath.includes('/.baosky/shared/')) {
                return false;
            }
        }

        // 其他情况视为用户级插件
        return true;
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

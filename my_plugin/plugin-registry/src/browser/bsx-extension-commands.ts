// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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

import { bnls } from '@baosky/platform/lib/common/bnls'
import { codicon } from '@theia/core/lib/browser';
import { Command } from '@theia/core/lib/common';

export namespace BSXExtensionsCommands {

    const EXTENSIONS_CATEGORY = 'Extensions';

    export const CLEAR_ALL = Command.toDefaultLocalizedCommand({
        id: 'vsxExtensions.clearAll',
        category: EXTENSIONS_CATEGORY,
        label: bnls.localizeByDefault('清除搜索结果'),
        iconClass: codicon('clear-all')
    });
    export const INSTALL_FROM_BSX: Command & { dialogLabel: string } = {
        id: 'vsxExtensions.installFromBSX',
        category: bnls.localizeByDefault(EXTENSIONS_CATEGORY),
        originalCategory: EXTENSIONS_CATEGORY,
        originalLabel: bnls.localizeByDefault('从BSX安装...'),
        label: bnls.localizeByDefault('安装本地插件') + '...',
        dialogLabel: bnls.localizeByDefault('安装本地插件')
    };
    export const INSTALL_BSX_FILE: Command = Command.toDefaultLocalizedCommand({
        id: 'vsxExtensions.installBSX',
        label: bnls.localizeByDefault('安装插件 BSX'),
        category: EXTENSIONS_CATEGORY,
    });
    export const INSTALL_ANOTHER_VERSION: Command = {
        id: 'vsxExtensions.installAnotherVersion'
    };
    export const COPY: Command = {
        id: 'vsxExtensions.copy'
    };
    export const COPY_EXTENSION_ID: Command = {
        id: 'vsxExtensions.copyExtensionId'
    };
    export const SHOW_BUILTINS = Command.toDefaultLocalizedCommand({
        id: 'vsxExtension.showBuiltins',
        label: bnls.localizeByDefault('显示内置插件'),
        category: EXTENSIONS_CATEGORY,
    });
    export const SHOW_INSTALLED = Command.toLocalizedCommand({
        id: 'vsxExtension.showInstalled',
        label: bnls.localizeByDefault('显示已安装插件'),
        category: EXTENSIONS_CATEGORY,
    }, 'theia/vsx-registry/showInstalled');
    export const SHOW_RECOMMENDATIONS = Command.toDefaultLocalizedCommand({
        id: 'vsxExtension.showRecommendations',
        label: bnls.localizeByDefault('显示推荐插件'),
        category: EXTENSIONS_CATEGORY,
    });
    export const ENABLE_PLUGIN: Command = {
        id: 'vsxExtensions.enablePlugin',
        label: bnls.localizeByDefault('启用'),
        category: EXTENSIONS_CATEGORY,
    };
    export const DISABLE_PLUGIN: Command = {
        id: 'vsxExtensions.disablePlugin',
        label: bnls.localizeByDefault('禁用'),
        category: EXTENSIONS_CATEGORY,
    };
}

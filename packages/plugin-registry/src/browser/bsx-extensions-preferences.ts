// *****************************************************************************
// Copyright (C) 2023 Ericsson and others.
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

import { interfaces } from '@theia/core/shared/inversify';
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceService,
    PreferenceSchema,
    PreferenceContribution
} from '@theia/core/lib/browser/preferences';
import { bnls } from '@baosky/platform/lib/common/bnls'

export const BsxExtensionsPreferenceSchema: PreferenceSchema = {
    'type': 'object',
    properties: {
        'extensions.onlyShowVerifiedExtensions': {
            type: 'boolean',
            default: false,
            description: bnls.localizeByDefault('这允许{0}只显示经过验证的扩展。', '天行插件商店')
        },
    }
};

export interface BsxExtensionsConfiguration {
    'extensions.onlyShowVerifiedExtensions': boolean;
}

export const BsxExtensionsPreferenceContribution = Symbol('BsxExtensionsPreferenceContribution');
export const BsxExtensionsPreferences = Symbol('BsxExtensionsPreferences');
export type BsxExtensionsPreferences = PreferenceProxy<BsxExtensionsConfiguration>;

export function createBsxExtensionsPreferences(preferences: PreferenceService, schema: PreferenceSchema = BsxExtensionsPreferenceSchema): BsxExtensionsPreferences {
    return createPreferenceProxy(preferences, schema);
}

export function bindBsxExtensionsPreferences(bind: interfaces.Bind): void {
    bind(BsxExtensionsPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        const contribution = ctx.container.get<PreferenceContribution>(BsxExtensionsPreferenceContribution);
        return createBsxExtensionsPreferences(preferences, contribution.schema);
    }).inSingletonScope();
    bind(BsxExtensionsPreferenceContribution).toConstantValue({ schema: BsxExtensionsPreferenceSchema });
    bind(PreferenceContribution).toService(BsxExtensionsPreferenceContribution);
}

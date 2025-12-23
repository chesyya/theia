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

import { createPreferenceProxy, PreferenceContribution, PreferenceSchema, PreferenceScope, PreferenceService } from '@theia/core/lib/browser';
import { JsonSchemaContribution } from '@theia/core/lib/browser/json-schema-store';
import { bnls } from '@baosky/platform/lib/common/bnls'
import { PreferenceConfiguration } from '@theia/core/lib/browser/preferences/preference-configurations';
import { interfaces } from '@theia/core/shared/inversify';
import { ExtensionSchemaContribution, extensionsSchemaID } from './recommended-extensions-json-schema';

export interface RecommendedExtensions {
    recommendations?: string[];
    unwantedRecommendations?: string[];
}

export const recommendedExtensionsPreferencesSchema: PreferenceSchema = {
    type: 'object',
    scope: PreferenceScope.Folder,
    properties: {
        extensions: {
            $ref: extensionsSchemaID,
            description: bnls.localizeByDefault('此工作区推荐插件列表.'),
            defaultValue: { recommendations: [] },
        },
    },
};

export const IGNORE_RECOMMENDATIONS_ID = 'extensions.ignoreRecommendations';

export const recommendedExtensionNotificationPreferencesSchema: PreferenceSchema = {
    type: 'object',
    scope: PreferenceScope.Folder,
    properties: {
        [IGNORE_RECOMMENDATIONS_ID]: {
            description: bnls.localizeByDefault('控制是否显示插件推荐的通知.'),
            default: false,
            type: 'boolean'
        }
    }
};

export const ExtensionNotificationPreferences = Symbol('ExtensionNotificationPreferences');

export function bindExtensionPreferences(bind: interfaces.Bind): void {
    bind(ExtensionSchemaContribution).toSelf().inSingletonScope();
    bind(JsonSchemaContribution).toService(ExtensionSchemaContribution);
    bind(PreferenceContribution).toConstantValue({ schema: recommendedExtensionsPreferencesSchema });
    bind(PreferenceConfiguration).toConstantValue({ name: 'extensions' });

    bind(ExtensionNotificationPreferences).toDynamicValue(({ container }) => {
        const preferenceService = container.get<PreferenceService>(PreferenceService);
        return createPreferenceProxy(preferenceService, recommendedExtensionNotificationPreferencesSchema);
    }).inSingletonScope();
    bind(PreferenceContribution).toConstantValue({ schema: recommendedExtensionNotificationPreferencesSchema });
}

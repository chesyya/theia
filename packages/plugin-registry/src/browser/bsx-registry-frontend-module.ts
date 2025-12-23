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

import '../../src/browser/style/index.css';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    WidgetFactory, bindViewContribution, FrontendApplicationContribution, ViewContainerIdentifier, OpenHandler, WidgetManager, WebSocketConnectionProvider,
    WidgetStatusBarContribution,
    noopWidgetStatusBarContribution
} from '@theia/core/lib/browser';
import { BSXExtensionsViewContainer } from './bsx-extensions-view-container';
import { BSXExtensionsContribution } from './bsx-extensions-contribution';
import { BSXExtensionsSearchBar } from './bsx-extensions-search-bar';
import { BSXExtensionsModel } from '../common/bsx-extensions-model';
import { BSXExtensionsModelImpl } from './bsx-extensions-model';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { BSXExtensionsWidget, BSXExtensionsWidgetOptions } from './bsx-extensions-widget';
import { BSXExtensionFactory, BSXExtension, BSXExtensionOptions } from './bsx-extension';
import { BSXExtensionEditor } from './bsx-extension-editor';
import { BSXExtensionEditorManager } from './bsx-extension-editor-manager';
import { BSXExtensionsSourceOptions } from './bsx-extensions-source';
import { BSXExtensionsSearchModel } from './bsx-extensions-search-model';
import { bindExtensionPreferences } from './recommended-extensions/recommended-extensions-preference-contribution';
import { bindPreferenceProviderOverrides } from './recommended-extensions/preference-provider-overrides';
import { bindBsxExtensionsPreferences } from './bsx-extensions-preferences';
import { BSXEnvironment, BSX_ENVIRONMENT_PATH } from '../common/bsx-environment';
import { LanguageQuickPickService } from '@theia/core/lib/browser/i18n/language-quick-pick-service';
import { BSXLanguageQuickPickService } from './bsx-language-quick-pick-service';
import { BsxExtensionArgumentProcessor } from './bsx-extension-argument-processor';
import { ArgumentProcessorContribution } from '@baosky/plugin-host/lib/main/browser/command-registry-main';
import { bindPluginInstallerDialog } from './plugin-installer-dialog';
import { PluginViewContribution } from './view/plugin-registry-view-contribution';
import { PluginViewServiceImpl } from './plugin-view-service-impl';
import { PluginViewService } from '@baosky/plugin-host/lib/common/plugin-view-service';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(PluginViewServiceImpl).toSelf().inSingletonScope();
    bind(PluginViewService).toService(PluginViewServiceImpl);
    bindViewContribution(bind, PluginViewContribution);
    bindPluginInstallerDialog(bind);
    bind(BSXEnvironment)
        .toDynamicValue(ctx => WebSocketConnectionProvider.createProxy(ctx.container, BSX_ENVIRONMENT_PATH))
        .inSingletonScope();
    bind(BSXExtension).toSelf();
    bind(BSXExtensionFactory).toFactory(ctx => (option: BSXExtensionOptions) => {
        const child = ctx.container.createChild();
        child.bind(BSXExtensionOptions).toConstantValue(option);
        return child.get(BSXExtension);
    });
    bind(BSXExtensionsModelImpl).toSelf().inSingletonScope();
    bind(BSXExtensionsModel).toService(BSXExtensionsModelImpl);

    bind(BSXExtensionEditor).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: BSXExtensionEditor.ID,
        createWidget: async (options: BSXExtensionOptions) => {
            const extension = await ctx.container.get(BSXExtensionsModelImpl).resolve(options.id);
            const child = ctx.container.createChild();
            child.bind(BSXExtension).toConstantValue(extension);
            return child.get(BSXExtensionEditor);
        }
    })).inSingletonScope();
    bind(BSXExtensionEditorManager).toSelf().inSingletonScope();
    bind(OpenHandler).toService(BSXExtensionEditorManager);
    bind(WidgetStatusBarContribution).toConstantValue(noopWidgetStatusBarContribution(BSXExtensionEditor));

    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: BSXExtensionsWidget.ID,
        createWidget: async (options: BSXExtensionsWidgetOptions) => BSXExtensionsWidget.createWidget(container, options)
    })).inSingletonScope();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: BSXExtensionsViewContainer.ID,
        createWidget: async () => {
            const child = ctx.container.createChild();
            child.bind(ViewContainerIdentifier).toConstantValue({
                id: BSXExtensionsViewContainer.ID,
                progressLocationId: 'extensions'
            });
            child.bind(BSXExtensionsViewContainer).toSelf();
            child.bind(BSXExtensionsSearchBar).toSelf().inSingletonScope();
            const viewContainer = child.get(BSXExtensionsViewContainer);
            const widgetManager = child.get(WidgetManager);
            for (const id of [
                BSXExtensionsSourceOptions.RECOMMENDED,
                BSXExtensionsSourceOptions.SEARCH_RESULT,
                BSXExtensionsSourceOptions.INSTALLED,
                BSXExtensionsSourceOptions.BUILT_IN,
            ]) {
                const widget = await widgetManager.getOrCreateWidget(BSXExtensionsWidget.ID, { id });
                viewContainer.addWidget(widget, {
                    initiallyCollapsed: id === BSXExtensionsSourceOptions.BUILT_IN,
                    initiallyHidden: id === BSXExtensionsSourceOptions.SEARCH_RESULT,
                    canHide: true
                });
            }
            return viewContainer;
        }
    })).inSingletonScope();

    bind(BSXExtensionsSearchModel).toSelf().inSingletonScope();

    rebind(LanguageQuickPickService).to(BSXLanguageQuickPickService).inSingletonScope();

    bindViewContribution(bind, BSXExtensionsContribution);
    bind(FrontendApplicationContribution).toService(BSXExtensionsContribution);
    bind(ColorContribution).toService(BSXExtensionsContribution);

    bindExtensionPreferences(bind);
    bindPreferenceProviderOverrides(bind, unbind);
    bindBsxExtensionsPreferences(bind);

    bind(BsxExtensionArgumentProcessor).toSelf().inSingletonScope();
    bind(ArgumentProcessorContribution).toService(BsxExtensionArgumentProcessor);
});

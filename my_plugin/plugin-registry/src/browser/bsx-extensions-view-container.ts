/********************************************************************************
 * Copyright (C) 2020 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 *******************************************************************************‚*/

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ViewContainer, PanelLayout, ViewContainerPart, Message, codicon } from '@theia/core/lib/browser';
import { BSXExtensionsSearchBar } from './bsx-extensions-search-bar';
import { BSXExtensionsModelImpl } from './bsx-extensions-model';
import { BSXSearchMode } from './bsx-extensions-search-model';
import { generateExtensionWidgetId } from './bsx-extensions-widget';
import { BSXExtensionsSourceOptions } from './bsx-extensions-source';
import { BSXExtensionsCommands } from './bsx-extension-commands';
import { bnls } from '@baosky/platform/lib/common/bnls';
import { BOTTOM_AREA_ID, MAIN_AREA_ID } from '@theia/core/lib/browser/shell/theia-dock-panel';
@injectable()
export class BSXExtensionsViewContainer extends ViewContainer {

    static ID = 'bsx-extensions-view-container';
    static LABEL = bnls.localizeByDefault('插件');

    override disableDNDBetweenContainers = true;

    @inject(BSXExtensionsSearchBar)
    protected readonly searchBar: BSXExtensionsSearchBar;

    @inject(BSXExtensionsModelImpl)
    protected readonly model: BSXExtensionsModelImpl;

    @postConstruct()
    protected override init(): void {

        super.init();
        this.id = BSXExtensionsViewContainer.ID;
        this.addClass('theia-vsx-extensions-view-container');

        this.setTitleOptions({
            label: BSXExtensionsViewContainer.LABEL,
            iconClass: codicon('extensions'),
            closeable: true
        });
        this.scrollOptions = {
            suppressScrollX: true,  // 禁止横向滚动
            suppressScrollY: true   // 禁止纵向滚动
        };

        this.getOrientation();
    }

    protected override onActivateRequest(msg: Message): void {
        this.searchBar.activate();
    }

    // 定义新的 getOrientation 方法，使得在theia中间区域也能折叠
    protected getOrientation(): void {
        ViewContainer.getOrientation = function (node: HTMLElement): 'vertical' | 'horizontal' {
            if (node.id.startsWith('bsx-extensions-view-container--bsx-extensions'))
                return 'vertical'
            if (node.closest(`#${MAIN_AREA_ID}`) || node.closest(`#${BOTTOM_AREA_ID}`)) {
                return 'horizontal';
            }
            return 'vertical';
        };
    }

    protected override onAfterAttach(msg: Message): void {
        super.onBeforeAttach(msg);
        this.updateMode();
        this.toDisposeOnDetach.push(this.model.search.onDidChangeQuery(() => this.updateMode()));
    }

    protected override configureLayout(layout: PanelLayout): void {
        layout.addWidget(this.searchBar);
        super.configureLayout(layout);
    }

    protected currentMode: BSXSearchMode = BSXSearchMode.Initial;
    protected readonly lastModeState = new Map<BSXSearchMode, ViewContainer.State>();

    protected updateMode(): void {
        const currentMode = this.model.search.getModeForQuery();
        if (currentMode === this.currentMode) {
            return;
        }
        if (this.currentMode !== BSXSearchMode.Initial) {
            this.lastModeState.set(this.currentMode, super.doStoreState());
        }
        this.currentMode = currentMode;
        const lastState = this.lastModeState.get(currentMode);
        if (lastState) {
            super.doRestoreState(lastState);
        } else {
            for (const part of this.getParts()) {
                this.applyModeToPart(part);
            }
        }

        const specialWidgets = this.getWidgetsForMode();
        if (specialWidgets?.length) {
            const widgetChecker = new Set(specialWidgets);
            const relevantParts = this.getParts().filter(part => widgetChecker.has(part.wrapped.id));
            relevantParts.forEach(part => {
                part.collapsed = false;
                part.show();
            });
        }
    }

    protected override registerPart(part: ViewContainerPart): void {
        super.registerPart(part);
        this.applyModeToPart(part);
    }

    protected applyModeToPart(part: ViewContainerPart): void {
        if (this.shouldShowWidget(part)) {
            part.show();
        } else {
            part.hide();
        }
    }

    protected shouldShowWidget(part: ViewContainerPart): boolean {
        const widgetsToShow = this.getWidgetsForMode();
        if (widgetsToShow.length) {
            return widgetsToShow.includes(part.wrapped.id);
        }
        // In default mode (None/Initial), show all widgets including Open VSX Registry
        // if (this.currentMode === BSXSearchMode.None || this.currentMode === BSXSearchMode.Initial) {
        //     return true;
        // }
        return part.wrapped.id !== generateExtensionWidgetId(BSXExtensionsSourceOptions.SEARCH_RESULT);
    }

    protected getWidgetsForMode(): string[] {
        switch (this.currentMode) {
            case BSXSearchMode.Builtin:
                return [generateExtensionWidgetId(BSXExtensionsSourceOptions.BUILT_IN)];
            case BSXSearchMode.Installed:
                return [generateExtensionWidgetId(BSXExtensionsSourceOptions.INSTALLED)];
            case BSXSearchMode.Recommended:
                return [generateExtensionWidgetId(BSXExtensionsSourceOptions.RECOMMENDED)];
            case BSXSearchMode.SystemLevel:
                return [generateExtensionWidgetId(BSXExtensionsSourceOptions.SYSTEM_LEVEL)];
            case BSXSearchMode.UserLevel:
                return [generateExtensionWidgetId(BSXExtensionsSourceOptions.USER_LEVEL)];
            case BSXSearchMode.Search:
                return [generateExtensionWidgetId(BSXExtensionsSourceOptions.SEARCH_RESULT)];
            case BSXSearchMode.None:
            case BSXSearchMode.Initial:
                // Show all views by default, including Open VSX Registry with popular extensions
                return [];
            default:
                return [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected override doStoreState(): any {
        const modes: BSXExtensionsViewContainer.State['modes'] = {};
        for (const mode of this.lastModeState.keys()) {
            modes[mode] = this.lastModeState.get(mode);
        }
        return {
            query: this.model.search.query,
            modes
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected override doRestoreState(state: any): void {
        // eslint-disable-next-line guard-for-in
        for (const key in state.modes) {
            const mode = Number(key) as BSXSearchMode;
            const modeState = state.modes[mode];
            if (modeState) {
                this.lastModeState.set(mode, modeState);
            }
        }
        this.model.search.query = state.query;
    }

    protected override updateToolbarItems(allParts: ViewContainerPart[]): void {
        if (allParts.length > 1) {
            const group = this.getToggleVisibilityGroupLabel();
            for (let i = 0; i < allParts.length; i++) {
                const part = allParts[i];
                const existingId = this.toggleVisibilityCommandId(part);
                const { caption, label, dataset: { visibilityCommandLabel } } = part.wrapped.title;
                // 设置 order 使得菜单顺序与左边视图一致
                this.registerToolbarItem(existingId, {
                    tooltip: visibilityCommandLabel || caption || label,
                    group,
                    order: i.toString()
                });
            }
        }
        this.registerToolbarItem(BSXExtensionsCommands.INSTALL_FROM_BSX.id, { tooltip: BSXExtensionsCommands.INSTALL_FROM_BSX.label, group: 'other_1' });
    }

    protected override toggleVisibilityCommandId(part: ViewContainerPart): string {
        return `${this.id}:toggle-visibility-${part.id}`;
    }

    protected override getToggleVisibilityGroupLabel(): string {
        return 'a/' + bnls.localizeByDefault('视图');
    }
}
export namespace BSXExtensionsViewContainer {
    export interface State {
        query: string;
        modes: {
            [mode: number]: ViewContainer.State | undefined
        }
    }
}

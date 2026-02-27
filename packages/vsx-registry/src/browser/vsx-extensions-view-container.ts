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
import { VSXExtensionsSearchBar } from './vsx-extensions-search-bar';
import { VSXExtensionsModel } from './vsx-extensions-model';
import { VSXSearchMode } from './vsx-extensions-search-model';
import { generateExtensionWidgetId } from './vsx-extensions-widget';
import { VSXExtensionsSourceOptions } from './vsx-extensions-source';
import { VSXExtensionsCommands } from './vsx-extension-commands';
import { nls } from '@theia/core/lib/common/nls';

@injectable()
export class VSXExtensionsViewContainer extends ViewContainer {

    static ID = 'vsx-extensions-view-container';
    static LABEL = nls.localizeByDefault('Extensions');

    override disableDNDBetweenContainers = true;

    @inject(VSXExtensionsSearchBar)
    protected readonly searchBar: VSXExtensionsSearchBar;

    @inject(VSXExtensionsModel)
    protected readonly model: VSXExtensionsModel;

    @postConstruct()
    protected override init(): void {
        super.init();
        this.id = VSXExtensionsViewContainer.ID;
        this.addClass('theia-vsx-extensions-view-container');

        this.setTitleOptions({
            label: VSXExtensionsViewContainer.LABEL,
            iconClass: codicon('extensions'),
            closeable: true
        });
    }

    protected override onActivateRequest(msg: Message): void {
        this.searchBar.activate();
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

    protected currentMode: VSXSearchMode = VSXSearchMode.Initial;
    protected readonly lastModeState = new Map<VSXSearchMode, ViewContainer.State>();

    protected updateMode(): void {
        const newMode = this.model.search.getModeForQuery();
        if (newMode === this.currentMode) {
            return;
        }

        // ✅ 永远保存当前模式状态（包括 Initial）
        this.lastModeState.set(this.currentMode, super.doStoreState());

        this.currentMode = newMode;

        const lastState = this.lastModeState.get(newMode);
        if (lastState) {
            super.doRestoreState(lastState);
        }

        // ✅ 只有 Search 模式才强制控制
        if (this.currentMode === VSXSearchMode.Search ||
            this.currentMode === VSXSearchMode.Popular) {

            const searchId = generateExtensionWidgetId(
                VSXExtensionsSourceOptions.SEARCH_RESULT
            );

            for (const part of this.getParts()) {
                if (part.wrapped.id === searchId) {
                    part.show();
                    part.collapsed = false;
                } else {
                    part.hide();
                }
            }
        }

        // for (const part of this.getParts()) {
        //     this.applyModeToPart(part);
        // }

        const specialWidgets = this.getWidgetsForMode();
        if (specialWidgets?.length) {
            const widgetChecker = new Set(specialWidgets);
            const relevantParts = this.getParts().filter(part =>
                widgetChecker.has(part.wrapped.id)
            );
            relevantParts.forEach(part => {
                part.collapsed = false;
                part.show();
            });
        }
    }

    protected override registerPart(part: ViewContainerPart): void {
        super.registerPart(part);
        if (this.currentMode === VSXSearchMode.Search ||
            this.currentMode === VSXSearchMode.Popular) {
            this.applyModeToPart(part);
        }
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
        // 只有当模式明确指定要强制显示哪些 widget 时才接管
        if (widgetsToShow.length > 0) {
            return widgetsToShow.includes(part.wrapped.id);
        }

        // 否则交给 ViewContainer 自己的 state 控制
        return true;
    }

    protected getWidgetsForMode(): string[] {
        switch (this.currentMode) {
            case VSXSearchMode.Builtin:
                return [generateExtensionWidgetId(VSXExtensionsSourceOptions.BUILT_IN)];
            case VSXSearchMode.Installed:
                return [generateExtensionWidgetId(VSXExtensionsSourceOptions.INSTALLED)];
            case VSXSearchMode.Recommended:
                return [generateExtensionWidgetId(VSXExtensionsSourceOptions.RECOMMENDED)];
            case VSXSearchMode.Search:
                return [generateExtensionWidgetId(VSXExtensionsSourceOptions.SEARCH_RESULT)];
            case VSXSearchMode.Popular:
                // 新增：显示 Open VSX Registry 热门扩展
                return [generateExtensionWidgetId(VSXExtensionsSourceOptions.SEARCH_RESULT)];
            case VSXSearchMode.None:
            case VSXSearchMode.Initial:
                // Show all views by default, including Open VSX Registry with popular extensions
                return [];
            default:
                return [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected override doStoreState(): any {
        const modes: VSXExtensionsViewContainer.State['modes'] = {};
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
        return;
        // eslint-disable-next-line guard-for-in
        // for (const key in state.modes) {
        //     const mode = Number(key) as VSXSearchMode;
        //     const modeState = state.modes[mode];
        //     if (modeState) {
        //         this.lastModeState.set(mode, modeState);
        //     }
        // }
        // this.model.search.query = state.query;
    }

    protected override getToggleVisibilityGroupLabel(): string {
        return 'a/' + nls.localizeByDefault('Views');
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
        this.registerToolbarItem(VSXExtensionsCommands.INSTALL_FROM_VSIX.id, { tooltip: VSXExtensionsCommands.INSTALL_FROM_VSIX.label, group: 'other_1' });
        this.registerToolbarItem(VSXExtensionsCommands.CLEAR_ALL.id, { tooltip: VSXExtensionsCommands.CLEAR_ALL.label, priority: 1, onDidChange: this.model.onDidChange });
    }

    protected override toggleVisibilityCommandId(part: ViewContainerPart): string {
        return `${this.id}:toggle-visibility-${part.id}`;
    }

}
export namespace VSXExtensionsViewContainer {
    export interface State {
        query: string;
        modes: {
            [mode: number]: ViewContainer.State | undefined
        }
    }
}

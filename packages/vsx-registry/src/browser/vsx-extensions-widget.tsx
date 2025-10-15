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

import { injectable, interfaces, postConstruct, inject } from '@theia/core/shared/inversify';
import { Message, TreeModel, TreeNode, SelectableTreeNode } from '@theia/core/lib/browser';
import { SourceTreeWidget } from '@theia/core/lib/browser/source-tree';
import { VSXExtensionsSource, VSXExtensionsSourceOptions } from './vsx-extensions-source';
import { nls } from '@theia/core/lib/common/nls';
import { BadgeWidget } from '@theia/core/lib/browser/view-container';
import { Emitter, Event } from '@theia/core/lib/common';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import * as React from '@theia/core/shared/react';

@injectable()
export class VSXExtensionsWidgetOptions extends VSXExtensionsSourceOptions {
    title?: string;
}

export const generateExtensionWidgetId = (widgetId: string): string => VSXExtensionsWidget.ID + ':' + widgetId;

@injectable()
export class VSXExtensionsWidget extends SourceTreeWidget implements BadgeWidget {

    static ID = 'vsx-extensions';

    static createWidget(parent: interfaces.Container, options: VSXExtensionsWidgetOptions): VSXExtensionsWidget {
        const child = SourceTreeWidget.createContainer(parent, {
            virtualized: false,
            scrollIfActive: true
        });
        child.bind(VSXExtensionsSourceOptions).toConstantValue(options);
        child.bind(VSXExtensionsSource).toSelf();
        child.unbind(SourceTreeWidget);
        child.bind(VSXExtensionsWidgetOptions).toConstantValue(options);
        child.bind(VSXExtensionsWidget).toSelf();
        return child.get(VSXExtensionsWidget);
    }

    protected _badge?: number;
    protected onDidChangeBadgeEmitter = new Emitter<void>();

    protected _badgeTooltip?: string;
    protected onDidChangeBadgeTooltipEmitter = new Emitter<void>();

    @inject(VSXExtensionsWidgetOptions)
    protected readonly options: VSXExtensionsWidgetOptions;

    @inject(VSXExtensionsSource)
    protected readonly extensionsSource: VSXExtensionsSource;

    @postConstruct()
    protected override init(): void {
        super.init();
        this.addClass('theia-vsx-extensions');

        this.id = generateExtensionWidgetId(this.options.id);

        this.toDispose.push(this.extensionsSource);
        this.source = this.extensionsSource;

        const title = this.options.title ?? this.computeTitle();
        this.title.label = title;
        this.title.caption = title;

        this.toDispose.push(this.source.onDidChange(async () => {
            this.badge = await this.resolveCount();
        }));
    }

    /**
     * Focus and reveal a plugin in the extensions list.
     * Automatically opens the side panel and expands this widget's container if needed.
     * @param pluginId The id of the plugin to focus
     * @returns true if the plugin was successfully focused, false otherwise
     */
    async focusAndReveal(pluginId: string): Promise<boolean> {
        // Find the node corresponding to the plugin
        const root = this.model.root;
        if (!root) {
            return false;
        }

        const findNode = (node: TreeNode): TreeNode | undefined => {
            if ('id' in node && (node as any).id === pluginId) {
                return node;
            }
            if (TreeNode.is(node) && 'children' in node) {
                const children = (node as any).children as TreeNode[];
                for (const child of children) {
                    const found = findNode(child);
                    if (found) {
                        return found;
                    }
                }
            }
            return undefined;
        };

        const targetNode = findNode(root);
        if (!targetNode || !TreeNode.isVisible(targetNode)) {
            return false;
        }

        // Select the node if it's selectable
        if (SelectableTreeNode.is(targetNode)) {
            this.model.selectNode(targetNode);
        }

        // Scroll the node into view
        const nodeElement = this.node.querySelector(`[data-node-id="${pluginId}"]`);
        if (nodeElement) {
            nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add a temporary highlight class
            nodeElement.classList.add('theia-vsx-extension-highlight');
            setTimeout(() => {
                nodeElement.classList.remove('theia-vsx-extension-highlight');
            }, 2000);
        }

        return true;
    }

    get onDidChangeBadge(): Event<void> {
        return this.onDidChangeBadgeEmitter.event;
    }

    get badge(): number | undefined {
        return this._badge;
    }

    set badge(count: number | undefined) {
        this._badge = count;
        this.onDidChangeBadgeEmitter.fire();
    }

    get onDidChangeBadgeTooltip(): Event<void> {
        return this.onDidChangeBadgeTooltipEmitter.event;
    }

    get badgeTooltip(): string | undefined {
        return this._badgeTooltip;
    }

    set badgeTooltip(tooltip: string | undefined) {
        this._badgeTooltip = tooltip;
        this.onDidChangeBadgeTooltipEmitter.fire();
    }

    protected computeTitle(): string {
        switch (this.options.id) {
            case VSXExtensionsSourceOptions.INSTALLED:
                return nls.localizeByDefault('Installed');
            case VSXExtensionsSourceOptions.BUILT_IN:
                return nls.localizeByDefault('Built-in');
            case VSXExtensionsSourceOptions.RECOMMENDED:
                return nls.localizeByDefault('Recommended');
            case VSXExtensionsSourceOptions.SEARCH_RESULT:
                return 'Open VSX Registry';
            default:
                return '';
        }
    }

    protected async resolveCount(): Promise<number | undefined> {
        if (this.options.id !== VSXExtensionsSourceOptions.SEARCH_RESULT) {
            const elements = await this.source?.getElements() || [];
            return [...elements].length;
        }
        return undefined;
    }

    protected override tapNode(node?: TreeNode): void {
        super.tapNode(node);
        this.model.openNode(node);
    }

    protected override handleDblClickEvent(): void {
        // Don't open the editor view on a double click.
    }

    protected override renderTree(model: TreeModel): React.ReactNode {
        if (this.options.id === VSXExtensionsSourceOptions.SEARCH_RESULT) {
            const searchError = this.extensionsSource.getModel().searchError;
            if (!!searchError) {
                const message = nls.localize('theia/vsx-registry/errorFetching', 'Error fetching extensions.');
                const configurationHint = nls.localize('theia/vsx-registry/errorFetchingConfigurationHint', 'This could be caused by network configuration issues.');
                const hint = searchError.includes('ENOTFOUND') ? configurationHint : '';
                return <AlertMessage
                    type='ERROR'
                    header={`${message} ${searchError} ${hint}`}
                />;
            }
        }
        return super.renderTree(model);
    }

    protected override onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        if (this.options.id === VSXExtensionsSourceOptions.INSTALLED) {
            // This is needed when an Extension was installed outside of the extension view.
            // E.g. using explorer context menu.
            this.doUpdateRows();
        }
    }
}

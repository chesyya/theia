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
import { Message, SelectableTreeNode, TreeModel, TreeNode } from '@theia/core/lib/browser';
import { SourceTreeWidget } from '@theia/core/lib/browser/source-tree';
import { BSXExtensionsSource, BSXExtensionsSourceOptions } from './bsx-extensions-source';
import { bnls } from '@baosky/platform/lib/common/bnls'
import { BadgeWidget } from '@theia/core/lib/browser/view-container';
import { Emitter, Event } from '@theia/core/lib/common';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import * as React from '@theia/core/shared/react';
import { EventId, SystemEventSubscriber } from '@baosky/platform/lib/browser/events';
import { USER_NAME } from '@baosky/project/lib/browser/es-server/controller/impl/user-login-controller-impl';

@injectable()
export class BSXExtensionsWidgetOptions extends BSXExtensionsSourceOptions {
    title?: string;
}

export const generateExtensionWidgetId = (widgetId: string): string => BSXExtensionsWidget.ID + ':' + widgetId;

@injectable()
export class BSXExtensionsWidget extends SourceTreeWidget implements BadgeWidget {

    static ID = 'bsx-extensions';

    static createWidget(parent: interfaces.Container, options: BSXExtensionsWidgetOptions): BSXExtensionsWidget {
        const child = SourceTreeWidget.createContainer(parent, {
            virtualized: false,
            scrollIfActive: true
        });
        child.bind(BSXExtensionsSourceOptions).toConstantValue(options);
        child.bind(BSXExtensionsSource).toSelf();
        child.unbind(SourceTreeWidget);
        child.bind(BSXExtensionsWidgetOptions).toConstantValue(options);
        child.bind(BSXExtensionsWidget).toSelf();
        return child.get(BSXExtensionsWidget);
    }

    protected _badge?: number;
    protected onDidChangeBadgeEmitter = new Emitter<void>();

    protected _badgeTooltip?: string;
    protected onDidChangeBadgeTooltipEmitter = new Emitter<void>();

    @inject(BSXExtensionsWidgetOptions)
    protected readonly options: BSXExtensionsWidgetOptions;

    @inject(BSXExtensionsSource)
    protected readonly extensionsSource: BSXExtensionsSource;
    @inject(SystemEventSubscriber) protected readonly subscriber: SystemEventSubscriber;

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
        // this.toDispose.push(
        // this.subscriber.subscribe(EventId.LOGIN, {
        //         notify: async (event) => {
        //             this.update();
        //         }
        //     })
        // )
        this.scrollOptions = {
            suppressScrollX: true,  // 禁止横向滚动
            suppressScrollY: true   // 禁止纵向滚动
        };


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
            case BSXExtensionsSourceOptions.INSTALLED:
                return bnls.localizeByDefault('已安装');
            case BSXExtensionsSourceOptions.BUILT_IN:
                return bnls.localizeByDefault('内置插件');
            case BSXExtensionsSourceOptions.RECOMMENDED:
                return bnls.localizeByDefault('推荐');
            case BSXExtensionsSourceOptions.SEARCH_RESULT:
                return bnls.localizeByDefault('天行插件商店');
            default:
                return '';
        }
    }

    async focusAndReveal(pluginId: string): Promise<boolean> {
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

        if (SelectableTreeNode.is(targetNode)) {
            this.model.selectNode(targetNode);
        }

        return true;
    }

    protected async resolveCount(): Promise<number | undefined> {
        if (this.options.id !== BSXExtensionsSourceOptions.SEARCH_RESULT) {
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
        if (this.options.id === BSXExtensionsSourceOptions.SEARCH_RESULT) {
            const searchError = this.extensionsSource.getModel().searchError;
            if (!!searchError) {
                let message: string = bnls.localizeByDefault('获取插件失败');
                if(searchError === 'timeout'){
                    message = bnls.localizeByDefault('获取插件超时');
                }
                const configurationHint = bnls.localizeByDefault('请检查网络连接或配置');
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
        if (this.options.id === BSXExtensionsSourceOptions.INSTALLED) {
            // This is needed when an Extension was installed outside of the extension view.
            // E.g. using explorer context menu.
            this.doUpdateRows();
        }
    }
}

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

import * as React from '@theia/core/shared/react';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget, Message, Widget, codicon } from '@theia/core/lib/browser';
import { BSXExtension, BSXExtensionEditorComponent } from './bsx-extension';
import { BSXExtensionsModelImpl } from './bsx-extensions-model';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { bnls } from '@baosky/platform/lib/common/bnls'

@injectable()
export class BSXExtensionEditor extends ReactWidget {

    static ID = 'bsx-extension-editor';

    @inject(BSXExtension)
    protected readonly extension: BSXExtension;

    @inject(BSXExtensionsModelImpl)
    protected readonly model: BSXExtensionsModelImpl;

    protected readonly deferredScrollContainer = new Deferred<HTMLElement>();

    @postConstruct()
    protected init(): void {
        this.addClass('theia-vsx-extension-editor');
        this.id = BSXExtensionEditor.ID + ':' + this.extension.id;
        this.title.closable = true;
        this.updateTitle();
        this.title.iconClass = codicon('list-selection');
        this.node.tabIndex = -1;
        this.update();
        this.toDispose.push(this.model.onDidChange(() => this.update()));
    }

    override getScrollContainer(): Promise<HTMLElement> {
        return this.deferredScrollContainer.promise;
    }

    protected override onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
    }

    protected override onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        this.updateTitle();
    }

    protected override onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.update();
    }

    protected updateTitle(): void {
        const label = bnls.localizeByDefault('{0}', (this.extension.displayName || this.extension.name));
        this.title.label = label;
        this.title.caption = label;
    }

    protected override onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.update();
    };

    protected resolveScrollContainer = (element: BSXExtensionEditorComponent | null) => {
        if (!element) {
            this.deferredScrollContainer.reject(new Error('element is null'));
        } else if (!element.scrollContainer) {
            this.deferredScrollContainer.reject(new Error('element.scrollContainer is undefined'));
        } else {
            this.deferredScrollContainer.resolve(element.scrollContainer);
        }
    };

    protected render(): React.ReactNode {
        return <BSXExtensionEditorComponent
            ref={this.resolveScrollContainer}
            extension={this.extension}
        />;
    }
}

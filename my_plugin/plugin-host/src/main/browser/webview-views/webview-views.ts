/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
// copied and modified from https://github.com/microsoft/vscode/blob/a4a4cf5ace4472bc4f5176396bb290cafa15c518/src/vs/workbench/contrib/webviewView/browser/webviewViewService.ts

import { CancellationToken, Event } from '@theia/core/lib/common';
import { WebviewWidget } from '../webview/webview';

export interface WebviewView {
    title?: string;
    description?: string;
    badge?: number | undefined;
    badgeTooltip?: string | undefined;
    readonly webview: WebviewWidget;
    readonly onDidChangeVisibility: Event<boolean>;
    readonly onDidDispose: Event<void>;
    readonly onDidChangeBadge: Event<void>;
    readonly onDidChangeBadgeTooltip: Event<void>;

    dispose(): void;
    show(preserveFocus: boolean): void;
    resolve(is_reviving?: boolean): Promise<void>;
}

export interface WebviewViewResolver {
    resolve(webviewView: WebviewView, cancellation: CancellationToken): Promise<void>;
}

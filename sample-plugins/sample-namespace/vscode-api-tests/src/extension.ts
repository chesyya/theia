// *****************************************************************************
// Copyright (C) 2026 and others.
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

import * as vscode from 'vscode';
declare global {
    // Exposed to tests for parity with VS Code's vscode-api-tests extension.
    // eslint-disable-next-line no-var
    var testExtensionContext: vscode.ExtensionContext | undefined;
}

export function activate(context: vscode.ExtensionContext): void {
    global.testExtensionContext = context;
}

export function deactivate(): void {
    global.testExtensionContext = undefined;
}

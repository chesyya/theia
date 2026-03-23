"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
suite('vscode.extensions', () => {
    test('getExtension returns undefined for a missing extension id', () => {
        const extension = vscode.extensions.getExtension('theia.does-not-exist');
        assert.strictEqual(extension, undefined);
    });
    test('getExtension returns this test extension', async () => {
        const extension = vscode.extensions.getExtension('theia.vscode-api-tests');
        assert.ok(extension);
        await extension?.activate();
        assert.strictEqual(extension?.id, 'theia.vscode-api-tests');
        assert.strictEqual(extension?.isActive, true);
    });
    test('all contains this test extension', () => {
        const ids = vscode.extensions.all.map(extension => extension.id);
        assert.ok(ids.includes('theia.vscode-api-tests'));
    });
    test('all can be queried without duplicate ids', () => {
        const ids = vscode.extensions.all.map(extension => extension.id);
        const uniqueIds = new Set(ids);
        assert.strictEqual(uniqueIds.size, ids.length);
    });
    test('onDidChange returns a disposable listener', () => {
        let fired = false;
        const disposable = vscode.extensions.onDidChange(() => {
            fired = true;
        });
        assert.ok(disposable);
        assert.strictEqual(typeof disposable.dispose, 'function');
        disposable.dispose();
        assert.strictEqual(fired, false);
    });
});

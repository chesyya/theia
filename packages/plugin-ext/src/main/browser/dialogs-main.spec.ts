// *****************************************************************************
// Copyright (C) 2026 Theia contributors.
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

import * as assert from 'assert';
import { Container } from '@theia/core/shared/inversify';
import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

let disableJSDOM = enableJSDOM();

import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
FrontendApplicationConfigProvider.set({ pluginDialogAutomation: false });

import { DialogOverlayService, SingleTextInputDialog } from '@theia/core/lib/browser';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { FileDialogService } from '@theia/filesystem/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileUploadService } from '@theia/filesystem/lib/browser/file-upload-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { RPCProtocol } from '../../common/rpc-protocol';
import { DialogsMainImpl } from './dialogs-main';

describe('DialogsMainImpl automation', () => {

    before(() => {
        disableJSDOM = enableJSDOM();
    });

    after(() => disableJSDOM());

    it('enforces the configuration gate and rejects stale dialog ids', async () => {
        const overlay = new DialogOverlayService();
        overlay.initialize();
        const container = new Container();
        container.bind(WorkspaceService).toConstantValue({} as WorkspaceService);
        container.bind(FileService).toConstantValue({} as FileService);
        container.bind(EnvVariablesServer).toConstantValue({} as EnvVariablesServer);
        container.bind(FileDialogService).toConstantValue({} as FileDialogService);
        container.bind(FileUploadService).toConstantValue({} as FileUploadService);
        container.bind(DialogOverlayService).toConstantValue(overlay);
        const main = new DialogsMainImpl({} as RPCProtocol, container);

        await assert.rejects(main.$getActiveDialog(), { name: 'DialogAutomationDisabledError' });

        const config = FrontendApplicationConfigProvider.get() as unknown as { pluginDialogAutomation: boolean };
        config.pluginDialogAutomation = true;
        assert.equal(await main.$getActiveDialog(), undefined);

        const dialog = new SingleTextInputDialog({ title: 'RPC dialog' });
        const dialogResult = dialog.open(false);
        const handle = await main.$getActiveDialog();
        assert.ok(handle);

        await main.$setDialogState(handle.id, { value: 'from-rpc' });
        assert.deepEqual(await main.$getDialogState(handle.id), { value: 'from-rpc' });
        assert.deepEqual(await main.$confirmDialog(handle.id), { closed: true, validationMessage: undefined });
        assert.equal(await dialogResult, 'from-rpc');
        await assert.rejects(main.$getDialogState(handle.id), { name: 'DialogClosedError' });
    });
});

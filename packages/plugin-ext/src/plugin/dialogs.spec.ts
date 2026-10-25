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
import { DialogsMain } from '../common/plugin-api-rpc';
import { RPCProtocol } from '../common/rpc-protocol';
import { DialogsExtImpl } from './dialogs';

describe('DialogsExtImpl automation', () => {

    it('returns undefined when there is no active dialog', async () => {
        const proxy = {
            $getActiveDialog: async () => undefined
        } as unknown as DialogsMain;
        const rpc = { getProxy: () => proxy } as unknown as RPCProtocol;
        const dialogs = new DialogsExtImpl(rpc);

        assert.equal(await dialogs.getActiveDialog(), undefined);
    });

    it('binds all handle calls to the captured dialog id', async () => {
        const calls: Array<{ method: string, id: string, argument?: unknown }> = [];
        const proxy = {
            $getActiveDialog: async () => ({ id: 'dialog-1' }),
            $getDialogSnapshot: async (id: string) => {
                calls.push({ method: 'snapshot', id });
                return {
                    title: 'Title', contentText: 'Content',
                    confirm: { available: true, enabled: true }, cancel: { available: true }
                };
            },
            $getDialogState: async (id: string) => {
                calls.push({ method: 'state', id });
                return { value: 'initial' };
            },
            $setDialogState: async (id: string, patch: unknown) => {
                calls.push({ method: 'setState', id, argument: patch });
            },
            $confirmDialog: async (id: string) => {
                calls.push({ method: 'confirm', id });
                return { closed: true };
            },
            $cancelDialog: async (id: string) => {
                calls.push({ method: 'cancel', id });
            },
            $getDialogActions: async (id: string) => {
                calls.push({ method: 'actions', id });
                return [{ id: 'reset', label: 'Reset', enabled: true }];
            },
            $invokeDialogAction: async (id: string, actionId: string) => {
                calls.push({ method: 'invoke', id, argument: actionId });
            }
        } as unknown as DialogsMain;
        const rpc = { getProxy: () => proxy } as unknown as RPCProtocol;
        const dialogs = new DialogsExtImpl(rpc);
        const handle = await dialogs.getActiveDialog();

        assert.ok(handle);
        assert.equal(handle.id, 'dialog-1');
        await handle.getSnapshot();
        await handle.getState();
        await handle.setState({ value: 'updated' });
        await handle.confirm();
        await handle.cancel();
        await handle.getActions();
        await handle.invokeAction('reset');

        assert.deepEqual(calls, [
            { method: 'snapshot', id: 'dialog-1' },
            { method: 'state', id: 'dialog-1' },
            { method: 'setState', id: 'dialog-1', argument: { value: 'updated' } },
            { method: 'confirm', id: 'dialog-1' },
            { method: 'cancel', id: 'dialog-1' },
            { method: 'actions', id: 'dialog-1' },
            { method: 'invoke', id: 'dialog-1', argument: 'reset' }
        ]);
    });
});

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
import { enableJSDOM } from './test/jsdom';

let disableJSDOM = enableJSDOM();

import {
    AbstractDialog, ConfirmDialog, ConfirmSaveDialog, DialogAutomationAction, DialogAutomationState, DialogOverlayService, SingleTextInputDialog
} from './dialogs';

interface TestDialogValue {
    choice: string;
    input: string;
}

class TestDialog extends AbstractDialog<TestDialogValue> {

    protected state: TestDialogValue = { choice: 'first', input: '' };

    constructor() {
        super({ title: 'Automation test' });
        const content = document.createElement('div');
        content.textContent = '  Visible content  ';
        this.contentNode.appendChild(content);
        this.appendCloseButton();
        this.appendAcceptButton();
    }

    get value(): TestDialogValue {
        return { ...this.state };
    }

    override getAutomationState(): DialogAutomationState {
        return { ...this.state };
    }

    protected override applyAutomationState(patch: DialogAutomationState): void {
        const unknownFields = Object.keys(patch).filter(key => key !== 'choice' && key !== 'input');
        if (unknownFields.length) {
            throw this.automationError('InvalidDialogStateError', `Unknown field: ${unknownFields[0]}`);
        }
        if (patch.choice !== undefined) {
            if (typeof patch.choice !== 'string') {
                throw this.automationError('InvalidDialogStateError', 'choice must be a string');
            }
            this.state.choice = patch.choice;
        }
        if (patch.input !== undefined) {
            if (typeof patch.input !== 'string') {
                throw this.automationError('InvalidDialogStateError', 'input must be a string');
            }
            this.state.input = patch.input;
        }
    }

    override getAutomationActions(): readonly DialogAutomationAction[] {
        return [{ id: 'reset', label: 'Reset', enabled: true }];
    }

    override async invokeAutomationAction(id: string): Promise<void> {
        if (id !== 'reset') {
            return super.invokeAutomationAction(id);
        }
        this.state.input = '';
    }
}

describe('Dialog automation', () => {

    let overlay: DialogOverlayService;

    before(() => disableJSDOM = enableJSDOM());
    after(() => disableJSDOM());

    beforeEach(() => {
        overlay = new DialogOverlayService();
        overlay.initialize();
    });

    it('tracks only the top-most dialog and invalidates detached handles', async () => {
        const first = new SingleTextInputDialog({ title: 'First' });
        const second = new SingleTextInputDialog({ title: 'Second' });
        const firstResult = first.open(false);
        const firstHandle = overlay.getActiveDialogAutomation();
        const secondResult = second.open(false);
        const secondHandle = overlay.getActiveDialogAutomation();

        assert.ok(firstHandle);
        assert.ok(secondHandle);
        assert.notEqual(firstHandle.id, secondHandle.id);
        assert.equal(secondHandle.dialog, second);

        await second.cancelFromAutomation();
        assert.equal(await secondResult, undefined);
        assert.equal(overlay.getDialogAutomation(secondHandle.id), undefined);
        assert.equal(overlay.getActiveDialogAutomation()?.id, firstHandle.id);

        await first.cancelFromAutomation();
        await firstResult;
    });

    it('assigns a new automation id when a reusable dialog is opened again', async () => {
        const dialog = new SingleTextInputDialog({ title: 'Reusable' });
        const firstResult = dialog.open(false);
        const firstId = overlay.getActiveDialogAutomation()?.id;
        await dialog.cancelFromAutomation();
        await firstResult;

        const secondResult = dialog.open(false);
        const secondId = overlay.getActiveDialogAutomation()?.id;
        assert.ok(firstId);
        assert.ok(secondId);
        assert.notEqual(firstId, secondId);

        await dialog.cancelFromAutomation();
        await secondResult;
    });

    it('exposes a normalized snapshot and explicit controls', async () => {
        const dialog = new TestDialog();
        const result = dialog.open(false);
        const snapshot = dialog.getAutomationSnapshot();

        assert.equal(snapshot.title, 'Automation test');
        assert.equal(snapshot.contentText, 'Visible content');
        assert.deepEqual(snapshot.confirm, { available: true, enabled: true, label: 'OK' });
        assert.deepEqual(snapshot.cancel, { available: true, label: 'Cancel' });

        await dialog.cancelFromAutomation();
        await result;
    });

    it('updates SingleTextInputDialog state used by confirm', async () => {
        const dialog = new SingleTextInputDialog({ title: 'Input' });
        const result = dialog.open(false);

        await dialog.setAutomationState({ value: 'from-plugin' });
        assert.deepEqual(dialog.getAutomationState(), { value: 'from-plugin' });

        const confirmation = await dialog.confirmFromAutomation();
        assert.equal(confirmation.closed, true);
        assert.equal(await result, 'from-plugin');
    });

    it('runs confirm button semantics before accepting the dialog value', async () => {
        const dialog = new ConfirmSaveDialog({ title: 'Save', msg: 'Save?', cancel: 'Cancel', dontSave: "Don't save", save: 'Save' });
        const result = dialog.open(false);

        const confirmation = await dialog.confirmFromAutomation();
        assert.equal(confirmation.closed, true);
        assert.equal(await result, true);
    });

    it('keeps the dialog open and reports a validation error', async () => {
        const dialog = new SingleTextInputDialog({
            title: 'Validated input',
            validate: value => value ? '' : 'A value is required'
        });
        const result = dialog.open(false);

        await dialog.setAutomationState({ value: '' });
        const confirmation = await dialog.confirmFromAutomation();
        assert.equal(confirmation.closed, false);
        assert.equal(confirmation.validationMessage, 'A value is required');

        await dialog.cancelFromAutomation();
        await result;
    });

    it('supports strict custom state and explicitly registered actions', async () => {
        const dialog = new TestDialog();
        const result = dialog.open(false);

        await dialog.setAutomationState({ choice: 'second', input: 'typed by plugin' });
        assert.deepEqual(dialog.getAutomationState(), { choice: 'second', input: 'typed by plugin' });
        assert.deepEqual(dialog.getAutomationActions(), [{ id: 'reset', label: 'Reset', enabled: true }]);

        await dialog.invokeAutomationAction('reset');
        assert.deepEqual(dialog.getAutomationState(), { choice: 'second', input: '' });
        await assert.rejects(dialog.setAutomationState({ typo: true }), { name: 'InvalidDialogStateError' });
        await assert.rejects(dialog.setAutomationState({ input: Number.NaN }), { name: 'InvalidDialogStateError' });

        await dialog.cancelFromAutomation();
        await result;
    });

    it('rejects state writes and confirmation when capabilities are unavailable', async () => {
        const dialog = new ConfirmDialog({ title: 'Read only', msg: 'Message' });
        await assert.rejects(dialog.setAutomationState({ value: 'unsupported' }), { name: 'DialogStateNotSupportedError' });

        class NoConfirmDialog extends AbstractDialog<void> {
            get value(): void { return; }
        }
        const noConfirm = new NoConfirmDialog({ title: 'No confirm' });
        await assert.rejects(noConfirm.confirmFromAutomation(), { name: 'DialogActionNotSupportedError' });
    });
});

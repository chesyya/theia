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

import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import {
    AbstractDialog, DialogAutomationAction, DialogAutomationState, DialogMode
} from '@theia/core/lib/browser';
import { injectable, interfaces } from '@theia/core/shared/inversify';

interface ComplexDialogValue {
    name: string;
    mode: string;
    notes: string;
    enabled: boolean;
}

const DEFAULT_VALUE: ComplexDialogValue = {
    name: 'initial-name',
    mode: 'standard',
    notes: 'Initial notes',
    enabled: false
};

class DialogAutomationComplexDialog extends AbstractDialog<ComplexDialogValue> {

    protected readonly nameInput = document.createElement('input');
    protected readonly modeSelect = document.createElement('select');
    protected readonly notesInput = document.createElement('textarea');
    protected readonly enabledInput = document.createElement('input');

    constructor(runPluginAutomation: () => void) {
        super({ title: 'Dialog Automation Verification', maxWidth: 560 });

        this.nameInput.type = 'text';
        this.nameInput.classList.add('theia-input');
        this.nameInput.placeholder = 'Value supplied by the plugin';

        for (const [value, label] of [['standard', 'Standard'], ['advanced', 'Advanced'], ['safe', 'Safe mode']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            this.modeSelect.appendChild(option);
        }

        this.notesInput.classList.add('theia-input');
        this.notesInput.rows = 3;
        this.notesInput.placeholder = 'Automation notes';

        this.enabledInput.type = 'checkbox';

        this.contentNode.append(
            this.createField('Name', this.nameInput),
            this.createField('Mode', this.modeSelect),
            this.createField('Notes', this.notesInput),
            this.createField('Enabled', this.enabledInput)
        );

        const resetButton = this.appendButton('Reset', false);
        resetButton.addEventListener('click', () => this.reset());
        const runButton = this.appendButton('Run Plugin Automation', false);
        runButton.addEventListener('click', () => {
            runButton.disabled = true;
            runPluginAutomation();
        });
        this.appendCloseButton();
        this.appendAcceptButton('Apply');
        this.setValue(DEFAULT_VALUE);
    }

    get value(): ComplexDialogValue {
        return {
            name: this.nameInput.value,
            mode: this.modeSelect.value,
            notes: this.notesInput.value,
            enabled: this.enabledInput.checked
        };
    }

    protected createField(label: string, control: HTMLElement): HTMLElement {
        const row = document.createElement('label');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '100px minmax(260px, 1fr)';
        row.style.alignItems = 'center';
        row.style.gap = '12px';
        row.style.marginBottom = '12px';
        const caption = document.createElement('span');
        caption.textContent = label;
        row.append(caption, control);
        return row;
    }

    protected override isValid(value: ComplexDialogValue, _mode: DialogMode): string {
        return value.name.trim() ? '' : 'Name is required.';
    }

    override getAutomationState(): DialogAutomationState {
        return { ...this.value };
    }

    protected override applyAutomationState(patch: DialogAutomationState): void {
        const supported = new Set(['name', 'mode', 'notes', 'enabled']);
        for (const key of Object.keys(patch)) {
            if (!supported.has(key)) {
                throw this.automationError('InvalidDialogStateError', `Unknown complex dialog state field: ${key}`);
            }
        }
        const next = { ...this.value };
        if (patch.name !== undefined) {
            if (typeof patch.name !== 'string') {
                throw new TypeError("Dialog state field 'name' must be a string.");
            }
            next.name = patch.name;
        }
        if (patch.mode !== undefined) {
            if (typeof patch.mode !== 'string' || !['standard', 'advanced', 'safe'].includes(patch.mode)) {
                throw new TypeError("Dialog state field 'mode' must be standard, advanced, or safe.");
            }
            next.mode = patch.mode;
        }
        if (patch.notes !== undefined) {
            if (typeof patch.notes !== 'string') {
                throw new TypeError("Dialog state field 'notes' must be a string.");
            }
            next.notes = patch.notes;
        }
        if (patch.enabled !== undefined) {
            if (typeof patch.enabled !== 'boolean') {
                throw new TypeError("Dialog state field 'enabled' must be a boolean.");
            }
            next.enabled = patch.enabled;
        }
        this.setValue(next);
    }

    override getAutomationActions(): readonly DialogAutomationAction[] {
        return [{ id: 'reset', label: 'Reset', enabled: true }];
    }

    override async invokeAutomationAction(id: string): Promise<void> {
        if (id !== 'reset') {
            return super.invokeAutomationAction(id);
        }
        this.reset();
    }

    protected reset(): void {
        this.setValue(DEFAULT_VALUE);
        this.update();
    }

    protected setValue(value: ComplexDialogValue): void {
        this.nameInput.value = value.name;
        this.modeSelect.value = value.mode;
        this.notesInput.value = value.notes;
        this.enabledInput.checked = value.enabled;
    }
}

export namespace DialogAutomationTestCommands {
    export const OPEN = 'dialogAutomationTest.open';
    export const GET_LAST_ACCEPTED_VALUE = 'dialogAutomationTest.getLastAcceptedValue';
    export const RUN_PLUGIN_AUTOMATION = 'theia-dialog-automation-test.run';
}

@injectable()
export class DialogAutomationTestContribution implements CommandContribution {

    protected lastAcceptedValue: ComplexDialogValue | undefined;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand({
            id: DialogAutomationTestCommands.OPEN,
            category: 'Dialog Automation',
            label: 'Open Complex Test Dialog'
        }, {
            execute: () => this.openDialog(commands)
        });
        commands.registerCommand({ id: DialogAutomationTestCommands.GET_LAST_ACCEPTED_VALUE }, {
            execute: () => this.lastAcceptedValue
        });
    }

    protected openDialog(commands: CommandRegistry): void {
        this.lastAcceptedValue = undefined;
        const dialog = new DialogAutomationComplexDialog(() => {
            commands.executeCommand(DialogAutomationTestCommands.RUN_PLUGIN_AUTOMATION).catch(error => console.error(error));
        });
        dialog.open().then(value => {
            this.lastAcceptedValue = value;
        });
    }
}

export function bindDialogAutomationTestContribution(bind: interfaces.Bind): void {
    bind(CommandContribution).to(DialogAutomationTestContribution).inSingletonScope();
}

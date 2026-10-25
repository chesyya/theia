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

export module '@theia/plugin' {

    export type DialogStateValue = string | number | boolean | null | DialogStateValue[] | {
        [key: string]: DialogStateValue
    };

    export interface DialogState {
        [key: string]: DialogStateValue
    }

    export interface DialogControl {
        readonly available: boolean;
        readonly enabled?: boolean;
        readonly label?: string;
    }

    export interface DialogSnapshot {
        readonly title: string;
        readonly contentText: string;
        readonly validationMessage?: string;
        readonly confirm: DialogControl;
        readonly cancel: DialogControl;
    }

    export interface DialogConfirmResult {
        readonly closed: boolean;
        readonly validationMessage?: string;
    }

    export interface DialogAction {
        readonly id: string;
        readonly label: string;
        readonly enabled: boolean;
    }

    export interface DialogHandle {
        /** An opaque identifier bound to this particular open dialog instance. */
        readonly id: string;

        getSnapshot(): Thenable<DialogSnapshot>;
        getState(): Thenable<DialogState>;
        setState(patch: DialogState): Thenable<void>;
        confirm(): Thenable<DialogConfirmResult>;
        cancel(): Thenable<void>;
        getActions(): Thenable<readonly DialogAction[]>;
        invokeAction(id: string): Thenable<void>;
    }

    export namespace window {
        /**
         * Gets a handle for the currently top-most dialog. The call returns
         * immediately and resolves to `undefined` when no dialog is open.
         *
         * This proposed API is available only when the application's
         * `pluginDialogAutomation` frontend option is enabled.
         */
        export function getActiveDialog(): Thenable<DialogHandle | undefined>;
    }
}

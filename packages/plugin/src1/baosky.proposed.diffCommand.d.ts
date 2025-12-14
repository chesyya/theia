/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// code copied and modified from https://github.com/microsoft/vscode/blob/1.77.0/src/vscode-dts/vscode.proposed.diffCommand.d.ts

export module '@baosky/plugin' {

    /**
     * The contiguous set of modified lines in a diff.
     */
    export interface LineChange {
        readonly originalStartLineNumber: number;
        readonly originalEndLineNumber: number;
        readonly modifiedStartLineNumber: number;
        readonly modifiedEndLineNumber: number;
    }

    export namespace commands {

        /**
         * Registers a diff information command that can be invoked via a keyboard shortcut,
         * a menu item, an action, or directly.
         *
         * Diff information commands are different from ordinary {@link commands.registerCommand commands} as
         * they only execute when there is an active diff editor when the command is called, and the diff
         * information has been computed. Also, the command handler of an editor command has access to
         * the diff information.
         *
         * @param command A unique identifier for the command.
         * @param callback A command handler function with access to the {@link LineChange diff information}.
         * @param thisArg The `this` context used when invoking the handler function.
         * @return Disposable which unregisters this command on disposal.
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export function registerDiffInformationCommand(command: string, callback: (diff: LineChange[], ...args: any[]) => any, thisArg?: any): Disposable;
    }

}

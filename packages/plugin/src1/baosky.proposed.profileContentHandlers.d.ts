/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// code copied and modified from https://github.com/microsoft/vscode/blob/1.77.0/src/vscode-dts/vscode.proposed.profileContentHandlers.d.ts

export module '@baosky/plugin' {

    export interface ProfileContentHandler {
        readonly name: string;
        saveProfile(name: string, content: string, token: CancellationToken): Thenable<Uri | null>;
        readProfile(uri: Uri, token: CancellationToken): Thenable<string | null>;
    }

    export namespace window {
        export function registerProfileContentHandler(id: string, profileContentHandler: ProfileContentHandler): Disposable;
    }

}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// code copied and modified from https://github.com/microsoft/vscode/blob/1.77.0/src/vscode-dts/vscode.proposed.fsChunks.d.ts

export module '@baosky/plugin' {

    export interface FileSystemProvider {
        open?(resource: Uri, options: { create: boolean }): number | Thenable<number>;
        close?(fd: number): void | Thenable<void>;
        read?(fd: number, pos: number, data: Uint8Array, offset: number, length: number): number | Thenable<number>;
        write?(fd: number, pos: number, data: Uint8Array, offset: number, length: number): number | Thenable<number>;
    }

}

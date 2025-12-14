/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// code copied and modified from https://github.com/microsoft/vscode/blob/1.77.0/src/vscode-dts/vscode.proposed.resolvers.d.ts

export module '@baosky/plugin' {

    export interface ResourceLabelFormatter {
        scheme: string;
        authority?: string;
        formatting: ResourceLabelFormatting;
    }

    export interface ResourceLabelFormatting {
        label: string; // myLabel:/${path}
        separator: '/' | '\\' | '';
        tildify?: boolean;
        normalizeDriveLetter?: boolean;
        workspaceSuffix?: string;
        authorityPrefix?: string;
    }

    export namespace workspace {
        export function registerResourceLabelFormatter(formatter: ResourceLabelFormatter): Disposable;
    }

}

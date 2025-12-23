/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents } from '@theia/core/lib/common/uri';

export { UriComponents };

// some well known URI schemas
// based on https://github.com/microsoft/vscode/blob/04c36be045a94fee58e5f8992d3e3fd980294a84/src/vs/base/common/network.ts#L9-L79
// TODO move to network.ts file
export namespace Schemes {

    /**
     * A schema that is used for models that exist in memory
     * only and that have no correspondence on a server or such.
     */
    export const inMemory = 'inmemory';

    /**
     * A schema that is used for setting files
     */
    export const vscode = 'vscode';

    /**
     * A schema that is used for internal private files
     */
    export const internal = 'private';

    /**
     * A walk-through document.
     */
    export const walkThrough = 'walkThrough';

    /**
     * An embedded code snippet.
     */
    export const walkThroughSnippet = 'walkThroughSnippet';

    export const http = 'http';

    export const https = 'https';

    export const file = 'file';

    export const mailto = 'mailto';

    export const untitled = 'untitled';

    export const data = 'data';

    export const command = 'command';

    export const vscodeRemote = 'vscode-remote';

    export const vscodeRemoteResource = 'vscode-remote-resource';

    export const userData = 'vscode-userdata';

    export const vscodeCustomEditor = 'vscode-custom-editor';

    export const vscodeSettings = 'vscode-settings';

    export const webviewPanel = 'webview-panel';
}

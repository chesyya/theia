// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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

import { injectable } from '@theia/core/shared/inversify';
import { HelpDocumentationMain, HelpDocPage, PLUGIN_RPC_CONTEXT } from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { Emitter, Event } from '@theia/core';
import { marked } from 'marked';

export interface RegisteredDocumentation {
    urlPath: string;
    pages: Map<string, HelpDocPage>;
}

@injectable()
export class HelpDocumentationMainImpl implements HelpDocumentationMain {

    private readonly onDidRegisterDocumentationEmitter = new Emitter<RegisteredDocumentation>();
    private readonly onDidUnregisterDocumentationEmitter = new Emitter<string>();

    readonly onDidRegisterDocumentation: Event<RegisteredDocumentation> = this.onDidRegisterDocumentationEmitter.event;
    readonly onDidUnregisterDocumentation: Event<string> = this.onDidUnregisterDocumentationEmitter.event;

    constructor(rpc: RPCProtocol) {
        // RPCProtocol parameter retained for consistency with other Main implementations
        // Store it even though current implementation uses HTTP to communicate with backend
        void rpc; // Mark as intentionally unused
    }

    async $registerDocumentation(urlPath: string, pages: { [pageId: string]: HelpDocPage }): Promise<void> {
        console.log(`[HelpDocumentationMainImpl] Registering documentation for: ${urlPath}`);

        // Fetch and parse markdown files
        const parsedPages: { [pageId: string]: { title: string; html: string } } = {};

        for (const [pageId, page] of Object.entries(pages)) {
            try {
                console.log(`[HelpDocumentationMainImpl] Fetching ${page.fileUrl}`);
                const response = await fetch(page.fileUrl);
                const markdown = await response.text();
                const html = marked.parse(markdown) as string;

                parsedPages[pageId] = {
                    title: page.title,
                    html
                };
                console.log(`[HelpDocumentationMainImpl] Parsed ${pageId}: ${page.title}`);
            } catch (error) {
                console.error(`[HelpDocumentationMainImpl] Failed to fetch/parse ${page.fileUrl}:`, error);
            }
        }

        // Send to backend service via HTTP
        try {
            await fetch('/services/help-documentation/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    urlPath,
                    pages: parsedPages
                })
            });
            console.log(`[HelpDocumentationMainImpl] Successfully registered documentation at /plugins/${urlPath}`);

            const pagesMap = new Map<string, HelpDocPage>();
            for (const [pageId, page] of Object.entries(pages)) {
                pagesMap.set(pageId, page);
            }
            this.onDidRegisterDocumentationEmitter.fire({ urlPath, pages: pagesMap });
        } catch (error) {
            console.error(`[HelpDocumentationMainImpl] Failed to register documentation:`, error);
        }
    }

    async $unregisterDocumentation(urlPath: string): Promise<void> {
        console.log(`[HelpDocumentationMainImpl] Unregistering documentation for: ${urlPath}`);

        try {
            await fetch('/services/help-documentation/unregister', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ urlPath })
            });
            this.onDidUnregisterDocumentationEmitter.fire(urlPath);
        } catch (error) {
            console.error(`[HelpDocumentationMainImpl] Failed to unregister documentation:`, error);
        }
    }
}

export function setUpHelpDocumentation(rpc: RPCProtocol): HelpDocumentationMainImpl {
    const helpDocMain = new HelpDocumentationMainImpl(rpc);
    rpc.set(PLUGIN_RPC_CONTEXT.HELP_DOCUMENTATION_MAIN, helpDocMain);
    return helpDocMain;
}

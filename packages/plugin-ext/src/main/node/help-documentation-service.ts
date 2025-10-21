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
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { Application } from '@theia/core/shared/express';

export interface HelpDocPage {
    title: string;
    html: string;  // Parsed HTML content
}

@injectable()
export class HelpDocumentationService implements BackendApplicationContribution {
    // Map: urlPath -> Map<pageId, page>
    private documentations = new Map<string, Map<string, HelpDocPage>>();

    configure(app: Application): void {
        // Registration endpoint
        app.post('/services/help-documentation/register', (req, res) => {
            const { urlPath, pages } = req.body;
            console.log(`[HelpDocumentationService] Received registration request for: ${urlPath}`);

            if (!urlPath || !pages) {
                res.status(400).json({ error: 'Missing urlPath or pages' });
                return;
            }

            const pagesMap = new Map<string, HelpDocPage>();
            for (const [pageId, page] of Object.entries<any>(pages)) {
                pagesMap.set(pageId, { title: page.title, html: page.html });
            }

            this.registerDocumentation(urlPath, pagesMap);
            res.json({ success: true, urlPath: `/plugins/${urlPath}` });
        });

        // Unregistration endpoint
        app.post('/services/help-documentation/unregister', (req, res) => {
            const { urlPath } = req.body;
            console.log(`[HelpDocumentationService] Received unregistration request for: ${urlPath}`);

            if (!urlPath) {
                res.status(400).json({ error: 'Missing urlPath' });
                return;
            }

            this.unregisterDocumentation(urlPath);
            res.json({ success: true });
        });

        // Route for main page: /plugins/:urlPath
        app.get('/plugins/:urlPath', (req, res) => {
            const urlPath = req.params.urlPath;
            const pages = this.documentations.get(urlPath);

            if (!pages) {
                res.status(404).send(this.wrapInHTML('Not Found', '<h1>Documentation not found</h1>'));
                return;
            }

            const mainPage = pages.get('main');
            if (!mainPage) {
                res.status(404).send(this.wrapInHTML('Not Found', '<h1>Main documentation page not found</h1>'));
                return;
            }

            res.send(this.wrapInHTML(mainPage.title, mainPage.html, urlPath, pages));
        });

        // Route for sub pages: /plugins/:urlPath/:pageId
        app.get('/plugins/:urlPath/:pageId', (req, res) => {
            const { urlPath, pageId } = req.params;
            const pages = this.documentations.get(urlPath);

            if (!pages) {
                res.status(404).send(this.wrapInHTML('Not Found', '<h1>Documentation not found</h1>'));
                return;
            }

            const page = pages.get(pageId);
            if (!page) {
                res.status(404).send(this.wrapInHTML('Not Found', `<h1>Page '${pageId}' not found</h1>`));
                return;
            }

            res.send(this.wrapInHTML(page.title, page.html, urlPath, pages));
        });
    }

    registerDocumentation(urlPath: string, pages: Map<string, HelpDocPage>): void {
        this.documentations.set(urlPath, pages);
        console.log(`[HelpDocumentationService] Registered documentation at /plugins/${urlPath}`);
        console.log(`[HelpDocumentationService] Available pages:`, Array.from(pages.keys()));
    }

    unregisterDocumentation(urlPath: string): void {
        this.documentations.delete(urlPath);
        console.log(`[HelpDocumentationService] Unregistered documentation at /plugins/${urlPath}`);
    }

    private wrapInHTML(title: string, content: string, urlPath?: string, allPages?: Map<string, HelpDocPage>): string {
        let navigation = '';
        if (urlPath && allPages) {
            navigation = this.generateNavigation(urlPath, allPages);
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #24292e;
            margin: 0;
            padding: 0;
            background-color: #f6f8fa;
        }
        .container {
            display: flex;
            min-height: 100vh;
        }
        .sidebar {
            width: 250px;
            background: #ffffff;
            border-right: 1px solid #e1e4e8;
            padding: 20px;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        .sidebar h3 {
            margin-top: 0;
            font-size: 16px;
            font-weight: 600;
            color: #24292e;
        }
        .sidebar ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .sidebar li {
            margin: 8px 0;
        }
        .sidebar a {
            color: #0366d6;
            text-decoration: none;
            display: block;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .sidebar a:hover {
            background-color: #f6f8fa;
        }
        .sidebar a.active {
            background-color: #0366d6;
            color: white;
        }
        .content-wrapper {
            margin-left: 250px;
            flex: 1;
            padding: 40px;
        }
        .content {
            max-width: 900px;
            background: white;
            padding: 40px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: #24292e;
        }
        h1 {
            font-size: 2em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
            margin-top: 0;
        }
        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }
        h3 { font-size: 1.25em; }
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        code {
            background-color: rgba(27,31,35,0.05);
            border-radius: 3px;
            padding: 0.2em 0.4em;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 85%;
        }
        pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
            line-height: 1.45;
        }
        pre code {
            background-color: transparent;
            padding: 0;
            font-size: 100%;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        table th, table td {
            padding: 6px 13px;
            border: 1px solid #d0d7de;
        }
        table th {
            background-color: #f6f8fa;
            font-weight: 600;
        }
        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        blockquote {
            padding: 0 1em;
            color: #57606a;
            border-left: 0.25em solid #d0d7de;
            margin: 0;
        }
        img {
            max-width: 100%;
        }
        hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: #e1e4e8;
            border: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        ${navigation}
        <div class="content-wrapper">
            <div class="content">
                ${content}
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    private generateNavigation(urlPath: string, pages: Map<string, HelpDocPage>): string {
        let nav = '<div class="sidebar"><h3>Documentation</h3><ul>';

        // Add main page link
        const mainPage = pages.get('main');
        if (mainPage) {
            nav += `<li><a href="/plugins/${urlPath}">${mainPage.title}</a></li>`;
        }

        // Add sub pages
        for (const [pageId, page] of pages.entries()) {
            if (pageId !== 'main') {
                nav += `<li><a href="/plugins/${urlPath}/${pageId}">${page.title}</a></li>`;
            }
        }

        nav += '</ul></div>';
        return nav;
    }
}


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as theia from '@baosky/plugin';
import { Emitter } from '@theia/core';
import { UriComponents } from '../../common/uri-components';
import { NotebookCellsChangedEventDto, NotebookDocumentsExt } from '../../common';
import { NotebooksExtImpl } from './notebooks';
import { URI } from '../types-impl';

export type NotebookDocumentMetadata = Record<string, unknown>;

export class NotebookDocumentsExtImpl implements NotebookDocumentsExt {

    private readonly didSaveNotebookDocumentEmitter = new Emitter<theia.NotebookDocument>();
    readonly onDidSaveNotebookDocument = this.didSaveNotebookDocumentEmitter.event;

    private readonly didChangeNotebookDocumentEmitter = new Emitter<theia.NotebookDocumentChangeEvent>();
    readonly onDidChangeNotebookDocument = this.didChangeNotebookDocumentEmitter.event;

    constructor(
        private readonly notebooksAndEditors: NotebooksExtImpl,
    ) { }

    $acceptModelChanged(uri: UriComponents, event: NotebookCellsChangedEventDto,
        isDirty: boolean, newMetadata?: NotebookDocumentMetadata): void {
        const document = this.notebooksAndEditors.getNotebookDocument(URI.from(uri));
        const e = document.acceptModelChanged(event, isDirty, newMetadata);
        this.didChangeNotebookDocumentEmitter.fire(e);
    }

    $acceptDirtyStateChanged(uri: UriComponents, isDirty: boolean): void {
        const document = this.notebooksAndEditors.getNotebookDocument(URI.from(uri));
        document.acceptDirty(isDirty);
    }

    $acceptModelSaved(uri: UriComponents): void {
        const document = this.notebooksAndEditors.getNotebookDocument(URI.from(uri));
        this.didSaveNotebookDocumentEmitter.fire(document.apiNotebook);
    }
}


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '@theia/core';
import { NotebookEditorPropertiesChangeData, NotebookEditorsExt, NotebookEditorViewColumnInfo } from '../../common';
import * as typeConverters from '../type-converters';
import * as theia from '@baosky/plugin';
import { NotebooksExtImpl } from './notebooks';

export class NotebookEditorsExtImpl implements NotebookEditorsExt {

    private readonly DidChangeNotebookEditorSelectionEmitter = new Emitter<theia.NotebookEditorSelectionChangeEvent>();
    private readonly DidChangeNotebookEditorVisibleRangesEmitter = new Emitter<theia.NotebookEditorVisibleRangesChangeEvent>();

    readonly onDidChangeNotebookEditorSelection = this.DidChangeNotebookEditorSelectionEmitter.event;
    readonly onDidChangeNotebookEditorVisibleRanges = this.DidChangeNotebookEditorVisibleRangesEmitter.event;

    constructor(
        private readonly notebooksAndEditors: NotebooksExtImpl,
    ) { }

    $acceptEditorPropertiesChanged(id: string, data: NotebookEditorPropertiesChangeData): void {
        const editor = this.notebooksAndEditors.getEditorById(id);
        // ONE: make all state updates
        if (data.visibleRanges) {
            editor.acceptVisibleRanges(data.visibleRanges.ranges.map(typeConverters.NotebookRange.to));
        }
        if (data.selections) {
            editor.acceptSelections(data.selections.selections.map(typeConverters.NotebookRange.to));
        }

        // TWO: send all events after states have been updated
        if (data.visibleRanges) {
            this.DidChangeNotebookEditorVisibleRangesEmitter.fire({
                notebookEditor: editor.apiEditor,
                visibleRanges: editor.apiEditor.visibleRanges
            });
        }
        if (data.selections) {
            this.DidChangeNotebookEditorSelectionEmitter.fire(Object.freeze({
                notebookEditor: editor.apiEditor,
                selections: editor.apiEditor.selections
            }));
        }
    }

    $acceptEditorViewColumns(data: NotebookEditorViewColumnInfo): void {
        // eslint-disable-next-line guard-for-in
        for (const id in data) {
            const editor = this.notebooksAndEditors.getEditorById(id);
            editor.acceptViewColumn(typeConverters.ViewColumn.to(data[id]));
        }
    }
}

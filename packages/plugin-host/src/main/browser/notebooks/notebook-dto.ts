import { OS } from '@theia/core';
import * as notebookCommon from '@theia/notebook/lib/common';
import { NotebookCellModel } from '@theia/notebook/lib/browser/view-model/notebook-cell-model';
import * as rpc from '../../../common';
import { CellExecutionUpdateType } from '@theia/notebook/lib/common';
import { CellExecuteUpdate, CellExecutionComplete } from '@theia/notebook/lib/browser';

export namespace NotebookDto {

    export function toNotebookOutputItemDto(item: notebookCommon.CellOutputItem): rpc.NotebookOutputItemDto {
        return {
            mime: item.mime,
            valueBytes: item.data
        };
    }

    export function toNotebookOutputDto(output: notebookCommon.CellOutput): rpc.NotebookOutputDto {
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            items: output.outputs.map(toNotebookOutputItemDto)
        };
    }

    export function toNotebookCellDataDto(cell: notebookCommon.CellData): rpc.NotebookCellDataDto {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            source: cell.source,
            internalMetadata: cell.internalMetadata,
            metadata: cell.metadata,
            outputs: cell.outputs.map(toNotebookOutputDto)
        };
    }

    export function toNotebookDataDto(data: notebookCommon.NotebookData): rpc.NotebookDataDto {
        return {
            metadata: data.metadata,
            cells: data.cells.map(toNotebookCellDataDto)
        };
    }

    export function fromNotebookOutputItemDto(item: rpc.NotebookOutputItemDto): notebookCommon.CellOutputItem {
        return {
            mime: item.mime,
            data: item.valueBytes
        };
    }

    export function fromNotebookOutputDto(output: rpc.NotebookOutputDto): notebookCommon.CellOutput {
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            outputs: output.items.map(fromNotebookOutputItemDto)
        };
    }

    export function fromNotebookCellDataDto(cell: rpc.NotebookCellDataDto): notebookCommon.CellData {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            source: cell.source,
            outputs: cell.outputs.map(fromNotebookOutputDto),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata
        };
    }

    export function fromNotebookDataDto(data: rpc.NotebookDataDto): notebookCommon.NotebookData {
        return {
            metadata: data.metadata,
            cells: data.cells.map(fromNotebookCellDataDto)
        };
    }

    export function toNotebookCellDto(cell: NotebookCellModel): rpc.NotebookCellDto {
        const eol = OS.backend.EOL;
        return {
            handle: cell.handle,
            uri: cell.uri.toComponents(),
            source: cell.text.split(/\r?\n/g),
            eol,
            language: cell.language,
            cellKind: cell.cellKind,
            outputs: cell.outputs.map(toNotebookOutputDto),
            metadata: cell.metadata,
            internalMetadata: cell.internalMetadata,
        };
    }

    export function fromCellExecuteUpdateDto(data: rpc.CellExecuteUpdateDto): CellExecuteUpdate {
        if (data.editType === CellExecutionUpdateType.Output) {
            return {
                editType: data.editType,
                cellHandle: data.cellHandle,
                append: data.append,
                outputs: data.outputs.map(fromNotebookOutputDto)
            };
        } else if (data.editType === CellExecutionUpdateType.OutputItems) {
            return {
                editType: data.editType,
                outputId: data.outputId,
                append: data.append,
                items: data.items.map(fromNotebookOutputItemDto)
            };
        } else {
            return data;
        }
    }

    export function fromCellExecuteCompleteDto(data: rpc.CellExecutionCompleteDto): CellExecutionComplete {
        return data;
    }

}

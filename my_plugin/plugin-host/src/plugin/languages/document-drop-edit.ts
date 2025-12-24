import * as theia from '@baosky/plugin';
import { DataTransferDTO, DocumentDropEdit } from '../../common/plugin-api-rpc-model';
import { CancellationToken } from '@theia/core/shared/vscode-languageserver-protocol';
import { Position } from '../../common/plugin-api-rpc';
import * as Converter from '../type-converters';
import { DocumentsExtImpl } from '../documents';
import { URI } from '@theia/core/shared/vscode-uri';
import { FileSystemExtImpl } from '../file-system-ext-impl';
import * as os from 'os';
import * as path from 'path';

export class DocumentDropEditAdapter {
    constructor(private readonly provider: theia.DocumentDropEditProvider,
        private readonly documents: DocumentsExtImpl,
        private readonly fileSystem: FileSystemExtImpl) { }

    async provideDocumentDropEdits(resource: URI, position: Position, dataTransfer: DataTransferDTO, token: CancellationToken): Promise<DocumentDropEdit | undefined> {
        return this.provider.provideDocumentDropEdits(
            this.documents.getDocument(resource),
            Converter.toPosition(position),
            Converter.DataTransfer.toDataTransfer(dataTransfer, itemId => this.resolveFileData(itemId)),
            token) as DocumentDropEdit | undefined;
    }

    private async resolveFileData(itemId: string): Promise<Uint8Array> {
        const filePath = URI.file(path.resolve(os.tmpdir(), 'theia_upload', itemId));
        return this.fileSystem.fileSystem.readFile(filePath);
    }
}

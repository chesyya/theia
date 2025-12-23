import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import * as types from '../types-impl';
import * as Converter from '../type-converters';
import { Position } from '../../common/plugin-api-rpc';
import { DocumentHighlight } from '../../common/plugin-api-rpc-model';

export class DocumentHighlightAdapter {

    constructor(
        private readonly provider: theia.DocumentHighlightProvider,
        private readonly documents: DocumentsExtImpl) {
    }

    provideDocumentHighlights(resource: URI, position: Position, token: theia.CancellationToken): Promise<DocumentHighlight[] | undefined> {
        const documentData = this.documents.getDocumentData(resource);
        if (!documentData) {
            return Promise.reject(new Error(`There is no document for ${resource}`));
        }

        const document = documentData.document;
        const zeroBasedPosition = Converter.toPosition(position);

        return Promise.resolve(this.provider.provideDocumentHighlights(document, zeroBasedPosition, token)).then(documentHighlights => {
            if (!documentHighlights) {
                return undefined;
            }

            if (this.isDocumentHighlightArray(documentHighlights)) {
                const highlights: DocumentHighlight[] = [];

                for (const highlight of documentHighlights) {
                    highlights.push(Converter.fromDocumentHighlight(highlight));
                }

                return highlights;
            }
        });
    }

    private isDocumentHighlightArray(array: unknown): array is types.DocumentHighlight[] {
        return Array.isArray(array) && array.length > 0 && array[0] instanceof types.DocumentHighlight;
    }
}

import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import * as Converter from '../type-converters';
import { URI } from '@theia/core/shared/vscode-uri';
import { FormattingOptions, TextEdit } from '../../common/plugin-api-rpc-model';

export class DocumentFormattingAdapter {

    constructor(
        private readonly provider: theia.DocumentFormattingEditProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    provideDocumentFormattingEdits(resource: URI, options: FormattingOptions, token: theia.CancellationToken): Promise<TextEdit[] | undefined> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There are no document for ${resource}`));
        }

        const doc = document.document;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(this.provider.provideDocumentFormattingEdits(doc, <any>options, token)).then(value => {
            if (Array.isArray(value)) {
                return value.map(Converter.fromTextEdit);
            }
            return undefined;
        });
    }

}

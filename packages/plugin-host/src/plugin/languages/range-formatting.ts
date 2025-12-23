import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import * as Converter from '../type-converters';
import { URI } from '@theia/core/shared/vscode-uri';
import { FormattingOptions, TextEdit, Range } from '../../common/plugin-api-rpc-model';

export class RangeFormattingAdapter {

    constructor(
        private readonly provider: theia.DocumentRangeFormattingEditProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    provideDocumentRangeFormattingEdits(resource: URI, range: Range, options: FormattingOptions, token: theia.CancellationToken): Promise<TextEdit[] | undefined> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There are no document for ${resource}`));
        }

        const doc = document.document;
        const ran = Converter.toRange(range);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(this.provider.provideDocumentRangeFormattingEdits(doc, ran, <any>options, token)).then(value => {
            if (Array.isArray(value)) {
                return value.map(Converter.fromTextEdit);
            }
            return undefined;
        });
    }

}

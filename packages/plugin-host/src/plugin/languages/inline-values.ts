import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { InlineValue, InlineValueContext, Range } from '../../common/plugin-api-rpc-model';
import { DocumentsExtImpl } from '../documents';
import * as Converter from '../type-converters';

export class InlineValuesAdapter {

    constructor(
        private readonly provider: theia.InlineValuesProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    async provideInlineValues(resource: URI, range: Range, context: InlineValueContext, token: theia.CancellationToken): Promise<InlineValue[] | undefined> {
        const documentData = this.documents.getDocumentData(resource);
        if (!documentData) {
            return Promise.reject(new Error(`There is no document data for ${resource}`));
        }

        const document = documentData.document;
        const viewPort = Converter.toRange(range);
        const ctx = Converter.toInlineValueContext(context);

        return Promise.resolve(this.provider.provideInlineValues(document, viewPort, ctx, token)).then(inlineValue => {
            if (!inlineValue) {
                return undefined;
            }
            if (Array.isArray(inlineValue)) {
                return inlineValue.map(iv => Converter.fromInlineValue(iv));
            }
            return undefined;
        });
    }
}

import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import * as Converter from '../type-converters';
import { URI } from '@theia/core/shared/vscode-uri';
import { FormattingOptions, TextEdit } from '../../common/plugin-api-rpc-model';
import { Position } from '../../common/plugin-api-rpc';

export class OnTypeFormattingAdapter {

    constructor(
        private readonly provider: theia.OnTypeFormattingEditProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    provideOnTypeFormattingEdits(resource: URI, position: Position, ch: string,
        options: FormattingOptions, token: theia.CancellationToken): Promise<TextEdit[] | undefined> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There are no document for ${resource}`));
        }

        const doc = document.document;
        const pos = Converter.toPosition(position);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(this.provider.provideOnTypeFormattingEdits(doc, pos, ch, <any>options, token)).then(value => {
            if (Array.isArray(value)) {
                return value.map(Converter.fromTextEdit);
            }
            return undefined;
        });
    }

}

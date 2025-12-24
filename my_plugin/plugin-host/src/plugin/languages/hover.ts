
import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import { Hover } from '../../common/plugin-api-rpc-model';
import * as Converter from '../type-converters';
import { Range } from '../types-impl';
import { Position } from '../../common/plugin-api-rpc';

export class HoverAdapter {

    constructor(
        private readonly provider: theia.HoverProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    public provideHover(resource: URI, position: Position, token: theia.CancellationToken): Promise<Hover | undefined> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There are no document for ${resource}`));
        }

        const doc = document.document;
        const pos = Converter.toPosition(position);

        return Promise.resolve(this.provider.provideHover(doc, pos, token)).then(value => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!value || !Array.isArray(value.contents) || (value.contents as Array<any>).length === 0) {
                return undefined;
            }
            if (!value.range) {
                value.range = doc.getWordRangeAtPosition(pos);
            }
            if (!value.range) {
                value.range = new Range(pos, pos);
            }

            return Converter.fromHover(value);
        });
    }

}

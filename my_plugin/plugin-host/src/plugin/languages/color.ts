import * as theia from '@baosky/plugin';
import { URI } from '@theia/core/shared/vscode-uri';
import { DocumentsExtImpl } from '../documents';
import * as Converter from '../type-converters';
import { RawColorInfo } from '../../common/plugin-api-rpc';
import { ColorPresentation } from '../../common/plugin-api-rpc-model';

export class ColorProviderAdapter {

    constructor(
        private documents: DocumentsExtImpl,
        private provider: theia.DocumentColorProvider
    ) { }

    provideColors(resource: URI, token: theia.CancellationToken): Promise<RawColorInfo[]> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There are no document for ${resource}`));
        }

        const doc = document.document;

        return Promise.resolve(
            this.provider.provideDocumentColors(doc, token)
        ).then(colors => {
            if (!Array.isArray(colors)) {
                return [];
            }

            const colorInfos: RawColorInfo[] = colors.map(colorInfo => ({
                color: Converter.fromColor(colorInfo.color),
                range: Converter.fromRange(colorInfo.range)!
            }));

            return colorInfos;
        });
    }

    provideColorPresentations(resource: URI, raw: RawColorInfo, token: theia.CancellationToken): Promise<ColorPresentation[]> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There are no document for ${resource}`));
        }

        const doc = document.document;
        const range = Converter.toRange(raw.range);
        const color = Converter.toColor(raw.color);
        return Promise.resolve(
            this.provider.provideColorPresentations(color, { document: doc, range: range }, token)
        ).then(value => {
            if (!Array.isArray(value)) {
                return [];
            }

            return value.map(Converter.fromColorPresentation);
        });
    }

}

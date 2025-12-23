import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import { ReferenceContext, Location } from '../../common/plugin-api-rpc-model';
import * as Converter from '../type-converters';
import { Position } from '../../common/plugin-api-rpc';
import { isLocationArray } from './util';

export class ReferenceAdapter {

    constructor(
        private readonly provider: theia.ReferenceProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    provideReferences(resource: URI, position: Position, context: ReferenceContext, token: theia.CancellationToken): Promise<Location[] | undefined> {
        const documentData = this.documents.getDocumentData(resource);
        if (!documentData) {
            return Promise.reject(new Error(`There is no document for ${resource}`));
        }

        const document = documentData.document;
        const zeroBasedPosition = Converter.toPosition(position);

        return Promise.resolve(this.provider.provideReferences(document, zeroBasedPosition, context, token)).then(reference => {
            if (!reference) {
                return undefined;
            }

            if (isLocationArray(reference)) {
                const locations: Location[] = [];

                for (const location of reference) {
                    locations.push(Converter.fromLocation(location));
                }

                return locations;
            }
        });
    }

}

import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import * as types from '../types-impl';
import * as Converter from '../type-converters';
import { Position } from '../../common/plugin-api-rpc';
import { Definition, LocationLink, Location } from '../../common/plugin-api-rpc-model';
import { isDefinitionLinkArray, isLocationArray } from './util';

export class TypeDefinitionAdapter {

    constructor(
        private readonly provider: theia.TypeDefinitionProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    provideTypeDefinition(resource: URI, position: Position, token: theia.CancellationToken): Promise<Definition | undefined> {
        const documentData = this.documents.getDocumentData(resource);
        if (!documentData) {
            return Promise.reject(new Error(`There is no document for ${resource}`));
        }

        const document = documentData.document;
        const zeroBasedPosition = Converter.toPosition(position);

        return Promise.resolve(this.provider.provideTypeDefinition(document, zeroBasedPosition, token)).then(definition => {
            if (!definition) {
                return undefined;
            }

            if (definition instanceof types.Location) {
                return Converter.fromLocation(definition);
            }

            if (isLocationArray(definition)) {
                const locations: Location[] = [];

                for (const location of definition) {
                    locations.push(Converter.fromLocation(location));
                }

                return locations;
            }

            if (isDefinitionLinkArray(definition)) {
                const definitionLinks: LocationLink[] = [];

                for (const definitionLink of definition) {
                    definitionLinks.push(Converter.fromDefinitionLink(definitionLink));
                }

                return definitionLinks;
            }
        });
    }

}

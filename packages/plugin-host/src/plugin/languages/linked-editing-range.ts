import * as theia from '@baosky/plugin';
import * as rpc from '../../common/plugin-api-rpc';
import { DocumentsExtImpl } from '../documents';
import { LinkedEditingRanges } from '../../common/plugin-api-rpc-model';
import { URI } from '@theia/core/shared/vscode-uri';
import { coalesce } from '../../common/arrays';
import { fromRange, toPosition } from '../type-converters';
import { serializeRegExp } from '../languages-utils';

export class LinkedEditingRangeAdapter {

    constructor(
        private readonly documents: DocumentsExtImpl,
        private readonly provider: theia.LinkedEditingRangeProvider
    ) { }

    async provideRanges(resource: URI, position: rpc.Position, token: theia.CancellationToken): Promise<LinkedEditingRanges | undefined> {

        const doc = this.documents.getDocument(resource);
        const pos = toPosition(position);

        const value = await this.provider.provideLinkedEditingRanges(doc, pos, token);
        if (value && Array.isArray(value.ranges)) {
            return {
                ranges: coalesce(value.ranges.map(r => fromRange(r))),
                wordPattern: serializeRegExp(value.wordPattern)
            };
        }
        return undefined;
    }

}

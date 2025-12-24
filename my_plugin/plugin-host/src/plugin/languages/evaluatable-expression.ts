import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { Position } from '../../common/plugin-api-rpc';
import { EvaluatableExpression } from '../../common/plugin-api-rpc-model';
import { DocumentsExtImpl } from '../documents';
import * as Converter from '../type-converters';

export class EvaluatableExpressionAdapter {

    constructor(
        private readonly provider: theia.EvaluatableExpressionProvider,
        private readonly documents: DocumentsExtImpl
    ) { }

    async provideEvaluatableExpression(resource: URI, position: Position, token: theia.CancellationToken): Promise<EvaluatableExpression | undefined> {
        const documentData = this.documents.getDocumentData(resource);
        if (!documentData) {
            return Promise.reject(new Error(`There is no document data for ${resource}`));
        }

        const document = documentData.document;
        const pos = Converter.toPosition(position);

        return Promise.resolve(this.provider.provideEvaluatableExpression(document, pos, token)).then(expression => {
            if (!expression) {
                return undefined;
            }
            return Converter.fromEvaluatableExpression(expression);
        });
    }
}

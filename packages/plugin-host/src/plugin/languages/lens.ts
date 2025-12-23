import { URI } from '@theia/core/shared/vscode-uri';
import * as theia from '@baosky/plugin';
import { DocumentsExtImpl } from '../documents';
import { CodeLensSymbol } from '../../common/plugin-api-rpc-model';
import * as Converter from '../type-converters';
import { ObjectIdentifier } from '../../common/object-identifier';
import { CommandRegistryImpl } from '../command-registry';
import { DisposableCollection } from '@theia/core/lib/common/disposable';

/** Adapts the calls from main to extension thread for providing/resolving the code lenses. */
export class CodeLensAdapter {

    private static readonly BAD_CMD: theia.Command = { command: 'missing', title: '<<MISSING COMMAND>>' };

    private cacheId = 0;
    private readonly cache = new Map<number, theia.CodeLens>();
    private readonly disposables = new Map<number, DisposableCollection>();

    constructor(
        private readonly provider: theia.CodeLensProvider,
        private readonly documents: DocumentsExtImpl,
        private readonly commands: CommandRegistryImpl
    ) { }

    provideCodeLenses(resource: URI, token: theia.CancellationToken): Promise<CodeLensSymbol[] | undefined> {
        const document = this.documents.getDocumentData(resource);
        if (!document) {
            return Promise.reject(new Error(`There is no document for ${resource}`));
        }

        const doc = document.document;

        return Promise.resolve(this.provider.provideCodeLenses(doc, token)).then(lenses => {
            if (Array.isArray(lenses)) {
                return lenses.map(lens => {
                    const cacheId = this.cacheId++;
                    const toDispose = new DisposableCollection();
                    const lensSymbol = ObjectIdentifier.mixin({
                        range: Converter.fromRange(lens.range)!,
                        command: this.commands.converter.toSafeCommand(lens.command, toDispose)
                    }, cacheId);
                    this.cache.set(cacheId, lens);
                    this.disposables.set(cacheId, toDispose);
                    return lensSymbol;
                });
            }
            return undefined;
        });
    }

    async resolveCodeLens(resource: URI, symbol: CodeLensSymbol, token: theia.CancellationToken): Promise<CodeLensSymbol | undefined> {
        const cacheId = ObjectIdentifier.of(symbol);
        const lens = this.cache.get(cacheId);
        if (!lens) {
            return undefined;
        }

        let newLens: theia.CodeLens | undefined | null;
        if (typeof this.provider.resolveCodeLens === 'function' && !lens.isResolved) {
            newLens = await this.provider.resolveCodeLens(lens, token);
            if (token.isCancellationRequested) {
                return undefined;
            }
        }
        newLens = newLens || lens;

        const disposables = this.disposables.get(cacheId);
        if (!disposables) {
            // already been disposed of
            return undefined;
        }
        symbol.command = this.commands.converter.toSafeCommand(newLens.command ? newLens.command : CodeLensAdapter.BAD_CMD, disposables);
        return symbol;
    }

    releaseCodeLenses(ids: number[]): void {
        ids.forEach(id => {
            this.cache.delete(id);
            const toDispose = this.disposables.get(id);
            if (toDispose) {
                toDispose.dispose();
                this.disposables.delete(id);
            }
        });
    }
}

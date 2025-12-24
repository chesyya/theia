import { SymbolInformation } from '@theia/core/shared/vscode-languageserver-protocol';
import * as theia from '@baosky/plugin';
import * as Converter from '../type-converters';

export class WorkspaceSymbolAdapter {

    constructor(
        private readonly provider: theia.WorkspaceSymbolProvider
    ) { }

    provideWorkspaceSymbols(query: string, token: theia.CancellationToken): Promise<SymbolInformation[]> {
        return Promise.resolve(this.provider.provideWorkspaceSymbols(query, token)).then(workspaceSymbols => {
            if (!workspaceSymbols) {
                return [];
            }

            const newSymbols: SymbolInformation[] = [];
            for (const sym of workspaceSymbols) {
                const convertedSymbol = Converter.fromSymbolInformation(sym);
                if (convertedSymbol) {
                    newSymbols.push(convertedSymbol);
                }
            }
            return newSymbols;
        });
    }

    resolveWorkspaceSymbol(symbol: SymbolInformation, token: theia.CancellationToken): Promise<SymbolInformation> {
        if (this.provider.resolveWorkspaceSymbol && typeof this.provider.resolveWorkspaceSymbol === 'function') {
            const theiaSymbol = Converter.toSymbolInformation(symbol);
            if (!theiaSymbol) {
                return Promise.resolve(symbol);
            } else {
                return Promise.resolve(this.provider.resolveWorkspaceSymbol(theiaSymbol, token)).then(workspaceSymbol => {
                    if (!workspaceSymbol) {
                        return symbol;
                    }

                    const converted = Converter.fromSymbolInformation(workspaceSymbol);
                    if (converted) {
                        return converted;
                    }
                    return symbol;
                });
            }
        }
        return Promise.resolve(symbol);
    }

}

import { injectable } from '@theia/core/shared/inversify';
import { PluginPackageGrammarsContribution, GrammarsContribution } from '../../../common';
import * as path from 'path';
import * as fs from '@theia/core/shared/fs-extra';

@injectable()
export class GrammarsReader {

    async readGrammars(rawGrammars: PluginPackageGrammarsContribution[], pluginPath: string): Promise<GrammarsContribution[]> {
        const result = new Array<GrammarsContribution>();
        for (const rawGrammar of rawGrammars) {
            const grammar = await this.readGrammar(rawGrammar, pluginPath);
            if (grammar) {
                result.push(grammar);
            }
        }

        return result;
    }

    private async readGrammar(rawGrammar: PluginPackageGrammarsContribution, pluginPath: string): Promise<GrammarsContribution | undefined> {
        // TODO: validate inputs
        let grammar: string | object;

        if (rawGrammar.path.endsWith('json')) {
            grammar = await fs.readJSON(path.resolve(pluginPath, rawGrammar.path));
        } else {
            grammar = await fs.readFile(path.resolve(pluginPath, rawGrammar.path), 'utf8');
        }
        return {
            language: rawGrammar.language,
            scope: rawGrammar.scopeName,
            format: rawGrammar.path.endsWith('json') ? 'json' : 'plist',
            grammar: grammar,
            grammarLocation: rawGrammar.path,
            injectTo: rawGrammar.injectTo,
            embeddedLanguages: rawGrammar.embeddedLanguages,
            tokenTypes: rawGrammar.tokenTypes
        };
    }
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// copied and modified from https://github.com/microsoft/vscode/blob/ba40bd16433d5a817bfae15f3b4350e18f144af4/src/vs/workbench/contrib/webview/common/themeing.ts

import { inject, postConstruct, injectable } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import { EditorPreferences, EditorConfiguration } from '@theia/editor/lib/browser/editor-preferences';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { Theme } from '@theia/core/lib/common/theme';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { ColorApplicationContribution } from '@theia/core/lib/browser/color-application-contribution';

export type WebviewThemeType = 'vscode-light' | 'vscode-dark' | 'vscode-high-contrast';
export interface WebviewThemeData {
    readonly activeThemeName: string;
    readonly activeThemeType: WebviewThemeType;
    readonly styles: { readonly [key: string]: string | number; };
}

@injectable()
export class WebviewThemeDataProvider {

    protected readonly onDidChangeThemeDataEmitter = new Emitter<void>();
    readonly onDidChangeThemeData = this.onDidChangeThemeDataEmitter.event;

    @inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences;
    @inject(ColorRegistry) protected readonly colors: ColorRegistry;
    @inject(ColorApplicationContribution) protected readonly colorContribution: ColorApplicationContribution;
    @inject(ThemeService) protected readonly themeService: ThemeService;

    protected themeData: WebviewThemeData | undefined;

    protected readonly editorStyles = new Map<keyof EditorConfiguration, string>([
        ['editor.fontFamily', 'editor-font-family'],
        ['editor.fontWeight', 'editor-font-weight'],
        ['editor.fontSize', 'editor-font-size']
    ]);

    @postConstruct()
    protected init(): void {
        this.colorContribution.onDidChange(() => this.reset());

        this.editorPreferences.onPreferenceChanged(e => {
            if (this.editorStyles.has(e.preferenceName)) {
                this.reset();
            }
        });
    }

    protected reset(): void {
        if (this.themeData) {
            this.themeData = undefined;
            this.onDidChangeThemeDataEmitter.fire(undefined);
        }
    }

    getThemeData(): WebviewThemeData {
        if (!this.themeData) {
            this.themeData = this.computeThemeData();
        }
        return this.themeData;
    }

    protected computeThemeData(): WebviewThemeData {
        const styles: { [key: string]: string | number; } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addStyle = (id: string, rawValue: any) => {
            if (rawValue) {
                const value = typeof rawValue === 'number' || typeof rawValue === 'string' ? rawValue : String(rawValue);
                styles[this.colors.toCssVariableName(id).substring(2)] = value;
                styles[this.colors.toCssVariableName(id, 'vscode').substring(2)] = value;
            }
        };

        addStyle('font-family', '-apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "Ubuntu", "Droid Sans", sans-serif');
        addStyle('font-weight', 'normal');
        addStyle('font-size', '13px');
        this.editorStyles.forEach((value, key) => addStyle(value, this.editorPreferences[key]));

        for (const id of this.colors.getColors()) {
            const color = this.colors.getCurrentColor(id);
            if (color) {
                addStyle(id, color.toString());
            }
        }

        const activeTheme = this.getActiveTheme();
        return {
            styles,
            activeThemeName: activeTheme.label,
            activeThemeType: this.getThemeType(activeTheme)
        };
    }

    protected getActiveTheme(): Theme {
        return this.themeService.getCurrentTheme();
    }

    protected getThemeType(theme: Theme): WebviewThemeType {
        switch (theme.type) {
            case 'light': return 'vscode-light';
            case 'dark': return 'vscode-dark';
            default: return 'vscode-high-contrast';
        }
    }

}

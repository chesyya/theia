import { ColorTheme, ColorThemeKind } from './types-impl';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { ThemingExt } from '../common';
import { RPCProtocol } from '../common/rpc-protocol';
import { ThemeType } from '@theia/core/lib/common/theme';

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/5ddbda0172d80bfbb2529987ba9020848e8771f7/src/vs/workbench/api/common/extHostTheming.ts

export class ThemingExtImpl implements ThemingExt {

    private actual: ColorTheme;
    private _onDidChangeActiveColorTheme: Emitter<ColorTheme>;

    constructor(
        readonly rpc: RPCProtocol
    ) {
        this.actual = new ColorTheme(ColorThemeKind.Dark);
        this._onDidChangeActiveColorTheme = new Emitter<ColorTheme>();
    }

    get activeColorTheme(): ColorTheme {
        return this.actual;
    }

    $onColorThemeChange(type: ThemeType): void {
        this.actual = new ColorTheme(this.convertKind(type));
        this._onDidChangeActiveColorTheme.fire(this.actual);
    }

    protected convertKind(type: ThemeType): ColorThemeKind {
        let kind: ColorThemeKind;
        switch (type) {
            case 'light':
                kind = ColorThemeKind.Light;
                break;
            case 'dark':
                kind = ColorThemeKind.Dark;
                break;
            case 'hc':
                kind = ColorThemeKind.HighContrast;
                break;
            case 'hcLight':
                kind = ColorThemeKind.HighContrastLight;
                break;
        }
        return kind;
    }

    get onDidChangeActiveColorTheme(): Event<ColorTheme> {
        return this._onDidChangeActiveColorTheme.event;
    }

}

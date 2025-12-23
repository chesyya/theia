import { Mutable } from '@theia/core';
import { MarkdownStringImpl as BaseMarkdownString, MarkdownString as MarkdownStringInterface, MarkdownStringTrustedOptions } from '@theia/core/lib/common/markdown-rendering';
import * as pluginAPI from '@baosky/plugin';
import { es5ClassCompat } from '../common/types';
import { URI } from './types-impl';

// Copied from https://github.com/microsoft/vscode/blob/7d9b1c37f8e5ae3772782ba3b09d827eb3fdd833/src/vs/workbench/api/common/extHostTypes.ts

@es5ClassCompat
export class MarkdownString implements pluginAPI.MarkdownString {

    readonly #delegate: BaseMarkdownString;

    /**
     * @returns whether the thing is a markdown string implementation with helper methods.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static isMarkdownString(thing: any): thing is pluginAPI.MarkdownString {
        if (thing instanceof MarkdownString) {
            return true;
        }
        return thing && thing.appendCodeblock && thing.appendMarkdown && thing.appendText && (thing.value !== undefined);
    }

    constructor(value?: string, supportThemeIcons: boolean = false) {
        this.#delegate = new BaseMarkdownString(value, { supportThemeIcons });
    }

    get value(): string {
        return this.#delegate.value;
    }
    set value(value: string) {
        this.#delegate.value = value;
    }

    get isTrusted(): boolean | MarkdownStringTrustedOptions | undefined {
        return this.#delegate.isTrusted;
    }

    set isTrusted(value: boolean | MarkdownStringTrustedOptions | undefined) {
        this.#delegate.isTrusted = value;
    }

    get supportThemeIcons(): boolean | undefined {
        return this.#delegate.supportThemeIcons;
    }

    set supportThemeIcons(value: boolean | undefined) {
        this.#delegate.supportThemeIcons = value;
    }

    get supportHtml(): boolean | undefined {
        return this.#delegate.supportHtml;
    }

    set supportHtml(value: boolean | undefined) {
        this.#delegate.supportHtml = value;
    }

    get baseUri(): pluginAPI.Uri | undefined {
        return URI.revive(this.#delegate.baseUri);
    }

    set baseUri(value: pluginAPI.Uri | undefined) {
        this.#delegate.baseUri = value;
    }

    appendText(value: string): pluginAPI.MarkdownString {
        this.#delegate.appendText(value);
        return this;
    }

    appendMarkdown(value: string): pluginAPI.MarkdownString {
        this.#delegate.appendMarkdown(value);
        return this;
    }

    appendCodeblock(value: string, language?: string): pluginAPI.MarkdownString {
        this.#delegate.appendCodeblock(language ?? '', value);
        return this;
    }

    toJSON(): MarkdownStringInterface {
        const plainObject: Mutable<MarkdownStringInterface> = { value: this.value };
        if (this.isTrusted !== undefined) {
            plainObject.isTrusted = this.isTrusted;
        }
        if (this.supportThemeIcons !== undefined) {
            plainObject.supportThemeIcons = this.supportThemeIcons;
        }
        if (this.supportHtml !== undefined) {
            plainObject.supportHtml = this.supportHtml;
        }
        if (this.baseUri !== undefined) {
            plainObject.baseUri = this.baseUri.toJSON();
        }
        return plainObject;
    }
}

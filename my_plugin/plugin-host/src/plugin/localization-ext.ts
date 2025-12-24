/* eslint-disable @typescript-eslint/no-explicit-any */

import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { nls } from '@theia/core';
import { Localization } from '@theia/core/lib/common/i18n/localization';
import { LocalizationExt, LocalizationMain, Plugin, PLUGIN_RPC_CONTEXT, StringDetails } from '../common';
import { LanguagePackBundle } from '../common/language-pack-service';
import { RPCProtocol } from '../common/rpc-protocol';
import { URI } from './types-impl';

@injectable()
export class LocalizationExtImpl implements LocalizationExt {
    @inject(RPCProtocol)
    protected readonly rpc: RPCProtocol;

    private _proxy: LocalizationMain;
    private currentLanguage?: string;
    private isDefaultLanguage = true;
    private readonly bundleCache = new Map<string, LanguagePackBundle | undefined>();

    @postConstruct()
    initialize(): void {
        this._proxy = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.LOCALIZATION_MAIN);
    }

    translateMessage(pluginId: string, details: StringDetails): string {
        const { message, args, comment } = details;
        if (this.isDefaultLanguage) {
            return Localization.format(message, (args ?? {}));
        }

        let key = message;
        if (comment && comment.length > 0) {
            key += `/${Array.isArray(comment) ? comment.join() : comment}`;
        }
        const str = this.bundleCache.get(pluginId)?.contents[key];
        return Localization.format(str ?? message, (args ?? {}));
    }

    getBundle(pluginId: string): { [key: string]: string } | undefined {
        return this.bundleCache.get(pluginId)?.contents;
    }

    getBundleUri(pluginId: string): URI | undefined {
        const uri = this.bundleCache.get(pluginId)?.uri;
        return uri ? URI.parse(uri) : undefined;
    }

    async initializeLocalizedMessages(plugin: Plugin, currentLanguage: string): Promise<void> {
        this.currentLanguage ??= currentLanguage;
        this.isDefaultLanguage = this.currentLanguage === nls.defaultLocale;

        if (this.isDefaultLanguage) {
            return;
        }

        if (this.bundleCache.has(plugin.model.id)) {
            return;
        }

        let bundle: LanguagePackBundle | undefined;

        try {
            bundle = await this._proxy.$fetchBundle(plugin.model.id);
        } catch (e) {
            console.error(`Failed to load translations for ${plugin.model.id}: ${e.message}`);
            return;
        }

        this.bundleCache.set(plugin.model.id, bundle);
    }

}

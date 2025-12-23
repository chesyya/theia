import { injectable } from '@theia/core/shared/inversify';
import { LanguagePackBundle, LanguagePackService } from '../../common/language-pack-service';

@injectable()
export class PluginLanguagePackService implements LanguagePackService {

    protected readonly storage = new Map<string, Map<string, LanguagePackBundle>>();

    storeBundle(pluginId: string, locale: string, bundle: LanguagePackBundle): void {
        if (!this.storage.has(pluginId)) {
            this.storage.set(pluginId, new Map());
        }
        this.storage.get(pluginId)!.set(locale, bundle);
    }

    deleteBundle(pluginId: string, locale?: string): void {
        if (locale) {
            this.storage.get(pluginId)?.delete(locale);
        } else {
            this.storage.delete(pluginId);
        }
    }

    async getBundle(pluginId: string, locale: string): Promise<LanguagePackBundle | undefined> {
        return this.storage.get(pluginId)?.get(locale);
    }
}

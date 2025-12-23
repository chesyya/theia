import { nls } from '@theia/core';
import { interfaces } from '@theia/core/shared/inversify';
import { LocalizationMain } from '../../common/plugin-api-rpc';
import { LanguagePackBundle, LanguagePackService } from '../../common/language-pack-service';

export class LocalizationMainImpl implements LocalizationMain {

    private readonly languagePackService: LanguagePackService;

    constructor(container: interfaces.Container) {
        this.languagePackService = container.get(LanguagePackService);
    }

    async $fetchBundle(id: string): Promise<LanguagePackBundle | undefined> {
        const bundle = await this.languagePackService.getBundle(id, nls.locale ?? nls.defaultLocale);
        return bundle;
    }
}

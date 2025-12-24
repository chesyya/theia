import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { Theme } from '@theia/core/lib/common/theme';
import { IconUrl } from '../../common/plugin-protocol';
import { Reference, SyncReferenceCollection } from '@theia/core/lib/common/reference';
import { Endpoint } from '@theia/core/lib/browser/endpoint';

export interface PluginIconKey {
    url: IconUrl;
    size?: number;
    type?: 'icon' | 'file';
}

export interface PluginIcon extends Disposable {
    readonly iconClass: string
}

export const PLUGIN_FILE_ICON_CLASS = 'theia-plugin-file-icon';

export const DEFAULT_ICON_SIZE = 12;

@injectable()
export class PluginSharedStyle {

    @inject(ThemeService) protected readonly themeService: ThemeService;

    protected style: HTMLStyleElement;
    protected readonly rules: {
        selector: string;
        body: (theme: Theme) => string
    }[] = [];

    @postConstruct()
    protected init(): void {
        this.update();
        this.themeService.onDidColorThemeChange(() => this.update());
    }

    protected readonly toUpdate = new DisposableCollection();
    protected update(): void {
        this.toUpdate.dispose();

        const style = this.style = document.createElement('style');
        style.type = 'text/css';
        style.media = 'screen';
        document.getElementsByTagName('head')[0].appendChild(style);
        this.toUpdate.push(Disposable.create(() =>
            document.getElementsByTagName('head')[0].removeChild(style)
        ));

        for (const rule of this.rules) {
            this.doInsertRule(rule);
        }
    }

    insertRule(selector: string, body: (theme: Theme) => string): Disposable {
        const rule = { selector, body };
        this.rules.push(rule);
        this.doInsertRule(rule);
        return Disposable.create(() => {
            const index = this.rules.indexOf(rule);
            if (index !== -1) {
                this.rules.splice(index, 1);
                this.deleteRule(selector);
            }
        });
    }
    protected doInsertRule({ selector, body }: {
        selector: string;
        body: (theme: Theme) => string
    }): void {
        const sheet = (<CSSStyleSheet>this.style.sheet);
        const cssBody = body(this.themeService.getCurrentTheme());
        sheet.insertRule(selector + ' {\n' + cssBody + '\n}', 0);
    }
    deleteRule(selector: string): void {
        const sheet = (<CSSStyleSheet>this.style.sheet);
        const rules = sheet.rules || sheet.cssRules || [];
        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((<any>rule).selectorText.indexOf(selector) !== -1) {
                sheet.deleteRule(i);
            }
        }
    }

    private readonly icons = new SyncReferenceCollection<PluginIconKey, PluginIcon>(key => this.createPluginIcon(key));
    toIconClass(url: IconUrl, { size }: { size: number } = { size: DEFAULT_ICON_SIZE }): Reference<PluginIcon> {
        return this.icons.acquire({ url, size });
    }

    toFileIconClass(url: IconUrl): Reference<PluginIcon> {
        return this.icons.acquire({ url, type: 'file' });
    }

    private iconSequence = 0;
    protected createPluginIcon(key: PluginIconKey): PluginIcon {
        const iconUrl = key.url;
        const size = key.size ?? DEFAULT_ICON_SIZE;
        const type = key.type ?? 'icon';

        const toDispose = new DisposableCollection();
        let iconClass = 'plugin-icon-' + this.iconSequence++;

        if (typeof iconUrl === 'object' && 'default' in iconUrl) {
            const { default: defaultIcon, hover: hoverIcon, active: activeIcon } = iconUrl;

            // 添加默认状态CSS规则
            const defaultUrls = this.extractIconUrls(defaultIcon);
            if (type === 'icon') {
                toDispose.push(this.insertRule('.' + iconClass, theme => `
                    content: "";
                    background-position: 2px;
                    background: center no-repeat url("${theme.type === 'light' ? defaultUrls.light : defaultUrls.dark}");
                    background-size: contain;
                `));
            } else {
                toDispose.push(this.insertRule('.' + iconClass, theme => `
                    content: "";
                    background-image: url("${theme.type === 'light' ? defaultUrls.light : defaultUrls.dark}");
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                `));
            }

            // 添加悬浮状态CSS规则
            if (hoverIcon) {
                const hoverUrls = this.extractIconUrls(hoverIcon);
                if (type === 'icon') {
                    toDispose.push(this.insertRule('.' + iconClass + ':hover', theme => `
                        background: center no-repeat url("${theme.type === 'light' ? hoverUrls.light : hoverUrls.dark}");
                        background-size: contain;
                    `));
                } else {
                    toDispose.push(this.insertRule('.' + iconClass + ':hover', theme => `
                        background-image: url("${theme.type === 'light' ? hoverUrls.light : hoverUrls.dark}");
                    `));
                }
            }

            // 添加激活状态CSS规则
            if (activeIcon) {
                const activeUrls = this.extractIconUrls(activeIcon);
                if (type === 'icon') {
                    toDispose.push(this.insertRule('.' + iconClass + '.theia-mod-active', theme => `
                        background: center no-repeat url("${theme.type === 'light' ? activeUrls.light : activeUrls.dark}");
                        background-size: contain;
                    `));
                } else {
                    toDispose.push(this.insertRule('.' + iconClass + '.theia-mod-active', theme => `
                        background-image: url("${theme.type === 'light' ? activeUrls.light : activeUrls.dark}");
                    `));
                }
            }

            if (type === 'file') {
                iconClass += ' ' + PLUGIN_FILE_ICON_CLASS;
            }
        } else {
            const iconUrls = this.extractIconUrls(iconUrl);

            if (type === 'icon') {
                toDispose.push(this.insertRule('.' + iconClass, theme => `
                    content: "";
                    background-position: 2px;
                    background: center no-repeat url("${theme.type === 'light' ? iconUrls.light : iconUrls.dark}");
                    background-size: contain;
                `));
            } else {
                toDispose.push(this.insertRule('.' + iconClass, theme => `
                    content: "";
                    background-image: url("${theme.type === 'light' ? iconUrls.light : iconUrls.dark}");
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                `));
                iconClass += ' ' + PLUGIN_FILE_ICON_CLASS;
            }
        }

        return { iconClass, dispose: () => toDispose.dispose() };
    }

    protected extractIconUrls(iconUrl: string | { light: string; dark: string }): { light: string; dark: string } {
        if (typeof iconUrl === 'object' && 'light' in iconUrl) {
            return {
                light: PluginSharedStyle.toExternalIconUrl(iconUrl.light),
                dark: PluginSharedStyle.toExternalIconUrl(iconUrl.dark)
            };
        }
        const url = PluginSharedStyle.toExternalIconUrl(`${iconUrl}`);
        return { light: url, dark: url };
    }

    static toExternalIconUrl(iconUrl: string): string {
        if (iconUrl.startsWith('hostedPlugin/')) {
            return new Endpoint({ path: iconUrl }).getRestUrl().toString();
        }
        return iconUrl;
    }

}

import { MessageService } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WebviewEnvironment } from './webview-environment';

@injectable()
export class WebviewFrontendSecurityWarnings implements FrontendApplicationContribution {

    @inject(WindowService)
    protected windowService: WindowService;

    @inject(MessageService)
    protected messageService: MessageService;

    @inject(WebviewEnvironment)
    protected webviewEnvironment: WebviewEnvironment;

    initialize(): void {
        this.checkHostPattern();
    }

    protected async checkHostPattern(): Promise<void> {
        // if (FrontendApplicationConfigProvider.get()['warnOnPotentiallyInsecureHostPattern'] === false) {
        //     return;
        // }
        // const hostPattern = await this.webviewEnvironment.hostPatternPromise;
        // if (hostPattern !== WebviewExternalEndpoint.defaultPattern) {
        //     const goToReadme = nls.localize('theia/webview/goToReadme', 'Go To README');
        //     const message = nls.localize('theia/webview/messageWarning', '\
        //     The {0} endpoint\'s host pattern has been changed to `{1}`; changing the pattern can lead to security vulnerabilities. \
        //     See `{2}` for more information.', 'webview', hostPattern, '@theia/plugin-ext/README.md');
        //     this.messageService.warn(message, Dialog.OK, goToReadme).then(action => {
        //         if (action === goToReadme) {
        //             this.windowService.openNewWindow('https://www.npmjs.com/package/@theia/plugin-ext', { external: true });
        //         }
        //     });
        // }
    }
}

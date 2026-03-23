// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { MessageService } from '@theia/core';
import { Dialog, Endpoint, FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { nls } from '@theia/core/lib/common/nls';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WebviewExternalEndpoint } from '../../common/webview-protocol';
import { MainMessageItem } from '../../../common/plugin-api-rpc';
import { ModalNotification, MessageType } from '../dialogs/modal-notification';
import { WebviewEnvironment } from './webview-environment';

@injectable()
export class WebviewCertificateSupportPrompt {

    protected shown = false;

    @inject(ModalNotification)
    protected readonly modalNotification: ModalNotification;

    async showPromptOnce(detail?: string): Promise<void> {
        if (this.shown) {
            return;
        }
        this.shown = true;

        const scriptAction = nls.localize('theia/plugin-ext/webview/downloadInstallScript', 'Download Install Script');
        const dismissAction = nls.localize('theia/plugin-ext/webview/later', 'Later');
        const suffix = detail ? ` ${detail}` : '';
        const message = nls.localize(
            'theia/plugin-ext/webview/certificateErrorMessage',
            'The browser does not trust the HTTPS certificate used by Theia webviews, so dynamic webview resources cannot load.{0} Download and run the certificate install script on this client machine with administrator privileges, then fully restart the browser.',
            suffix
        );

        const actions: MainMessageItem[] = [
            { title: scriptAction },
            { title: dismissAction, isCloseAffordance: true }
        ];
        const action = await this.modalNotification.showDialog(MessageType.Warning, message, { detail, modal: true }, actions);
        if (action === scriptAction) {
            this.downloadAsset(this.getPreferredInstallScriptPath());
        }
    }

    protected getPreferredInstallScriptPath(): 'install/linux.sh' | 'install/windows.ps1' {
        return navigator.platform.toLowerCase().includes('win') ? 'install/windows.ps1' : 'install/linux.sh';
    }

    protected downloadAsset(assetPath: 'install/linux.sh' | 'install/windows.ps1'): void {
        const uri = new Endpoint({ path: `/webview/certificate/${assetPath}` }).getRestUrl().toString();
        const link = document.createElement('a');
        link.href = uri;
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}

@injectable()
export class WebviewFrontendSecurityWarnings implements FrontendApplicationContribution {

    @inject(WindowService)
    protected windowService: WindowService;

    @inject(MessageService)
    protected messageService: MessageService;

    @inject(WebviewEnvironment)
    protected webviewEnvironment: WebviewEnvironment;

    @inject(WebviewCertificateSupportPrompt)
    protected readonly certificateSupportPrompt: WebviewCertificateSupportPrompt;

    initialize(): void {
        this.checkHostPattern();
    }

    onStart(_app: FrontendApplication): void {
        this.maybeShowCertificateSupportDemo();
    }

    protected async checkHostPattern(): Promise<void> {
        if (FrontendApplicationConfigProvider.get()['warnOnPotentiallyInsecureHostPattern'] === false) {
            return;
        }
        const hostPattern = await this.webviewEnvironment.hostPatternPromise;
        if (hostPattern !== WebviewExternalEndpoint.defaultPattern) {
            const goToReadme = nls.localize('theia/webview/goToReadme', 'Go To README');
            const message = nls.localize('theia/webview/messageWarning', '\
            The {0} endpoint\'s host pattern has been changed to `{1}`; changing the pattern can lead to security vulnerabilities. \
            See `{2}` for more information.', 'webview', hostPattern, '@theia/plugin-ext/README.md');
            this.messageService.warn(message, Dialog.OK, goToReadme).then((action: string | undefined) => {
                if (action === goToReadme) {
                    this.windowService.openNewWindow('https://www.npmjs.com/package/@theia/plugin-ext', { external: true });
                }
            });
        }
    }

    protected maybeShowCertificateSupportDemo(): void {
        const search = new URLSearchParams(window.location.search);
        if (search.get('webviewCertificateDemo') === 'true') {
            this.certificateSupportPrompt.showPromptOnce('Demo mode: startup preview.');
        }
    }
}

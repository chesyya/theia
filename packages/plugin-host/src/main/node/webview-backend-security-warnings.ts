import { BackendApplicationContribution } from '@theia/core/lib/node';
import { BackendApplicationConfigProvider } from '@theia/core/lib/node/backend-application-config-provider';
import { injectable } from '@theia/core/shared/inversify';
import { WebviewExternalEndpoint } from '../common/webview-protocol';

@injectable()
export class WebviewBackendSecurityWarnings implements BackendApplicationContribution {

    initialize(): void {
        this.checkHostPattern();
    }

    protected async checkHostPattern(): Promise<void> {
        if (BackendApplicationConfigProvider.get()['warnOnPotentiallyInsecureHostPattern'] === false) {
            return;
        }
        const envHostPattern = process.env[WebviewExternalEndpoint.pattern];
        if (envHostPattern && envHostPattern !== WebviewExternalEndpoint.defaultPattern) {
            console.warn(`\
WEBVIEW SECURITY WARNING

    Changing the @theia/plugin-ext webview host pattern can lead to security vulnerabilities.
        Current pattern: "${envHostPattern}"
    Please read @theia/plugin-ext/README.md for more information.
`
            );
        }
    }
}

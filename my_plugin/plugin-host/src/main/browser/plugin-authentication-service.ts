import { AuthenticationProvider, AuthenticationService, AuthenticationServiceImpl, AuthenticationSession } from '@theia/core/lib/browser/authentication-service';
import { inject } from '@theia/core/shared/inversify';
import { Deferred, timeoutReject } from '@theia/core/lib/common/promise-util';
import { HostedPluginSupport } from '../../hosted/browser/hosted-plugin';

export function getAuthenticationProviderActivationEvent(id: string): string { return `onAuthenticationRequest:${id}`; }

/**
 * Plugin authentication service that aims to activate additional plugins if sessions are created or queried.
 */
export class PluginAuthenticationServiceImpl extends AuthenticationServiceImpl implements AuthenticationService {
    @inject(HostedPluginSupport) protected readonly pluginService: HostedPluginSupport;

    override async getSessions(id: string, scopes?: string[]): Promise<ReadonlyArray<AuthenticationSession>> {
        await this.tryActivateProvider(id);
        return super.getSessions(id, scopes);
    }

    override async login(id: string, scopes: string[]): Promise<AuthenticationSession> {
        await this.tryActivateProvider(id);
        return super.login(id, scopes);
    }

    protected async tryActivateProvider(providerId: string): Promise<AuthenticationProvider> {
        this.pluginService.activateByEvent(getAuthenticationProviderActivationEvent(providerId));

        const provider = this.authenticationProviders.get(providerId);
        if (provider) {
            return provider;
        }

        // When activate has completed, the extension has made the call to `registerAuthenticationProvider`.
        // However, activate cannot block on this, so the renderer may not have gotten the event yet.
        return Promise.race([
            this.waitForProviderRegistration(providerId),
            timeoutReject<AuthenticationProvider>(5000, 'Timed out waiting for authentication provider to register')
        ]);
    }

    protected async waitForProviderRegistration(providerId: string): Promise<AuthenticationProvider> {
        const waitForRegistration = new Deferred<AuthenticationProvider>();
        const registration = this.onDidRegisterAuthenticationProvider(info => {
            if (info.id === providerId) {
                registration.dispose();
                const provider = this.authenticationProviders.get(providerId);
                if (provider) {
                    waitForRegistration.resolve(provider);
                } else {
                    waitForRegistration.reject(new Error(`No authentication provider '${providerId}' is currently registered.`));
                }
            }
        });
        return waitForRegistration.promise;
    }
}

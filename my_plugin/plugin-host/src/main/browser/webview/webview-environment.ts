import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import URI from '@theia/core/lib/common/uri';
import { WebviewExternalEndpoint } from '../../common/webview-protocol';
import { environment } from '@theia/core/shared/@theia/application-package/lib/environment';

@injectable()
export class WebviewEnvironment {

    protected _hostPatternPromise: Promise<string>;

    protected readonly externalEndpointHost = new Deferred<string>();

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    @postConstruct()
    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
        this._hostPatternPromise = this.getHostPattern();
        try {
            const endpointPattern = await this.hostPatternPromise;
            const { host } = new Endpoint();
            this.externalEndpointHost.resolve(endpointPattern.replace('{{hostname}}', host));
        } catch (e) {
            this.externalEndpointHost.reject(e);
        }
    }

    get hostPatternPromise(): Promise<string> {
        return this._hostPatternPromise;
    }

    async externalEndpointUrl(): Promise<URI> {
        const host = await this.externalEndpointHost.promise;
        return new Endpoint({
            host,
            path: '/webview'
        }).getRestUrl();
    }

    async externalEndpoint(): Promise<string> {
        return (await this.externalEndpointUrl()).toString(true);
    }

    async resourceRoot(host: string): Promise<string> {
        if (host === 'frontend') {
            return (await this.externalEndpointUrl()).withPath('{{path}}').toString(true);
        }

        // Make sure we preserve the scheme of the resource but convert it into a normal path segment
        // The scheme is important as we need to know if we are requesting a local or a remote resource.
        return (await this.externalEndpointUrl()).resolve('theia-resource/{{scheme}}//{{authority}}/{{path}}').toString(true);
    }

    async cspSource(): Promise<string> {
        return (await this.externalEndpointUrl()).withPath('').withQuery('').withFragment('').toString(true).replace('{{uuid}}', '*');
    }

    protected async getHostPattern(): Promise<string> {
        return environment.electron.is()
            ? WebviewExternalEndpoint.defaultPattern
            : this.environments.getValue(WebviewExternalEndpoint.pattern)
                .then(variable => variable?.value || WebviewExternalEndpoint.defaultPattern);
    }
}

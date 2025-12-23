import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as theia from '@baosky/plugin';
import { RPCProtocol } from '../common/rpc-protocol';
import { EnvMain, PLUGIN_RPC_CONTEXT } from '../common/plugin-api-rpc';
import { QueryParameters } from '../common/env';
import { generateUuid } from '@theia/core/lib/common/uuid';

@injectable()
export abstract class EnvExtImpl {
    @inject(RPCProtocol)
    protected readonly rpc: RPCProtocol;

    private proxy: EnvMain;
    private queryParameters: QueryParameters;
    private lang: string;
    private applicationName: string;
    private ui: theia.UIKind;
    private envMachineId: string;
    private envSessionId: string;
    private host: string;
    private applicationRoot: string;
    private appUriScheme: string;
    private _remoteName: string | undefined;

    constructor() {
        this.envSessionId = generateUuid();
        this.envMachineId = generateUuid();
        this._remoteName = undefined;
    }

    @postConstruct()
    initialize(): void {
        this.proxy = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.ENV_MAIN);
    }

    getEnvVariable(envVarName: string): Promise<string | undefined> {
        return this.proxy.$getEnvVariable(envVarName).then(x => {
            if (x === null) {
                return undefined;
            }
            return x;
        });
    }

    getQueryParameter(queryParamName: string): string | string[] | undefined {
        return this.queryParameters[queryParamName];
    }

    getQueryParameters(): QueryParameters {
        return this.queryParameters;
    }

    setQueryParameters(queryParams: QueryParameters): void {
        this.queryParameters = queryParams;
    }

    setApplicationName(applicationName: string): void {
        this.applicationName = applicationName;
    }

    setLanguage(lang: string): void {
        this.lang = lang;
    }

    setUIKind(uiKind: theia.UIKind): void {
        this.ui = uiKind;
    }

    setAppHost(appHost: string): void {
        this.host = appHost;
    }

    setAppRoot(appRoot: string): void {
        this.applicationRoot = appRoot;
    }

    setAppUriScheme(uriScheme: string): void {
        this.appUriScheme = uriScheme;
    }

    getClientOperatingSystem(): Promise<theia.OperatingSystem> {
        return this.proxy.$getClientOperatingSystem();
    }

    get appName(): string {
        return this.applicationName;
    }

    get appRoot(): string {
        return this.applicationRoot;
    }

    abstract get isNewAppInstall(): boolean;

    get appHost(): string {
        return this.host;
    }

    get remoteName(): string | undefined {
        return this._remoteName;
    }

    get language(): string {
        return this.lang;
    }
    get machineId(): string {
        return this.envMachineId;
    }
    get sessionId(): string {
        return this.envSessionId;
    }
    get uriScheme(): string {
        return this.appUriScheme;
    }
    get uiKind(): theia.UIKind {
        return this.ui;
    }
}

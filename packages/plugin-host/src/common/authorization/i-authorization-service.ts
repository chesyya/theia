import { Event } from '@theia/core/lib/common/event';

export interface IAuthorizationService {
    readonly initialized: Promise<void>;

    readonly onDidUpdateAuthorizationStatus: Event<IAuthorizationStatusChangeEvent>;

    getAuthorizationStatus(pluginId: PluginIdentifier): Promise<AuthorizationStatus>;

    grantAuthorization(pluginId: PluginIdentifier): void;

    revokeAuthorization(pluginId: PluginIdentifier): void;

    getAllAuthorizationStatuses(): Promise<Map<PluginIdentifier, AuthorizationStatus>>;
}

export interface IAuthorizationClient {

    updateAuthorizationStatus(event: IAuthorizationStatusChangeEvent): void;
}

export type PluginIdentifier = string;

export enum AuthorizationStatus {
    /**
     * The user has granted authorization.
     */
    GRANTED = 'granted',
    /**
     * The user has denied authorization.
     */
    DENIED = 'denied',
}

export interface IAuthorizationStatusChangeEvent {
    readonly pluginId: PluginIdentifier;
    readonly status: AuthorizationStatus;
    readonly previousStatus?: AuthorizationStatus;
}

export const IAuthorizationService = Symbol('IAuthorizationService');
export const authorizationServicePath = '/services/plugin-authorization';

export const IAuthorizationRPC = Symbol('IAuthorizationRPC');

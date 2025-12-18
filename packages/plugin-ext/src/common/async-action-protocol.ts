import { createProxyIdentifier, ProxyIdentifier } from './rpc-protocol';

export interface ActionContext {
    anchorId: string;
    uri?: string;
    [key: string]: any;
}

export interface AsyncActionItem {
    id: string;
    label: string;
    icon?: string;
    tooltip?: string;
    visible?: boolean;
    enabled?: boolean;
    
    // Internal use
    _providerId?: string;
}

export interface AsyncActionBackendService {
    $getActions(context: ActionContext): Promise<AsyncActionItem[]>;
    $executeAction(providerId: string, actionId: string, context: ActionContext): Promise<void>;
}

export interface IActionProvider {
    provideActions(context: ActionContext): Promise<AsyncActionItem[]>;
    resolveAction(actionId: string, context: ActionContext): Promise<void>;
}

export const ASYNC_ACTION_RPC_CONTEXT = {
    ASYNC_ACTION_BACKEND: createProxyIdentifier<AsyncActionBackendService>('AsyncActionBackendService')
};

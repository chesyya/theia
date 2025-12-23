import http from 'http';
import https from 'https';
import tls from 'tls';

import { createHttpPatch, createProxyResolver, createTlsPatch, ProxySupportSetting } from '@vscode/proxy-agent';
import { PreferenceRegistryExtImpl } from '../../plugin/preference-registry';
import { WorkspaceExtImpl } from '../../plugin/workspace';

export function connectProxyResolver(workspaceExt: WorkspaceExtImpl, configProvider: PreferenceRegistryExtImpl): void {
    const resolveProxy = createProxyResolver({
        resolveProxy: async url => workspaceExt.resolveProxy(url),
        getHttpProxySetting: () => configProvider.getConfiguration('http').get('proxy'),
        log: () => { },
        getLogLevel: () => 0,
        proxyResolveTelemetry: () => { },
        useHostProxy: true,
        env: process.env,
    });
    const lookup = createPatchedModules(configProvider, resolveProxy);
    configureModuleLoading(lookup);
}

interface PatchedModules {
    http: typeof http;
    https: typeof https;
    tls: typeof tls;
}

function createPatchedModules(configProvider: PreferenceRegistryExtImpl, resolveProxy: ReturnType<typeof createProxyResolver>): PatchedModules {
    const defaultConfig = 'override' as ProxySupportSetting;
    const proxySetting = {
        config: defaultConfig
    };
    const certSetting = {
        config: false
    };
    configProvider.onDidChangeConfiguration(() => {
        const httpConfig = configProvider.getConfiguration('http');
        proxySetting.config = httpConfig?.get<ProxySupportSetting>('proxySupport') || defaultConfig;
        certSetting.config = !!httpConfig?.get<boolean>('systemCertificates');
    });

    return {
        http: Object.assign(http, createHttpPatch(http, resolveProxy, proxySetting, certSetting, true)),
        https: Object.assign(https, createHttpPatch(https, resolveProxy, proxySetting, certSetting, true)),
        tls: Object.assign(tls, createTlsPatch(tls))
    };
}

function configureModuleLoading(lookup: PatchedModules): void {
    const node_module = require('module');
    const original = node_module._load;
    node_module._load = function (request: string): typeof tls | typeof http | typeof https {
        if (request === 'tls') {
            return lookup.tls;
        }

        if (request !== 'http' && request !== 'https') {
            return original.apply(this, arguments);
        }

        // Create a shallow copy of the http(s) module to work around extensions that apply changes to the modules
        // See for more info: https://github.com/microsoft/vscode/issues/93167
        return { ...lookup[request] };
    };
}

import { interfaces } from '@theia/core/shared/inversify';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceService,
    PreferenceContribution,
    PreferenceSchema
} from '@theia/core/lib/browser/preferences';
import { bnls } from '@baosky/platform/lib/common/bnls';

const frontendConfig = FrontendApplicationConfigProvider.get();

export const WebviewConfigSchema: PreferenceSchema = {
    type: 'object',
    properties: {
        'webview.trace': {
            type: 'string',
            enum: ['off', 'on', 'verbose'],
            description: bnls.localizeByDefault('控制与 Webview 的通信追踪.'),
            default: 'off'
        }
    }
};

if (frontendConfig.securityWarnings) {
    WebviewConfigSchema.properties['webview.warnIfUnsecure'] = {
        scope: 'application',
        type: 'boolean',
        description: bnls.localizeByDefault('当前部署的 Webview 存在安全隐患.'),
        default: true,
    };
}

export interface WebviewConfiguration {
    'webview.trace': 'off' | 'on' | 'verbose'
    'webview.warnIfUnsecure'?: boolean
}

export const WebviewPreferenceContribution = Symbol('WebviewPreferenceContribution');
export const WebviewPreferences = Symbol('WebviewPreferences');
export type WebviewPreferences = PreferenceProxy<WebviewConfiguration>;

export function createWebviewPreferences(preferences: PreferenceService, schema: PreferenceSchema = WebviewConfigSchema): WebviewPreferences {
    return createPreferenceProxy(preferences, schema);
}

export function bindWebviewPreferences(bind: interfaces.Bind): void {
    bind(WebviewPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        const contribution = ctx.container.get<PreferenceContribution>(WebviewPreferenceContribution);
        return createWebviewPreferences(preferences, contribution.schema);
    }).inSingletonScope();
    bind(WebviewPreferenceContribution).toConstantValue({ schema: WebviewConfigSchema });
    bind(PreferenceContribution).toService(WebviewPreferenceContribution);
}

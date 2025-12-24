import {
    DebugConfigurationProvider,
    DebugConfigurationProviderDescriptor,
    DebugConfigurationProviderTriggerKind,
    DebugExt
} from '../../../common/plugin-api-rpc';
import { DebugConfiguration } from '@theia/debug/lib/common/debug-configuration';

export class PluginDebugConfigurationProvider implements DebugConfigurationProvider {
    public handle: number;
    public type: string;
    public triggerKind: DebugConfigurationProviderTriggerKind;
    provideDebugConfigurations: (folder: string | undefined) => Promise<DebugConfiguration[]>;
    resolveDebugConfiguration: (
        folder: string | undefined,
        debugConfiguration: DebugConfiguration
    ) => Promise<DebugConfiguration | undefined | null>;
    resolveDebugConfigurationWithSubstitutedVariables: (
        folder: string | undefined,
        debugConfiguration: DebugConfiguration
    ) => Promise<DebugConfiguration | undefined | null>;

    constructor(
        description: DebugConfigurationProviderDescriptor,
        protected readonly debugExt: DebugExt
    ) {
        this.handle = description.handle;
        this.type = description.type;
        this.triggerKind = description.trigger;

        if (description.provideDebugConfiguration) {
            this.provideDebugConfigurations = async (folder: string | undefined) => this.debugExt.$provideDebugConfigurationsByHandle(this.handle, folder);
        }

        if (description.resolveDebugConfigurations) {
            this.resolveDebugConfiguration =
                async (folder: string | undefined, debugConfiguration: DebugConfiguration) =>
                    this.debugExt.$resolveDebugConfigurationByHandle(this.handle, folder, debugConfiguration);
        }

        if (description.resolveDebugConfigurationWithSubstitutedVariables) {
            this.resolveDebugConfigurationWithSubstitutedVariables =
                async (folder: string | undefined, debugConfiguration: DebugConfiguration) =>
                    this.debugExt.$resolveDebugConfigurationWithSubstitutedVariablesByHandle(this.handle, folder, debugConfiguration);
        }
    }
}

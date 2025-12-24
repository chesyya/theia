import * as theia from '@baosky/plugin';
import { DebugAdapter } from '@theia/debug/lib/common/debug-model';
import { PluginPackageDebuggersContribution } from '../../common';
import { DebugAdapterInlineImplementation } from '../types-impl';
import { InlineDebugAdapter } from '@theia/debug/lib/common/inline-debug-adapter';

export class PluginDebugAdapterCreator {
    public async resolveDebugAdapterExecutable(_pluginPath: string, _debuggerContribution: PluginPackageDebuggersContribution): Promise<theia.DebugAdapterExecutable | undefined> {
        // Node is required to run the default executable
        return undefined;
    }

    public async createDebugAdapter(
        session: theia.DebugSession,
        _debugConfiguration: theia.DebugConfiguration,
        executable: theia.DebugAdapterExecutable | undefined,
        descriptorFactory: theia.DebugAdapterDescriptorFactory | undefined
    ): Promise<DebugAdapter> {
        if (descriptorFactory) {
            const descriptor = await descriptorFactory.createDebugAdapterDescriptor(session, executable);
            if (descriptor) {
                if (DebugAdapterInlineImplementation.is(descriptor)) {
                    return this.connectInlineDebugAdapter(descriptor);
                }
            }
        }

        throw new Error('It is not possible to provide debug adapter executable.');
    }

    public connectInlineDebugAdapter(adapter: DebugAdapterInlineImplementation): InlineDebugAdapter {
        return new InlineDebugAdapter(adapter.implementation);
    }
}

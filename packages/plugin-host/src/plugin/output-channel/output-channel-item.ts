import * as theia from '@baosky/plugin';
import { OutputChannelRegistryMain, PluginInfo } from '../../common/plugin-api-rpc';

export class OutputChannelImpl implements theia.OutputChannel {

    private disposed: boolean;

    constructor(readonly name: string, protected readonly proxy: OutputChannelRegistryMain, protected readonly pluginInfo: PluginInfo) {
    }

    dispose(): void {
        if (!this.disposed) {
            this.proxy.$dispose(this.name).then(() => {
                this.disposed = true;
            });
        }
    }

    append(value: string): void {
        this.validate();
        this.proxy.$append(this.name, value, this.pluginInfo);
    }

    appendLine(value: string): void {
        this.validate();
        this.append(value + '\n');
    }

    replace(value: string): void {
        this.validate();
        this.clear();
        this.append(value);
    }

    clear(): void {
        this.validate();
        this.proxy.$clear(this.name);
    }

    show(preserveFocusOrColumn?: boolean | theia.ViewColumn, preserveFocus?: boolean): void {
        this.validate();
        if (typeof preserveFocusOrColumn === 'boolean') {
            preserveFocus = preserveFocusOrColumn;
        }
        this.proxy.$reveal(this.name, !!preserveFocus);
    }

    hide(): void {
        this.validate();
        this.proxy.$close(this.name);
    }

    protected validate(): void {
        if (this.disposed) {
            throw new Error('Channel has been closed');
        }
    }
}

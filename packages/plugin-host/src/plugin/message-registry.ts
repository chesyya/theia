import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import {
    PLUGIN_RPC_CONTEXT as Ext, MessageRegistryMain, MainMessageOptions, MainMessageType
} from '../common/plugin-api-rpc';
import { RPCProtocol } from '../common/rpc-protocol';
import { MessageItem, MessageOptions } from '@baosky/plugin';

@injectable()
export class MessageRegistryExt {
    @inject(RPCProtocol)
    protected readonly rpc: RPCProtocol;

    private proxy: MessageRegistryMain;

    @postConstruct()
    initialize(): void {
        this.proxy = this.rpc.getProxy(Ext.MESSAGE_REGISTRY_MAIN);
    }

    async showMessage(type: MainMessageType, message: string,
        optionsOrFirstItem?: MessageOptions | string | MessageItem,
        ...rest: (string | MessageItem)[]): Promise<string | MessageItem | undefined> {
        const options: MainMessageOptions = {};
        const actions: MessageItem[] = [];
        const items: (string | MessageItem)[] = [];
        const pushItem = (item: string | MessageItem) => {
            items.push(item);
            if (typeof item === 'string') {
                actions.push({ title: item });
            } else {
                actions.push({ title: item.title, isCloseAffordance: item.isCloseAffordance });
                if (item.isCloseAffordance) {
                    options.onCloseActionHandle = actions.length - 1;
                }
            }
        };
        if (optionsOrFirstItem) {
            if (typeof optionsOrFirstItem === 'string' || 'title' in optionsOrFirstItem) {
                pushItem(optionsOrFirstItem);
            } else {
                if ('modal' in optionsOrFirstItem) {
                    options.modal = optionsOrFirstItem.modal;
                    if ('detail' in optionsOrFirstItem) {
                        options.detail = optionsOrFirstItem.detail;
                    }
                }
            }
        }
        for (const item of rest) {
            pushItem(item);
        }
        const actionHandle = await this.proxy.$showMessage(type, message, options, actions);
        return actionHandle !== undefined ? items[actionHandle] : undefined;
    }
}

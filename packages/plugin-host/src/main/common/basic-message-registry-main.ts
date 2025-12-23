import { interfaces } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';
import { MessageRegistryMain, MainMessageType, MainMessageOptions, MainMessageItem } from '../../common/plugin-api-rpc';

/**
 * A basic implementation of the message registry that does not support the modal option
 * as that requires an UI.
 */
export class BasicMessageRegistryMainImpl implements MessageRegistryMain {
    protected readonly messageService: MessageService;

    constructor(container: interfaces.Container) {
        this.messageService = container.get(MessageService);
    }

    async $showMessage(type: MainMessageType, message: string, options: MainMessageOptions, actions: MainMessageItem[]): Promise<number | undefined> {
        const action = await this.doShowMessage(type, message, options, actions);
        const handle = action
            ? actions.map(a => a.title).indexOf(action)
            : undefined;
        return handle === undefined && options.modal ? options.onCloseActionHandle : handle;
    }

    protected async doShowMessage(type: MainMessageType, message: string, options: MainMessageOptions, actions: MainMessageItem[]): Promise<string | undefined> {
        // Modal notifications are not supported in this context
        switch (type) {
            case MainMessageType.Info:
                return this.messageService.info(message, ...actions.map(a => a.title));
            case MainMessageType.Warning:
                return this.messageService.warn(message, ...actions.map(a => a.title));
            case MainMessageType.Error:
                return this.messageService.error(message, ...actions.map(a => a.title));
        }
        throw new Error(`Message type '${type}' is not supported yet!`);
    }

}

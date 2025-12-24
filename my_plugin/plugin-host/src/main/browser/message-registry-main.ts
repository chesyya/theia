import { interfaces } from '@theia/core/shared/inversify';
import { MainMessageType, MainMessageOptions, MainMessageItem } from '../../common/plugin-api-rpc';
import { ModalNotification, MessageType } from './dialogs/modal-notification';
import { BasicMessageRegistryMainImpl } from '../common/basic-message-registry-main';

/**
 * Message registry implementation that adds support for the model option via dialog in the browser.
 */
export class MessageRegistryMainImpl extends BasicMessageRegistryMainImpl {
    constructor(container: interfaces.Container) {
        super(container);
    }

    protected override async doShowMessage(type: MainMessageType, message: string,
        options: MainMessageOptions, actions: MainMessageItem[]): Promise<string | undefined> {

        if (options.modal) {
            const messageType = type === MainMessageType.Error ? MessageType.Error :
                type === MainMessageType.Warning ? MessageType.Warning :
                    MessageType.Info;
            const modalNotification = new ModalNotification();
            return modalNotification.showDialog(messageType, message, options, actions);
        }
        return super.doShowMessage(type, message, options, actions);
    }

}

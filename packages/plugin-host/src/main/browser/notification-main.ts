import { MAIN_RPC_CONTEXT } from '../../common';
import { interfaces } from '@theia/core/shared/inversify';
import { RPCProtocol } from '../../common/rpc-protocol';
import { BasicNotificationMainImpl } from '../common/basic-notification-main';

export class NotificationMainImpl extends BasicNotificationMainImpl {
    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        super(rpc, container, MAIN_RPC_CONTEXT.NOTIFICATION_EXT);
    }
}

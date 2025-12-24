import { inject, interfaces } from "@theia/core/shared/inversify";
import { MAIN_RPC_CONTEXT, SystemEventExt, SystemEventMain } from "../../../common";
import { SystemEventSubscriber } from '@baosky/platform/lib/browser/events/system-event-subscriber'
import { DisposableCollection } from "@theia/core";
import { RPCProtocol } from "../../../common/rpc-protocol";
import { EventId } from '@baosky/platform/lib/browser/events/events'

/**
 * SystemEventMainImpl
 * @date 2025/05/14 - 16:19:56 PM
 * @author wubing
 *
 * @export
 * @class SystemEventMainImpl
 * @typedef {SystemEventMainImpl}
 * @implements {SystemEventMain}
 */
export class SystemEventMainImpl implements SystemEventMain {
    @inject(SystemEventSubscriber) protected readonly subscriber: SystemEventSubscriber;
    private proxy: SystemEventExt;
    private readonly toDisposeMap = new Map<string, DisposableCollection>();

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.SYSTEMEVENT_EXT);
        this.subscriber = container.get(SystemEventSubscriber);
    }
    $subscribeSysEvent(eventId: string, subscribeId: string): void {
        if (this.toDisposeMap.has(subscribeId)) {
            this.toDisposeMap.get(subscribeId)?.push(this.subscriber.subscribe(
                DeveloperEventMap[eventId], {
                notify: (event) => this.fireToPlugin(eventId, event)
            }))
        }
        else {
            const toDispose = new DisposableCollection();
            toDispose.push(this.subscriber.subscribe(
                DeveloperEventMap[eventId], {
                notify: (event) => this.fireToPlugin(eventId, event)
            }));
            this.toDisposeMap.set(subscribeId, toDispose);
        }
    }

    $unsubscribeSysEvent(subscribeId: string): void {
        this.toDisposeMap.get(subscribeId)?.dispose();
    }

    protected fireToPlugin(eventId: string, event: any): void | undefined {
        this.proxy.$onSysEventFired(eventId, event);
    }
}


/**
 * events mapping
 * @date 2025/05/14 - 16:20:43 PM
 * @author wubing
 *
 * @type {{ readonly beforeCompile: any; readonly directiveFailure: any; readonly outOfMemory: any; readonly projectCreate: any; readonly projectWillOpen: any; readonly projectDidOpen: any; readonly projectWillClose: any; ... 28 more ...; readonly teamMemberListUpdate: any; }}
 */
export const DeveloperEventMap = {
    //Platform
    preferenceChanged: EventId.PREFERENCE_SCHEMA_CHANGE,
    // Compile
    beforeCompile: EventId.BEFORE_COMPILE,
    directiveFailure: EventId.DIRECTIVE_FAILURE,
    outOfMemory: EventId.OUT_OF_MEMORY,

    // Project
    projectCreate: EventId.PROJECT_CREATE,
    projectWillOpen: EventId.WILL_OPEN_PROJECT,
    projectDidOpen: EventId.DID_OPEN_PROJECT,
    projectWillClose: EventId.WILL_CLOSE_PROJECT,
    projectDidClose: EventId.DID_CLOSE_PROJECT,
    projectDidDelete: EventId.DID_DELETE_PROJECT,
    projectDidRemove: EventId.DID_REMOVE_PROJECT,
    projectSizeChange: EventId.PROJECT_SIZE_CHANGE,
    projectListChanged: EventId.PROJECT_LIST_CHANGED,
    projectMemberListUpdate: EventId.PROJECT_MEMBER_LIST_UPDATE,

    // Data
    realDataTypeChanged: EventId.REAL_DATA_TYPE_CHANGED,
    dataChanged: EventId.DATA_CHANGED,
    dataCreated: EventId.DATA_CREATED,
    dataDeleted: EventId.DATA_DELETED,
    dataUpdated: EventId.DATA_UPDATED,
    dataLoadFinish: EventId.DATA_LOAD_FINISH,
    clipboardDidUpdate: EventId.CLIPBOARD_DID_UPDATE,
    defaultNamespaceChanged: EventId.DEFAULT_NAMESPACE_CHANGED,

    // File
    folderLoadedSuccess: EventId.FOLDER_LOADED_SUCCESS,
    fileLoadedSuccess: EventId.FILE_LOADED_SUCCESS,
    fileSaved: EventId.FILE_SAVED,
    copyFileSuccess: EventId.COPY_FILE_SUCCESS,
    moveFileSuccess: EventId.MOVE_FILE_SUCCESS,

    // Tab
    tabStartSubscribe: EventId.TAB_START_SUBSCRIBE,
    tabStopSubscribe: EventId.TAB_STOP_SUBSCRIBE,
    notOpenAutoCloseDialog: EventId.NOT_OPEN_AUTO_CLOSE_DIALOG,

    // Browser
    browserDisconnect: EventId.BROWSER_DISCONNECT,
    browserReconnect: EventId.BROWSER_RECONNECT,

    // Session
    login: EventId.LOGIN,
    logout: EventId.LOGOUT,

    // Team
    esUserListUpdate: EventId.ES_USER_LIST_UPDATE,
    teamListUpdate: EventId.TEAM_LIST_UPDATE,
    teamMemberListUpdate: EventId.TEAM_MEMBER_LIST_UPDATE
} as const;


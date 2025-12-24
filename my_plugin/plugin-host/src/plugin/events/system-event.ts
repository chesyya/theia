import {
    PLUGIN_RPC_CONTEXT,
    SystemEventExt,
    SystemEventMain
} from '../../common/plugin-api-rpc';
import { RPCProtocol } from '../../common/rpc-protocol';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { Disposable } from '@theia/core/shared/vscode-languageserver-protocol';
import { UUID } from '@theia/core/shared/@phosphor/coreutils';


/**
 * SystemEventExtImpl
 * @date 2025/05/14 - 16:21:16 PM
 * @author wubing
 *
 * @export
 * @class SystemEventExtImpl
 * @typedef {SystemEventExtImpl}
 * @implements {SystemEventExt}
 */
export class SystemEventExtImpl implements SystemEventExt {

    private readonly eventEmitters = new Map<string, Emitter<void>>();
    readonly events = new Map<string, Event<void>>();
    private proxy: SystemEventMain;
    private readonly toDisposeEventIds = new Map<Disposable, string>();

    constructor(rpc: RPCProtocol) {
        const eventIds = extractEventIds(PluginEvent);
        for (const id of eventIds) {
            const emitter = new Emitter<any>();
            this.eventEmitters.set(id, emitter);
            this.events.set(id, emitter.event);
        }
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.SYSTEMEVENT_MAIN);
    }

    onEvent(eventId: string, listener: () => void): Disposable {
        const subscribeIdId = UUID.uuid4();
        const eventDisposable = this.events.get(eventId)!(listener);
        this.toDisposeEventIds.set(eventDisposable, subscribeIdId);
        this.proxy.$subscribeSysEvent(eventId, subscribeIdId);

        return {
            dispose: () => {
                eventDisposable.dispose();
                this.proxy.$unsubscribeSysEvent(this.toDisposeEventIds.get(eventDisposable)!);
            }
        }
    }
    $onSysEventFired(eventId: string, event: any): void {
        this.eventEmitters.get(eventId)?.fire(event);
    }

}


/**
 * 提取id
 * @date 2025/05/14 - 16:21:33 PM
 * @author wubing
 *
 * @export
 * @param {*} obj
 * @returns {string[]}
 */
export function extractEventIds(obj: any): string[] {
    const ids: string[] = [];
    for (const key in obj) {
        const val = obj[key];
        if (typeof val === "string") {
            ids.push(val);
        } else if (typeof val === "object") {
            ids.push(...extractEventIds(val));
        }
    }
    return ids;
}


/**
 * events mapping
 * @date 2025/05/14 - 16:21:51 PM
 * @author wubing
 *
 * @type {{ readonly Compile: { readonly Before: "beforeCompile"; readonly DirectiveFailure: "directiveFailure"; readonly OutOfMemory: "outOfMemory"; }; readonly Project: { readonly Create: "projectCreate"; ... 8 more ...; readonly MemberListUpdate: "projectMemberListUpdate"; }; ... 5 more ...; readonly Team: { ...; }; }}
 */
export const PluginEvent = {
    Platform: {
        PreferenceChanged: "preferenceChanged",
    },
    Compile: {
        Before: "beforeCompile",
        DirectiveFailure: "directiveFailure",
        OutOfMemory: "outOfMemory",
    },

    Project: {
        Create: "projectCreate",
        WillOpen: "projectWillOpen",
        DidOpen: "projectDidOpen",
        WillClose: "projectWillClose",
        DidClose: "projectDidClose",
        DidDelete: "projectDidDelete",
        DidRemove: "projectDidRemove",
        SizeChange: "projectSizeChange",
        ListChanged: "projectListChanged",
        MemberListUpdate: "projectMemberListUpdate",
    },

    Data: {
        RealTypeChanged: "realDataTypeChanged",
        Changed: "dataChanged",
        Created: "dataCreated",
        Deleted: "dataDeleted",
        Updated: "dataUpdated",
        LoadFinish: "dataLoadFinish",
        ClipboardUpdate: "clipboardDidUpdate",
        DefaultNamespaceChanged: "defaultNamespaceChanged",
    },

    File: {
        FolderLoaded: "folderLoadedSuccess",
        FileLoaded: "fileLoadedSuccess",
        FileSaved: "fileSaved",
        CopySuccess: "copyFileSuccess",
        MoveSuccess: "moveFileSuccess",
    },

    Tab: {
        StartSubscribe: "tabStartSubscribe",
        StopSubscribe: "tabStopSubscribe",
        NotOpenAutoCloseDialog: "notOpenAutoCloseDialog",
    },

    Browser: {
        Disconnect: "browserDisconnect",
        Reconnect: "browserReconnect",
    },

    Session: {
        Login: "login",
        Logout: "logout",
    },

    Team: {
        UserListUpdate: "esUserListUpdate",
        ListUpdate: "teamListUpdate",
        MemberListUpdate: "teamMemberListUpdate",
    }
} as const;



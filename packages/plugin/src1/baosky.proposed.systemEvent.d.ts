export module "@baosky/plugin" {

    export namespace system {
        type ValueOf<T> = T extends Record<string, any>
            ? {
                [K in keyof T]: T[K] extends string
                ? T[K]
                : ValueOf<T[K]>
            }[keyof T]
            : never;
        type SystemEventIds = ValueOf<typeof eventId>;

        export function onEvent(eventId: SystemEventIds, listener: (event) => void): Disposable;
        export const eventId = {
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

    }
}

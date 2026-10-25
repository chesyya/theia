// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
import {
    PLUGIN_RPC_CONTEXT as Ext, OpenDialogOptionsMain, DialogsMain, SaveDialogOptionsMain, UploadDialogOptionsMain,
    DialogAutomationHandleDTO
} from '../common/plugin-api-rpc';
import {
    OpenDialogOptions, SaveDialogOptions, UploadDialogOptions, DialogHandle, DialogSnapshot, DialogState,
    DialogConfirmResult, DialogAction
} from '@theia/plugin';
import { RPCProtocol } from '../common/rpc-protocol';
import { URI } from './types-impl';

export class DialogsExtImpl {
    private proxy: DialogsMain;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(Ext.DIALOGS_MAIN);
    }

    showOpenDialog(options: OpenDialogOptions): PromiseLike<URI[] | undefined> {
        const optionsMain = {
            title: options.title,
            openLabel: options.openLabel,
            defaultUri: options.defaultUri ? options.defaultUri.path : undefined,
            canSelectFiles: typeof options.canSelectFiles === 'boolean' ? options.canSelectFiles : true,
            canSelectFolders: typeof options.canSelectFolders === 'boolean' ? options.canSelectFolders : false,
            canSelectMany: options.canSelectMany,
            filters: options.filters
        } as OpenDialogOptionsMain;

        return new Promise((resolve, reject) => {
            this.proxy.$showOpenDialog(optionsMain).then(result => {
                if (result) {
                    const uris = [];
                    for (let i = 0; i < result.length; i++) {
                        const uri = URI.file(result[i]);
                        uris.push(uri);
                    }
                    resolve(uris);
                } else {
                    resolve(undefined);
                }
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    showSaveDialog(options: SaveDialogOptions): PromiseLike<URI | undefined> {
        const optionsMain = {
            title: options.title,
            saveLabel: options.saveLabel,
            defaultUri: options.defaultUri ? options.defaultUri.path : undefined,
            filters: options.filters
        } as SaveDialogOptionsMain;

        return new Promise((resolve, reject) => {
            this.proxy.$showSaveDialog(optionsMain).then(result => {
                if (result) {
                    resolve(URI.parse('file://' + result));
                } else {
                    resolve(undefined);
                }
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    showUploadDialog(options: UploadDialogOptions): PromiseLike<URI[] | undefined> {
        const optionsMain = {
            defaultUri: options.defaultUri ? options.defaultUri.path : undefined
        } as UploadDialogOptionsMain;

        return new Promise((resolve, reject) => {
            this.proxy.$showUploadDialog(optionsMain).then(result => {
                if (result) {
                    resolve(result.map(uri => URI.parse(uri)));
                } else {
                    resolve(undefined);
                }
            }).catch(reason => {
                reject(reason);
            });
        });
    }

    async getActiveDialog(): Promise<DialogHandle | undefined> {
        const handle = await this.proxy.$getActiveDialog();
        return handle ? new DialogHandleImpl(handle, this.proxy) : undefined;
    }

}

class DialogHandleImpl implements DialogHandle {

    readonly id: string;

    constructor(handle: DialogAutomationHandleDTO, protected readonly proxy: DialogsMain) {
        this.id = handle.id;
    }

    getSnapshot(): PromiseLike<DialogSnapshot> {
        return this.proxy.$getDialogSnapshot(this.id);
    }

    getState(): PromiseLike<DialogState> {
        return this.proxy.$getDialogState(this.id);
    }

    setState(patch: DialogState): PromiseLike<void> {
        return this.proxy.$setDialogState(this.id, patch);
    }

    confirm(): PromiseLike<DialogConfirmResult> {
        return this.proxy.$confirmDialog(this.id);
    }

    cancel(): PromiseLike<void> {
        return this.proxy.$cancelDialog(this.id);
    }

    getActions(): PromiseLike<readonly DialogAction[]> {
        return this.proxy.$getDialogActions(this.id);
    }

    invokeAction(id: string): PromiseLike<void> {
        return this.proxy.$invokeDialogAction(this.id, id);
    }
}

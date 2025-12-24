import { PLUGIN_RPC_CONTEXT as Ext, OpenDialogOptionsMain, DialogsMain, SaveDialogOptionsMain, UploadDialogOptionsMain } from '../common/plugin-api-rpc';
import { OpenDialogOptions, SaveDialogOptions, UploadDialogOptions } from '@baosky/plugin';
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
                    const uris: URI[] = [];
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

}

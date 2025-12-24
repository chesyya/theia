import { isObject } from '@theia/core/lib/common/types';
import { URI } from '@theia/core';
import { menuPathContribution, menuPathMapping } from '../main/browser/menus/vscode-theia-menu-mappings';
import { Plugin_Maps } from './key-mappings';
import { PLCObjectSymbols } from '@baosky/plc-protocol/lib/common/const'

export interface ProjectTreeSelection {
    readonly data: {
        readonly stat: {
            readonly path: URI;
            readonly objectType: symbol;
            readonly options: {
                readonly namespace: string
            },
            readonly contextMenuPath: string[];
            readonly objectBusinessType: symbol[]
        };
        readonly name: string;
    }
}

export interface EditorContextSelection {
    readonly bodyWidget: {
        uri: URI;
    };
    readonly headWidget: EditorSelection;
}

export interface Selection {
    readonly uri: URI;
    readonly name: string;
    readonly namespace: string;
}

export interface EditorSelection {
    readonly model: Selection,
    readonly selection: any
}

export namespace UriSelection {

    export function isProjectTree(arg: unknown): arg is ProjectTreeSelection {
        if (!isObject<ProjectTreeSelection>(arg)) return false;

        const data = (arg as Partial<ProjectTreeSelection>).data;
        if (!data) return false;

        const stat = (data as Partial<ProjectTreeSelection['data']>).stat;
        if (!stat) return false;
        const name = (data as Partial<ProjectTreeSelection['data']>).name;
        if (!name) return false;

        return stat.path instanceof URI;
    }

    export function isEditorContext(arg: unknown): arg is EditorContextSelection {
        if (!isObject<EditorContextSelection>(arg)) return false;

        const bodyWidget = (arg as Partial<EditorContextSelection>).bodyWidget;
        if (!bodyWidget) return false;

        const headWidget = (arg as Partial<EditorContextSelection>).headWidget;
        if (!headWidget) return false;

        return true;
    }

    export function isSelection(arg: unknown): arg is Selection {
        return isObject<Selection>(arg)
    }

    export function getProjectTreeUri(selection: unknown): any {
        return extractProjectPath(selection);
    }

    function extractProjectPath(selection: unknown): any {
        if (isProjectTree(selection)) {
            const path = selection.data?.stat?.path;
            const nodeType = Plugin_Maps.SYMBOL_TO_STRING_MAP.get(selection.data.stat.objectType);
            let matchUri = path.path.toString().match(/\/PLC_\d+.*$/); //保证符合dp数据格式
            let name = selection.data.name.replace(/(<[^>]*>|\[[^\]] *\])$/, '')
            if (nodeType == 'plc' && name) {
                const match = name.match(/PLC_\d/);
                if (match)
                    name = match[0]
            }
            const namespace = selection.data.stat.options?.namespace;
            let dpUri = '';
            if (matchUri) {
                const fullPath = matchUri[0];
                dpUri = fullPath.replace(/\.[^.]*$/, ''); // 去掉最后的扩展名
            }
            return {
                fileUri: path,
                dpUri: dpUri,
                name: name,
                nodeType: nodeType,
                namespace: namespace
            }
        }
        return undefined;
    }

    export function getProjectTreeUris(selection: unknown): any[] {
        if (Array.isArray(selection)) {
            return selection.filter(isProjectTree).map(s => {
                return extractProjectPath(s)
            });
        }
        return [];
    }

    // export function getEditorContextSource(source: unknown): EditorSelection | undefined {
    //     if (isEditorContext(source)) {
    //         return {
    //             module: source.headWidget?.module,
    //             name: source.headWidget?.name,
    //             namespace: source.headWidget?.namespace
    //         }
    //     }
    //     return undefined;
    // }

    export function getEditorContextSources(source: any, selection: any): any {
        let uri: URI;
        if (!isEditorContext(source))
            return;
        uri = source.bodyWidget.uri;
        if (typeof selection !== 'object') {
            selection = '';
        } else if (selection?.data?.row?.edit !== undefined) {
            selection = selection.data.row.edit;
            uri = source.headWidget.model.uri;
        } else if (selection?.data !== undefined) {
            selection = selection.data;
        }
        if (isEditorContext(source)) {
            const result = {
                uri: uri,
                selection: selection
            };
            return result;
        }
        return;
    }

    export function getContextKey(selection: any): { businessType: string, ext: string } | undefined {
        if (!isProjectTree(selection)) {
            return undefined;
        }

        const { path: pathData, objectBusinessType } = selection.data.stat;
        const ext = pathData.path.ext;

        let businessType: string = '';

        if (Array.isArray(objectBusinessType) && objectBusinessType.length > 0) {
            const typeSymbol = objectBusinessType[0];
            businessType = Plugin_Maps.SYMBOL_TO_STRING_MAP.get(typeSymbol)?? '';
        }

        return {
            businessType,
            ext
        };
    }

}

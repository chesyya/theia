/* eslint-disable @typescript-eslint/no-explicit-any */

import { PluginIdentifiers, PluginModel, PluginPackage } from '../../../common/plugin-protocol';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import URI from '@theia/core/lib/common/uri';

const NLS_REGEX = /^%([\w\d.-]+)%$/i;

function getUri(pluginModel: PluginModel, relativePath: string): URI {
    const ownURI = new Endpoint().getRestUrl();
    return ownURI.parent.resolve(PluginPackage.toPluginUrl(pluginModel, relativePath));
}

function readPluginFile(pluginModel: PluginModel, relativePath: string): Promise<string> {
    return readContents(getUri(pluginModel, relativePath).toString());
}

function readContents(uri: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.onreadystatechange = function (): void {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    resolve(this.response);
                } else if (this.status === 404) {
                    reject('NotFound');
                } else {
                    reject(new Error('Could not fetch plugin resource'));
                }
            }
        };

        request.open('GET', uri, true);
        request.send();
    });
}

async function readPluginJson(pluginModel: PluginModel, relativePath: string): Promise<any> {
    const content = await readPluginFile(pluginModel, relativePath);
    const json = JSON.parse(content) as PluginPackage;
    json.publisher ??= PluginIdentifiers.UNPUBLISHED;
    return json;
}

export async function loadManifest(pluginModel: PluginModel): Promise<any> {

    const manifestPromise = readPluginJson(pluginModel, 'package.json');
    const translationsPromise = loadTranslations(pluginModel);
    const [manifest, translations] = await Promise.all([
        manifestPromise,
        translationsPromise
    ]);
    // translate vscode builtins, as they are published with a prefix.
    const built_prefix = '@theia/vscode-builtin-';
    if (manifest && manifest.name && manifest.name.startsWith(built_prefix)) {
        manifest.name = manifest.name.substring(built_prefix.length);
    }
    return manifest && translations && Object.keys(translations).length ?
        localize(manifest, translations) :
        manifest;
}

async function loadTranslations(pluginModel: PluginModel): Promise<any> {
    try {
        //添加超时保护
        const result = await Promise.race([
            readPluginJson(pluginModel, 'package.nls.json'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('readPluginJson 超时')), 3000)
            )
        ]);
        return result;
    } catch (e) {
        if (e === 'NotFound' || e?.message?.includes('NotFound') ||
            e?.message?.includes('超时') || e?.code === 'ENOENT') {
            console.warn('package.nls.json 不存在或超时，返回空对象');
            return {};
        }

        console.error('loadTranslations 未知错误:', e);
        throw e;
    }
}

function localize(value: any, translations: {
    [key: string]: string
}): any {
    if (typeof value === 'string') {
        const match = NLS_REGEX.exec(value);
        return match && translations[match[1]] || value;
    }
    if (Array.isArray(value)) {
        const result: string[] = [];
        for (const item of value) {
            result.push(localize(item, translations));
        }
        return result;
    }
    if (value === null) {
        return value;
    }
    if (typeof value === 'object') {
        const result: { [key: string]: any } = {};
        // eslint-disable-next-line guard-for-in
        for (const propertyName in value) {
            result[propertyName] = localize(value[propertyName], translations);
        }
        return result;
    }
    return value;
}

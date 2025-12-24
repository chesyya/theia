import { RPCProtocol } from "../../common/rpc-protocol";
import { Plugin, PLUGIN_RPC_CONTEXT, PluginIdentifiers, PluginRegistryExt, VersionServiceExt, VersionServiceMain } from "../../common";
import { ProductType } from "@baosky/platform/lib/common/es-version-protocol";
import * as baosky from '@baosky/plugin'

/**
 * VersionServiceExtImpl
 * @date 2025-12-08 , 10:53:07 am
 * @author 南天远
 *
 * @export
 * @class VersionServiceExtImpl
 * @typedef {VersionServiceExtImpl}
 * @implements {VersionServiceExt}
 */
export class VersionServiceExtImpl implements VersionServiceExt{
    protected readonly proxy: VersionServiceMain;

    constructor(rpc: RPCProtocol){
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.VERSION_SERVICE_MAIN);
    }
    getAppVersionByFile(projectPath: baosky.Uri): Promise<{ appMajorVersion: number; appMinorVersion: number; }> {
        return this.proxy.$getAppVersionByFile(projectPath);
    }
    getAppVersionNumberByFile(projectPath: baosky.Uri): Promise<number> {
        return this.proxy.$getAppVersionNumberByFile(projectPath);
    }
    getLatestAppVersion(): Promise<number> {
        return this.proxy.$getLatestAppVersion();
    }
    getLatestFullAppVersion(): Promise<{ appMajorVersion: number; appMinorVersion: number; hotfix: number; }> {
        return this.proxy.$getLatestFullAppVersion();
    }
    getAppVersionSync(): number {
        return this.proxy.$getAppVersionSync();
    }
    getProductVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }> {
        return this.proxy.$getProductVersionRange(product);
    }
    getProductVersionRangeSync(product: ProductType): { oldest: number; latest: number; } {
        return this.proxy.$getProductVersionRangeSync(product);
    }
    getModelVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }> {
        return this.proxy.$getModelVersionRange(product);
    }
    getLanguageVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }> {
        return this.proxy.$getLanguageVersionRange(product);
    }
    getLanguageVersionRangeString(product: ProductType): Promise<{ oldest: string; latest: string; }> {
        return this.proxy.$getLanguageVersionRangeString(product);
    }
    getMatchedVersionsByAppVersion(appVersion: number): Promise<{ languageVersion: number; projectVersion: number; }> {
        return this.proxy.$getMatchedVersionsByAppVersion(appVersion);
    }
    getMatchedPLCModelVersionByProject(projectVersion: number): Promise<number> {
        return this.proxy.$getMatchedPLCModelVersionByProject(projectVersion);
    }

}

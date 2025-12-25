import { PLUGIN_RPC_CONTEXT, EditorRegistryExt, EditorRegistryMain, PlatformServiceExt, PlatformServiceMain } from "../../../common";
import * as baosky from '@baosky/plugin'
import { RPCProtocol } from "../../../common/rpc-protocol";
import { UUID } from "@theia/core/shared/@phosphor/coreutils";
import { Plugin } from "../../../common/plugin-api-rpc";
import { URI } from "@theia/core";
import { Disposable } from "../../types-impl";


export class PlatformServiceExtImpl implements PlatformServiceExt {
    protected readonly proxy: PlatformServiceMain;
    protected loadingFunMap = new Map<string, baosky.LoadingFun>();
    protected callbackIds: string[];
    protected numTag = 0;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(PLUGIN_RPC_CONTEXT.PLATFORM_SERVICE_MAIN);
    }
    async registerMenuAction(location: baosky.MenuLocation, menuId: string, actions: baosky.MenuActions[]): Promise<Map<string, Disposable>> {
        let disposeMap = new Map();
        const actionIds = await this.proxy.$registerMenuAction(location, menuId, actions);
        if(!actionIds)
            throw new Error('未能成功注册菜单项，注册点不对或已存在重复')
        actionIds?.actions.forEach((item) => {
            const dispose = {
            dispose: () => this.proxy.$removeMenuAction(actionIds.menuId, item)
        };
            disposeMap.set(item, dispose);
        })
        return disposeMap;
    }

    public async loadObject(deviceName: string, path: string | baosky.Uri, options?: baosky.LoadOptions, ctx?: baosky.DataContext): Promise<void> {
        return await this.proxy.$loadObject(deviceName, path, options, ctx);
    }

    public unloadObject(deviceName: string, path: string | baosky.Uri): void {
        return this.proxy.$unloadObject(deviceName, path);
    }

    public async reloadObject(deviceName: string, path: string | baosky.Uri, options?: baosky.LoadOptions, ctx?: baosky.DataContext): Promise<void> {
        return await this.proxy.$reloadObject(deviceName, path, options, ctx);
    }

    public async reloadContainer(path: baosky.Uri, newPath?: baosky.Uri): Promise<void> {
        return await this.proxy.$reloadContainer(path, newPath);
    }

    public async getProjectPath(): Promise<string> {
        return await this.proxy.$getProjectPath();
    }
    public async getProjectInfo(): Promise<baosky.ProjectObject> {
        return await this.proxy.$getProjectInfo();
    }
    public async getDeviceParamsByPath(uri: baosky.Uri): Promise<baosky.DeviceParams> {
        return await this.proxy.$getDeviceParamsByPath(uri);
    }
    public async getDevicePathByName(name: string): Promise<string> {
        return await this.proxy.$getDevicePathByName(name);
    }
    public async getModelVersion(name: string): Promise<number> {
        return await this.proxy.$getModelVersion(name);
    }
    public async getAppVersion(): Promise<number> {
        return await this.proxy.$getAppVersion();
    }
    public async validateName(name: string, nameSourceType: string, options?: baosky.NameValidationOptions): Promise<baosky.ValidationResult[]> {
        return await this.proxy.$validateName(name, nameSourceType, options);
    }
    public async getNextName(location: baosky.Uri, options: baosky.NextNameOptions): Promise<string> {
        return await this.proxy.$getNextName(location, options);
    }
    public async tryGetNextName(location: baosky.Uri, options: baosky.NextNameOptions, nameList?: string[]): Promise<string> {
        return await this.proxy.$tryGetNextName(location, options, nameList);
    }
    public async releaseName(): Promise<void> {
        await this.proxy.$releaseName();
    }
    public async clearDirectiveStack(): Promise<void> {
        await this.proxy.$clearDirectiveStack();
    }

    async selection(): Promise<baosky.GlobalSelection[]> {
        return await this.proxy.$selection();
    };

    gotoProblem(problem: baosky.ProblemLocation): Promise<void> {
        return this.proxy.$gotoProblem(problem);
    }

    getProblems(resource?: URI): Promise<baosky.Diagnostic[] | [string, baosky.Diagnostic[]][]> {
        return this.proxy.$getProblems(resource as any);
    }

    async getPreferenceValue(settingKey: string, contentKey?: string): Promise<JSON | undefined> {
        const result = await this.proxy.$getPreferenceValue(settingKey, contentKey);
        return result
    }
    async getPreferenceChecked(settingKey: string): Promise<boolean | undefined> {
        return await this.proxy.$getPreferenceChecked(settingKey);
    }
    registerPreference<T extends baosky.BasePreferenceSchema>(schema: T): void {
        this.proxy.$registerPreference(schema);
    }
    async executeCrossReference(params: baosky.CrossReferenceParam): Promise<baosky.CrossRefTableDataType[] | baosky.CrossReferenceResponse> {
        return await this.proxy.$executeCrossReference(params);
    }

    async gotoService(gotoOptions: baosky.GotoOptions): Promise<void> {
        await this.proxy.$goto(gotoOptions);
    }

    async gotoHelp(route: string, plugin: Plugin) {
        await this.proxy.$gotoHelp(plugin.model.id, route);
    }

    async openDialog(dialogProps: baosky.DialogProps): Promise<void> {
        switch (dialogProps.type) {
            case 'loadingDialog': await this.openLoadingDialog(dialogProps);
        }
    }

    async decorateInteractiveTarget(target: baosky.InteractiveTarget): Promise<void> {
        await this.proxy.$decorateInteractiveTarget(target);
    }

    async openLoadingDialog(dialogProps: baosky.DialogProps) {
        if (!dialogProps.loading || !dialogProps.epoch)
            return;
        this.callbackIds = [];
        this.numTag = dialogProps.epoch;
        const forSendMes = UUID.uuid4();
        const forSendMesArr = UUID.uuid4();
        const forFinished = UUID.uuid4();
        const forClose = UUID.uuid4();
        this.callbackIds.push(forSendMes, forSendMesArr, forFinished, forClose);
        const res = await this.proxy.$openDialog(dialogProps, this.callbackIds);
        if (res) {
            await dialogProps.loading(async (item: string[] | string) => {
                await this.loadingDialog(item);
            });
        }
    }

    async loadingDialog(item: string[] | string) {

        if (Array.isArray(item))
            this.proxy.$triggerCallback([this.callbackIds[1]], [item], [true]);
        else
            this.proxy.$triggerCallback([this.callbackIds[0]], [item], [true]);
        if (--this.numTag <= 0) {
            await this.SLEEP(1000);
            this.proxy.$triggerCallback([this.callbackIds[2], this.callbackIds[3]], [], [false, false]);
        }
    }
    SLEEP = async (t: number) => new Promise(r => (setTimeout(() => r(t), t)));

    async focusInfoViewTab(type: string, stopAutoScroll?: boolean): Promise<void> {
        await this.proxy.$focusInfoViewTab(type, stopAutoScroll);
    }
}

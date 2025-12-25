import { PlatformServiceExt, PlatformServiceMain } from "../../../../common";
import * as baosky from '@baosky/plugin';
import { interfaces } from "@theia/core/shared/inversify";
import { GotoService } from '@baosky/platform/lib/browser/info-view/goto/goto-service';
import { GotoInfo } from '@baosky/platform/lib/common/info-view/goto-info';
import { ContributionProvider, ILogger, URI } from "@theia/core";
import { CommonLoadingPageDialogFactory } from '@baosky/platform/lib/browser/common-dialog/common-loading-page-dialog'
import { GoToHelpService } from "@baosky/platform/lib/browser/go-to-help-service";
import { InfoPanelTabBarDecorateService, InfoPanelTitleKind } from '@baosky/platform/lib/browser/info-view/info-view-tab-bar-decorator-contribution'
import { GlobalSelectionService } from "@baosky/platform/lib/browser/service/global-selection-service";
import { CrossReferenceContribution } from "@baosky/platform/lib/browser/cross-reference/interface"
import { CrossReferenceWidget } from "@baosky/platform/lib/browser/cross-reference/widget/cross-reference-widget"
import { CrossReferenceViewContribution } from "@baosky/platform/lib/browser/cross-reference/view-contribution"
import { PUEditorProvider } from "@baosky/program-unit/lib/browser/model/program-unit-model-provider";
import { LanguageServiceImpl } from "@baosky/plc-protocol/lib/browser/language-service/language-service";
import { CrossReferenceViewDataProvider } from "@baosky/plc-protocol/lib/browser/cross-reference/controller/contribution/cross-reference-view-data-provider"
import { ProjectTreeModelManager } from "@baosky/project/lib/browser/project-tree-view/manager/project-tree-model-manager";
import { ProjectTree } from "@baosky/project/lib/browser/project-tree-view/view/models/project-tree";
import { CrossReferenceParam, LanguageService, TaskCrossReferenceParam } from "@baosky/plc-protocol/lib/browser/language-service";
import { TaskCrossReferenceDataProvider } from '@baosky/plc-protocol/lib/browser/cross-reference/controller/contribution/task-cross-reference-data-provider';
import { BaoskyPreferenceService } from "@baosky/platform/lib/browser/framework/preference/baosky-preference-service-protocol";
import { ProblemContribution } from '@baosky/platform/lib/browser/problem/problem-contribution';
import { ProblemManager } from "@theia/markers/lib/browser";
import { NavigateService, IRootContainerObjectLoadService } from '@baosky/platform/lib/browser/project';
import { DirectiveExecutorService } from "@baosky/platform/lib/browser/directive";
import { NameService } from "@baosky/platform/lib/browser/name/service/name-service";
import { InfoViewContribution } from "@baosky/platform/lib/browser/info-view/info-view-contribution";
import { IPluginCommandManager } from "../../command/plugin-command-manager-protocol";
import { GotoCustomRoute, GotoCustomRouteService } from '@baosky/platform/lib/browser/framework/custom-route/goto-custom-route/goto-custom-route-protocol'
import { UriComponents } from "@theia/core/lib/common/uri";


export class PlatformServiceMainImpl implements PlatformServiceMain {
    protected readonly gototoService: GotoService;
    protected readonly commonLoadingPageDialogFactory: CommonLoadingPageDialogFactory;
    protected callbackMap = new Map<string, any>();
    protected readonly proxy: PlatformServiceExt;
    protected readonly goToHelpService: GoToHelpService;
    protected readonly infoPanelTabBarDecorateService: InfoPanelTabBarDecorateService;
    protected contributionProvider: ContributionProvider<CrossReferenceContribution>;
    protected crossReferenceWidget: CrossReferenceWidget;
    protected crossReferenceViewContribution: CrossReferenceViewContribution;
    protected pUEditorProvider: PUEditorProvider;
    protected languageServiceImpl: LanguageServiceImpl;
    protected globalSelectionService: GlobalSelectionService;
    protected crossReferenceViewDataProvider: CrossReferenceViewDataProvider;
    protected readonly logger: ILogger;
    protected readonly projectTreeModelManager: ProjectTreeModelManager;
    protected readonly languageService: LanguageService;
    protected readonly dataProvider: TaskCrossReferenceDataProvider;
    protected readonly problemContribution: ProblemContribution;
    protected readonly problemManager: ProblemManager;
    protected preferenceService: BaoskyPreferenceService;
    protected navigateService: NavigateService
    protected rootContainerObjectLoadService: IRootContainerObjectLoadService;
    protected directiveExecutorService: DirectiveExecutorService;
    protected nameService: NameService;
    protected infoViewContribution: InfoViewContribution;
    protected iPluginCommandManager: IPluginCommandManager;
    protected gotoCustomRouteService: GotoCustomRouteService;

    constructor(container: interfaces.Container) {
        this.gototoService = container.get(GotoService);
        this.commonLoadingPageDialogFactory = container.get(CommonLoadingPageDialogFactory);
        this.goToHelpService = container.get(GoToHelpService);
        this.infoPanelTabBarDecorateService = container.get(InfoPanelTabBarDecorateService);
        this.contributionProvider = container.getNamed<ContributionProvider<CrossReferenceContribution>>(
            ContributionProvider,
            CrossReferenceContribution
        );
        this.crossReferenceWidget = container.get(CrossReferenceWidget);
        this.crossReferenceViewContribution = container.get(CrossReferenceViewContribution);
        this.pUEditorProvider = container.get(PUEditorProvider);
        this.languageServiceImpl = container.get(LanguageServiceImpl);
        this.globalSelectionService = container.get(GlobalSelectionService);
        this.crossReferenceViewDataProvider = container.get(CrossReferenceViewDataProvider);
        this.logger = container.get<ILogger>(ILogger).child(PlatformServiceMainImpl.name);
        this.projectTreeModelManager = container.get(ProjectTreeModelManager);
        this.languageService = container.get(LanguageService);
        this.dataProvider = container.get(TaskCrossReferenceDataProvider);
        this.preferenceService = container.get(BaoskyPreferenceService);
        this.problemContribution = container.get(ProblemContribution);
        this.problemManager = container.get(ProblemManager);
        this.navigateService = container.get(NavigateService);
        this.rootContainerObjectLoadService = container.get(IRootContainerObjectLoadService);
        this.directiveExecutorService = container.get(DirectiveExecutorService);
        this.nameService = container.get(NameService);
        this.infoViewContribution = container.get(InfoViewContribution);
        this.iPluginCommandManager = container.get(IPluginCommandManager);
        this.gotoCustomRouteService = container.get(GotoCustomRouteService);
    }
    async $registerMenuAction(location: baosky.MenuLocation, menuId: string, actions: baosky.MenuActions[]) {
        if(location == 'tooltip'){
            const options = actions.map((menu) => {
                const handler = this.iPluginCommandManager.getPluginHandler(menu.command.command);
                if(!handler)
                    throw new Error(`command '${menu.command.command}' not found`);
                const gotoUnit: GotoCustomRoute = {
                    routeId: menu.command.command,
                    label: menu.command.title,
                    isEnable: handler.isEnabled,
                    handle: handler.execute
                }
                return gotoUnit;
            })
            const success = this.gotoCustomRouteService.registerGotoCustomRoute(menuId, options);
            return {
                menuId: menuId,
                actions: Array.from(success.keys())
            }
        }
        return;
    }

    $removeMenuAction(menuId: string, commandId: string) {
        this.gotoCustomRouteService.unRegisterGotoCustomRoute(menuId, commandId);
    }

    async $selection(): Promise<baosky.GlobalSelection[]> {
        const selections: baosky.GlobalSelection[] = [];
        const globalSelection = this.globalSelectionService.selection?.selections;
        const source = this.globalSelectionService.selection?.source;
        if (globalSelection && Array.isArray(globalSelection)) {
            globalSelection.map(s => {
                let name: any;
                if ('row' in s.data && s.data.row && typeof s.data.row === 'object' && 'fullName' in s.data.row) {
                    name = s.data.row.fullName
                }
                const data = {
                    name: name,

                }
                const { type, position, problemInfo } = s;
                selections.push({ data: data, type: type, position: position, problemInfo: problemInfo as any });
            })
        }
        return selections;
    }

    async $gotoProblem(problem: baosky.ProblemLocation): Promise<void> {
        const { desc, uri, position } = problem;
        const key = await this.problemContribution.getRelatedRowKey(desc, uri, position);
        if (!key)
            return await this.problemContribution.scrollTo([uri]);
        return await this.problemContribution.scrollToTheRow(key);
    }

    $getProblems(resource: baosky.Uri): Promise<baosky.Diagnostic[]>;
    $getProblems(): Promise<[string, baosky.Diagnostic[]][]>;
    $getProblems(resource?: baosky.Uri): Promise<baosky.Diagnostic[] | [string, readonly baosky.Diagnostic[]][]> {
        if (resource) {
            const collection = this.problemManager.findMarkers({ uri: new URI(resource) });
            const diagnostics = Array.from(collection).map(marker => marker.data) as baosky.Diagnostic[]; // 取出 marker.data
            return Promise.resolve(diagnostics);
        }

        const entries = Array.from(this.problemManager.getMarkersByUri()).map(([uri, collection]) => {
            const diagnostics: any = [];
            for (const owner of collection.getOwners()) {
                for (const marker of collection.getMarkers(owner)) {
                    diagnostics.push(marker.data);
                }
            }
            return [uri.toString(), diagnostics] as [string, baosky.Diagnostic[]];
        });

        return Promise.resolve(entries);
    }


    protected getNodeStat(uri: URI) {
        const node = this.projectTreeModelManager.getNodeByPath(uri);
        const focusedNode = (node as ProjectTree.Node)?.stat;
        if (!node || !focusedNode || !focusedNode.path || !focusedNode.objectType) {
            const errorMsg = `[Plugin-Host] Could not find node or node stat for path: ${uri.path.toString()}`;
            this.logger.error(errorMsg);
        }
        return focusedNode;
    }

    $registerPreference<T extends baosky.BasePreferenceSchema>(schema: T) {
        if (!Array.isArray(schema.path)) {
            throw new Error('[PLUGIN-HOST] schema.path 必须为数组');
        }

        // 自动在 path 前面添加插件根节点
        const pluginRootElement = { key: "plugin", displayName: "插件" };

        // 如果 path 为空或第一个元素不是插件根节点，则自动添加
        if (schema.path.length === 0 ||
            schema.path[0].key !== 'plugin' ||
            schema.path[0].displayName !== '插件') {
            schema.path = [pluginRootElement, ...schema.path];
        }

        this.preferenceService.setBaoskySchema(schema);
    }

    async $getPreferenceValue(settingKey: string, contentKey?: string): Promise<JSON | undefined> {
        const value = this.preferenceService.getBaoskyPreferenceValue(settingKey);
        return value?.toString() as unknown as JSON;
    }
    async $getPreferenceChecked(settingKey: string): Promise<boolean | undefined> {
        const value = this.preferenceService.getBaoskyPreferenceChecked(settingKey);
        return value;
    }

    async $executeCrossReference(params: baosky.CrossReferenceParam): Promise<baosky.CrossRefTableDataType[] | baosky.CrossReferenceResponse> {
        //转换为语言服务需要的参数
        let newPara: CrossReferenceParam;

        if ('uri' in params) {
            newPara = Object.assign({}, params, {
                uri: new URI(params.uri.toString())
            });
        } else {
            newPara = params as CrossReferenceParam;
        }
        if (params.type == 'TASK')
            return await this.dataProvider.getCrossReferenceData(newPara as TaskCrossReferenceParam) as baosky.CrossRefTableDataType[];
        const result = await this.languageService.crossreference(newPara) as baosky.CrossReferenceResponse;
        return result;
    }
    async $decorateInteractiveTarget(target: baosky.InteractiveTarget): Promise<void> {
        return this.infoPanelTabBarDecorateService.decorateTabBar(InfoPanelTitleKind[target.id]);
    }
    async $gotoHelp(pluginId: string, route: string): Promise<void> {
        this.goToHelpService.goToHelpRelativePath(`${route}`, 'Plugins');
    }

    async $goto(gotoOptions: baosky.GotoOptions): Promise<void> {
        const path = URI.fromFilePath(gotoOptions.path.path);
        const gotoInfo = new GotoInfo({
            path,
            options: gotoOptions.options
        });
        await this.gototoService.goto(gotoInfo);
    }

    async $openDialog(dialogProps: baosky.DialogProps, callbackId: string[]): Promise<boolean> {
        switch (dialogProps.type) {
            case 'loadingDialog': {
                const dialog = this.commonLoadingPageDialogFactory(dialogProps.props);
                this.callbackMap.set(callbackId[0], (itemTitle: string) => dialog.acceptLoadedEvent(itemTitle));
                this.callbackMap.set(callbackId[1], (itemTitles: string[]) => dialog.acceptBriefLoadedEvent(itemTitles))
                this.callbackMap.set(callbackId[2], () => dialog.handleFinishLoading());
                this.callbackMap.set(callbackId[3], () => dialog.close());
                dialog.open();
                return true
            }
        }
    }

    public async $getProjectPath(): Promise<string> {
        const uri = this.navigateService.getProjectPath();
        return uri.path.fsPath();
    }

    public async $getProjectInfo(): Promise<baosky.ProjectObject> {
        return this.navigateService.getProjectInfo();
    }

    public async $getDeviceParamsByPath(uri: UriComponents): Promise<baosky.DeviceParams> {
        return this.navigateService.getDeviceParamsByPath(URI.fromComponents(uri));
    }

    public async $getDevicePathByName(name: string): Promise<string> {
        const uri = this.navigateService.getDevicePathByName(name);
        return uri.path.fsPath();
    }

    public async $getModelVersion(name: string): Promise<number> {
        return this.navigateService.getModelVersion(name);
    }

    public async $getAppVersion(): Promise<number> {
        return this.navigateService.getAppVersion();
    }

    public async $loadObject(deviceName: string, path: string | UriComponents, options?: baosky.LoadOptions, ctx?: baosky.DataContext): Promise<void> {
        return await this.rootContainerObjectLoadService.loadObject(deviceName, typeof(path) == 'string' ? path : URI.fromComponents(path), options as any, ctx);
    }

    public $unloadObject(deviceName: string, path: string | UriComponents): void {
        return this.rootContainerObjectLoadService.unloadObject(deviceName, typeof(path) == 'string' ? path : URI.fromComponents(path));
    }

    public async $reloadObject(deviceName: string, path: string | UriComponents, options?: baosky.LoadOptions, ctx?: baosky.DataContext): Promise<void> {
        return await this.rootContainerObjectLoadService.reloadObject(deviceName, typeof(path) == 'string' ? path : URI.fromComponents(path), options as any, ctx);
    }

    public async $reloadContainer(path: UriComponents, newPath?: UriComponents): Promise<void> {
        return await this.rootContainerObjectLoadService.reloadContainer(URI.fromComponents(path), newPath ? URI.fromComponents(newPath) : undefined);
    }

    public async $validateName(name: string, nameSourceType: string, options?: baosky.NameValidationOptions): Promise<baosky.ValidationResult[]> {
        return await this.nameService.validateName(name, nameSourceType, options);
    }

    public async $getNextName(location: UriComponents, options: baosky.NextNameOptions): Promise<string> {
        return await this.nameService.getNextName(URI.fromComponents(location), options)
    }

    public async $tryGetNextName(location: UriComponents, options: baosky.NextNameOptions, nameList?: string[]): Promise<string> {
        return await this.nameService.tryGetNextName(URI.fromComponents(location), options, nameList)
    }

    public async $releaseName(): Promise<void> {
        await this.nameService.releaseName()
    }

    public async $clearDirectiveStack(): Promise<void> {
        await this.directiveExecutorService.clear();
    }

    $triggerCallback(callbackId: string[], paras: string[] | string[][], multiTrigger: boolean[]): void {
        callbackId.forEach((item, index) => {
            const handler = this.callbackMap.get(item);
            if (!handler) return;
            if (paras && paras.length > 0) {

                if (Array.isArray(paras[0])) {
                    const para = (paras as string[][])[index];
                    handler(para);
                }
                else {
                    const para = (paras as string[])[index];
                    handler(para);
                }
            } else {
                handler();
            }
            if (!multiTrigger[index]) {
                this.callbackMap.delete(item);
            }
        });
    }

    /**
     * infoViewContribution 的 focusTab
     * @date 2025-12-09 , 1:35:54 pm
     * @author 南天远
     *
     * @public
     * @async
     * @param {string} type
     * @param {?boolean} [stopAutoScroll]
     * @returns {Promise<void>}
     */
    public async $focusInfoViewTab(type: string, stopAutoScroll?: boolean): Promise<void> {
        await this.infoViewContribution.focusTab(type, stopAutoScroll);
    }
}



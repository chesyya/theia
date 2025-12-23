import { interfaces } from "@theia/core/shared/inversify";
import { ProjectRegistryMain } from "../../../common";
import { TXWorkspaceService } from '@baosky/platform/lib/browser/framework/workspace/workspace-service'
import { NavigateService } from '@baosky/platform/lib/browser/service/common/navigate-service';
import * as baosky from '@baosky/plugin';
import { RefactorService } from '@baosky/plc-protocol/lib/browser/refactor/service/refactor-service'
import { RenameResult } from "@baosky/plc-protocol/lib/browser/refactor/view/refactor-dialog";
import { ProjectTreeModelManager } from '@baosky/project/lib/browser/project-tree-view/manager/project-tree-model-manager'
import { ILogger, URI } from "@theia/core";
import { bnls } from "@baosky/platform/lib/common/bnls";
import { ProjectTree } from "@baosky/project/lib/browser/project-tree-view/view/models/project-tree";
import { NameType } from "@baosky/plc-protocol/lib/browser/name-service";
import { NamespaceUtils } from '@baosky/platform/lib/common/utils/namespace-utils';
import { ProjectNodeUtils } from '@baosky/project/lib/browser/util/project-node-utils'
import { RefactorController } from "@baosky/plc-protocol/lib/browser/refactor/refactor-controller";
import { RenameNodeDirective } from '@baosky/plc-protocol/lib/browser/refactor/directive/node-rename-directive'
import { Directive, DirectiveExecutorService } from "@baosky/platform/lib/browser/directive";
import { StackType } from "@baosky/platform/lib/browser/directive/stack-type";
import _ from "lodash";
import { RefactorOption } from "@baosky/plc-protocol/lib/browser/refactor/refactoring";
import { WidgetManager } from "@theia/core/lib/browser";
import { ProjectOperationService, ProjectTreeService } from "@baosky/platform/lib/browser/project";
import { GVSEditorProvider } from "@baosky/gvs/lib/browser/gvs/gvs-model/gvs-model-provider";
import { PuSuffix } from '@baosky/plc-protocol/lib/browser/software/program-unit/pu-model';
import { DataBase } from '@baosky/platform/lib/browser/database/database'
import { Plugin_Maps } from "../../../common/key-mappings";
import { PLC_SYMBOL } from "@baosky/plc-protocol/lib/browser/plc/plc-object";
import { ProjectTreeInnerOperationRuleProvider } from '@baosky/project/lib/browser/project-tree-view/manager/project-tree-inner-operation-rule-provider';

interface RefactorOptions<T extends Directive> {
    name: string;
    action: RefactorOption[];
    directive: T
}

export class ProjectRegistryMainImpl implements ProjectRegistryMain {
    protected readonly tXWorkspaceService: TXWorkspaceService;
    protected readonly navigateService: NavigateService;
    protected readonly refactorService: RefactorService;
    protected readonly projectTreeModelManager: ProjectTreeModelManager;
    protected readonly refactorController: RefactorController;
    protected readonly directiveExecutorService: DirectiveExecutorService;
    protected readonly widgetManager: WidgetManager;
    protected readonly projectTreeService: ProjectTreeService;
    protected readonly gvsEditorProvider: GVSEditorProvider;
    protected readonly projectOperationService: ProjectOperationService;
    protected readonly dataBase: DataBase;
    protected readonly logger: ILogger;
    protected readonly projectTreeInnerOperationRuleProvider: ProjectTreeInnerOperationRuleProvider;

    constructor(container: interfaces.Container) {
        this.tXWorkspaceService = container.get(TXWorkspaceService);
        this.navigateService = container.get(NavigateService);
        this.refactorService = container.get(RefactorService);
        this.projectTreeModelManager = container.get(ProjectTreeModelManager);
        this.refactorController = container.get(RefactorController);
        this.directiveExecutorService = container.get(DirectiveExecutorService);
        this.widgetManager = container.get(WidgetManager);
        this.projectTreeService = container.get(ProjectTreeService);
        this.gvsEditorProvider = container.get(GVSEditorProvider);
        this.projectOperationService = container.get(ProjectOperationService);
        this.dataBase = container.get(DataBase);
        this.logger = container.get<ILogger>(ILogger).child(ProjectRegistryMainImpl.name);
        this.projectTreeInnerOperationRuleProvider = container.get(ProjectTreeInnerOperationRuleProvider);
    }

    $saveProject(): void {
        try {
            this.projectOperationService.saveProject();
            this.logger.info('[Plugin-Host] Project saved successfully.');
        } catch (error) {
            this.logger.error('[Plugin-Host] Error saving project:', error);
        }
    }

    async $countNode(queryOptions: baosky.projects.NodeObjectType[]): Promise<baosky.projects.ProjectNodeCount[]> {
        const count: baosky.projects.ProjectNodeCount[] = [];
        try {
            const map = Plugin_Maps.SYMBOL_TO_STRING_MAP;
            // const ParentMeta = {identifiers: [PLC_SYMBOL]}
            const plcMeta = this.dataBase.findALL((obj) => {
                if (!obj.identifiers || !obj.identifiers[0] || typeof obj.identifiers[0] !== 'symbol')
                    return false
                return obj.identifiers[0] === PLC_SYMBOL ? true : false;
            });
            if (plcMeta.length === 0) {
                this.logger.warn(`[Plugin-Host] ${bnls.localizeByDefault('未找到PLC.')}`);
            }

            plcMeta.forEach((plc, index) => {
                if (!count[index]) {
                    count[index] = { plcName: '' } as baosky.projects.ProjectNodeCount;
                }
                count[index].plcName = plc.name ?? 'PLC';
                queryOptions.forEach((query) => {
                    count[index][query] = this.dataBase.count((obj) => {
                        if (!obj.identifiers || !obj.identifiers[0] || typeof obj.identifiers[0] !== 'symbol')
                            return false
                        const regex = new RegExp(`\\/bsprojects\\/[^/]+\\/${plc.name}\\/`);
                        return obj.src?.path.toString().match(regex) && map.get(obj.identifiers[0]) === query ? true : false;
                    }, { includeAll: true })
                })
            });
            this.logger.info(`[Plugin-Host] Node count finished. Result:${count}`, count);
            return count;
        } catch (error) {
            this.logger.error('[Plugin-Host] Error counting nodes:', error);
            return count;
        }
    }

    async $getCurrentProject(): Promise<baosky.projects.Project | undefined> {
        try {
            const path = this.navigateService.getProjectPath().path.fsPath();
            const projectInfo = await this.tXWorkspaceService.getProject(path);
            const result = {
                name: projectInfo?.name || '',
                author: projectInfo?.author || '',
                uri: path,
                type: projectInfo?.type || ''
            };
            this.logger.info('[Plugin-Host] Current project info:', result);
            return result;
        } catch (error) {
            this.logger.error('[Plugin-Host] Error getting current project:', error);
            return undefined;
        }
    }

    async $focusNode(path: string): Promise<void> {
        try {
            await this.projectTreeService.focusToNode(URI.fromFilePath(path));
            this.logger.info('[Plugin-Host] Node focused successfully.');
        } catch (error) {
            this.logger.error('[Plugin-Host] Error focusing node:', error);
        }
    }

    async $doRefactor(refactorOptions: baosky.projects.RefactorOptions): Promise<void> {
        try {
            let options: RefactorOptions<RenameNodeDirective> | undefined;
            if (refactorOptions.target) {
                options = await this.getVarRefactorOptions(refactorOptions);
            }
            else {
                options = await this.getFileRefactorOptions(refactorOptions);
            }
            if (!options) {
                return;
            }
            await this.refactorController.openRefactorPreview(options.name, options.action, options.directive);
            this.logger.info('[Plugin-Host] Refactor preview opened successfully.');
        } catch (error) {
            this.logger.error('[Plugin-Host] Error during refactor:', error);
        }
    }

    protected async getFileRefactorOptions(refactorOptions: baosky.projects.RefactorOptions): Promise<RefactorOptions<RenameNodeDirective> | undefined> {
        const targetUri = URI.fromFilePath(refactorOptions.targetPath);
        const result: RenameResult = {
            name: refactorOptions.name,
            refactor: true,
            namespace: refactorOptions.namespace
        };
        const focusedNode = this.getNodeStat(refactorOptions, targetUri);
        const nameType = this.projectTreeInnerOperationRuleProvider.getNodeNameType(focusedNode);
        const newName = [NameType.SOFTWARE, NameType.GVS, NameType.NGVS, NameType.AXIS].includes(nameType) ? `${result.namespace}.${result.name}` : refactorOptions.name;
        const nodeName = ProjectNodeUtils.toFilterNameSuffix(NamespaceUtils.toFilterNamespace(focusedNode.name));
        const { options, refactor } = await this.refactorService.getFileRefactorOptions(result, nameType, focusedNode, newName, targetUri, nodeName);
        if (!focusedNode.path || !focusedNode.objectType) {
            this.logger.error(`[Plugin-Host] Focused node for path ${refactorOptions.targetPath} is missing path or objectType.`);
            return undefined
        }
        const newUri = focusedNode.path?.parent.resolve(`${newName}${focusedNode.path.path.ext}`);
        const directive = this.getRefactorDirective(nodeName, newName, focusedNode.path, focusedNode.objectType, newUri, result, options);
        const refactorResult = {
            name: nodeName,
            action: options,
            directive: directive
        };
        this.logger.info('[Plugin-Host] Generated file refactor options:', refactorResult);
        return refactorResult;
    }

    protected getNodeStat(refactorOptions: baosky.projects.RefactorOptions, targetUri: URI) {
        const node = this.projectTreeModelManager.getNode(refactorOptions.targetPath) || this.projectTreeModelManager.getNodeByPath(targetUri);
        const focusedNode = (node as ProjectTree.Node)?.stat;
        if (!node || !focusedNode || !focusedNode.path || !focusedNode.objectType) {
            const errorMsg = `[Plugin-Host] Could not find node or node stat for path: ${refactorOptions.targetPath}`;
            this.logger.error(errorMsg);
            throw new Error(bnls.localizeByDefault('{0} is not defined', refactorOptions.targetPath));
        }
        return focusedNode;
    }

    protected async getVarRefactorOptions(
        refactorOptions: baosky.projects.RefactorOptions
    ): Promise<RefactorOptions<RenameNodeDirective> | undefined> {
        let targetUri = URI.fromFilePath(refactorOptions.targetPath);
        if (refactorOptions.name === "" || refactorOptions.target === "" || refactorOptions.target === undefined) {
            return undefined;
        }
        let editor: any;
        try {
            const editorUri = PuSuffix.PU_BODY_FILE.includes(targetUri.path.ext)
                ? URI.fromFilePath(refactorOptions.targetPath.replace(/\.[^.]*$/, '.itf'))
                : targetUri;
            editor = await this.gvsEditorProvider.getEditor(editorUri);
        } catch (error) {
            this.logger.error(`[Plugin-Host] Failed to get editor for path {0}: {1}`, refactorOptions.targetPath, error);
            return undefined;
        }
        const focusedNode = this.getNodeStat(refactorOptions, targetUri);
        const referenceName = `${editor.getComponents().operator?.viewModel.scopeName}.${refactorOptions.target}`;
        if (refactorOptions.name.toUpperCase() === refactorOptions.target!.toUpperCase()) {
            return undefined;
        }
        // const isVariableReference = await this.refactorService.isVariableReference(
        //     referenceName,
        //     editor.uri
        // );
        // if (!isVariableReference) {
        //     return undefined;
        // }
        const result: RenameResult = {
            name: refactorOptions.name,
            refactor: true,
            namespace: refactorOptions.namespace
        };
        if (!focusedNode.path || !focusedNode.objectType) {
            return undefined
        }

        let refactorActions: RefactorOption[] | undefined = undefined;
        const actions = await this.refactorService.getReferenceActions({
            uri: editor.uri,
            paramActions: [
                {
                    type: "variable",
                    source: referenceName,
                    target: `${editor.getComponents().operator?.viewModel.scopeName}.${refactorOptions.name}`
                },
            ],
        });
        if (!actions) {
            return undefined;
        }
        refactorActions = actions;
        const directive = this.getRefactorDirective(refactorOptions.target, refactorOptions.name, targetUri, focusedNode.objectType,
            targetUri, result, refactorActions)
        const refactorResult = {
            name: referenceName,
            action: refactorActions,
            directive: directive
        };
        return refactorResult;
    }

    private getRefactorDirective(nodeName: string, newName: string, path: URI, type: symbol, newUri: URI, result: RenameResult, options: RefactorOption[]): RenameNodeDirective {
        return new RenameNodeDirective(
            this.directiveExecutorService.nextId(),
            bnls.localizeByDefault('插件重命名 {0} 为 {1} ', nodeName, newName),
            path.path.fsPath(),
            'plugin_directive',
            type,
            path,
            newUri,
            result.refactor,
            options,
            _.sumBy(options, arr => arr.fileActions.filter(obj => obj.type !== "file").length),
            result.refactor ? (from: StackType, to: StackType): void => this.refactorController.actionSuccessCallback(from, to) : undefined,
            result.refactor ? (from: StackType): Promise<boolean> => this.refactorController.openDoRefactorDialog(from) : undefined
        );
    }
}

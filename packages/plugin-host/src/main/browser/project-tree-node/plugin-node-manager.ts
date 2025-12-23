import { inject, injectable } from "@theia/core/shared/inversify";
import { BaoskyFileService } from '@baosky/platform/lib/browser/filesystem/file-service/baosky-file-service'
import { ILogger, URI } from "@theia/core";
import { bnls } from "@baosky/platform/lib/common/bnls";
import { DataBase } from '@baosky/platform/lib/browser/database/database'
import { ProjectFileService } from "@baosky/platform/lib/browser/project/service/project-file-service";
import { ModelViewDataContribution, RootContainer } from "@baosky/platform/lib/browser/project";
import { Emitter } from "@theia/core/shared/vscode-languageserver-protocol";
import * as baosky from '@baosky/plugin';
import { SvgIconManager } from "./icon-manager";
import { PLUGIN_FOLDER_NODE_SYMBOL, PluginFolderNodeObject, PluginFolderNodeObjectFactory } from "./folder-node/plugin-folder-node-object";
import { PLUGIN_FILE_NODE_SYMBOL, PluginFileNodeObject, PluginFileNodeObjectFactory } from "./file-node/plugin-file-node-object";
import { DataPair } from "@baosky/platform/lib/browser/database/data-provider-contribution";
import { ObjectSymbols } from "@baosky/platform/lib/common/const";
import { IndexMeta } from "@baosky/platform/lib/common/index-meta";

const PLUGIN_PREFIX = 'plugin';

export interface PluginTreeNodeManager {
    createPluginNode(nodeData: baosky.projects.TreeNodeData): Promise<boolean>;
    removeNode(path: string): Promise<boolean>;
    updateNode(path: string, nodeData: baosky.projects.TreeNodeData): Promise<boolean>;
    validatePath(uri: URI): boolean;
}

interface NodeInfo {
    iconClass: string;
    menuPath: string;
    order?: number;
    commands?: string[];
}

type PluginNodeObject = PluginFileNodeObject | PluginFolderNodeObject;
type PluginNodeFactory = PluginFileNodeObjectFactory | PluginFolderNodeObjectFactory;

@injectable()
export class PluginTreeNodeManagerImpl implements PluginTreeNodeManager {
    @inject(ModelViewDataContribution)
    protected readonly modelViewDataContribution: ModelViewDataContribution;
    @inject(BaoskyFileService)
    private readonly projectFileService: BaoskyFileService;
    @inject(ProjectFileService)
    private readonly projectFolderService: ProjectFileService;
    @inject(DataBase)
    private readonly dataBase: DataBase;
    @inject(PluginFileNodeObjectFactory)
    protected readonly pluginFileNodeObjectFactory: PluginFileNodeObjectFactory;
    @inject(PluginFolderNodeObjectFactory)
    protected readonly pluginFolderNodeObjectFactory: PluginFolderNodeObjectFactory;
    @inject(RootContainer)
    protected readonly rootContainer: RootContainer;

    private readonly dbClickEventEmitter = new Emitter<URI>();
    public readonly dbClickEvent = this.dbClickEventEmitter.event;
    private readonly removeNodeEventEmitter = new Emitter<URI>();
    public readonly removeNodeEvent = this.removeNodeEventEmitter.event;
    public readonly nodesData = new Map<URI, NodeInfo>();
    protected classNum = 0;

    constructor(@inject(ILogger) private readonly logger: ILogger) {
        this.logger = this.logger.child(PluginTreeNodeManagerImpl.name);
    }

    validatePath(uri: URI): boolean {
        const parentPath = uri.parent.path.toString();
        const currentPath = uri.path.toString();

        // 检查节点是否已存在
        const nodeExists = this.dataBase.has(meta =>
            meta.src?.path?.toString().toLowerCase() === currentPath.toLowerCase(),
            { includeAll: true }
        );
        if (nodeExists) {
            return false;
        }

        // 检查父节点是否存在且为目录
        const parentValid = this.dataBase.has(meta =>
            meta.src?.path?.toString() === parentPath &&
            (!meta.src?.path.ext || meta.src?.path.ext === ''),
            { includeAll: true }
        );
        return parentValid;
    }

    async createPluginNode(nodeData: baosky.projects.TreeNodeData): Promise<boolean> {
        const fileURI = URI.fromFilePath(nodeData.uri.path);

        if (!this.validatePath(fileURI)) {
            this.logger.warn(bnls.localizeByDefault(
                "添加节点失败，节点{0}已存在或父节点非目录节点。",
                fileURI.path.toString()
            ));
            return false;
        }

        try {
            const nodeObject = this.createNodeObject(nodeData, fileURI);
            const success = this.persistNodeObject(nodeObject, fileURI);

            if (success) {
                this.registerNodeInfo(nodeData, fileURI);
            }

            return success;
        } catch (error) {
            await this.removeNode(nodeData.uri.path.toString());
            this.logger.error(error);
            return false;
        }
    }

    private createNodeObject(nodeData: baosky.projects.TreeNodeData, fileURI: URI): PluginNodeObject {
        const factory = this.getNodeFactory(nodeData.type);
        const nodeObject = factory({
            id: fileURI.toString(),
            parentId: fileURI.parent.toString()
        });

        nodeObject.name = fileURI.path.name;
        nodeObject.path = fileURI;
        return nodeObject;
    }

    private getNodeFactory(type: string): PluginNodeFactory {
        return type === 'FILE'
            ? this.pluginFileNodeObjectFactory
            : this.pluginFolderNodeObjectFactory;
    }

    private persistNodeObject(nodeObject: PluginNodeObject, fileURI: URI): boolean {
        const dataPair = this.getDataPair(nodeObject);
        const plcContainer = this.rootContainer.getContainerByPath(fileURI.parent)
        if (plcContainer) {
            plcContainer.set(dataPair.key, nodeObject);
        } else {
            this.dataBase.set(dataPair.key, dataPair.value);
        }

        return true;
    }

    private registerNodeInfo(nodeData: baosky.projects.TreeNodeData, fileURI: URI): void {
        const className = `${PLUGIN_PREFIX}_${nodeData.name}_${this.classNum++}`;
        const menuPath = `${PLUGIN_PREFIX}_${nodeData.name}_${this.classNum++}`;

        SvgIconManager.addIcon(className, nodeData.icon ?? '');
        this.nodesData.set(fileURI, { iconClass: className, menuPath, commands: nodeData.commands, order: nodeData.order });
    }

    private getDataPair(object: PluginNodeObject): DataPair {
        const isFileNode = object instanceof PluginFileNodeObject;
        const identifiers = isFileNode
            ? [PLUGIN_FILE_NODE_SYMBOL, ObjectSymbols.OBJECT_CONTAINER]
            : [PLUGIN_FOLDER_NODE_SYMBOL, ObjectSymbols.OBJECT_CONTAINER];

        return {
            key: {
                identifiers,
                name: object.name,
                src: object.path,
                predicate: (item) => item.src
                    && item.src.isEqual(object!.path)
                    && IndexMeta.contains(ObjectSymbols.OBJECT_CONTAINER, item.identifiers) ? true : false
            },
            value: object
        };
    }

    async removeNode(path: string): Promise<boolean> {
        const fileURI = URI.fromFilePath(path);

        try {
            const container = this.rootContainer.getContainerByPath(fileURI.parent);
            return container
                ? this.removeFromContainer(container, path)
                : this.removeFromDatabase(path);
        } catch (error) {
            this.logger.error(error);
            return false;
        }
    }

    private removeFromContainer(container: any, path: string): boolean {
        if (!container.has(item => item.src?.path.toString() === path)) {
            this.logger.warn(bnls.localizeByDefault("删除节点失败，节点{0}不存在。", path));
            return false;
        }

        container.remove(item => {
            const itemPath: string = item.src?.path.toString()
            if ('identifiers' in item && (item.identifiers.includes(PLUGIN_FOLDER_NODE_SYMBOL) | item.identifiers.includes(PLUGIN_FILE_NODE_SYMBOL)) && itemPath.startsWith(path))
                return true;
        }, { includeAll: true });
        return true;
    }

    private removeFromDatabase(path: string): boolean {
        if (!this.dataBase.has(item => item.src?.path.toString() === path)) {
            this.logger.warn(bnls.localizeByDefault("删除节点失败，节点{0}不存在。", path));
            return false;
        }

        this.dataBase.remove(item => item.src?.path.toString() === path, { includeAll: true });
        return true;
    }

    async updateNode(path: string, nodeData: baosky.projects.TreeNodeData): Promise<boolean> {
        const removeSuccess = await this.removeNode(path);
        if (!removeSuccess) {
            return false;
        }

        return await this.createPluginNode(nodeData);
    }

    firedbEvent(uri: URI): void {
        this.dbClickEventEmitter.fire(uri);
    }

    // 兼容旧接口
    async createPluginFileNode(nodeData: baosky.projects.TreeNodeData): Promise<boolean> {
        return this.createPluginNode({ ...nodeData, type: 'FILE' });
    }

    async createPluginFolderNode(nodeData: baosky.projects.TreeNodeData): Promise<boolean> {
        return this.createPluginNode({ ...nodeData, type: 'DIRECTORY' });
    }
}

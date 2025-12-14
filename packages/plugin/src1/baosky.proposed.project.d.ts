export module "@baosky/plugin" {
    export namespace projects {

        /**
         * Description placeholder
         */
        export interface DeviceObjectInterface extends CoreObjectInterface {
            name: string;
            path: URI;

            /**
             * Id
             */
            get id(): string;
            /**
             * 父Id
             */
            get parentId(): string;
        }


        /**
         * Description placeholder
         */
        export abstract class BaseDeviceObject extends CoreObject implements DeviceObjectInterface, IContainer, IQueryIndexMeta, DataLoader {
            private readonly container: BaseContainer;

            private readonly loader: DataLoader;
            public name: string;
            public path: URI;

            /**
             * Creates an instance of PLCObject.
             * @date 8/29/2023 - 3:59:26 AM
             * @author 沈杰
             *
             * @constructor
             * @param {ObjectProps} props
             */
            constructor(
                props: ObjectProps,
                loaderFactory: DataLoaderFactory
            ) {
                super();
                this.setProp("id", props.id);
                this.setProp("parentId", props.parentId);
                this.loader = loaderFactory(this);
            }

            protected init(): void {
                this.container.initMemoryDB();
            }

            /**
             * id
             */
            public get id(): string {
                const id = this.getProp<string>("id");
                if (!id) {
                    throw new Error();
                }
                return id;
            }

            /**
             * 获取父Id
             */
            public get parentId(): string {
                const parentId = this.getProp<string>("parentId");
                if (!parentId) {
                    throw new Error();
                }
                return parentId;
            }

            /**
             * Description placeholder
             */
            public chain(): DataSet {
                return this.container.chain();
            }

            /**
             * 使用该接口将会在执行完成之后，释放掉dataset对象。
             */
            public doChain<T>(cb: (dataset: DataSet) => T): T {
                return this.container.doChain(cb);
            }

            /**
             * Description placeholder
             */
            public get onCreateObject(): Event<any> {
                return this.container.onCreateObject;
            }

            /**
             * Description placeholder
             */
            public get onDeleteObject(): Event<any> {
                return this.container.onDeleteObject;
            }
            /**
             * Description placeholder
             */
            public get onUpdateObject(): Event<any> {
                return this.container.onUpdateObject;
            }
            /**
             * Description placeholder
             */
            public get onFinishLoadObject(): Event<any> {
                return this.container.onFinishLoadObject;
            }
            /**
             * Description placeholder
             */
            public dispose(): void {
                this.container.dispose();
            }
            /**
             * 替换。
             */
            public replace(predicate: (meta: IndexMeta) => boolean, obj: any, options?: QueryOptions | undefined): boolean {
                return this.container.replace(predicate, obj, options);
            }

            /**
             * Description placeholder
             */
            public async load(path: string | URI, options?: LoadOptions, ctx?: DataContext): Promise<IndexMeta[]> {
                return this.loader.load(path, options, ctx);
            }

            /**
             * 重载对象
             */
            public async reload(path: string | URI, options?: LoadOptions | undefined, ctx?: DataContext): Promise<IndexMeta[]> {
                return this.loader.reload(path, options, ctx);
            }

            /**
             * Description placeholder
             */
            public removeAll(): void {
                this.container.removeAll();
            }
            /**
             * Description placeholder
             */
            public countByIdentifier(identifier: Identifier<any>, options?: QueryOptions): number {
                return this.container.countByIdentifier(identifier, options);
            }

            /**
             * Description placeholder
             */
            public getIndex(obj: any, options?: QueryOptions): IndexMeta | undefined {
                return this.container.getIndex(obj, options);
            }

            /**
             * Description placeholder
             */
            public findBySrc<T extends IndexMeta>(src: URI, options?: QueryOptions): T[] {
                return this.container.findBySrc<T>(src, options);
            }

            /**
             * Description placeholder
             */
            public findByIdentifier<T extends IndexMeta>(identifier: Identifier<T>, options?: QueryOptions): T[] {
                return this.container.findByIdentifier<T>(identifier, options);
            }

            /**
             * Description placeholder
             */
            public singleByIdentifier<T extends IndexMeta>(identifier: Identifier<T>, options?: QueryOptions): T | undefined {
                return this.container.singleByIdentifier<T>(identifier, options);
            }

            /**
             * Description placeholder
             */
            public set<T extends IndexMeta>(index: IndexMeta, obj: T): void {
                return this.container.set<T>(index, obj);
            }

            /**
              * 添加一个对象到容器。
              */
            public add<T extends IndexMeta>(obj: T): void {
                this.container.add(obj);
            }

            /**
             * Description placeholder
             */
            public find<T extends IndexMeta>(predicate: (obj: IndexMeta) => boolean, options?: QueryOptions): T | undefined {
                return this.container.find<T>(predicate, options);
            }

            /**
             * Description placeholder
             */
            public findALL<T extends IndexMeta>(predicate: (obj: IndexMeta) => boolean, options?: QueryOptions): T[] {
                return this.container.findALL<T>(predicate, options);
            }

            /**
             * 找到全部符合条件的对象元数据。
             */
            public findAllIndexMeta(predicate: (obj: IndexMeta) => boolean, options?: QueryOptions | undefined): IndexMeta[] {
                return this.container.findAllIndexMeta(predicate, options);
            }

            /**
             * Description placeholder
             */
            public count(predicate: (obj: IndexMeta) => boolean, options?: QueryOptions): number {
                return this.container.count(predicate, options);
            }

            /**
             * Description placeholder
             */
            public remove(predicate: (meta: IndexMeta) => boolean, options?: QueryOptions): void {
                return this.container.remove(predicate, options);
            }

            /**
             * Description placeholder
             */
            public has(predicate: (meta: IndexMeta) => boolean, options?: QueryOptions): boolean {
                return this.container.has(predicate, options);
            }

            /**
             * 懒加载
             */
            public lazyLoading(predicate: (meta: IndexMeta) => boolean, obj: any, options?: QueryOptions | undefined): boolean {
                return this.container.lazyLoading(predicate, obj, options);
            }

            /**
             * 链式查询
             * 仅支持查询字段：id, name, src, identifiers
             */
            public chainByIndexMeta(cb: (chain: Resultset<IndexMeta & LokiObj>) => IndexMeta[]): IndexMeta[] {
                return this.container.chainByIndexMeta(cb);
            }

            /**
             * 依据条件查询
             * 仅支持查询字段：id, name
             */
            public findByIndexMeta(condition: QueryCondition<IndexMeta>): IndexMeta[] {
                return this.container.findByIndexMeta(condition);
            }

            /**
             * 条件查询
             * 仅支持查询字段：id, name, src, identifiers
             */
            public whereByIndexMeta(fun: (data: IndexMeta) => boolean): IndexMeta[] {
                return this.container.whereByIndexMeta(fun);
            }

            /**
             * 依据条件查询,返回第一条数据
             * 仅支持查询字段：id, name
             */
            public findOneByIndexMeta(condition: QueryCondition<IndexMeta>): IndexMeta | null {
                return this.container.findOneByIndexMeta(condition);
            }
        }

        /**
         * 项目对象。
         */
        export class ProjectObject extends ESObject {
            /**
             * 项目名称。
             */
            name: string;
            /**
             * 项目路径。
             */
            path: string;
            /**
             * 项目作者。
             */
            author: string;
            /**
             * 项目描述信息。
             */
            description: string;
            /**
             * 项目版本号。
             */
            version: number;
            /**
             * 项目打开者。
             */
            opener?: string;
            /**
             * 工作区路径。
             */
            workspacePath?: string;
            /**
             * 项目创建时间。
             */
            createTime: Date;
            /**
             * 项目最后打开时间。
             */
            lastOpenTime: Date;
            /**
             * 项目修改时间。
             */
            lastModifyTime: Date;
            /**
             * 项目大小
             */
            size?: number;
            /**
             * 项目类型 v1.10
             */
            type?: ProjectType;
            /**
             * 项目id v1.10
             */
            id?: number;
            /**
             * 项目初建版本 v1.10
             */
            createVersion?: number;
        }

        //项目节点
        export type ProjectNodeCount = {
            //所属PLC名字
            plcName: string;

            //program-unit数量
            pu: number;

            //task数量
            task: number;

            //iomapping数量
            iomapping: number;

            //global variable set数量,包括ngvs
            gvs: number;

            //user-defined data type数量
            udt: number;
        }

        //节点类型
        export type NodeObjectType = 'gvs' | 'udt' | 'iomapping' | 'program-unit' | 'task'

        //统计项目节点数量
        export function countNode(queryOptions: NodeObjectType[]): Promis<ProjectNodeCount[]>

        export interface Project {
            name: string;
            author: string;
            uri: string;
            type: string;
        }
        /**
         * get current open project
         * */
        export function getCurrent(): Promise<Project | undefined>;

        // 树节点类型
        type TreeNodeType = 'DIRECTORY' | 'FILE';

        interface NodeData {
            // 节点icon图标，相对于package.json的地址或者svg代码
            icon?: string;
            // 节点名字
            name: string;
            // 节点id
            readonly id: string;
        }

        // 树节点数据
        export interface TreeNodeData extends NodeData {
            // 节点uri
            uri: Uri;
            // 节点类型，dir or file
            readonly type: TreeNodeType;
            // 节点排序
            readonly order?: number;
            // 节点右键菜单命令集,要先在package.json中定义
            readonly commands?: string[];
            // readonly children?: TreeNodeDataProvider[];
        }

        // 节点提供者
        interface NodeProvider<T, U> {
            // 获取节点数据
            getNodeData(): T;
            //节点自定义操作
            actions?: U;
        }

        // 节点操作
        export interface NodeActions<T = undefined> {
            // 自定义删除节点逻辑
            onRemove?: () => boolean | Promise<boolean>;
            // 自定义更新节点逻辑
            // onUpdate?: () => boolean | Promise<boolean>;
            // 自定义双击节点逻辑
            onDoubleClick?: () => boolean | Promise<boolean>;
            //自定义单击节点逻辑
            // onClick?: () => boolean | Promise<boolean>;
            //TODO 右键菜单
        }

        // 节点控制器
        interface NodeController<T> {
            // 删除节点
            remove(): Promise<void>;
            // 更新节点
            // update(provider: T): Promise<void>;
        }

        export interface TreeNodeProvider extends NodeProvider<TreeNodeData, TreeNodeActions> { };

        export interface TreeNodeController extends NodeController<TreeNodeProvider> { };

        export interface TreeNodeActions extends NodeActions { };

        // 注册树节点提供者
        export function registerTreeNodeProvider(provider: TreeNodeProvider): TreeNodeController;

        /**
         * open view according to widgetId
         */
        // export function openView(id: string): Promise<void>;

        export function focusNode(path: string): Promise<void>;

        export type RefactorOptions = {
            /**
             * newName
             */
            name: string,
            /**
             * 对象地址
             */
            targetPath: string,
            /**
             * 目标对象，重构单变量时需要
             */
            target?: string,
            /**
             * 命名空间
             */
            namespace?: string
        }
        /**
         * code refactor
         * @param refactorOptions
         */
        export function doRefactor(refactorOptions: RefactorOptions): void;

        /**
         * save project
        */
        export function saveProject(): void;
    }
}

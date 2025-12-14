export module "@baosky/plugin" {
    export namespace platform {

        /**
         * 根据问题位置描述跳转问题面板对应条目
         * @param {ProblemLocation} problem 问题位置描述，从
         * @security 1
         * @returns {Promise<AuthenticationSessionAccountInformation>}
         * @example
         * const problems: baosky.Diagnostic[] = await baosky.platform.getProblems(baosky.Uri.parse(uri));
			//获取所有错误
			if(Array.isArray(problems) && problems.length > 0)
			location = {
				uri: uri,
				position: problems[0].range,
				desc: problems[0].message
			}
            }),
            //跳转到对应错误位置
            baosky.platform.gotoProblem(location);
         */
        export function gotoProblem(problem: ProblemLocation): Promise<void>;

        export function getProblems(): Promise<[string, Diagnostic[]][]>;

        export function getProblems(resource: Uri): Promise<Diagnostic[]>;

        /**
         * 获取当前项目或者指定资源对象的问题
         * @param {?Uri} [resource]
         * @returns {Promise<Diagnostic[] | [string, Diagnostic[]][]>}
         * @security 1
         * @example
         * const problems: baosky.Diagnostic[] = await baosky.platform.getProblems(baosky.Uri.parse(uri));
			//获取所有错误
			if(Array.isArray(problems) && problems.length > 0)
			location = {
				uri: uri,
				position: problems[0].range,
				desc: problems[0].message
			}
            }),
            //跳转到对应错误位置
            baosky.platform.gotoProblem(location);

         * const uri = 'file:///root/Workspaces/bsprojects/abc/PLC_1/SOFTWARE/PROGRAMUNIT/STD.PU_1.itf';
         * await baosky.platform.getProblems(baosky.Uri.parse(uri));
         */
        export function getProblems(resource?: Uri): Promise<Diagnostic[] | [string, Diagnostic[]][]>;



        /**
         * 注册插件设置设置项
         * 	/* 	插件path的第一个元素必须{key: "plugin", displayName: "插件"}，否则会注册失败
            如：path: [
            { key: "plugin", displayName: "插件" },
            {key: "preference_plugin", displayName: '个性化插件'}
            ],
         * @param {(SelectPreferenceSchema | NumberInputPreferenceSchema)} schema
         * @returns {Promise<void>}
         * @security 1
         */
        export function registerPreferenceSettings(schema: SelectPreferenceSchema | NumberInputPreferenceSchema): Promise<void>;

        export function getPreferenceValue(settingKey: string, contentKey?: string): Promise<JSON | undefined>;

        export function getPreferenceChecked(settingKey: string): Promise<boolean | undefined>;

        /**
         * @description 获取项目路径
         */
        export function getProjectPath(): Promise<Uri>
        /**
         * @description 获取项目信息
         */
        export function getProjectInfo(): Promise<ProjectObject>;
        /**
         * @description 通过子节点路径获取设备参数
         */
        export function getDeviceParamsByPath(uri: Uri): Promise<DeviceParams>;
        /**
         * @description 通过plc名字获取设备路径
         */
        export function getDevicePathByName(name: string): Promise<Uri>;
        /**
         * @description 通过设备路径获取某个指定类型的object的路径
         */
        export function getChildPathByDevice(uri: Uri, objectType: CoreObject): Promise<Uri | undefined>;
        /**
         * @description 获取当前plc的数据模型版本
         */
        export function getModelVersion(name: string): Promise<number>;
        /**
         * @description 获取当前打开项目的应用版本
         */
        export function getAppVersion(): Promise<number>;
        /**
         * @description 往device Container里面加载对象
         */
        export function loadObject(deviceName: string, path: string | URI, options?: LoadOptions, ctx?: DataContext): Promise<void>;
        /**
         * @description 卸载device Container里面的path相关所有对象
         */
        export function unloadObject(deviceName: string, path: string | URI): void;
        /**
         * @description 往device Container里面重载对象
         */
        export function reloadObject(deviceName: string, path: string | URI, options?: LoadOptions, ctx?: DataContext): Promise<void>;
        /**
         *@description  重载container
         */
        export function reloadContainer(path: Uri, newPath?: Uri): Promise<void>;
        /**
         * @description 验证名称的合法性
         */
        export function validateName(name: string, nameSourceType: string, options?: NameValidationOptions): Promise<ValidationResult[]>;
        /**
         * @description 获取下一个新名字
         */
        export function getNextName(location: URI, options: NextNameOptions): Promise<string>;
        /**
         * @Description //获取下一个可用名称，并缓存
         **/
        export function tryGetNextName(location: URI, options: NextNameOptions, nameList?: string[]): Promise<string>;
        /**
         * @Description //释放缓存的名称
         **/
        export function releaseName(): Promise<void>;
        /**
         * @description 清空指令堆栈
         */
        export function clearDirectiveStack(): Promise<void>;
        /**
         * 根据资源ID获取资源属性
         * @date 2025-11-28 , 9:42:00 am
         * @author 南天远
         *
         * @export
         * @param {string[]} resourceIds
         * @returns {Promise<LicenseableResource[]>}
         */
        export function getAttributesByIDEResource(
            resourceIds: string[]
        ): Promise<LicenseableResource[]>;

        /**
         * 获取当前应用版本号(.txproj)
         * @param projectPath
         */
        export function getAppVersionByFile(projectPath: baosky.Uri): Promise<{ appMajorVersion: number; appMinorVersion: number; }>;

        /**
         * 获取当前应用版本号(.txproj): major_version*10000 + minor_version
         * @param projectPath
         */
        export function getAppVersionNumberByFile(projectPath: baosky.Uri): Promise<number>;

        /**
         * 获取最新应用版本号 或 指定模型版本号对应的最大应用版本号
         */
        export function getLatestAppVersion(): Promise<number>;

        /**
         * Description 获取最新的应用版本号， major_version*10000 + minor_version
         */
        export function getLatestFullAppVersion(): Promise<{ appMajorVersion: number; appMinorVersion: number; hotfix: number; }>;

        /**
         * Description 获取最新的应用版本号
         */
        export function getAppVersionSync(): number;

        /**
         * Description 获取最新的产品版本信息
         * @param product
         */
        export function getProductVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }>;

        /**
         * Description 获取最新的产品版本信息
         * @param product
         */
        export function getProductVersionRangeSync(product: ProductType): { oldest: number; latest: number; };

        /**
         * Description 获取最新的产品版本信息
         * @param product
         */
        export function getModelVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }>;

        /**
         * Description 获取最新的产品language版本信息
         * @param product
         */
        export function getLanguageVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }>;

        /**
         * 获取最新的产品language版本信息
         * @param product
         */
        export function getLanguageVersionRangeString(product: ProductType): Promise<{ oldest: string; latest: string; }>;

        /**
         * 根据应用版本号获取匹配的天行项目版本与编译器版本(es.version)
         * @param appVersion
         */
        export function getMatchedVersionsByAppVersion(appVersion: number): Promise<{ languageVersion: number; projectVersion: number; }>;

        /**
         * 通过天行项目版本号获取匹配的PLC版本信息
         * @param projectVersion
         */
        export function getMatchedPLCModelVersionByProject(projectVersion: number): Promise<number>;

        /**
         * @description infoViewContribution 的 focusTab
         */
        export function focusInfoViewTab(type: string, stopAutoScroll?: boolean): Promise<void>;

        /*
            目前只有这些状态    天行可以调用所有command，包括插件注册command
            1.只有天行内部可以调用
            2.插件可以申请授权调用             天行内部注册命令默认
            3.插件注册命令，但不允许其他插件调用
            4.插件内部可以随意调用            插件注册命令默认

            注释：暂无这些状态 未来可能有
            // 插件相互之间调用也需要授权   仅插件
            // 所有人都可以调用              所有
        */
        export enum CommandPermissionLevel {
            BAOSKY_PRIVATE,
            BAOSKY_PROTECTED,
            PLUGIN_PRIVATE,
            PLUGIN_PUBLIC
        }

        /**
         * 新名称可选参数
         */
        export interface NextNameOptions {
            /**
             * @description 所生成名字后校验重名的范围
             */
            range: NameValidationRange,
            /**
             * @description software的具体子类型，如：gvs、pu、udt等NameType | 硬件的具体子类型，如IO-station、IO模块等
             */
            type?: string,
            /**
             * 名称前缀
             */
            prefix?: string,
            /**
             * 名称后缀开始数字
             */
            startIndex?: number,
            /**
             * @description 名称前缀和后缀之间的连接符号，默认是下划线
             */
            interval?: string,
            /**
             * 名称的最大长度
             */
            maxLength?: number,
            /**
             * 当前命名空间
             */
            namespace?: string,
            /**
             * @description 硬件、软件各自的其他自定义参数
             */
            option?: any,
            /**
             * 获取nameList时需要排除的字符串
             */
            excludePath?: URI[],
            /**
             * 获得下一个名称时比对全局名称时是否大小写敏感，默认为不敏感。
             */
            isCaseSensitive?: boolean,
        }

        /**
         * NameService 验证结果等级
         */
        export enum ValidationLevel {
            ERROR = "error",
            WARN = "warning"
        }

        /**
         * 验证结果类型,指向有误的字段
         */
        export enum ValidationResultType {
            NAME = "name",
            NAMESPACE = "namespace",
            LOCATION = "location",
        }

        /**
         * NameService 验证结果
         */
        export interface ValidationResult {
            /**
             * 验证结果等级
             */
            level: ValidationLevel,
            /**
             * 验证结果信息
             */
            msg: string,
            /**
             * 校验异常类型,指向有误的字段
             */
            type: ValidationResultType,
        }

        /**
         * @description 待校验名字的校验范围是一个设备下 or 一个项目下（即与所有设备下的软、硬件名字都不重名） or 当前位置下
         */
        export enum NameValidationRange {
            PROJECT = "project",
            DEVICE = "device",
            LOCATION = "location"
        }

        /**
         * @description 验证可选参数
         */
        export interface NameValidationOptions {
            /**
             * @description software的具体子类型，如：gvs、pu、udt等NameType | 硬件的具体子类型，如IO-station、IO模块等
             */
            type?: string,
            /**
             * @description 待校验名字的校验范围是一个设备下 or 一个项目下 or 当前位置下
             */
            range?: NameValidationRange,
            // software需要的校验时辅助参数,软件默认在同一个设备下校验，即不同设备之间允许重名
            /**
             * 路径
             */
            location?: URI,
            /**
             * 命名空间
             */
            namespace?: string,
            //hardware需要：IO-station在plc之间是不重复的；其他可选择要求在plc之间重复或不重复
            /**
             * @description 硬件、软件各自的其他自定义参数，如选择要求在plc之间重复或不重复
             */
            option?: any,
            /**
             * 获取nameList时需要排除的字符串
             */
            excludePath?: URI[],
            /**
             * 比对全局名称时是否大小写敏感，默认为不敏感。
             */
            isCaseSensitive?: boolean,
            /**
             * 额外的需要校验的名称列表
             */
            extraCheckNames?: string[]
        }

        /**
         * 加载选项
         * @date 10/11/2023 - 12:36:52 AM
         * @author 沈杰
         *
         * @export
         * @interface LoadOptions
         * @typedef {LoadOptions}
         */
        export interface LoadOptions {
            /**
             * 是否递归。
             * @date 10/11/2023 - 8:06:23 AM
             * @author 沈杰
             *
             * @type {?boolean}
             */
            recursion?: boolean;
            /**
             * 回调
             * @author 胡雪纯
             *
             * @param {URI} path
             * @param {?("start" | "end")} [type]
             * @param {?FileStat} [stat]
             */
            callback?(path: URI, type?: CallBackType, stat?: FileStat): void;
        }

        /**
         *
         */
        export interface DataContext {
            parentData?: DataPair;
            parentPath?: URI;
            parentType?: Identifier<any>[];
        }

        /**
         * 天行业务对象基类。
         */
        export class ESObject {
            [props: string]: any;
            /**
             * 业务对象版本号，在通过反序列化器创建对象或者工厂类创建对象时，保证为其设置版本号。
             * 默认版本号与当前项目的项目列表中设置的业务模型版本号一致。
             */
            @field({
                defaultValue: 0
            })
            modelVersion = 0;
        }

        /**
         * 对象元数据。
         */
        export interface IndexMeta {
            /**
             * 约束。
             */
            // identifier?: Identifier<any>;
            identifiers?: Identifier<any>[];
            name?: string;
            id?: string;
            /**
             * 源路径。
             */
            src?: URI;
            /**
             * 判定重复方法。
             */
            predicate?: (obj: IndexMeta) => boolean;
        }
        export namespace IndexMeta {
            /**
             * 是否包含ID。
             */
            export function contains(identifier: Identifier<any>, identifiers?: Identifier<any>[]): boolean {
                if (!identifiers) {
                    return false;
                }
                return identifiers.some((i) => i === identifier);
            }
        }

        /**
         * 核心对象。
         * @date 8/29/2023 - 2:23:28 AM
         */
        export class CoreObject implements IndexMeta {
            public identifiers?: Identifier<any>[];
            protected readonly coreProps: Map<string, any> = new Map();
            protected readonly extendProps: Map<string, any> = new Map();
            public src?: URI;

            private _objectType?: symbol;
            /**
             * get
             */
            public get objectType(): symbol | undefined {
                //TODO:后续删除this.identifiers[0]
                return this._objectType ?? (this.identifiers ? this.identifiers[0] as symbol : undefined);
            }
            /**
             * set
             */
            public set objectType(value: symbol | undefined) {
                this._objectType = value;
            }

            /**
             * Description placeholder
             * @date 8/29/2023 - 2:48:59 AM
             * @author 沈杰
             *
             * @public
             * @template T
             * @param {string} key
             * @param {T} value
             */
            public setExtend<T>(key: string, value: T): void {
                this.extendProps.set(key, value);
            }

            /**
             * Description placeholder
             * @date 8/29/2023 - 2:46:02 AM
             * @author 沈杰
             *
             * @public
             * @template T
             * @param {string} key
             * @returns {(T |undefined)}
             */
            public getExtend<T>(key: string, defaultValue?: T | (() => T)): T | undefined {
                let value = this.extendProps.get(key);
                if (value !== undefined) {
                    return value as T;
                } else if (typeof defaultValue === "function") {
                    value = defaultValue.apply(null);
                } else {
                    value = defaultValue
                }
                this.extendProps.set(key, value);
                return value;
            }

            /**
            * Description placeholder
            * @date 8/29/2023 - 4:01:34 AM
            * @author 沈杰
            *
            * @public
            * @template T
            * @param {string} key
            * @returns {(T|undefined)}
            */
            public getProp<T>(key: string): T | undefined {
                const value = this.coreProps.get(key);
                if (value) {
                    return value as T;
                } else {
                    return undefined;
                }
            }

            /**
             * Description placeholder
             * @date 8/29/2023 - 3:59:56 AM
             * @author 沈杰
             *
             * @public
             * @param {string} key
             * @param {string} value
             */
            public setProp<T>(key: string, value: T): void {
                this.coreProps.set(key, value);
            }
        }

        export function executeCrossReference(params: CrossReferenceParam): Promise<CrossReferenceResponse | CrossRefTableDataType>;

        export type UserInfo = {
            /**
             * 用户ID
            */
            user_id?: number;
            /**
             * 用户名，唯一
             */
            username: string;
            /**
             * 用户状态，'active', 'inactive', 'suspended'
             */
            status?: ESUserStatus;
            /**
             * 上次登录时间
             */
            last_login?: string;
            /**
             * 注册时间
             */
            registered_at?: string;
            /**
             * 密码
             */
            password?: string
        }
        export function getUserInfo(): Promise<UserInfo | undefined>;

        export function isAdminUser(): boolean;

        export type InteractiveTarget = {
            readonly id: 'ROUTINE' | 'DOWNLOAD' | 'COMPILE';
            readonly type: 'tabbar'
            // 未来可以扩展
            // readonly payload?: unknown;
        };

        export function decorateInteractiveTarget(target: InteractiveTarget): Promise<void>;


        export enum InfoLevel {
            ERROR = "Error",
            WARNING = "Warning",
            INFORMATION = "Information"
        }

        export class RoutineInfo {
            /**
             * 信息类型
             */
            readonly level: InfoLevel;
            /**
             * 消息
             */
            readonly message: string;
            /**
             * 时间
             */
            readonly time: Date | string | number;
            /**
             * 位置
             */
            readonly position?: string;
        }

        export function sendRoutineInfo(routineInfo: RoutineInfo): void;

        // baosky 中widget的业务类型
        export type WidgetType = 'PuTabToolbarFactoryType'

        export type ToolbarItem = {
            // widget type
            readonly widgetType: WidgetType;
            // 按钮绑定的一组命令
            readonly commands: string[];
            // 按钮注册位置
            readonly position: {
                // 按钮所属组，不设置时从右边开始注册，index从右边开始计数
                readonly groupIdx?: number,
                // 按钮在组内的位置
                readonly index: number
            }
        }

        // 向指定widget注册toolbar按钮
        export function registerToolbar(toolbarItems: ToolbarItem[]): Promise<Disposable[]>;

        export interface TreeNodeController extends NodeController<TreeNodeProvider> { };

        export type GotoOptions = {
            /**
             * service path
            */
            readonly path: Uri,

            /**
             * additional parameters
            */
            readonly options?: object
        }

        /**
         * goto dataType
        */
        export function gotoService(gotoOptions: GotoOptions): Promise<void>;

        /**
         * 跳转到指定route页面
        */
        export function gotoHelp(route: string): Promise<void>;

        export type DialogProps = {
            /**
             * 弹窗参数
             */
            props: LoadingPageDialogProps,

            /**
             * 弹窗类型
            */
            type: DialogType

            /**
             * 创建loading弹窗时需传入加载函数
             */
            loading?: LoadingFun;
            /**
             * 创建loading弹窗时需传入加载函数的执行次数
            */
            epoch?: number;
        }
        type LoadingFun = (func: (item: string | string[]) => Promise<void>) => Promise<void>;

        export async function openDialog(dialogProps: DialogProps): Promise<void>;
    }

    /* 	插件path的第一个元素必须{key: "plugin", displayName: "插件"}，否则会注册失败
        path: [
        { key: "plugin", displayName: "插件" },
        {key: "preference_plugin", displayName: '个性化插件'}
    ],
    */
    export interface PreferenceSchemaPath {
        key: string,
        displayName: string
    }

    export interface SelectPreferenceSchema extends BaoskyComponentPreferenceSchema {
        type: "select";
        /**
         * @description 默认值  是选项的value
         */
        defaultValue?: string;
        /**
         * @description 下拉选项 必填
         */
        options: BaoskyPreferenceSelectOptionType[];
    }

    export interface BaoskyPreferenceSelectOptionType {
        label: string;
        value: string;
    }

    export interface BaoskyComponentPreferenceSchema extends BasePreferenceSchema {
        type: string;
        /**
         * @description 默认值
         */
        defaultValue?: JSONValue;
    }

    export interface NumberInputPreferenceSchema extends BaoskyComponentPreferenceSchema {
        type: "number-input";
        /**
         * @description 是否支持浮点数
         */
        supportReal?: boolean;
        /**
         * @description 校验用户输入  是否显示tooltip提示
         */
        // validate?: (str: number) => BaoskyPreferenceValidateTooltip | undefined;
        /**
         * @description 默认值
         */
        defaultValue?: number;
    }

    export interface BasePreferenceSchema {
        /**
         * @description 配置项的路径 例如[{key:"routine",displayName:"常规"}]
         */
        path: PreferenceSchemaPath[]
        /**
         * @description 配置项的标题 例如 title:"自动保存项目"
         */
        title: string,
        /**
         * @description 是否显示checkbox
         */
        checkable?: boolean;
        /**
         * @description 默认勾选
         */
        defaultChecked?: boolean;
        /**
         * @description 配置项的键 保证唯一
         */
        settingKey: string,
        /**
         * @description 配置项的描述
         */
        description?: string,
        /**
         * @description 路径的排序
         */
        pathOrder?: number,
        /**
         * @description 配置项优先级顺序  用于相同路径下的排序
         */
        order?: number,
        /**
         * @description 内容的组件类型  "text" | "input" | "number-input" | "textarea"
         */
        type?: string
    }

    /**
     * 当前设备参数
     */
    export interface DeviceParams {
        name: string;
        path: URI;
    }

    //task交叉引用结果
    export interface CrossRefTableDataType {
        rowNum: number;
        identifyName: string;
        referenced?: string;
        callOn?: FilterOptionType;
        context?: string;
        position?: string;
        type?: string;
        showType?: string;
        range?: Range;
        graphID?: string;
        note?: string;
        address?: string;
        isIndent: boolean; //是否缩进
        uri?: URI;
        options?: any; //其他参数
    }

    enum FilterOptionType {
        ALL = "a",
        DECLARE = "b",
        WRITE = "c",
        READ = "d",
        CALL = "e",
        READ_AND_WRITE = "f",
        BIND = "g"
    }

    //交叉引用结果
    export interface CrossReferenceResponse {
        error: string;
        projectName?: string;
        referenceName?: string;
        contentList?: CrossReferenceResult[];
    }

    enum CrossReferenceAccessType {
        DECLARE = 0,
        TYPE_DECLARE = 1,
        CALL = 2,
        READ = 3,
        WRITE = 4,
        READ_WRITE = 5,
        UNKNOW = 6,
    }
    interface CrossReferenceResult {
        symbolName: string;
        locationName: string;
        accessType: CrossReferenceAccessType;
        uri: string;
        context: {
            content: string;
        };
        position: {
            offset: number;
            length: number;
        };
        range: Range;
        elementType: string;
        comment: string;
        graphID?: string;
        graphTitle?: string;
        fullElementType?: string;
    }

    //交叉引用参数
    export type CrossReferenceParam = DirectNameCorssReferenceParam | TextCrossReferenceParam | LDCrossReferenceParam | TaskCrossReferenceParam;

    //对对象进行交叉引用
    interface DirectNameCorssReferenceParam { //包括：单个PU、任意表格区内的变量或数据类型
        plcName: string;
        symbolName: string;
        type: "DIRECT";
    }
    //对ST内容进行交叉引用
    interface TextCrossReferenceParam { //包括：PU（ST）编辑区内的某段内容
        uri: Uri;
        type: "TEXT";
        offset: number;
        length: number;
    }
    //对LD内容进行交叉引用
    interface LDCrossReferenceParam { //包括：PU（LD）编辑区内的某个元素
        uri: Uri;
        type: "LD";
        id: string;
    }

    //对任务进行交叉引用
    interface TaskCrossReferenceParam { //包括：单个Task
        plcName: string;
        symbolName: string;
        // description: string;
        type: "TASK";
    }

    /**
    * 可创建的弹窗类型
    */
    type DialogType = 'loadingDialog';

    type DialogProps = LoadingPageDialogProps;

    interface CommonDialogProps {
        readonly title: string;
        /**
         * Determines the maximum width of the dialog in pixels.
         * Default value is undefined, which would result in the css property 'max-width: none' being applied to the dialog.
         */
        maxWidth?: number;
        /**
         * Determine the word wrapping behavior for content in the dialog.
         * - `normal`: breaks words at allowed break points.
         * - `break-word`: breaks otherwise unbreakable words.
         * - `initial`: sets the property to it's default value.
         * - `inherit`: inherit this property from it's parent element.
         * Default value is undefined, which would result in the css property 'word-wrap' not being applied to the dialog.
         */
        wordWrap?: 'normal' | 'break-word' | 'initial' | 'inherit';
    }

    interface LoadingPageDialogProps extends CommonDialogProps {
        /**
        * 加载弹窗的样式：详细视图 | 简略视图。默认为详细视图
        */
        styleType?: "detailed" | "brief";
        /**
         * 详细视图或简略视图的主要信息
         */
        content: string;
        /**
         * 待加载项的数量: 可选参数，若未知可以不传
         * note: 仅用于详细视图
         */
        total?: number;
        /**
         * 是否展示详细视图的加载信息。默认展示加载信息；如不展示加载信息，则也不展示进度条
         * note: 仅用于详细视图
         */
        showLoadingInfo?: boolean;
        /**
         * 是否展示详细视图的进度条。默认展示进度条
         * note: 仅用于详细视图
         */
        showProgressBar?: boolean;
    }



}

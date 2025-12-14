export module "@baosky/plugin" {

    export namespace plc {
        // library 库 相关接口
        export namespace library {
            /**
             * 获取所有库元素
             *
             * @param options - 配置选项
             * @param options.uri - 库所属的PLC Uri 地址
             * @param options.filterId - 过滤器 ID，用于筛选库元素
             * @param options.withVersion - 是否包含版本信息（可选，默认为 false）
             *
             * @returns 返回包含库元素的 Promise 数组
             */
            export function getAllLibraryElements(options: { plcUri: Uri, filterId: LibraryFilterId, withVersion?: boolean }): Promise<LibraryElement[]>

            /**
             * 将libSet添加到引用库中
             * categor为SYS.TO、SYS.Advanced、SYS.Basic、USER等
             */
            export function addToRefLibByLibSet(plcUri: Uri, libSetParamters: LibSetParamters): Promise<void>;

            /**
             * 获取所有引用库的元素
             */
            export function getAllReferenceLibElement(plcUri: baosky.Uri): Promise<baosky.LibraryElement[]>;
        }

        /**
         * PLCopen导入
        */
        export function importPLCopen(options: ImportPLCopenOptions);

        /**
         * PLCopen导出
         * @param plcName
         */
        // export function exportPLCopen(filePath: Uri):

        /**
         * 快速修复
         */
        export function provideQuickFixAction(plcName: string): MaybePromise<() => MaybePromise<void>>;
        /**
        * @description 获取plc下默认的namespace
        */
        export function getDefaultNamespace(plcName: string): Promise<string>;
        /**
         * 获取当前语言服务状态
         */
        export function getLanguageStatus(): number;
    }

    export enum OpenPLCVariableType {
        GVS,
        STRUCT,
        SEND_NGVS,
        RECV_NGVS,
        PRG,
        FB,
        FC,
        IO_MAPPING,
        C_LIB
    }

    //baosky 中问题位置描述
    export interface ProblemLocation {
        //问题描述
        desc: string,
        //问题uri
        uri: string,
        //问题位置
        position: Range
    }

    export type ImportPLCopenOptions = { type: OpenPLCVariableType, targetUri: Uri, props: ImportPLCopenProps } | { type: 'task', targetUri: Uri, plcName: string, props: ImportTASKProps }

    export type ImportPLCopenProps = {
        name: string;
        namespace: string;
        comment?: string;
        setting?: JSONObject;
        type: OpenPLCVariableType;
        vars?: OpenPLCVariableProps[];
        languageType?: PuLanguageType;
        returnType?: string;
        loadData?: boolean;
        pragma?: string;
        pragmas?: string[];
    };

    export type ImportTASKProps = {
        taskName: string;
        priority: string;
        type: CycleType;
        cycleTime?: string;
        watchdogEnable?: boolean;
        watchdogTime?: string;
        eventType?: EventType;
        repeatType?: RepertType;
        startTime?: string;
        activateState?: boolean;
        description: string;
        intervalTime?: string;
        prgList?: PrgType[];
        displayName?: string;
        loadData?: boolean;
    };

    //时间数据类型
    export enum RepertType {
        HOURLY,
        EVERYDAY,
        WEEKLY,
        MONTHLY,
        MONTHLY_END,
        YEARLY,
    }

    /**
     * 定义prg列表数据结构
     */
    export interface PrgType {

        /**
         * prg的名称(包含namespace)
         */
        prgName: string;
        /**
         * prg是否使能
         */
        enable: boolean;
        /**
         * prg执行顺序
         */
        order: number;
    }

    export enum EventType {
        PLC_TO_RUN = "plcStatus.toRun",
        TIME_EXECUTE_ONETIME = "time.executeOnetime",
        TIME_INTERVALS = "time.intervals",
        PROGRAM_TIMEOUT = "program.timeout",
        PROGRAM_ERROR = "program.error",
        HARDWARE_INTERRUPT = "hardware.interrupt",
        HARDWARE_DIAGNOSTIC_ERROR = "hardware.diagnosticError",
        REDUNDANCY_IOSYNC_ERROR = "redundancy.ioSyncError",
        REDUNDANCY_IOSYNC_SWITCH = "redundancy.ioSyncSwitch",
        REDUNDANCY_ENTER_SYNC = "redundancy.enterSync",
        REDUNDANCY_EXIT_SYNC = "redundancy.exitSync",
    }

    /**
     * 定义任务循环类型
     */
    export enum CycleType {
        /**
         * 连续循环
         */
        CONTINUOUS_CYCLE,
        /**
         * 定周期循环
         */
        CONSTANT_CYCLE,
        /**
         * 事件触发
         */
        EVENT_TRIGGER,

        /**
         * servo类型的task
         */
        SERVO,

        /**
         * init_servo类型的task
         */
        INIT_SERVO
    }

    export type VariableData = {
        name: string;
        type: string;
        block: VarBlock;
        value: string;
        modifier: VarModifier;
        comment: string;
        setting?: VaribaleDeclareLineSetting;
        varProp?: VariableAccessProp;
    };

    export type VarBlock =
        | "VAR"
        | "VAR_INPUT"
        | "VAR_GLOBAL"
        | "VAR_OUTPUT"
        | "VAR_IN_OUT"
        | "VAR_TEMP"
        | "";

    export type VarModifier =
        | "CONSTANT"
        | "RETAIN"
        | "";

    export type ArrayComment = [number, string];
    export class ArrayCommentMap extends Map<number, string> {
        toJSON(): ArrayComment[] {
            return [...this.entries()].sort((a, b) => a[0] - b[0]);
        }
    }
    export type VaribaleDeclareLineSetting = {
        readonly?: boolean;
        arrayComment?: ArrayCommentMap;
    };

    export type VariableLineArgs = Partial<VariableData> & { id?: string };

    export type OpenPLCVariableProps = VariableLineArgs & IOMappingVars;

    export type VariableAccessFullProp = {
        BEDBEO_ALLOW_READ: boolean,
        BEDBEO_ALLOW_WRITE: boolean,
        HMI_VISIBLE: boolean,
        VISIBLE?: boolean,
        IS_ALLOW_MODIFY?: boolean,
    }
    export type VariableAccessProp = Partial<VariableAccessFullProp>;

    export interface IOMappingVars {
        address?: string;
        remark?: string;
        namespace?: string;
    }

    export type ExportRes = {
        vars: VariableDeclareLineJSON[];
    } & TextDataModelDTO;

    export type VariableDeclareLineJSON = LineJSON & VariableData;

    export type LineJSON = {
        id: string;
        lineType: string;
        lineIndex: number;
    };

    export type TextDataModelDTO = {
        name: string;
        uri: URI;
        namespace: string;
        comment: string;
        data: {
            [key: string]: any;
        };
        pragma?: string;
        pragmas?: string[];
        setting?: JSONObject;
    } & Partial<ESObject>;

    export type LibSetParamters = {
        libSet: string,
        version: string,
        category: string
    }

    /**
     * 库过滤ID
     */
    export enum LibraryFilterId {
        Default = "default", //如果值为default,则认为是默认的过滤器;
        Reference_Library = "reference-library",
        User_Library_Manager = "user-library-manager",
        ST = "ST",
        LD = "LD",
        SFC = "SFC",
    }

    /**
     * 库元素定义
     */
    export class LibraryElement extends BaseLibElement {
        order: number;
        /**
         * 实现方式集合
         */
        implementations: Array<Implementation>;
        /**
         * 库的接口定义
         */
        interface: LibInterface;
        /**
         * 库的扩展实现集合
         */
        selections: Array<FunctionSelector>;
        /**
         * 资源文件
         */
        resource: LibResource;
        /**
         * 系统库帮助文档跳转链接
         */
        manualPath?: string;

        libraryReference?: LibraryFolder;

        /**
         * 文件系统中的路径
         */
        path: string;

    }

    /**
     * 库元素的资源定义
     */
    export class LibResource {
        /**
         * 资源文件路径(相对)
         */
        file: string;
        /**
         * 资源文件ID
         */
        id: string;
        /**
         * 小图标标识
         */
        smallIcon: string;
        /**
         * 大图标标识
         */
        bigIcon: string;
        /**
         * 类别：SYS/USER
         */
        category?: string
    }

    /**
     * 具体的函数指向
     */
    export class FunctionSelector {
        /**
         * 指向函数名称
         */
        implementation: string;
        /**
         * 指向函数的值类型
         */
        valueTypes: string;

        operator: string;
    }

    /**
     * 库接口
     */
    export class LibInterface {

        /**
         * 系统库的可视化展示，各参数描述ST或LD的语言特性。
         */
        LanguageSpecific: Array<LanguageSpecific>;

        /**
         * 接口参数
         */
        parameters: Array<Parameter>;
        /**
         * 接口参数约束
         */
        templates: Array<TemplateParam>;
        /**
         * 接口返回类型
         */

        returnType: string;

        /**
         * 返回类型描述key
         */
        returnDescription: string;
        /**
         * 接口返回类型国际化
         */
        // @Exclude()
        returnDesContent?: string;

        operators: Array<LibOperator>
    }

    /**
     * Description placeholder
     */
    export class LibOperator {
        display: string;
        name: string;
    }

    /**
     * 参数约束的定义
     */
    export class TemplateParam {
        /**
         * 允许的参数类型约束
         */
        allowedTypes: ElementaryType;


        /**
         * 为内置类型的函数做的特殊类型描述
         */
        buildInType?: string;
        /**
         * 是否自动进行类型转换
         */
        autoType: boolean;
        /**
         * 参数名称
         */
        name: string;
    }

    /**
     * 基本数据类型
     */
    export enum ElementaryType {
        VOID = 0,
        REAL = 0x000000001,
        LREAL = 0x00000002,
        USINT = 0x00000004,
        UINT = 0x00000008,
        UDINT = 0x00000010,
        ULINT = 0x00000020,
        SINT = 0x000000040,
        INT = 0x000000080,
        DINT = 0x00000100,
        LINT = 0x00000200,
        TIME = 0x00000400,
        LTIME = 0x00000800,
        BOOL = 0x00001000,
        BYTE = 0x00002000,
        WORD = 0x00004000,
        DWORD = 0x00008000,
        LWORD = 0x00010000,
        STRING = 0x00020000,
        WSTRING = 0x00040000,
        CHAR = 0x00080000,
        WCHAR = 0x00100000,
        DATE_AND_TIME = 0x00200000,
        LDT = 0x00400000,
        DATE = 0x00800000,
        TIME_OF_DAY = 0x01000000,
        LTOD = 0x02000000,
        ANY_STRUCT = 0x04000000,
        ANY_ARRAY = 0x080000000,/**特殊类型 */
        ANY_TYPE = 0x0000000008000000,
        BIT = 0x0000000010000000,
        SDTIME = 0x0000000020000000,
        C_ADDR = 0x0000000040000000,
        ANY_REAL = REAL | LREAL,
        ANY_UNSIGNED = USINT | UINT | UDINT | ULINT,
        ANY_SIGNED = SINT | INT | DINT | LINT,
        ANY_INT = ANY_UNSIGNED | ANY_SIGNED,

        ANY_NUM = ANY_REAL | ANY_INT,
        ANY_DURATION = TIME | LTIME,
        ANY_MAGNITUDE = ANY_NUM | ANY_DURATION,
        ANY_MAGNITUDE_WITH_SDTIME = ANY_MAGNITUDE | SDTIME,
        ANY_BIT = BOOL | BYTE | WORD | DWORD | LWORD,
        ANY_BYTE = BYTE | WORD | DWORD | LWORD,
        ANY_DATE = DATE_AND_TIME | LDT | DATE | TIME_OF_DAY,

        ANY_STRING = STRING | WSTRING,
        ANY_CHAR = CHAR | WCHAR,
        ANY_CHARS = ANY_STRING | ANY_CHAR,

        ANY_BASIC_TYPE = ANY_MAGNITUDE | DATE_AND_TIME | DATE | TIME_OF_DAY,
        ANY_ELEMENTARY_EXCLUDE_STRING = ANY_MAGNITUDE | ANY_BIT | CHAR | ANY_DATE,
        ANY_ELEMENTARY = ANY_MAGNITUDE | ANY_BIT | ANY_CHARS | ANY_DATE,
        ANY_ELEMENTARY_INCLUDE_SDTIME = ANY_ELEMENTARY | SDTIME,
        ANY = ANY_ELEMENTARY | ANY_STRUCT | ANY_ARRAY,
    }

    /**
     * 系统库的可视化展示，各参数描述ST或LD的语言特性。
     */
    export class LanguageSpecific {
        display: string;

        fillWord: string;

        lang: string;

        layout: string;

        left: string;

        right: string;
    }

    /**
     * 库的实现定义
     */
    export class Implementation {
        /**
         * 实现类型
         */
        implType: LibImplType;
        /**
         * 名称
         */
        name: string;
        /**
         * PLC信息
         */
        plc: string;
        /**
         * 支持语言
         */
        languages: string;
        /**
         * 参数列表
         */
        parameters: Array<Parameter>;
        /**
         * 返回类型
         */
        returnType: string;

        itf: Array<string>;

        out: Array<string> | undefined;
    }

    export class Parameter {
        /**
         * 参数域
         */
        section: SectionType;
        /**
         * 名称
         */
        name: string;
        /**
         * 数据类型
         */
        type: string;
        /**
         * 条件
         */
        conditions: string;

        /**
         * 保持
         */
        isRetain?: boolean;

        /**
         * 控制FB变量是否可以在全局监控表中修改值
         */
        isAllowModify?: boolean;

        /**
         * 控制FB的in/out参数是否能为空
         */
        isAllowNull?: boolean;

        /**
         * 用于控制FB管脚是否在HMI,SCADA,OPCUA等第三方可见
         */
        bedbeoAllowRead?: boolean;

        /**
         * 用于控制FB管脚是否在HMI,SCADA,OPCUA等第三方可修改值
         */
        bedbeoAllowWrite?: boolean;

        /**
         * 用于控制FB管脚是否用户可见
         */
        visible?: boolean

        /**
         * HMI/SCADA可见
         */
        hmiVisible?: boolean;
        /**
         * 注释
         */
        comment: string;

        /**
         * 初始值
         */
        initval?: string;

        /**
         * 注释国际化
         */
        // @Exclude()
        commentContent?: string;

        /**
         * 基数
         */
        cardinality?: Cardinality;
    }

    /**
     * 变量的作用域
     */
    export enum SectionType {
        // SectionUndef = "SectionUndef",
        // SectionInput = "SectionInput",
        // SectionOutput = "SectionOutput",
        // SectionInOut = "SectionInOut",
        // SectionStatic = "SectionStatic",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SectionUndef = 0,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SectionInput = 0x00000001,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SectionOutput = 0x00000002,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SectionInOut = 0x00000004,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SectionStatic = 0x00000008,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SectionStruct = 0x00000010,
    }

    /**
     * 参数基数配置
     */
    export class Cardinality {
        /**
         * 最大值
         */
        max: number;
        /**
         * 最小值
         */
        min: number;
        /**
         * 开始下标
         */
        startIndex: number;
    }

    /**
     * 库的实现类型
     */
    export enum LibImplType {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ImplUndef = "ImplUndef",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Code = "Code",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Transform = "Transform",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Intrinsic = "Intrinsic",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Native = "Native",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Link = "Link",
    }

    /**
     * 基础库元素
     */
    export abstract class BaseLibElement {
        /**
         * 名称
         */
        name: string;
        /**
         * 类型
         */
        type: SWType;
        /**
         * 版本
         */
        version: string;
        /**
         * enEno标识
         */
        enEno: EnEno;
        /**
         * 是否通用
         */
        generic: boolean;

        /**
         * Family信息
         */
        family?: string;

        /**
         * 定义的实例是否允许retain限定
         */
        isAllowRetain: boolean;

        /**
         * INIMode信息
         */
        iNIMode?: boolean;

        /**
         * 对应语言
         */
        languages: PULanguage;

        /**
         * 描述
         */
        description: string;

        /**
         * 展示名称
         */
        display: string;

        /**
         * 在右侧树中是否隐藏。缺省表示不隐藏，true表示隐藏
         */
        hide: boolean;

        /**
         * 显示国际化后的内容
         */
        // @Exclude()
        displayContent?: string;

        /**
         * 描述国际化后的内容
         */
        // @Exclude()
        descContent?: string;

        order: number;

        /**
         * 模型版本
         * 记录当前库是什么版本的设备固件发布出来的
         */
        modelVersion: string;
    }

    export class FileElement {
        /**
         * 文件系统中的路径
         */
        path: string;
    }

    export class LibraryFolder extends FileElement {
        /**
         * 显示
         */
        display: string;

        /**
         * 库的分组
         * 记录当前库的分组；
         * 如果库是用户库，那么该值为"USER"; 可用LibraryCategory.USER表示；
         * buildIn的库，该值为"base";
         * 如果系统库，该值以"SYS"开头；
         *
         */
        category: string;
        /**
         * 库名称
         */
        libSet: string;

        /**
         * 版本号
         */
        version: string;

        /**
         * 描述
         */
        description: string;
        /**
         * 显示国际化后的内容
         */
        // @Exclude()
        displayContent?: string;
        /**
         * 描述国际化后的内容
         */
        // @Exclude()
        descContent?: string;

        /**
         * 孩子
         */
        children: LibraryElement[] = [];

        /**
         * 排序
         */
        order: number;

        /**
         * 作者
         */
        author?: string;

        /**
         * 公司
         */
        company?: string;

        /**
         * PLC信息
         */
        plc: string[];

        /**
         * ModelVersion信息
         * 记录当前库是什么版本的设备固件发布出来的
         */
        modelVersion?: string;

        /**
         * SrcLangType信息
         */
        srcLangType?: string[];

        /**
         * 限制可用版本
         */
        restrictAvailableVersion?: string;

        /**
         * 依赖库
         */
        dependency?: LibraryInfo[];

        fingerPrint?: string;
    }

    export class LibraryInfo {
        /**
         * 分类
         */
        category: string;

        /**
         * 库名称
         */
        libSet: string;

        /**
         * 版本号
         */
        version: string;
    }

    /**
     * 程序元素类型
     */
    export enum SWType {
        BASIC = "BASIC", //语言元素使用
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SWTypeUndef = "SWTypeUndef",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Task = "Task",
        PRG = "PRG",
        FC = "FC",
        FB = "FB",
        UDT = "UDT",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Variable = "Variable",
    }

    /**
     * EN ENO的使用标识
     */
    export enum EnEno {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Normal = "Normal",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SkipEno = "SkipEno",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        NoEnEno = "NoEnEno",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        NoEno = "NoEno",
    }

    export enum PULanguage {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        LangUndef = 0x00000000,
        LD = 0x00000001,
        FBD = 0x00000002,
        IL = 0x00000004,
        ST = 0x00000008,
        SFC = 0x00000010,
        C = 0x00000020,
        CPP = 0x00000040,
        CFC = 0x00000080,
        CEM = 0x00000100,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Python = 0x00000200,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        IECBasicGraphic = LD | FBD,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        IECBasicTexual = IL | ST,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        IECBasic = IECBasicTexual | IECBasicGraphic,

        IECBasicWithCFC = IECBasic | CFC,
    }
}

/*
 * @Author: wubing
 * @Date: 2025-11-12 09:05:59
 * @FilePath:
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors:
 * @LastEditTime: 2025-11-20 09:52:34
 */
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';

export const IDE_API_MANIFEST = 'plugin-api-manifest.json';
export const PLUGUIN_API_USAGE = 'plugin-api-usage.json';


/**
 * 参数信息
 * @date 2025/12/03 - 17:47:28 PM
 * @author wubing
 *
 * @interface ParameterInfo
 * @typedef {ParameterInfo}
 */
interface ParameterInfo {
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
}


/**
 * 函数签名信息
 * @date 2025/12/03 - 17:47:15 PM
 * @author wubing
 *
 * @interface FunctionSignature
 * @typedef {FunctionSignature}
 */
interface FunctionSignature {
    parameters: ParameterInfo[];
    returnType: string;
    typeParameters?: string[];
}


/**
 * 属性信息
 * @date 2025/12/03 - 17:47:41 PM
 * @author wubing
 *
 * @interface PropertyInfo
 * @typedef {PropertyInfo}
 */
interface PropertyInfo {
    name: string;
    type: string;
    readonly: boolean;
    optional: boolean;
}


/**
 * api定义
 * @date 2025/12/03 - 17:48:04 PM
 * @author wubing
 *
 * @interface ApiDefinition
 * @typedef {ApiDefinition}
 */
interface ApiDefinition {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'enum' | 'namespace' | 'type' | 'variable';
    signature?: FunctionSignature;
    properties?: Record<string, PropertyInfo>;
    methods?: Record<string, FunctionSignature[]>;
    constructors?: FunctionSignature[];
    enumValues?: string[];
    typeAlias?: string;
    namespace?: Record<string, ApiDefinition>;
}

interface IdeApiDeclaration {
    version: string;
    generatedAt: string;
    apis: Record<string, ApiDefinition>;
}


/**
 * 具体api信息
 * @date 2025/12/03 - 17:48:30 PM
 * @author wubing
 *
 * @interface UsedApiInfo
 * @typedef {UsedApiInfo}
 */
interface UsedApiInfo {
    apiName: string;
    usageType: 'call' | 'construct' | 'property' | 'type';
    memberPath: string[];
    fullPath: string[];
    parameterCount?: number;
    usageCount?: number;
    locations: Array<{
        file: string;
        line: number;
    }>;
}


/**
 * 插件api使用情况
 * @date 2025/12/03 - 17:48:56 PM
 * @author wubing
 *
 * @interface PluginApiUsage
 * @typedef {PluginApiUsage}
 */
interface PluginApiUsage {
    pluginId: string;
    pluginVersion: string;
    usedApis: UsedApiInfo[];
    generatedAt: string;
}


/**
 * 检查结果
 * @date 2025/12/03 - 17:49:37 PM
 * @author wubing
 *
 * @export
 * @interface CompatibilityCheckResult
 * @typedef {CompatibilityCheckResult}
 */
export interface CompatibilityCheckResult {
    compatible: boolean;
    pluginApiVersion?: string;
    currentIdeApiVersion?: string;
    errors?: string[];
}


/**
 * 兼容性检查器
 * @date 2025/12/03 - 17:49:20 PM
 * @author wubing
 *
 * @class CompatibilityChecker
 * @typedef {CompatibilityChecker}
 */
class CompatibilityChecker {
    private v1Apis: Record<string, ApiDefinition>;
    private v2Apis: Record<string, ApiDefinition>;
    private pluginUsage: PluginApiUsage;
    private errors: string[] = [];

    constructor(
        v1Data: IdeApiDeclaration,
        v2Data: IdeApiDeclaration,
        pluginUsage: PluginApiUsage
    ) {
        this.v1Apis = v1Data.apis;
        this.v2Apis = v2Data.apis;
        this.pluginUsage = pluginUsage;
    }

    public getErrors(): string[] {
        return this.errors;
    }


    /**
     * 检查入口函数
     * @date 2025/12/03 - 17:49:54 PM
     * @author wubing
     *
     * @returns {boolean}
     */
    check(): boolean {

        let isCompatible = true;

        for (let i = 0; i < this.pluginUsage.usedApis.length; i++) {
            const usage = this.pluginUsage.usedApis[i];

            // 在 v1 中查找 API 定义
            const v1Definition = this.findApiDefinition(this.v1Apis, usage);
            if (!v1Definition) {
                continue;
            }

            // 在 v2 中查找 API 定义
            const v2Definition = this.findApiDefinition(this.v2Apis, usage);
            if (!v2Definition) {
                this.reportError(
                    usage,
                    'API 已被删除',
                    `此 API 在 V2 中已不存在`,
                    v1Definition
                );
                isCompatible = false;
                continue;
            }

            // 根据使用类型进行兼容性检查
            const currentItemCompatible = this.checkCompatibility(usage, v1Definition, v2Definition);
            if (!currentItemCompatible) {
                isCompatible = false;
                continue;
            }
        }

        return isCompatible;
    }

    /**
     * 查找 API 定义
     */
    private findApiDefinition(
        apis: Record<string, ApiDefinition>,
        usage: UsedApiInfo
    ): ApiDefinition | FunctionSignature | PropertyInfo | null {
        const { apiName, memberPath } = usage;

        // 查找顶层 API
        let current: ApiDefinition | undefined = apis[apiName];
        if (!current) {
            return null;
        }

        // 如果没有成员路径，返回顶层 API
        if (memberPath.length === 0) {
            return current;
        }

        for (let i = 0; i < memberPath.length; i++) {
            const memberName = memberPath[i];
            const isLast = i === memberPath.length - 1;

            // 检查 namespace
            if (current.namespace && current.namespace[memberName]) {
                current = current.namespace[memberName];
                if (isLast) {
                    return current;
                }
                continue;
            }

            // 检查 methods
            if (current.methods && current.methods[memberName]) {
                if (isLast) {
                    return current.methods[memberName][0];
                }
                return null;
            }

            // 检查 properties
            if (current.properties && current.properties[memberName]) {
                if (isLast) {
                    return current.properties[memberName];
                }
                return null;
            }

            return null;
        }

        return current;
    }

    /**
     * 检查兼容性
     */
    private checkCompatibility(
        usage: UsedApiInfo,
        v1Def: ApiDefinition | FunctionSignature | PropertyInfo,
        v2Def: ApiDefinition | FunctionSignature | PropertyInfo
    ): boolean {
        switch (usage.usageType) {
            case 'call':
                return this.checkFunctionCallCompatibility(usage, v1Def, v2Def);
            case 'construct':
                return this.checkConstructorCompatibility(usage, v1Def, v2Def);
            case 'property':
                return this.checkPropertyCompatibility(usage, v1Def, v2Def);
            case 'type':
                return this.checkTypeCompatibility(usage, v1Def, v2Def);
            default:
                return true;
        }
    }

    /**
     * 检查函数调用兼容性
     */
    private checkFunctionCallCompatibility(
        usage: UsedApiInfo,
        v1Def: any,
        v2Def: any
    ): boolean {
        // 获取所有重载
        const v1Signatures = this.getAllFunctionSignatures(v1Def);
        const v2Signatures = this.getAllFunctionSignatures(v2Def);

        if (v1Signatures.length === 0 || v2Signatures.length === 0) {
            return true;
        }

        const paramCount = usage.parameterCount || 0;

        // 在 v1 中找到匹配参数数量的签名
        const v1MatchingSig = v1Signatures.find(sig => {
            const required = sig.parameters.filter(p => !p.optional).length;
            const total = sig.parameters.length;
            return paramCount >= required && paramCount <= total;
        });

        if (!v1MatchingSig) {
            return true;
        }

        // 在 v2 中找到匹配参数数量的签名
        const v2MatchingSig = v2Signatures.find(sig => {
            const required = sig.parameters.filter(p => !p.optional).length;
            const total = sig.parameters.length;
            return paramCount >= required && paramCount <= total;
        });

        if (!v2MatchingSig) {
            // V2 中没有匹配的签名，不兼容
            this.reportError(
                usage,
                '函数重载缺失',
                `V2 中没有接受 ${paramCount} 个参数的重载`,
                v1MatchingSig,
                v2Signatures[0]
            );
            return false;
        }

        return this.checkParametersCompatibility(usage, v1MatchingSig, v2MatchingSig);
    }

    /**
     * 检查构造函数兼容性
     */
    private checkConstructorCompatibility(
        usage: UsedApiInfo,
        v1Def: any,
        v2Def: any
    ): boolean {
        // 获取所有构造函数重载
        const v1Constructors = (v1Def as ApiDefinition).constructors || [];
        const v2Constructors = (v2Def as ApiDefinition).constructors || [];

        if (v1Constructors.length === 0 || v2Constructors.length === 0) {
            return true;
        }

        const paramCount = usage.parameterCount || 0;

        // 在 v1 中找到匹配参数数量的构造函数
        const v1MatchingCtor = v1Constructors.find(ctor => {
            const required = ctor.parameters.filter(p => !p.optional).length;
            const total = ctor.parameters.length;
            return paramCount >= required && paramCount <= total;
        });

        if (!v1MatchingCtor) {
            return true;
        }

        // 在 v2 中找到匹配参数数量的构造函数
        const v2MatchingCtor = v2Constructors.find(ctor => {
            const required = ctor.parameters.filter(p => !p.optional).length;
            const total = ctor.parameters.length;
            return paramCount >= required && paramCount <= total;
        });

        if (!v2MatchingCtor) {
            // V2 中没有匹配的构造函数，不兼容
            this.reportError(
                usage,
                '构造函数重载缺失',
                `V2 中没有接受 ${paramCount} 个参数的构造函数重载`,
                v1MatchingCtor,
                v2Constructors[0]
            );
            return false;
        }

        // 检查参数兼容性
        return this.checkParametersCompatibility(usage, v1MatchingCtor, v2MatchingCtor);
    }

    /**
     * 检查属性兼容性
     */
    private checkPropertyCompatibility(
        usage: UsedApiInfo,
        v1Def: any,
        v2Def: any
    ): boolean {
        const v1Prop = v1Def as PropertyInfo;
        const v2Prop = v2Def as PropertyInfo;

        // 检查属性类型是否改变
        if (v1Prop.type !== v2Prop.type) {
            this.reportError(
                usage,
                '属性类型改变',
                `属性类型从 "${v1Prop.type}" 改变为 "${v2Prop.type}"`,
                v1Prop,
                v2Prop
            );
            return false;
        }

        return true;
    }

    /**
     * 检查类型兼容性
     */
    private checkTypeCompatibility(
        usage: UsedApiInfo,
        v1Def: any,
        v2Def: any
    ): boolean {
        //TODO
        return true;
    }

    /**
     * 检查参数兼容性
     */
    private checkParametersCompatibility(
        usage: UsedApiInfo,
        v1Sig: FunctionSignature,
        v2Sig: FunctionSignature
    ): boolean {
        const paramCount = usage.parameterCount || 0;
        const v1Params = v1Sig.parameters;
        const v2Params = v2Sig.parameters;

        // 1. 检查插件传递的参数数量是否在 v2 的有效范围内
        const v2RequiredCount = v2Params.filter(p => !p.optional).length;
        const v2TotalCount = v2Params.length;

        if (paramCount < v2RequiredCount) {
            this.reportError(
                usage,
                '参数数量不足',
                `插件传递 ${paramCount} 个参数，但 V2 需要至少 ${v2RequiredCount} 个必需参数`,
                v1Sig,
                v2Sig
            );
            return false;
        }

        if (paramCount > v2TotalCount) {
            this.reportError(
                usage,
                '参数数量过多',
                `插件传递 ${paramCount} 个参数，但 V2 最多接受 ${v2TotalCount} 个参数`,
                v1Sig,
                v2Sig
            );
            return false;
        }

        // 2. 检查每个参数的类型兼容性
        for (let i = 0; i < paramCount; i++) {
            const v1Param = v1Params[i];
            const v2Param = v2Params[i];

            if (!v2Param) {
                this.reportError(
                    usage,
                    '参数被删除',
                    `第 ${i + 1} 个参数在 V2 中不存在`,
                    v1Sig,
                    v2Sig
                );
                return false;
            }

            // 检查参数是否从可选变为必需（Optional -> Required）
            if (v1Param && v1Param.optional && !v2Param.optional) {
                this.reportError(
                    usage,
                    '参数变为必需',
                    `第 ${i + 1} 个参数 "${v2Param.name}" 从可选变为必需。如果插件显式传递了 undefined，将导致不兼容。`,
                    v1Sig,
                    v2Sig
                );
                return false;
            }

            // 检查参数类型
            if (v1Param && v1Param.type !== v2Param.type) {
                if (!this.isTypeCompatible(v1Param.type, v2Param.type)) {
                    this.reportError(
                        usage,
                        '参数类型不兼容',
                        `第 ${i + 1} 个参数 "${v2Param.name}" 的类型从 "${v1Param.type}" 改变为 "${v2Param.type}"`,
                        v1Sig,
                        v2Sig
                    );
                    return false;
                }
            }
        }

        // 3. 检查返回类型
        if (v1Sig.returnType !== v2Sig.returnType) {
            if (!this.isTypeCompatible(v1Sig.returnType, v2Sig.returnType)) {
                this.reportError(
                    usage,
                    '返回类型不兼容',
                    `返回类型从 "${v1Sig.returnType}" 改变为 "${v2Sig.returnType}"`,
                    v1Sig,
                    v2Sig
                );
                return false;
            }
        }

        return true;
    }

    /**
     * 获取函数签名（考虑重载）
     */
    private getFunctionSignature(def: any): FunctionSignature | null {
        if ('parameters' in def && 'returnType' in def) {
            return def as FunctionSignature;
        }
        if ('signature' in def && def.signature) {
            return def.signature;
        }
        // 如果有多个签名（重载），返回第一个作为默认
        if ('signatures' in def && def.signatures && def.signatures.length > 0) {
            return def.signatures[0];
        }
        return null;
    }

    /**
     * 获取所有函数签名（用于处理重载）
     */
    private getAllFunctionSignatures(def: any): FunctionSignature[] {
        if ('signatures' in def && def.signatures) {
            return def.signatures;
        }
        const sig = this.getFunctionSignature(def);
        return sig ? [sig] : [];
    }

    /**
     * 类型兼容性检查
     */
    private isTypeCompatible(v1Type: string, v2Type: string): boolean {
        // 精确匹配
        if (v1Type === v2Type) {
            return true;
        }

        // any 类型兼容所有类型
        if (v2Type === 'any') {
            return true;
        }

        // 联合类型包含检查（简化版）
        // 例如: "T | undefined" 变为 "T | string"
        if (v2Type.includes('|')) {
            const v2Types = v2Type.split('|').map(t => t.trim());
            if (v2Types.includes(v1Type)) {
                return true;
            }
        }

        // 其他情况认为不兼容
        return false;
    }

    /**
     * 格式化参数列表
     */
    private formatParameters(params: ParameterInfo[]): string {
        if (params.length === 0) {
            return '()';
        }
        return '(' + params.map(p =>
            `${p.name}${p.optional ? '?' : ''}: ${p.type}`
        ).join(', ') + ')';
    }

    /**
     *
     * 获取错误信息
     */
    private reportError(
        usage: UsedApiInfo,
        errorType: string,
        message: string,
        v1Def?: any,
        v2Def?: any
    ): void {
        const locationStr = usage.locations.map(l => `${l.file}:${l.line}`).join(', ');
        const formattedError = `[${errorType}] ${message}\nAPI: ${usage.fullPath.join('.')}\n位置: ${locationStr}`;
        this.errors.push(formattedError);
    }
}


/**
 * 兼容性检查服务
 * @date 2025/12/03 - 17:28:17 PM
 * @author wubing
 *
 * @export
 * @class PluginApiCompatibilityService
 * @typedef {PluginApiCompatibilityService}
 * @implements {BackendApplicationContribution}
 */
@injectable()
export class PluginApiCompatibilityService implements BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    private currentIdeApiPath: string;
    private currentIdeApiData?: IdeApiDeclaration;

    constructor() {
        // 使用 require.resolve 动态定位 @baosky/plugin 包的位置
        try {
            const pluginPackagePath = require.resolve('@baosky/plugin/package.json');
            const pluginPackageDir = path.dirname(pluginPackagePath);
            this.currentIdeApiPath = path.join(pluginPackageDir, IDE_API_MANIFEST);
        } catch (error) {
            this.currentIdeApiPath = path.join(__dirname, '../../../plugin/plugin-api-manifest.json');
        }
    }

    /**
     * 在应用启动时初始化
     */
    async initialize(): Promise<void> {
        await this.loadIdeApiDefinition();
    }

    /**
     * 加载当前 IDE 的 API 定义
     */
    private async loadIdeApiDefinition(): Promise<void> {
        try {
            if (await fs.pathExists(this.currentIdeApiPath)) {
                const content = await fs.readFile(this.currentIdeApiPath, 'utf-8');
                this.currentIdeApiData = JSON.parse(content);
            } else {
                this.logger.warn(`[API Compatibility] IDE API 未找到: ${this.currentIdeApiPath}`);
            }
        } catch (error) {
            this.logger.error('[API Compatibility] 加载IDE API声明失败:', error);
        }
    }

    /**
     * 检查插件的 API 兼容性
     * @param pluginPath 插件的根路径
     * @param isSystemPlugin 是否是系统插件（系统插件跳过检查）
     * @returns 兼容性检查结果
     */
    async checkCompatibility(pluginPath: string, isSystemPlugin: boolean = false): Promise<CompatibilityCheckResult> {
        // 系统插件跳过兼容性检查
        if (isSystemPlugin) {
            return { compatible: true };
        }
        try {
            // 检查插件的 API 文件是否存在
            const pluginApiOutputPath = path.join(pluginPath, IDE_API_MANIFEST);
            const pluginApiUsagePath = path.join(pluginPath, PLUGUIN_API_USAGE);

            const hasPluginApiOutput = await fs.pathExists(pluginApiOutputPath);
            const hasPluginApiUsage = await fs.pathExists(pluginApiUsagePath);

            // 用户插件必须有兼容性文件
            if (!hasPluginApiOutput || !hasPluginApiUsage) {
                const missingFiles: string[] = [];
                if (!hasPluginApiOutput) {
                    missingFiles.push(IDE_API_MANIFEST);
                }
                if (!hasPluginApiUsage) {
                    missingFiles.push('plugin-api-usage.json');
                }
                this.logger.error(
                    `[API Compatibility] 路径 ${pluginPath} 下未找到插件兼容性文件: ${missingFiles.join(', ')}`
                );
                return {
                    compatible: false,
                    errors: [`缺失插件兼容性检查文件: ${missingFiles.join(', ')}`]
                };
            }

            if (!this.currentIdeApiData) {
                this.logger.warn(
                    '[API Compatibility] 当前IDE的API声明文件未找到，默认允许插件加载. '
                );
                return { compatible: true };
            }

            // 加载插件的 API 信息
            const pluginApiOutput: IdeApiDeclaration = JSON.parse(
                await fs.readFile(pluginApiOutputPath, 'utf-8')
            );
            const pluginApiUsage: PluginApiUsage = JSON.parse(
                await fs.readFile(pluginApiUsagePath, 'utf-8')
            );

            this.logger.info(
                `[API Compatibility] 正在检查插件 "${pluginApiUsage.pluginId}" ` +
                `(插件 API 版本: ${pluginApiOutput.version}) vs IDE API 版本: ${this.currentIdeApiData.version}`
            );

            // 执行兼容性检查
            const checker = new CompatibilityChecker(
                pluginApiOutput,
                this.currentIdeApiData,
                pluginApiUsage
            );

            const compatible = checker.check();
            const errors = checker.getErrors();

            if (!compatible) {
                this.logger.error(
                    `[API Compatibility] 插件 "${pluginApiUsage.pluginId}" 与当前IDE的API系统不兼容:\n` +
                    errors.map(err => `  - ${err}`).join('\n')
                );
            }

            return {
                compatible,
                pluginApiVersion: pluginApiOutput.version,
                currentIdeApiVersion: this.currentIdeApiData.version,
                errors: compatible ? undefined : errors
            };

        } catch (error) {
            this.logger.error(`[API Compatibility] 兼容性检查失败 ${pluginPath}:`, error);
            return {
                compatible: false,
                errors: [`兼容性检查失败原因: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }
}

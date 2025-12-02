// *****************************************************************************
// Copyright (C) 2024 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';

// ============================================================================
// 类型定义
// ============================================================================

interface ParameterInfo {
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
}

interface FunctionSignature {
    parameters: ParameterInfo[];
    returnType: string;
    typeParameters?: string[];
}

interface PropertyInfo {
    name: string;
    type: string;
    readonly: boolean;
    optional: boolean;
}

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

interface PluginApiUsage {
    pluginId: string;
    pluginVersion: string;
    usedApis: UsedApiInfo[];
    generatedAt: string;
}

export interface CompatibilityCheckResult {
    compatible: boolean;
    pluginApiVersion?: string;
    currentIdeApiVersion?: string;
    errors?: string[];
}

// ============================================================================
// 兼容性检查器（核心算法）
// ============================================================================

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

    /**
     * 执行兼容性检查
     */
    check(): boolean {
        for (const usage of this.pluginUsage.usedApis) {
            // 1. 在 v1 中查找 API 定义
            const v1Definition = this.findApiDefinition(this.v1Apis, usage);
            if (!v1Definition) {
                // 如果在 v1 中未找到，可能是运行时 API，跳过检查
                continue;
            }

            // 2. 在 v2 中查找 API 定义
            const v2Definition = this.findApiDefinition(this.v2Apis, usage);
            if (!v2Definition) {
                this.errors.push(
                    `API ${usage.fullPath.join('.')} 已被删除 (used in ${usage.locations[0].file}:${usage.locations[0].line})`
                );
                return false;
            }

            // 3. 根据使用类型进行兼容性检查
            const compatible = this.checkCompatibility(usage, v1Definition, v2Definition);
            if (!compatible) {
                return false;
            }
        }

        return true;
    }

    getErrors(): string[] {
        return this.errors;
    }

    /**
     * 查找 API 定义
     */
    private findApiDefinition(
        apis: Record<string, ApiDefinition>,
        usage: UsedApiInfo
    ): ApiDefinition | FunctionSignature | PropertyInfo | null {
        const { apiName, memberPath } = usage;

        // 1. 查找顶层 API
        let current: ApiDefinition | undefined = apis[apiName];
        if (!current) {
            return null;
        }

        // 2. 如果没有成员路径，返回顶层 API
        if (memberPath.length === 0) {
            return current;
        }

        // 3. 遍历成员路径
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
                    return current.methods[memberName][0]; // 返回第一个重载
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

            // 未找到
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
            this.errors.push(
                `函数 ${usage.fullPath.join('.')} 不再支持 ${paramCount} 个参数 (used in ${usage.locations[0].file}:${usage.locations[0].line})`
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
        const v1Constructors = (v1Def as ApiDefinition).constructors || [];
        const v2Constructors = (v2Def as ApiDefinition).constructors || [];

        if (v1Constructors.length === 0 || v2Constructors.length === 0) {
            return true;
        }

        const paramCount = usage.parameterCount || 0;

        const v1MatchingCtor = v1Constructors.find(ctor => {
            const required = ctor.parameters.filter(p => !p.optional).length;
            const total = ctor.parameters.length;
            return paramCount >= required && paramCount <= total;
        });

        if (!v1MatchingCtor) {
            return true;
        }

        const v2MatchingCtor = v2Constructors.find(ctor => {
            const required = ctor.parameters.filter(p => !p.optional).length;
            const total = ctor.parameters.length;
            return paramCount >= required && paramCount <= total;
        });

        if (!v2MatchingCtor) {
            this.errors.push(
                `构造函数 ${usage.fullPath.join('.')} 不再支持 ${paramCount} 个参数 (used in ${usage.locations[0].file}:${usage.locations[0].line})`
            );
            return false;
        }

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

        if (v1Prop.type !== v2Prop.type) {
            this.errors.push(
                `属性 ${usage.fullPath.join('.')} 类型从 "${v1Prop.type}" 改变为 "${v2Prop.type}" (used in ${usage.locations[0].file}:${usage.locations[0].line})`
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
        const v2Params = v2Sig.parameters;

        const v2RequiredCount = v2Params.filter(p => !p.optional).length;
        const v2TotalCount = v2Params.length;

        if (paramCount < v2RequiredCount) {
            this.errors.push(
                `${usage.fullPath.join('.')} 需要至少 ${v2RequiredCount} 个参数，但插件传递了 ${paramCount} 个 (used in ${usage.locations[0].file}:${usage.locations[0].line})`
            );
            return false;
        }

        if (paramCount > v2TotalCount) {
            this.errors.push(
                `${usage.fullPath.join('.')} 最多接受 ${v2TotalCount} 个参数，但插件传递了 ${paramCount} 个 (used in ${usage.locations[0].file}:${usage.locations[0].line})`
            );
            return false;
        }

        const v1Params = v1Sig.parameters;
        for (let i = 0; i < paramCount; i++) {
            const v1Param = v1Params[i];
            const v2Param = v2Params[i];

            if (!v2Param) {
                this.errors.push(
                    `${usage.fullPath.join('.')} 第 ${i + 1} 个参数在新版本中不存在 (used in ${usage.locations[0].file}:${usage.locations[0].line})`
                );
                return false;
            }

            if (v1Param && v1Param.type !== v2Param.type) {
                if (!this.isTypeCompatible(v1Param.type, v2Param.type)) {
                    this.errors.push(
                        `${usage.fullPath.join('.')} 第 ${i + 1} 个参数类型从 "${v1Param.type}" 改变为 "${v2Param.type}" (used in ${usage.locations[0].file}:${usage.locations[0].line})`
                    );
                    return false;
                }
            }
        }

        return true;
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
     * 获取函数签名（考虑重载）
     */
    private getFunctionSignature(def: any): FunctionSignature | null {
        if ('parameters' in def && 'returnType' in def) {
            return def as FunctionSignature;
        }
        if ('signature' in def && def.signature) {
            return def.signature;
        }
        if ('signatures' in def && def.signatures && def.signatures.length > 0) {
            return def.signatures[0];
        }
        return null;
    }

    /**
     * 简化的类型兼容性检查
     */
    private isTypeCompatible(v1Type: string, v2Type: string): boolean {
        if (v1Type === v2Type) {
            return true;
        }
        if (v2Type === 'any') {
            return true;
        }
        if (v2Type.includes('|')) {
            const v2Types = v2Type.split('|').map(t => t.trim());
            if (v2Types.includes(v1Type)) {
                return true;
            }
        }
        return false;
    }
}

// ============================================================================
// 兼容性检查服务
// ============================================================================

@injectable()
export class PluginApiCompatibilityService implements BackendApplicationContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    private currentIdeApiPath: string;
    private currentIdeApiData?: IdeApiDeclaration;

    constructor() {
        // 使用 require.resolve 动态定位 @theia/plugin 包的位置
        try {
            // 定位 @theia/plugin 包的 package.json
            const pluginPackagePath = require.resolve('@theia/plugin/package.json');
            // 获取包的根目录
            const pluginPackageDir = path.dirname(pluginPackagePath);
            // 拼接 API 定义文件路径
            this.currentIdeApiPath = path.join(pluginPackageDir, 'ide-api-output.json');
        } catch (error) {
            // 如果找不到包，回退到相对路径
            this.currentIdeApiPath = path.join(__dirname, '../../../plugin/ide-api-output.json');
        }
    }

    /**
     * BackendApplicationContribution: 在应用启动时初始化
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
                this.logger.info(`[API Compatibility] Loaded IDE API version: ${this.currentIdeApiData?.version}`);
            } else {
                this.logger.warn(`[API Compatibility] IDE API definition file not found at: ${this.currentIdeApiPath}`);
            }
        } catch (error) {
            this.logger.error('[API Compatibility] Failed to load IDE API definition:', error);
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
            this.logger.debug(`[API Compatibility] Skipping compatibility check for system plugin at ${pluginPath}`);
            return { compatible: true };
        }
        try {
            // 1. 检查插件的 API 文件是否存在
            const pluginApiOutputPath = path.join(pluginPath, 'ide-api-output.json');
            const pluginApiUsagePath = path.join(pluginPath, 'plugin-api-usage.json');

            const hasPluginApiOutput = await fs.pathExists(pluginApiOutputPath);
            const hasPluginApiUsage = await fs.pathExists(pluginApiUsagePath);

            // 用户插件必须有兼容性文件
            if (!hasPluginApiOutput || !hasPluginApiUsage) {
                const missingFiles = [];
                if (!hasPluginApiOutput) {
                    missingFiles.push('ide-api-output.json');
                }
                if (!hasPluginApiUsage) {
                    missingFiles.push('plugin-api-usage.json');
                }
                this.logger.error(
                    `[API Compatibility] Plugin at ${pluginPath} is missing required compatibility files: ${missingFiles.join(', ')}`
                );
                return {
                    compatible: false,
                    errors: [`Plugin is missing required API compatibility files: ${missingFiles.join(', ')}`]
                };
            }

            // 2. 检查当前 IDE 的 API 是否已加载
            if (!this.currentIdeApiData) {
                this.logger.warn(
                    '[API Compatibility] Current IDE API definition not loaded. ' +
                    'This may indicate a system issue, but allowing plugin deployment to continue.'
                );
                // IDE API 未加载不是插件的问题，记录警告但允许部署
                return { compatible: true };
            }

            // 3. 加载插件的 API 信息
            const pluginApiOutput: IdeApiDeclaration = JSON.parse(
                await fs.readFile(pluginApiOutputPath, 'utf-8')
            );
            const pluginApiUsage: PluginApiUsage = JSON.parse(
                await fs.readFile(pluginApiUsagePath, 'utf-8')
            );

            this.logger.info(
                `[API Compatibility] Checking plugin "${pluginApiUsage.pluginId}" ` +
                `(API version: ${pluginApiOutput.version}) against IDE API version: ${this.currentIdeApiData.version}`
            );

            // 4. 执行兼容性检查
            const checker = new CompatibilityChecker(
                pluginApiOutput,
                this.currentIdeApiData,
                pluginApiUsage
            );

            const compatible = checker.check();
            const errors = checker.getErrors();

            if (!compatible) {
                this.logger.error(
                    `[API Compatibility] Plugin "${pluginApiUsage.pluginId}" is not compatible with current IDE API:\n` +
                    errors.map(err => `  - ${err}`).join('\n')
                );
            } else {
                this.logger.info(`[API Compatibility] Plugin "${pluginApiUsage.pluginId}" is compatible`);
            }

            return {
                compatible,
                pluginApiVersion: pluginApiOutput.version,
                currentIdeApiVersion: this.currentIdeApiData.version,
                errors: compatible ? undefined : errors
            };

        } catch (error) {
            this.logger.error(`[API Compatibility] Error checking plugin compatibility at ${pluginPath}:`, error);
            // 检查出错时，采用 fail-safe 策略，拒绝部署
            return {
                compatible: false,
                errors: [`Compatibility check failed due to error: ${error instanceof Error ? error.message : String(error)}`]
            };
        }
    }
}

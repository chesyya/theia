// *****************************************************************************
// Copyright (C) 2024 Baosky and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * 兼容性检查器
 * 
 * 功能：比较签名，检查插件 API 使用与 IDE 声明的兼容性
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 参数信息
 */
export interface ParameterInfo {
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
}

/**
 * 函数/方法签名
 */
export interface FunctionSignature {
    parameters: ParameterInfo[];
    returnType: string;
    typeParameters?: string[];
}

/**
 * 属性信息
 */
export interface PropertyInfo {
    name: string;
    type: string;
    readonly: boolean;
    optional: boolean;
}

/**
 * API 定义（用于 IDE 声明）
 */
export interface ApiDefinition {
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

/**
 * IDE API 声明
 */
export interface IdeApiDeclaration {
    version: string;
    generatedAt: string;
    apis: Record<string, ApiDefinition>;
}

/**
 * 使用的 API 信息
 */
export interface UsedApiInfo {
    apiName: string;
    usageType: 'call' | 'construct' | 'property' | 'type';
    memberPath?: string[];
    parameterCount?: number;
    locations: Array<{
        file: string;
        line: number;
    }>;
}

/**
 * 插件 API 使用记录
 */
export interface PluginApiUsage {
    pluginId: string;
    pluginVersion: string;
    usedApis: UsedApiInfo[];
    generatedAt: string;
}

/**
 * 兼容性问题
 */
export interface CompatibilityIssue {
    severity: 'error' | 'warning' | 'info';
    apiName: string;
    memberPath?: string[];
    issue: string;
    pluginUsage?: UsedApiInfo;
    ideDefinition?: ApiDefinition;
}

/**
 * 兼容性检查结果
 */
export interface CompatibilityResult {
    compatible: boolean;
    issues: CompatibilityIssue[];
    summary: {
        totalApis: number;
        compatibleApis: number;
        incompatibleApis: number;
        missingApis: number;
    };
}

// ============================================================================
// 兼容性检查器
// ============================================================================

export class SignatureCompatibilityChecker {
    /**
     * 检查兼容性
     */
    checkCompatibility(
        pluginUsage: PluginApiUsage,
        ideDeclaration: IdeApiDeclaration
    ): CompatibilityResult {
        // 早期退出：一旦发现不兼容就立即返回
        for (const usage of pluginUsage.usedApis) {
            const checkResult = this.checkApiUsage(usage, ideDeclaration);

            // 如果发现错误级别的不兼容，立即返回
            if (!checkResult.compatible) {
                const errorIssues = checkResult.issues.filter(i => i.severity === 'error');
                if (errorIssues.length > 0) {
                    return {
                        compatible: false,
                        issues: errorIssues,
                        summary: {
                            totalApis: pluginUsage.usedApis.length,
                            compatibleApis: 0,
                            incompatibleApis: 1,
                            missingApis: checkResult.missing ? 1 : 0
                        }
                    };
                }
            }
        }

        // 所有检查通过
        return {
            compatible: true,
            issues: [],
            summary: {
                totalApis: pluginUsage.usedApis.length,
                compatibleApis: pluginUsage.usedApis.length,
                incompatibleApis: 0,
                missingApis: 0
            }
        };
    }

    /**
     * 检查单个 API 使用
     */
    private checkApiUsage(
        usage: UsedApiInfo,
        ideDeclaration: IdeApiDeclaration
    ): { compatible: boolean; missing: boolean; issues: CompatibilityIssue[] } {
        const issues: CompatibilityIssue[] = [];

        // 查找 API 定义
        const apiDef = ideDeclaration.apis[usage.apiName];

        if (!apiDef) {
            issues.push({
                severity: 'error',
                apiName: usage.apiName,
                memberPath: usage.memberPath,
                issue: `API '${usage.apiName}' not found in IDE declaration`,
                pluginUsage: usage
            });
            return { compatible: false, missing: true, issues };
        }

        // 如果有成员路径，检查成员
        if (usage.memberPath && usage.memberPath.length > 0) {
            const memberCheck = this.checkMemberAccess(usage, apiDef);
            issues.push(...memberCheck.issues);
            return { compatible: memberCheck.compatible, missing: false, issues };
        }

        // 检查直接使用
        if (usage.usageType === 'call') {
            const callCheck = this.checkFunctionCall(usage, apiDef);
            issues.push(...callCheck.issues);
            return { compatible: callCheck.compatible, missing: false, issues };
        }

        if (usage.usageType === 'construct') {
            const constructCheck = this.checkConstructor(usage, apiDef);
            issues.push(...constructCheck.issues);
            return { compatible: constructCheck.compatible, missing: false, issues };
        }

        return { compatible: true, missing: false, issues };
    }

    /**
     * 检查成员访问
     */
    private checkMemberAccess(
        usage: UsedApiInfo,
        apiDef: ApiDefinition
    ): { compatible: boolean; issues: CompatibilityIssue[] } {
        const issues: CompatibilityIssue[] = [];
        const memberPath = usage.memberPath!;

        let current: ApiDefinition | undefined = apiDef;

        // 如果 memberPath 的第一个元素和 apiName 相同，跳过它
        const startIndex = (memberPath.length > 0 && memberPath[0] === usage.apiName) ? 1 : 0;

        for (let i = startIndex; i < memberPath.length; i++) {
            const member = memberPath[i];

            if (!current) {
                issues.push({
                    severity: 'error',
                    apiName: usage.apiName,
                    memberPath: memberPath.slice(0, i + 1),
                    issue: `Cannot access member '${member}' - parent is not defined`,
                    pluginUsage: usage
                });
                return { compatible: false, issues };
            }

            // 检查方法
            if (current.methods && member in current.methods) {
                if (i === memberPath.length - 1 && usage.usageType === 'call') {
                    // 最后一个成员且是调用，检查签名
                    const signatures = current.methods[member];
                    const paramCheck = this.checkParameterCount(usage.parameterCount || 0, signatures);
                    if (!paramCheck.compatible) {
                        issues.push({
                            severity: 'warning',
                            apiName: usage.apiName,
                            memberPath,
                            issue: paramCheck.issue!,
                            pluginUsage: usage,
                            ideDefinition: apiDef
                        });
                    }
                }
                return { compatible: issues.length === 0, issues };
            }

            // 检查属性
            if (current.properties && member in current.properties) {
                return { compatible: true, issues };
            }

            // 检查枚举值
            if (current.kind === 'enum' && current.enumValues && current.enumValues.includes(member)) {
                return { compatible: true, issues };
            }

            // 检查命名空间
            if (current.namespace && member in current.namespace) {
                current = current.namespace[member];
                continue;
            }

            // 成员不存在
            issues.push({
                severity: 'error',
                apiName: usage.apiName,
                memberPath: memberPath.slice(0, i + 1),
                issue: `Member '${member}' not found on '${usage.apiName}'`,
                pluginUsage: usage,
                ideDefinition: apiDef
            });
            return { compatible: false, issues };
        }

        return { compatible: issues.length === 0, issues };
    }

    /**
     * 检查函数调用
     */
    private checkFunctionCall(
        usage: UsedApiInfo,
        apiDef: ApiDefinition
    ): { compatible: boolean; issues: CompatibilityIssue[] } {
        const issues: CompatibilityIssue[] = [];

        if (apiDef.kind !== 'function' || !apiDef.signature) {
            issues.push({
                severity: 'error',
                apiName: usage.apiName,
                issue: `'${usage.apiName}' is not a function`,
                pluginUsage: usage,
                ideDefinition: apiDef
            });
            return { compatible: false, issues };
        }

        const paramCheck = this.checkParameterCount(usage.parameterCount || 0, [apiDef.signature]);
        if (!paramCheck.compatible) {
            issues.push({
                severity: 'warning',
                apiName: usage.apiName,
                issue: paramCheck.issue!,
                pluginUsage: usage,
                ideDefinition: apiDef
            });
        }

        return { compatible: issues.length === 0, issues };
    }

    /**
     * 检查构造函数
     */
    private checkConstructor(
        usage: UsedApiInfo,
        apiDef: ApiDefinition
    ): { compatible: boolean; issues: CompatibilityIssue[] } {
        const issues: CompatibilityIssue[] = [];

        if (apiDef.kind !== 'class' || !apiDef.constructors || apiDef.constructors.length === 0) {
            issues.push({
                severity: 'error',
                apiName: usage.apiName,
                issue: `'${usage.apiName}' is not constructable`,
                pluginUsage: usage,
                ideDefinition: apiDef
            });
            return { compatible: false, issues };
        }

        const paramCheck = this.checkParameterCount(usage.parameterCount || 0, apiDef.constructors);
        if (!paramCheck.compatible) {
            issues.push({
                severity: 'warning',
                apiName: usage.apiName,
                issue: paramCheck.issue!,
                pluginUsage: usage,
                ideDefinition: apiDef
            });
        }

        return { compatible: issues.length === 0, issues };
    }

    /**
     * 检查参数数量（支持可选参数）
     */
    private checkParameterCount(
        providedCount: number,
        signatures: FunctionSignature[]
    ): { compatible: boolean; issue?: string } {
        for (const sig of signatures) {
            const requiredParams = sig.parameters.filter(p => !p.optional).length;
            const totalParams = sig.parameters.length;

            // 如果提供的参数在必需和总数之间，就兼容
            if (providedCount >= requiredParams && providedCount <= totalParams) {
                return { compatible: true };
            }

            // 如果 IDE 的 API 增加了可选参数，仍然兼容
            if (providedCount >= requiredParams && providedCount < totalParams) {
                return { compatible: true };
            }
        }

        return {
            compatible: false,
            issue: `Parameter count mismatch: provided ${providedCount}, expected ${signatures.map(s => {
                const required = s.parameters.filter(p => !p.optional).length;
                const total = s.parameters.length;
                return required === total ? `${required}` : `${required}-${total}`;
            }).join(' or ')}`
        };
    }

    /**
     * 生成兼容性报告
     */
    generateReport(result: CompatibilityResult, pluginUsage: PluginApiUsage): string {
        const lines: string[] = [];

        lines.push('# API 兼容性检查报告\n');
        lines.push(`**插件:** ${pluginUsage.pluginId} v${pluginUsage.pluginVersion}`);
        lines.push(`**检查时间:** ${new Date().toISOString()}\n`);

        lines.push('## 概览\n');
        lines.push(`- **总 API 数:** ${result.summary.totalApis}`);
        lines.push(`- **兼容:** ${result.summary.compatibleApis}`);
        lines.push(`- **不兼容:** ${result.summary.incompatibleApis}`);
        lines.push(`- **缺失:** ${result.summary.missingApis}`);
        lines.push(`- **结果:** ${result.compatible ? '✅ 兼容' : '❌ 不兼容'}\n`);

        if (result.issues.length > 0) {
            lines.push('## 问题详情\n');

            const errors = result.issues.filter(i => i.severity === 'error');
            const warnings = result.issues.filter(i => i.severity === 'warning');

            if (errors.length > 0) {
                lines.push('### ❌ 错误\n');
                for (const issue of errors) {
                    lines.push(`- **${issue.apiName}${issue.memberPath ? '.' + issue.memberPath.join('.') : ''}**`);
                    lines.push(`  ${issue.issue}`);
                    if (issue.pluginUsage?.locations[0]) {
                        lines.push(`  位置: ${issue.pluginUsage.locations[0].file}:${issue.pluginUsage.locations[0].line}`);
                    }
                    lines.push('');
                }
            }

            if (warnings.length > 0) {
                lines.push('### ⚠️  警告\n');
                for (const issue of warnings) {
                    lines.push(`- **${issue.apiName}${issue.memberPath ? '.' + issue.memberPath.join('.') : ''}**`);
                    lines.push(`  ${issue.issue}`);
                    lines.push('');
                }
            }
        }

        return lines.join('\n');
    }
}

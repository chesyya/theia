/**
 * API 兼容性检查器
 *
 * 功能：
 * 1. 读取插件使用的 API 列表
 * 2. 对比 IDE API 的 v1 和 v2 版本
 * 3. 检测不兼容的变更
 */

import * as fs from 'fs';
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

// ============================================================================
// 兼容性检查器
// ============================================================================

class CompatibilityChecker {
    private v1Apis: Record<string, ApiDefinition>;
    private v2Apis: Record<string, ApiDefinition>;
    private pluginUsage: PluginApiUsage;

    constructor(
        v1ApiPath: string,
        v2ApiPath: string,
        usagePath: string
    ) {
        console.log('📖 加载 API 定义和使用信息...\n');

        const v1Data: IdeApiDeclaration = JSON.parse(fs.readFileSync(v1ApiPath, 'utf-8'));
        const v2Data: IdeApiDeclaration = JSON.parse(fs.readFileSync(v2ApiPath, 'utf-8'));
        this.pluginUsage = JSON.parse(fs.readFileSync(usagePath, 'utf-8'));

        this.v1Apis = v1Data.apis;
        this.v2Apis = v2Data.apis;

        console.log(`✅ V1 API 版本: ${v1Data.version}`);
        console.log(`✅ V2 API 版本: ${v2Data.version}`);
        console.log(`✅ 插件: ${this.pluginUsage.pluginId} v${this.pluginUsage.pluginVersion}`);
        console.log(`✅ 需要检查 ${this.pluginUsage.usedApis.length} 个 API 使用\n`);
    }

    /**
     * 执行兼容性检查
     */
    check(): boolean {
        console.log('🔍 开始兼容性检查...\n');
        console.log('='.repeat(80));

        for (let i = 0; i < this.pluginUsage.usedApis.length; i++) {
            const usage = this.pluginUsage.usedApis[i];
            console.log(`\n[${i + 1}/${this.pluginUsage.usedApis.length}] 检查: ${usage.fullPath.join('.')}`);
            console.log(`    使用类型: ${usage.usageType}`);
            console.log(`    使用位置: ${usage.locations[0].file}:${usage.locations[0].line}`);

            // 1. 在 v1 中查找 API 定义
            const v1Definition = this.findApiDefinition(this.v1Apis, usage);
            if (!v1Definition) {
                console.log(`    ⚠️  警告: 在 V1 中未找到此 API 定义（可能是运行时 API）`);
                console.log('    ⏭️  跳过检查');
                continue;
            }

            // 2. 在 v2 中查找 API 定义
            const v2Definition = this.findApiDefinition(this.v2Apis, usage);
            if (!v2Definition) {
                this.reportError(
                    usage,
                    'API 已被删除',
                    `此 API 在 V2 中已不存在`,
                    v1Definition
                );
                return false;
            }

            // 3. 根据使用类型进行兼容性检查
            const compatible = this.checkCompatibility(usage, v1Definition, v2Definition);
            if (!compatible) {
                return false;
            }

            console.log(`    ✅ 兼容`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n🎉 所有 API 检查通过！插件与 V2 版本兼容。\n');
        return true;
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
                // methods 不能再继续深入
                return null;
            }

            // 检查 properties
            if (current.properties && current.properties[memberName]) {
                if (isLast) {
                    return current.properties[memberName];
                }
                // 需要继续深入，但 property 的类型信息不足以继续
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
        // 获取所有重载
        const v1Signatures = this.getAllFunctionSignatures(v1Def);
        const v2Signatures = this.getAllFunctionSignatures(v2Def);

        if (v1Signatures.length === 0 || v2Signatures.length === 0) {
            console.log(`    ⚠️  无法获取函数签名`);
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
            console.log(`    ⚠️  在 V1 中未找到匹配 ${paramCount} 个参数的重载`);
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
            console.log(`    ❌ V2 中没有接受 ${paramCount} 个参数的重载`);
            console.log(`    📝 V1 有 ${v1Signatures.length} 个重载，V2 有 ${v2Signatures.length} 个重载`);
            this.reportError(
                usage,
                '函数重载缺失',
                `V2 中没有接受 ${paramCount} 个参数的重载`,
                v1MatchingSig,
                v2Signatures[0]
            );
            return false;
        }

        // 检查匹配的签名是否兼容
        console.log(`    📝 V1 匹配重载: ${this.formatParameters(v1MatchingSig.parameters)}`);
        console.log(`    📝 V2 匹配重载: ${this.formatParameters(v2MatchingSig.parameters)}`);
        console.log(`    📝 实际传递: ${paramCount} 个参数`);

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
            console.log(`    ⚠️  无法获取构造函数签名`);
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
            console.log(`    ⚠️  在 V1 中未找到匹配 ${paramCount} 个参数的构造函数重载`);
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
            console.log(`    ❌ V2 中没有接受 ${paramCount} 个参数的构造函数重载`);
            this.reportError(
                usage,
                '构造函数重载缺失',
                `V2 中没有接受 ${paramCount} 个参数的构造函数重载`,
                v1MatchingCtor,
                v2Constructors[0]
            );
            return false;
        }

        console.log(`    📝 V1 匹配重载: ${this.formatParameters(v1MatchingCtor.parameters)}`);
        console.log(`    📝 V2 匹配重载: ${this.formatParameters(v2MatchingCtor.parameters)}`);
        console.log(`    📝 实际传递: ${paramCount} 个参数`);

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

        // 检查 optional 状态
        if (!v1Prop.optional && v2Prop.optional) {
            // 必需变为可选：兼容
            console.log(`    ℹ️  属性从必需变为可选（兼容的变更）`);
        } else if (v1Prop.optional && !v2Prop.optional) {
            // 可选变为必需：可能不兼容，但属性访问通常是兼容的
            console.log(`    ⚠️  属性从可选变为必需`);
        }

        // 检查 readonly 状态
        if (!v1Prop.readonly && v2Prop.readonly) {
            // writable 变为 readonly：对于属性读取是兼容的
            console.log(`    ℹ️  属性变为只读（对于读取操作兼容）`);
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
        // 简化实现：只检查类型是否存在
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

        console.log(`    📝 V1 参数: ${this.formatParameters(v1Params)}`);
        console.log(`    📝 V2 参数: ${this.formatParameters(v2Params)}`);
        console.log(`    📝 实际传递: ${paramCount} 个参数`);

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

            // 检查参数类型
            if (v1Param && v1Param.type !== v2Param.type) {
                // 简化的类型检查：精确匹配
                // 实际应用中需要更复杂的类型兼容性检查
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
     * 简化的类型兼容性检查
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
     * 报告错误
     */
    private reportError(
        usage: UsedApiInfo,
        errorType: string,
        message: string,
        v1Def?: any,
        v2Def?: any
    ): void {
        console.log('\n' + '='.repeat(80));
        console.log('❌ 兼容性错误\n');
        console.log(`API: ${usage.fullPath.join('.')}`);
        console.log(`类型: ${errorType}`);
        console.log(`详情: ${message}`);
        console.log(`\n使用位置:`);
        usage.locations.forEach(loc => {
            console.log(`  - ${loc.file}:${loc.line}`);
        });

        if (v1Def) {
            console.log('\nV1 定义:');
            console.log(JSON.stringify(v1Def, null, 2));
        }

        if (v2Def) {
            console.log('\nV2 定义:');
            console.log(JSON.stringify(v2Def, null, 2));
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n💡 建议: 请更新插件代码以适配新的 API 定义，或使用兼容的 IDE 版本。\n');
    }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let v1ApiPath = path.join(__dirname, 'ide-api-output.json');
    let v2ApiPath = path.join(__dirname, 'ide-api-output-v2.json');
    let usagePath = path.join(__dirname, 'plugin-api-usage.json');

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--v1' && i + 1 < args.length) {
            v1ApiPath = args[++i];
        } else if (args[i] === '--v2' && i + 1 < args.length) {
            v2ApiPath = args[++i];
        } else if (args[i] === '--usage' && i + 1 < args.length) {
            usagePath = args[++i];
        } else if (args[i] === '--help') {
            console.log('用法: npx ts-node compatibility-checker.ts [选项]');
            console.log('\n选项:');
            console.log('  --v1 <path>      V1 API 定义文件路径 (默认: ide-api-output.json)');
            console.log('  --v2 <path>      V2 API 定义文件路径 (默认: ide-api-output-v2.json)');
            console.log('  --usage <path>   插件 API 使用文件路径 (默认: plugin-api-usage.json)');
            console.log('  --help           显示帮助信息');
            process.exit(0);
        }
    }

    // 检查文件是否存在
    if (!fs.existsSync(v1ApiPath)) {
        console.error(`❌ 文件不存在: ${v1ApiPath}`);
        process.exit(1);
    }
    if (!fs.existsSync(v2ApiPath)) {
        console.error(`❌ 文件不存在: ${v2ApiPath}`);
        process.exit(1);
    }
    if (!fs.existsSync(usagePath)) {
        console.error(`❌ 文件不存在: ${usagePath}`);
        process.exit(1);
    }

    try {
        const checker = new CompatibilityChecker(v1ApiPath, v2ApiPath, usagePath);
        const compatible = checker.check();

        if (!compatible) {
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ 检查过程中发生错误:', error);
        process.exit(1);
    }
}

main();

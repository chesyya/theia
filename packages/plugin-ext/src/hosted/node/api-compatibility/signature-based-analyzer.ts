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
 * 基于签名的 API 兼容性分析器
 *
 * 功能：
 * 1. 提取插件使用的 API 及其签名
 * 2. 从 IDE 的 theia.d.ts 生成 API 定义 JSON
 * 3. 比较签名，检查兼容性
 */

import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 函数/方法签名
 */
export interface FunctionSignature {
    parameters: ParameterInfo[];
    returnType: string;
    typeParameters?: string[];
}

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
    methods?: Record<string, FunctionSignature[]>; // 支持重载
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
 * 插件 API 使用记录
 */
export interface PluginApiUsage {
    pluginId: string;
    pluginVersion: string;
    usedApis: UsedApiInfo[];
    generatedAt: string;
}

/**
 * 使用的 API 信息
 */
export interface UsedApiInfo {
    apiName: string;
    /** 使用的方式 */
    usageType: 'call' | 'construct' | 'property' | 'type';
    /** 访问的成员路径，如 ['commands', 'registerCommand'] */
    memberPath?: string[];
    /** 如果是函数调用，记录参数数量 */
    parameterCount?: number;
    /** 使用位置（用于错误报告） */
    locations: Array<{
        file: string;
        line: number;
    }>;
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

// ============================================================================
// IDE API 定义生成器
// ============================================================================

export class IdeApiDeclarationGenerator {
    private project: Project;

    constructor() {
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
        });
    }

    /**
     * 从 @theia/plugin 的 .d.ts 文件生成 API 声明
     */
    async generateDeclaration(theiaPluginPath?: string): Promise<IdeApiDeclaration> {
        // 查找 theia.d.ts
        if (!theiaPluginPath) {
            try {
                const packagePath = require.resolve('@theia/plugin/package.json');
                theiaPluginPath = path.dirname(packagePath);
            } catch {
                throw new Error('Cannot find @theia/plugin package');
            }
        }

        // Try multiple possible locations for theia.d.ts
        let dtsPath = path.join(theiaPluginPath, 'lib', 'theia.d.ts');
        if (!fs.existsSync(dtsPath)) {
            dtsPath = path.join(theiaPluginPath, 'src', 'theia.d.ts');
        }
        if (!fs.existsSync(dtsPath)) {
            dtsPath = path.join(theiaPluginPath, 'theia.d.ts');
        }
        if (!fs.existsSync(dtsPath)) {
            throw new Error(`theia.d.ts not found in ${theiaPluginPath} (checked lib/, src/, and root)`);
        }

        console.log(`📖 解析 API 定义: ${dtsPath}`);

        // 添加源文件
        const sourceFile = this.project.addSourceFileAtPath(dtsPath);

        // 提取 API 定义
        const apis: Record<string, ApiDefinition> = {};

        // theia.d.ts 使用 "export module '@theia/plugin'" 结构
        // 需要找到这个模块声明并提取其中的导出
        const modules = sourceFile.getModules();
        let theiaModule = modules.find(m => m.getName() === "'@theia/plugin'");

        if (!theiaModule) {
            // 如果没有找到模块，尝试从顶层导出提取
            const exportedDeclarations = sourceFile.getExportedDeclarations();
            for (const [name, declarations] of exportedDeclarations) {
                for (const declaration of declarations) {
                    const apiDef = this.extractApiDefinition(name, declaration);
                    if (apiDef) {
                        apis[name] = apiDef;
                    }
                }
            }
        } else {
            // 从模块中提取导出的声明
            const body = theiaModule.getBody();
            if (Node.isModuleBlock(body)) {
                for (const statement of body.getStatements()) {
                    // 提取导出的声明
                    if (Node.isExportable(statement)) {
                        let apiName: string | undefined;
                        let declaration: Node | undefined;

                        if (Node.isVariableStatement(statement)) {
                            const decl = statement.getDeclarations()[0];
                            apiName = decl?.getName();
                            declaration = decl;
                        } else if (Node.isFunctionDeclaration(statement)) {
                            apiName = statement.getName();
                            declaration = statement;
                        } else if (Node.isClassDeclaration(statement)) {
                            apiName = statement.getName();
                            declaration = statement;
                        } else if (Node.isInterfaceDeclaration(statement)) {
                            apiName = statement.getName();
                            declaration = statement;
                        } else if (Node.isEnumDeclaration(statement)) {
                            apiName = statement.getName();
                            declaration = statement;
                        } else if (Node.isTypeAliasDeclaration(statement)) {
                            apiName = statement.getName();
                            declaration = statement;
                        } else if (Node.isModuleDeclaration(statement)) {
                            apiName = statement.getName().replace(/['"]/g, '');
                            declaration = statement;
                        }

                        if (apiName && declaration) {
                            const apiDef = this.extractApiDefinition(apiName, declaration);
                            if (apiDef) {
                                apis[apiName] = apiDef;
                            }
                        }
                    }
                }
            }
        }

        // 读取版本
        const packageJsonPath = path.join(theiaPluginPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        return {
            version: packageJson.version || 'unknown',
            generatedAt: new Date().toISOString(),
            apis
        };
    }

    /**
     * 提取 API 定义
     */
    private extractApiDefinition(name: string, declaration: Node): ApiDefinition | null {
        // 函数
        if (Node.isFunctionDeclaration(declaration)) {
            return {
                name,
                kind: 'function',
                signature: this.extractFunctionSignature(declaration)
            };
        }

        // 类
        if (Node.isClassDeclaration(declaration)) {
            const constructors = declaration.getConstructors().map(c =>
                this.extractFunctionSignature(c)
            );

            const methods: Record<string, FunctionSignature[]> = {};
            for (const method of declaration.getMethods()) {
                const methodName = method.getName();
                if (!methodName) continue; // Skip methods without names
                if (!methods[methodName]) {
                    methods[methodName] = [];
                }
                if (Array.isArray(methods[methodName])) {
                    methods[methodName].push(this.extractFunctionSignature(method));
                }
            }

            const properties: Record<string, PropertyInfo> = {};
            for (const prop of declaration.getProperties()) {
                const propName = prop.getName();
                properties[propName] = {
                    name: propName,
                    type: prop.getType().getText(),
                    readonly: prop.isReadonly(),
                    optional: prop.hasQuestionToken() || false
                };
            }

            return {
                name,
                kind: 'class',
                constructors,
                methods,
                properties
            };
        }

        // 接口
        if (Node.isInterfaceDeclaration(declaration)) {
            const methods: Record<string, FunctionSignature[]> = {};
            for (const method of declaration.getMethods()) {
                const methodName = method.getName();
                if (!methodName) continue; // Skip methods without names
                if (!methods[methodName]) {
                    methods[methodName] = [];
                }
                if (Array.isArray(methods[methodName])) {
                    methods[methodName].push(this.extractFunctionSignature(method));
                }
            }

            const properties: Record<string, PropertyInfo> = {};
            for (const prop of declaration.getProperties()) {
                const propName = prop.getName();
                properties[propName] = {
                    name: propName,
                    type: prop.getType().getText(),
                    readonly: prop.isReadonly(),
                    optional: prop.hasQuestionToken() || false
                };
            }

            return {
                name,
                kind: 'interface',
                methods,
                properties
            };
        }

        // 枚举
        if (Node.isEnumDeclaration(declaration)) {
            const enumValues = declaration.getMembers().map(m => m.getName());
            return {
                name,
                kind: 'enum',
                enumValues
            };
        }

        // 类型别名
        if (Node.isTypeAliasDeclaration(declaration)) {
            return {
                name,
                kind: 'type',
                typeAlias: declaration.getType().getText()
            };
        }

        // 命名空间
        if (Node.isModuleDeclaration(declaration)) {
            const namespace: Record<string, ApiDefinition> = {};
            const body = declaration.getBody();

            if (Node.isModuleBlock(body)) {
                for (const statement of body.getStatements()) {
                    // Check if statement has export keyword
                    const hasExportKeyword = statement.getCombinedModifierFlags() !== undefined;
                    if (hasExportKeyword) {
                        const exportName = Node.isVariableStatement(statement)
                            ? statement.getDeclarations()[0]?.getName()
                            : (statement as any).getName?.();

                        if (exportName) {
                            const def = this.extractApiDefinition(exportName, statement as any);
                            if (def) {
                                namespace[exportName] = def;
                            }
                        }
                    }
                }
            }

            return {
                name,
                kind: 'namespace',
                namespace
            };
        }

        // 变量
        if (Node.isVariableDeclaration(declaration)) {
            return {
                name,
                kind: 'variable',
                typeAlias: declaration.getType().getText()
            };
        }

        return null;
    }

    /**
     * 提取函数签名
     */
    private extractFunctionSignature(node: Node): FunctionSignature {
        let parameters: ParameterInfo[] = [];
        let returnType = 'void';
        let typeParameters: string[] = [];

        if (Node.isFunctionLikeDeclaration(node)) {
            // 参数
            parameters = node.getParameters().map(param => ({
                name: param.getName(),
                type: param.getType().getText(),
                optional: param.isOptional(),
                defaultValue: param.getInitializer()?.getText()
            }));

            // 返回类型
            const returnTypeNode = node.getReturnType();
            returnType = returnTypeNode.getText();

            // 类型参数
            typeParameters = node.getTypeParameters().map(tp => tp.getName());
        }

        return {
            parameters,
            returnType,
            typeParameters: typeParameters.length > 0 ? typeParameters : undefined
        };
    }

    /**
     * 保存声明到 JSON 文件
     */
    async saveDeclaration(declaration: IdeApiDeclaration, outputPath: string): Promise<void> {
        const json = JSON.stringify(declaration, null, 2);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, json, 'utf-8');
    }

    /**
     * 从 JSON 文件加载声明
     */
    async loadDeclaration(filePath: string): Promise<IdeApiDeclaration> {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
}

// ============================================================================
// 插件 API 使用提取器（简化版，只记录使用）
// ============================================================================

export class PluginApiUsageExtractor {
    private project: Project;
    private readonly TARGET_MODULE = '@theia/plugin';

    constructor() {
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                allowJs: true,
                target: 99,
                module: 99,
            }
        });
    }

    /**
     * 提取插件使用的 API
     */
    async extractUsage(pluginPath: string): Promise<PluginApiUsage> {
        const packageJsonPath = path.join(pluginPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        const sourceFiles = this.collectSourceFiles(pluginPath);
        for (const file of sourceFiles) {
            this.project.addSourceFileAtPath(file);
        }

        const usedApis = new Map<string, UsedApiInfo>();

        for (const sourceFile of this.project.getSourceFiles()) {
            this.analyzeSourceFile(sourceFile, pluginPath, usedApis);
        }

        return {
            pluginId: packageJson.name || 'unknown',
            pluginVersion: packageJson.version || '0.0.0',
            usedApis: Array.from(usedApis.values()),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * 收集源文件
     */
    private collectSourceFiles(pluginPath: string): string[] {
        const files: string[] = [];
        const scanDirs = ['src', 'out', 'lib'];

        for (const dir of scanDirs) {
            const fullPath = path.join(pluginPath, dir);
            if (fs.existsSync(fullPath)) {
                this.scanDirectory(fullPath, files);
            }
        }

        return files;
    }

    /**
     * 扫描目录
     */
    private scanDirectory(dir: string, files: string[], maxDepth: number = 10, currentDepth: number = 0): void {
        if (currentDepth > maxDepth) return;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== '.git') {
                    this.scanDirectory(fullPath, files, maxDepth, currentDepth + 1);
                }
            } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }

    /**
     * 分析源文件
     */
    private analyzeSourceFile(sourceFile: SourceFile, pluginPath: string, usedApis: Map<string, UsedApiInfo>): void {
        const relativePath = path.relative(pluginPath, sourceFile.getFilePath());
        const symbolTable = new Map<string, string>();
        const namespaceImports = new Set<string>();

        // 分析 import
        sourceFile.getImportDeclarations().forEach(importDecl => {
            if (importDecl.getModuleSpecifierValue() === this.TARGET_MODULE) {
                const defaultImport = importDecl.getDefaultImport();
                const namespaceImport = importDecl.getNamespaceImport();
                const namedImports = importDecl.getNamedImports();

                if (defaultImport) {
                    namespaceImports.add(defaultImport.getText());
                }
                if (namespaceImport) {
                    namespaceImports.add(namespaceImport.getText());
                }
                for (const namedImport of namedImports) {
                    const original = namedImport.getName();
                    const alias = namedImport.getAliasNode()?.getText() || original;
                    symbolTable.set(alias, original);
                }
            }
        });

        // 记录 API 使用
        const recordUsage = (apiName: string, type: UsedApiInfo['usageType'], memberPath: string[], line: number, paramCount?: number) => {
            const key = `${apiName}:${memberPath.join('.')}`;
            if (!usedApis.has(key)) {
                usedApis.set(key, {
                    apiName,
                    usageType: type,
                    memberPath: memberPath.length > 0 ? memberPath : undefined,
                    parameterCount: paramCount,
                    locations: []
                });
            }
            usedApis.get(key)!.locations.push({
                file: relativePath,
                line
            });
        };

        // 分析调用表达式
        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
            const expr = call.getExpression();

            if (Node.isPropertyAccessExpression(expr)) {
                const chain = this.getPropertyChain(expr);
                if (chain.length > 0) {
                    const first = chain[0];

                    if (namespaceImports.has(first)) {
                        // theia.commands.registerCommand(...)
                        if (chain.length >= 2) {
                            recordUsage(chain[1], 'call', chain.slice(1), call.getStartLineNumber(), call.getArguments().length);
                        }
                    } else if (symbolTable.has(first)) {
                        // commands.registerCommand(...)
                        const apiName = symbolTable.get(first)!;
                        recordUsage(apiName, 'call', chain, call.getStartLineNumber(), call.getArguments().length);
                    }
                }
            } else if (Node.isIdentifier(expr)) {
                const name = expr.getText();
                if (symbolTable.has(name)) {
                    // directCall()
                    recordUsage(symbolTable.get(name)!, 'call', [], call.getStartLineNumber(), call.getArguments().length);
                }
            }
        });

        // 分析 new 表达式
        sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression).forEach(newExpr => {
            const expr = newExpr.getExpression();
            if (Node.isIdentifier(expr)) {
                const name = expr.getText();
                if (symbolTable.has(name)) {
                    recordUsage(symbolTable.get(name)!, 'construct', [], newExpr.getStartLineNumber(), newExpr.getArguments().length);
                }
            }
        });

        // 分析属性访问
        sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach(propAccess => {
            const chain = this.getPropertyChain(propAccess);
            if (chain.length > 0) {
                const first = chain[0];

                if (namespaceImports.has(first) && chain.length >= 2) {
                    recordUsage(chain[1], 'property', chain.slice(1), propAccess.getStartLineNumber());
                } else if (symbolTable.has(first)) {
                    recordUsage(symbolTable.get(first)!, 'property', chain, propAccess.getStartLineNumber());
                }
            }
        });
    }

    /**
     * 获取属性访问链
     */
    private getPropertyChain(expr: Node): string[] {
        const chain: string[] = [];
        let current: Node | undefined = expr;

        while (current && Node.isPropertyAccessExpression(current)) {
            chain.unshift(current.getName());
            current = current.getExpression();
        }

        if (current && Node.isIdentifier(current)) {
            chain.unshift(current.getText());
        }

        return chain;
    }

    /**
     * 保存使用信息
     */
    async saveUsage(usage: PluginApiUsage, outputPath: string): Promise<void> {
        const json = JSON.stringify(usage, null, 2);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, json, 'utf-8');
    }
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
        // 例如: apiName="commands", memberPath=["commands", "registerCommand"]
        // 我们应该只检查 "registerCommand"
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

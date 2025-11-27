// *****************************************************************************
// Copyright (C) 2024 Baosky and others.
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

/**
 * 插件 API 提取器 - 使用 ts-morph 进行静态代码分析
 *
 * 这个工具能够：
 * 1. 分析插件代码中所有从 @theia/plugin 导入的 API
 * 2. 处理各种导入模式：命名导入、命名空间导入、别名、重命名等
 * 3. 追踪 API 的实际使用（属性访问、方法调用等）
 * 4. 生成兼容性检查所需的 JSON 元数据
 *
 * 基于 ts-morph: https://ts-morph.com/
 */

import { Project, SourceFile, Node, SyntaxKind, ImportDeclaration, VariableDeclaration } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

export interface ApiUsageInfo {
    /** API 原始名称（@theia/plugin 中导出的名称） */
    apiName: string;
    /** 本地使用的别名（如果有重命名） */
    localName?: string;
    /** 导入方式 */
    importKind: 'named' | 'namespace' | 'default' | 'sideEffect';
    /** 访问的成员（如 commands.registerCommand 中的 registerCommand） */
    accessedMembers: Set<string>;
    /** 使用位置 */
    usages: Array<{
        file: string;
        line: number;
        column: number;
        code: string;
    }>;
}

export interface PluginApiMetadata {
    pluginId: string;
    pluginVersion: string;
    /** 去重后的 API 列表 */
    apis: string[];
    /** 详细的使用信息 */
    apiUsageDetails: Record<string, {
        importTypes: string[];
        members: string[];
        usageCount: number;
        aliases: string[];
    }>;
    analyzedFiles: string[];
    timestamp: string;
}

/**
 * 基于 ts-morph 的 API 提取器
 *
 * 优势：
 * - 使用成熟的 TypeScript AST 工具
 * - 自动处理类型信息和作用域
 * - 不会被别名、重命名欺骗
 * - 支持所有 JavaScript/TypeScript 语法
 */
export class TsMorphApiExtractor {
    private readonly TARGET_MODULE = '@theia/plugin';
    private project: Project;

    constructor() {
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                allowJs: true,
                target: 99, // Latest
                module: 99, // ESNext
            }
        });
    }

    /**
     * 提取插件中所有使用的 @theia/plugin API
     */
    async extractApis(pluginPath: string): Promise<PluginApiMetadata> {
        // 读取 package.json
        const packageJsonPath = path.join(pluginPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`package.json not found: ${packageJsonPath}`);
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const pluginId = packageJson.name || 'unknown';
        const pluginVersion = packageJson.version || '0.0.0';

        // 收集源文件
        const sourceFiles = this.collectSourceFiles(pluginPath);

        // 添加文件到项目
        for (const file of sourceFiles) {
            this.project.addSourceFileAtPath(file);
        }

        // 分析 API 使用
        const apiUsageMap = new Map<string, ApiUsageInfo>();

        for (const sourceFile of this.project.getSourceFiles()) {
            this.analyzeSourceFile(sourceFile, pluginPath, apiUsageMap);
        }

        // 生成元数据
        return this.generateMetadata(pluginId, pluginVersion, apiUsageMap, sourceFiles);
    }

    /**
     * 收集所有源文件
     */
    private collectSourceFiles(pluginPath: string): string[] {
        const files: string[] = [];
        const scanDirs = ['src', 'out', 'lib', 'dist'];

        for (const dir of scanDirs) {
            const fullPath = path.join(pluginPath, dir);
            if (fs.existsSync(fullPath)) {
                this.scanDirectory(fullPath, files);
            }
        }

        // 如果没有找到标准目录，扫描根目录（深度限制为 2）
        if (files.length === 0) {
            this.scanDirectory(pluginPath, files, 2);
        }

        return files;
    }

    /**
     * 递归扫描目录
     */
    private scanDirectory(dir: string, files: string[], maxDepth: number = 10, currentDepth: number = 0): void {
        if (currentDepth > maxDepth) {
            return;
        }

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') {
                    continue;
                }
                this.scanDirectory(fullPath, files, maxDepth, currentDepth + 1);
            } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }

    /**
     * 分析单个源文件
     */
    private analyzeSourceFile(sourceFile: SourceFile, pluginPath: string, apiUsageMap: Map<string, ApiUsageInfo>): void {
        const relativePath = path.relative(pluginPath, sourceFile.getFilePath());

        // 符号表：本地名称 -> 原始 API 名称的映射
        const symbolTable = new Map<string, { original: string; kind: ApiUsageInfo['importKind'] }>();

        // 命名空间导入（如 import * as theia from '@theia/plugin'）
        const namespaceImports = new Set<string>();

        // 1. 分析 ES6 import 声明
        sourceFile.getImportDeclarations().forEach(importDecl => {
            if (importDecl.getModuleSpecifierValue() === this.TARGET_MODULE) {
                this.processImportDeclaration(importDecl, symbolTable, namespaceImports, apiUsageMap, relativePath);
            }
        });

        // 2. 分析 CommonJS require
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            this.processRequireDeclaration(varDecl, symbolTable, namespaceImports, apiUsageMap, relativePath);
        });

        // 3. 分析标识符使用
        sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).forEach(identifier => {
            const identifierName = identifier.getText();

            // 检查是否是已导入的符号
            if (symbolTable.has(identifierName)) {
                const symbol = symbolTable.get(identifierName)!;
                this.recordApiUsage(apiUsageMap, symbol.original, identifierName, identifier, relativePath);
            }
        });

        // 4. 分析属性访问（theia.commands, commands.registerCommand 等）
        sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach(propAccess => {
            const expression = propAccess.getExpression();
            const propertyName = propAccess.getName();

            if (Node.isIdentifier(expression)) {
                const objName = expression.getText();

                // 情况1: 命名空间访问 (theia.commands)
                if (namespaceImports.has(objName)) {
                    this.recordApiUsage(apiUsageMap, propertyName, undefined, propAccess, relativePath);

                    const apiInfo = apiUsageMap.get(propertyName);
                    if (apiInfo) {
                        apiInfo.accessedMembers.add(propertyName);
                    }
                }
                // 情况2: API 成员访问 (commands.registerCommand)
                else if (symbolTable.has(objName)) {
                    const symbol = symbolTable.get(objName)!;
                    const apiInfo = apiUsageMap.get(symbol.original);

                    if (apiInfo) {
                        apiInfo.accessedMembers.add(propertyName);
                        apiInfo.usages.push({
                            file: relativePath,
                            line: propAccess.getStartLineNumber(),
                            column: propAccess.getStartLinePos(),
                            code: propAccess.getText()
                        });
                    }
                }
            }
        });
    }

    /**
     * 处理 ES6 import 声明
     */
    private processImportDeclaration(
        importDecl: ImportDeclaration,
        symbolTable: Map<string, { original: string; kind: ApiUsageInfo['importKind'] }>,
        namespaceImports: Set<string>,
        apiUsageMap: Map<string, ApiUsageInfo>,
        relativePath: string
    ): void {
        const defaultImport = importDecl.getDefaultImport();
        const namespaceImport = importDecl.getNamespaceImport();
        const namedImports = importDecl.getNamedImports();

        // import theia from '@theia/plugin'
        if (defaultImport) {
            const localName = defaultImport.getText();
            symbolTable.set(localName, { original: 'default', kind: 'default' });
            namespaceImports.add(localName);
        }

        // import * as theia from '@theia/plugin'
        if (namespaceImport) {
            const localName = namespaceImport.getText();
            symbolTable.set(localName, { original: '*', kind: 'namespace' });
            namespaceImports.add(localName);
        }

        // import { commands, window as win } from '@theia/plugin'
        for (const namedImport of namedImports) {
            const originalName = namedImport.getName();
            const alias = namedImport.getAliasNode();
            const localName = alias ? alias.getText() : originalName;

            symbolTable.set(localName, { original: originalName, kind: 'named' });

            // 记录到 API 使用映射
            if (!apiUsageMap.has(originalName)) {
                apiUsageMap.set(originalName, {
                    apiName: originalName,
                    localName: localName !== originalName ? localName : undefined,
                    importKind: 'named',
                    accessedMembers: new Set(),
                    usages: []
                });
            }

            const apiInfo = apiUsageMap.get(originalName)!;
            apiInfo.usages.push({
                file: relativePath,
                line: importDecl.getStartLineNumber(),
                column: importDecl.getStartLinePos(),
                code: namedImport.getText()
            });
        }
    }

    /**
     * 处理 CommonJS require 声明
     */
    private processRequireDeclaration(
        varDecl: VariableDeclaration,
        symbolTable: Map<string, { original: string; kind: ApiUsageInfo['importKind'] }>,
        namespaceImports: Set<string>,
        apiUsageMap: Map<string, ApiUsageInfo>,
        relativePath: string
    ): void {
        const initializer = varDecl.getInitializer();

        if (!initializer || !Node.isCallExpression(initializer)) {
            return;
        }

        const expression = initializer.getExpression();
        if (!Node.isIdentifier(expression) || expression.getText() !== 'require') {
            return;
        }

        const args = initializer.getArguments();
        if (args.length === 0 || !Node.isStringLiteral(args[0])) {
            return;
        }

        const moduleName = args[0].getLiteralText();
        if (moduleName !== this.TARGET_MODULE) {
            return;
        }

        // const theia = require('@theia/plugin')
        const nameNode = varDecl.getNameNode();
        if (Node.isIdentifier(nameNode)) {
            const localName = nameNode.getText();
            symbolTable.set(localName, { original: '*', kind: 'namespace' });
            namespaceImports.add(localName);
        }
        // const { commands, window: win } = require('@theia/plugin')
        else if (Node.isObjectBindingPattern(nameNode)) {
            for (const element of nameNode.getElements()) {
                const propertyName = element.getPropertyNameNode();
                const name = element.getNameNode();

                const originalName = propertyName ? propertyName.getText() : (Node.isIdentifier(name) ? name.getText() : '');
                const localName = Node.isIdentifier(name) ? name.getText() : originalName;

                if (originalName) {
                    symbolTable.set(localName, { original: originalName, kind: 'named' });

                    if (!apiUsageMap.has(originalName)) {
                        apiUsageMap.set(originalName, {
                            apiName: originalName,
                            localName: localName !== originalName ? localName : undefined,
                            importKind: 'named',
                            accessedMembers: new Set(),
                            usages: []
                        });
                    }
                }
            }
        }
    }

    /**
     * 记录 API 使用
     */
    private recordApiUsage(
        apiUsageMap: Map<string, ApiUsageInfo>,
        originalName: string,
        localName: string | undefined,
        node: Node,
        relativePath: string
    ): void {
        if (originalName === '*' || originalName === 'default') {
            return; // 跳过特殊标记
        }

        if (!apiUsageMap.has(originalName)) {
            apiUsageMap.set(originalName, {
                apiName: originalName,
                localName,
                importKind: 'named',
                accessedMembers: new Set(),
                usages: []
            });
        }

        const apiInfo = apiUsageMap.get(originalName)!;
        apiInfo.usages.push({
            file: relativePath,
            line: node.getStartLineNumber(),
            column: node.getStartLinePos(),
            code: node.getText()
        });
    }

    /**
     * 生成元数据
     */
    private generateMetadata(
        pluginId: string,
        pluginVersion: string,
        apiUsageMap: Map<string, ApiUsageInfo>,
        sourceFiles: string[]
    ): PluginApiMetadata {
        const apis: string[] = [];
        const apiUsageDetails: Record<string, {
            importTypes: string[];
            members: string[];
            usageCount: number;
            aliases: string[];
        }> = {};

        for (const [apiName, info] of apiUsageMap) {
            if (apiName === '*' || apiName === 'default') {
                continue;
            }

            apis.push(apiName);

            const aliases: string[] = [];
            if (info.localName && info.localName !== apiName) {
                aliases.push(info.localName);
            }

            apiUsageDetails[apiName] = {
                importTypes: [info.importKind],
                members: Array.from(info.accessedMembers).sort(),
                usageCount: info.usages.length,
                aliases
            };
        }

        return {
            pluginId,
            pluginVersion,
            apis: [...new Set(apis)].sort(),
            apiUsageDetails,
            analyzedFiles: sourceFiles.map(f => path.basename(f)),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 导出为 JSON
     */
    async exportToJson(metadata: PluginApiMetadata, outputPath: string): Promise<void> {
        const json = JSON.stringify(metadata, null, 2);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, json, 'utf-8');
    }

    /**
     * 清理项目
     */
    cleanup(): void {
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
        });
    }
}

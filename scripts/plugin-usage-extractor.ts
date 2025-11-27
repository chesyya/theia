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
 * 插件 API 使用提取器
 * 
 * 功能：提取插件使用的 API 及其签名
 */

import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// 类型定义
// ============================================================================

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
 * 插件 API 使用记录
 */
export interface PluginApiUsage {
    pluginId: string;
    pluginVersion: string;
    usedApis: UsedApiInfo[];
    generatedAt: string;
}

// ============================================================================
// 插件 API 使用提取器
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

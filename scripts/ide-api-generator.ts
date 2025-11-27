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
 * IDE API 声明生成器
 * 
 * 功能：从 @theia/plugin 的 theia.d.ts 文件生成 API 定义 JSON
 */

import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import {
    ApiDefinition,
    IdeApiDeclaration,
    FunctionSignature,
    PropertyInfo,
    ParameterInfo
} from './types';

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

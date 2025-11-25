# Theia 插件 API 兼容性检查实现方案

## 1. 概述

### 1.1 目标

实现一套完整的插件 API 兼容性检查机制，确保：
1. ✅ 老插件使用的 API 在新 IDE 中签名未变 → 允许安装
2. ❌ 老插件使用的 API 在新 IDE 中签名已变 → 拒绝安装
3. ✅ 注释、参数名等非语义变化 → 不影响兼容性
4. ❌ 参数类型、返回值类型等语义变化 → 影响兼容性

### 1.2 核心思路

**在 IDE 发布时提取 API 签名，插件安装时进行对比检查**

```
┌──────────────────────────────────────────────────────────────┐
│  IDE 构建时                                                    │
├──────────────────────────────────────────────────────────────┤
│  1. 运行签名提取工具                                          │
│  2. 扫描 @theia/plugin 的 theia.d.ts                          │
│  3. 提取所有 API 的类型签名                                   │
│  4. 生成 theia-api-signatures.json                           │
│  5. 随 IDE 一起发布                                           │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  插件安装时                                                    │
├──────────────────────────────────────────────────────────────┤
│  1. 读取 IDE 的 theia-api-signatures.json                    │
│  2. 读取插件的 plugin-api-usage.json                         │
│  3. 对比每个 API 的类型签名                                   │
│  4. 检查兼容性 → 允许/拒绝安装                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 签名格式设计

### 2.1 什么算"接口变动"？

| 变化类型 | 是否兼容 | 示例 |
|---------|---------|------|
| **参数类型改变** | ❌ 不兼容 | `(name: string)` → `(name: number)` |
| **返回值类型改变** | ❌ 不兼容 | `: Terminal` → `: void` |
| **删除必选参数** | ❌ 不兼容 | `(name: string, path: string)` → `(name: string)` |
| **可选参数变必选** | ❌ 不兼容 | `(name?: string)` → `(name: string)` |
| **添加必选参数** | ❌ 不兼容 | `(name: string)` → `(name: string, path: string)` |
| **必选参数变可选** | ✅ 兼容 | `(name: string)` → `(name?: string)` |
| **添加可选参数** | ✅ 兼容 | `(name: string)` → `(name: string, opt?: number)` |
| **删除可选参数** | ✅ 兼容 | `(name: string, opt?: number)` → `(name: string)` |
| **参数名改变** | ✅ 兼容 | `(name: string)` → `(terminalName: string)` |
| **注释/文档改变** | ✅ 兼容 | 添加/修改 JSDoc |
| **空格/格式改变** | ✅ 兼容 | 代码格式化 |

### 2.2 签名文件格式

#### IDE 的 API 签名文件 (theia-api-signatures.json)

```json
{
  "version": "1.0",
  "generatedAt": "2025-01-25T12:00:00.000Z",
  "ideVersion": "1.48.0",
  "apis": {
    "window": {
      "createTerminal": {
        "kind": "function",
        "parameters": [
          {
            "name": "nameOrOptions",
            "type": "string|TerminalOptions|ExtensionTerminalOptions",
            "optional": false
          },
          {
            "name": "shellPath",
            "type": "string",
            "optional": true
          },
          {
            "name": "shellArgs",
            "type": "string[]|string",
            "optional": true
          }
        ],
        "returnType": "Terminal",
        "deprecated": false
      },
      "showInformationMessage": {
        "kind": "function",
        "parameters": [
          {
            "name": "message",
            "type": "string",
            "optional": false
          },
          {
            "name": "items",
            "type": "string[]",
            "optional": false
          }
        ],
        "returnType": "Thenable<string|undefined>",
        "deprecated": false
      }
    },
    "Terminal": {
      "sendText": {
        "kind": "method",
        "parameters": [
          {
            "name": "text",
            "type": "string",
            "optional": false
          },
          {
            "name": "shouldExecute",
            "type": "boolean",
            "optional": true
          }
        ],
        "returnType": "void",
        "deprecated": false
      },
      "processId": {
        "kind": "property",
        "propertyType": "Thenable<number>",
        "deprecated": false
      }
    }
  }
}
```

#### 插件的 API 使用清单 (plugin-api-usage.json)

```json
{
  "pluginName": "my-extension",
  "pluginVersion": "1.0.0",
  "engines": {
    "vscode": "^1.80.0"
  },
  "usedApis": [
    {
      "namespace": "window",
      "member": "createTerminal",
      "signature": {
        "kind": "function",
        "parameters": [
          {
            "name": "nameOrOptions",
            "type": "string|TerminalOptions|ExtensionTerminalOptions",
            "optional": false
          }
        ],
        "returnType": "Terminal"
      },
      "usageLocations": [
        "src/extension.ts:42",
        "src/terminal.ts:15"
      ]
    },
    {
      "namespace": "Terminal",
      "member": "sendText",
      "signature": {
        "kind": "method",
        "parameters": [
          {
            "name": "text",
            "type": "string",
            "optional": false
          },
          {
            "name": "shouldExecute",
            "type": "boolean",
            "optional": true
          }
        ],
        "returnType": "void"
      },
      "usageLocations": [
        "src/terminal.ts:20"
      ]
    }
  ]
}
```

---

## 3. 实现：API 签名提取工具

### 3.1 创建工具文件

**文件路径**: `packages/plugin-ext/src/tools/extract-api-signatures.ts`

```typescript
#!/usr/bin/env node

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface APISignature {
    kind: 'function' | 'method' | 'property' | 'class' | 'interface';
    parameters?: Array<{
        name: string;
        type: string;
        optional: boolean;
    }>;
    returnType?: string;
    propertyType?: string;
    deprecated?: boolean;
}

interface APISignatureFile {
    version: string;
    generatedAt: string;
    ideVersion: string;
    apis: {
        [namespace: string]: {
            [member: string]: APISignature;
        };
    };
}

/**
 * API 签名提取工具
 */
class APISignatureExtractor {

    /**
     * 主入口
     */
    public static async extract(options: {
        theiaPluginDts: string;
        outputPath: string;
        ideVersion: string;
    }): Promise<void> {
        console.log('🔍 Extracting API signatures from:', options.theiaPluginDts);
        console.log('📦 IDE Version:', options.ideVersion);

        const extractor = new APISignatureExtractor();
        const signatures = extractor.extractFromDts(options.theiaPluginDts);

        const outputData: APISignatureFile = {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            ideVersion: options.ideVersion,
            apis: signatures
        };

        const outputDir = path.dirname(options.outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(
            options.outputPath,
            JSON.stringify(outputData, null, 2),
            'utf8'
        );

        console.log('✅ API signatures extracted successfully!');
        console.log('📄 Output file:', options.outputPath);
        console.log('📊 Total namespaces:', Object.keys(signatures).length);

        let totalAPIs = 0;
        for (const ns of Object.values(signatures)) {
            totalAPIs += Object.keys(ns).length;
        }
        console.log('📊 Total APIs:', totalAPIs);
    }

    /**
     * 从 .d.ts 文件提取签名
     */
    private extractFromDts(dtsPath: string): APISignatureFile['apis'] {
        const sourceCode = fs.readFileSync(dtsPath, 'utf8');
        const sourceFile = ts.createSourceFile(
            dtsPath,
            sourceCode,
            ts.ScriptTarget.Latest,
            true
        );

        const signatures: APISignatureFile['apis'] = {};

        const visit = (node: ts.Node) => {
            // 处理 namespace (export namespace window { ... })
            if (ts.isModuleDeclaration(node) && node.name) {
                const namespaceName = node.name.text;

                if (!signatures[namespaceName]) {
                    signatures[namespaceName] = {};
                }

                if (node.body && ts.isModuleBlock(node.body)) {
                    node.body.statements.forEach(statement => {
                        this.processStatement(statement, signatures[namespaceName]);
                    });
                }
            }

            // 处理顶层接口 (export interface Terminal { ... })
            if (ts.isInterfaceDeclaration(node) && node.name) {
                const interfaceName = node.name.text;

                if (!signatures[interfaceName]) {
                    signatures[interfaceName] = {};
                }

                node.members.forEach(member => {
                    this.processMember(member, signatures[interfaceName]);
                });
            }

            // 处理顶层类
            if (ts.isClassDeclaration(node) && node.name) {
                const className = node.name.text;

                if (!signatures[className]) {
                    signatures[className] = {};
                }

                node.members.forEach(member => {
                    this.processMember(member, signatures[className]);
                });
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return signatures;
    }

    /**
     * 处理 namespace 内的语句
     */
    private processStatement(
        statement: ts.Statement,
        signatures: { [key: string]: APISignature }
    ): void {
        if (ts.isFunctionDeclaration(statement) && statement.name) {
            const name = statement.name.text;
            signatures[name] = this.extractFunctionSignature(statement);
        }

        if (ts.isVariableStatement(statement)) {
            statement.declarationList.declarations.forEach(decl => {
                if (ts.isIdentifier(decl.name)) {
                    const name = decl.name.text;
                    signatures[name] = this.extractPropertySignature(decl);
                }
            });
        }
    }

    /**
     * 处理类/接口的成员
     */
    private processMember(
        member: ts.ClassElement | ts.TypeElement,
        signatures: { [key: string]: APISignature }
    ): void {
        const name = this.getMemberName(member);
        if (!name) return;

        if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) {
            signatures[name] = this.extractFunctionSignature(member);
        } else if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
            signatures[name] = {
                kind: 'property',
                propertyType: this.getTypeString(member.type),
                deprecated: this.isDeprecated(member)
            };
        }
    }

    /**
     * 提取函数签名
     */
    private extractFunctionSignature(
        node: ts.FunctionDeclaration | ts.MethodSignature | ts.MethodDeclaration
    ): APISignature {
        return {
            kind: ts.isFunctionDeclaration(node) ? 'function' : 'method',
            parameters: node.parameters.map(param => ({
                name: param.name.getText(),
                type: this.normalizeType(this.getTypeString(param.type)),
                optional: !!param.questionToken || !!param.initializer
            })),
            returnType: this.normalizeType(this.getTypeString(node.type)),
            deprecated: this.isDeprecated(node)
        };
    }

    /**
     * 提取属性签名
     */
    private extractPropertySignature(node: ts.VariableDeclaration): APISignature {
        return {
            kind: 'property',
            propertyType: this.normalizeType(this.getTypeString(node.type)),
            deprecated: false
        };
    }

    /**
     * 获取成员名称
     */
    private getMemberName(node: ts.Node): string | null {
        if ('name' in node && node.name) {
            if (ts.isIdentifier(node.name)) {
                return node.name.text;
            }
            if (ts.isStringLiteral(node.name)) {
                return node.name.text;
            }
        }
        return null;
    }

    /**
     * 获取类型字符串
     */
    private getTypeString(typeNode: ts.TypeNode | undefined): string {
        if (!typeNode) {
            return 'any';
        }

        const printer = ts.createPrinter();
        return printer.printNode(
            ts.EmitHint.Unspecified,
            typeNode,
            typeNode.getSourceFile()
        );
    }

    /**
     * 规范化类型字符串（关键：去除格式差异）
     */
    private normalizeType(typeString: string): string {
        return typeString
            .replace(/\s+/g, ' ')           // 多个空格变一个
            .replace(/\s*\|\s*/g, '|')      // 去除 | 周围空格
            .replace(/\s*&\s*/g, '&')       // 去除 & 周围空格
            .replace(/\s*,\s*/g, ',')       // 去除 , 周围空格
            .replace(/\s*<\s*/g, '<')       // 去除 < 周围空格
            .replace(/\s*>\s*/g, '>')       // 去除 > 周围空格
            .replace(/\s*\[\s*/g, '[')      // 去除 [ 周围空格
            .replace(/\s*\]\s*/g, ']')      // 去除 ] 周围空格
            .replace(/\s*\(\s*/g, '(')      // 去除 ( 周围空格
            .replace(/\s*\)\s*/g, ')')      // 去除 ) 周围空格
            .replace(/\s*:\s*/g, ':')       // 去除 : 周围空格
            .trim();
    }

    /**
     * 检查是否已废弃
     */
    private isDeprecated(node: ts.Node): boolean {
        const jsDocTags = ts.getJSDocTags(node);
        return jsDocTags.some(tag => tag.tagName.text === 'deprecated');
    }
}

// CLI 入口
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.error('Usage: extract-api-signatures <theia.d.ts> <output.json> <ide-version>');
        process.exit(1);
    }

    const [theiaPluginDts, outputPath, ideVersion] = args;

    APISignatureExtractor.extract({
        theiaPluginDts,
        outputPath,
        ideVersion
    }).catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
}

export { APISignatureExtractor };
```

### 3.2 集成到构建流程

在 `packages/plugin-ext/package.json` 中添加：

```json
{
  "name": "@theia/plugin-ext",
  "version": "1.48.0",
  "scripts": {
    "build": "npm run extract-api-signatures && tsc -b",
    "extract-api-signatures": "ts-node src/tools/extract-api-signatures.ts ../plugin/src/theia.d.ts ./data/theia-api-signatures.json ${npm_package_version}"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}
```

---

## 4. 实现：兼容性检查器

### 4.1 创建检查器

**文件路径**: `packages/plugin-ext/src/main/node/plugin-api-compatibility-checker.ts`

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core';
import * as fs from 'fs';
import * as path from 'path';

interface APISignature {
    kind: 'function' | 'method' | 'property';
    parameters?: Array<{
        name: string;
        type: string;
        optional: boolean;
    }>;
    returnType?: string;
    propertyType?: string;
    deprecated?: boolean;
}

interface APISignatureFile {
    version: string;
    generatedAt: string;
    ideVersion: string;
    apis: {
        [namespace: string]: {
            [member: string]: APISignature;
        };
    };
}

interface CompatibilityCheckResult {
    compatible: boolean;
    incompatibleAPIs: Array<{
        api: string;
        reason: string;
        details: string;
    }>;
}

@injectable()
export class PluginAPICompatibilityChecker {

    @inject(ILogger)
    protected readonly logger: ILogger;

    private ideAPISignatures: APISignatureFile | null = null;

    /**
     * 初始化：加载 IDE 的 API 签名文件
     */
    async initialize(): Promise<void> {
        const signaturePath = path.join(
            __dirname,
            '../data/theia-api-signatures.json'
        );

        if (fs.existsSync(signaturePath)) {
            this.ideAPISignatures = JSON.parse(
                fs.readFileSync(signaturePath, 'utf8')
            );
            this.logger.info(
                `✅ Loaded IDE API signatures (Version: ${this.ideAPISignatures.ideVersion})`
            );
        } else {
            this.logger.warn(
                '⚠️  API signatures file not found. Compatibility checking disabled.'
            );
        }
    }

    /**
     * 检查插件的 API 兼容性
     */
    checkCompatibility(pluginPath: string): CompatibilityCheckResult {
        const result: CompatibilityCheckResult = {
            compatible: true,
            incompatibleAPIs: []
        };

        // 如果没有加载 IDE 签名，跳过检查
        if (!this.ideAPISignatures) {
            return result;
        }

        // 读取插件的 API 使用清单
        const usageFilePath = path.join(pluginPath, 'plugin-api-usage.json');

        if (!fs.existsSync(usageFilePath)) {
            this.logger.warn(
                `⚠️  Plugin API usage manifest not found: ${pluginPath}`
            );
            return result; // 允许安装但记录警告
        }

        const pluginAPIUsage = JSON.parse(
            fs.readFileSync(usageFilePath, 'utf8')
        );

        // 检查每个使用的 API
        for (const usedAPI of pluginAPIUsage.usedApis) {
            const ideAPI = this.ideAPISignatures.apis[usedAPI.namespace]?.[usedAPI.member];

            const checkResult = this.compareSignatures(
                usedAPI.signature,
                ideAPI,
                `${usedAPI.namespace}.${usedAPI.member}`
            );

            if (!checkResult.compatible) {
                result.compatible = false;
                result.incompatibleAPIs.push({
                    api: `${usedAPI.namespace}.${usedAPI.member}`,
                    reason: checkResult.reason,
                    details: checkResult.details
                });
            }
        }

        return result;
    }

    /**
     * 比较两个签名
     */
    private compareSignatures(
        pluginSig: APISignature,
        ideSig: APISignature | undefined,
        apiPath: string
    ): { compatible: boolean; reason: string; details: string } {

        // API 不存在
        if (!ideSig) {
            return {
                compatible: false,
                reason: 'API_NOT_FOUND',
                details: `API '${apiPath}' does not exist in current IDE version`
            };
        }

        // API 类型不同（函数 vs 属性）
        if (pluginSig.kind !== ideSig.kind) {
            return {
                compatible: false,
                reason: 'API_KIND_CHANGED',
                details: `API kind changed from ${pluginSig.kind} to ${ideSig.kind}`
            };
        }

        // 检查函数/方法签名
        if (pluginSig.kind === 'function' || pluginSig.kind === 'method') {
            return this.compareFunctionSignatures(pluginSig, ideSig, apiPath);
        }

        // 检查属性签名
        if (pluginSig.kind === 'property') {
            if (pluginSig.propertyType !== ideSig.propertyType) {
                return {
                    compatible: false,
                    reason: 'PROPERTY_TYPE_CHANGED',
                    details: `Property type changed from ${pluginSig.propertyType} to ${ideSig.propertyType}`
                };
            }
        }

        return { compatible: true, reason: '', details: '' };
    }

    /**
     * 比较函数签名
     */
    private compareFunctionSignatures(
        pluginSig: APISignature,
        ideSig: APISignature,
        apiPath: string
    ): { compatible: boolean; reason: string; details: string } {

        // 检查返回值类型
        if (pluginSig.returnType !== ideSig.returnType) {
            return {
                compatible: false,
                reason: 'RETURN_TYPE_CHANGED',
                details: `Return type changed from ${pluginSig.returnType} to ${ideSig.returnType}`
            };
        }

        // 检查参数
        const pluginParams = pluginSig.parameters || [];
        const ideParams = ideSig.parameters || [];

        // 检查插件期望的每个参数
        for (let i = 0; i < pluginParams.length; i++) {
            const pluginParam = pluginParams[i];
            const ideParam = ideParams[i];

            // IDE 删除了插件需要的参数
            if (!ideParam) {
                if (!pluginParam.optional) {
                    return {
                        compatible: false,
                        reason: 'REQUIRED_PARAMETER_REMOVED',
                        details: `Required parameter '${pluginParam.name}' was removed`
                    };
                }
                continue; // 可选参数被删除 → 兼容
            }

            // 参数类型改变
            if (pluginParam.type !== ideParam.type) {
                return {
                    compatible: false,
                    reason: 'PARAMETER_TYPE_CHANGED',
                    details: `Parameter '${pluginParam.name}' type changed from ${pluginParam.type} to ${ideParam.type}`
                };
            }

            // 可选参数变必选
            if (pluginParam.optional && !ideParam.optional) {
                return {
                    compatible: false,
                    reason: 'OPTIONAL_BECAME_REQUIRED',
                    details: `Parameter '${pluginParam.name}' became required`
                };
            }
        }

        // IDE 添加了新必选参数
        for (let i = pluginParams.length; i < ideParams.length; i++) {
            const newParam = ideParams[i];
            if (!newParam.optional) {
                return {
                    compatible: false,
                    reason: 'REQUIRED_PARAMETER_ADDED',
                    details: `New required parameter '${newParam.name}' was added`
                };
            }
        }

        return { compatible: true, reason: '', details: '' };
    }
}
```

### 4.2 集成到插件部署流程

修改 `packages/plugin-ext/src/main/node/plugin-deployer-impl.ts`:

```typescript
import { PluginAPICompatibilityChecker } from './plugin-api-compatibility-checker';

@injectable()
export class PluginDeployerImpl implements PluginDeployer {

    @inject(PluginAPICompatibilityChecker)
    protected readonly apiChecker: PluginAPICompatibilityChecker;

    async doStart(): Promise<void> {
        // 初始化 API 兼容性检查器
        await this.apiChecker.initialize();

        // ... 原有逻辑
    }

    async deployPlugins(pluginsToDeploy: PluginDeployerEntry[]): Promise<number> {
        // 过滤出被接受的插件
        const acceptedPlugins = pluginsToDeploy.filter(pluginDeployerEntry => {
            if (!pluginDeployerEntry.isAccepted()) {
                return false;
            }

            // 🔥 执行 API 兼容性检查
            const checkResult = this.apiChecker.checkCompatibility(
                pluginDeployerEntry.path()
            );

            if (!checkResult.compatible) {
                this.logger.error(
                    `❌ Plugin ${pluginDeployerEntry.id()} is not compatible with current IDE version:`
                );
                for (const incompatibleAPI of checkResult.incompatibleAPIs) {
                    this.logger.error(`  • ${incompatibleAPI.api}: ${incompatibleAPI.reason}`);
                    this.logger.error(`    ${incompatibleAPI.details}`);
                }
                return false; // 拒绝安装
            }

            return true; // 允许安装
        });

        // ... 继续原有的部署流程
    }
}
```

### 4.3 注册到依赖注入

在 `packages/plugin-ext/src/main/node/plugin-ext-backend-module.ts`:

```typescript
import { PluginAPICompatibilityChecker } from './plugin-api-compatibility-checker';

export default new ContainerModule(bind => {
    // ... 其他绑定

    bind(PluginAPICompatibilityChecker).toSelf().inSingletonScope();
});
```

---

## 5. 文件组织结构

```
theia/
├── packages/
│   ├── plugin/
│   │   └── src/
│   │       └── theia.d.ts                           # 📄 API 定义源文件
│   │
│   └── plugin-ext/
│       ├── src/
│       │   ├── tools/
│       │   │   └── extract-api-signatures.ts        # 🔧 签名提取工具
│       │   │
│       │   └── main/node/
│       │       ├── plugin-api-compatibility-checker.ts  # 🔍 兼容性检查器
│       │       ├── plugin-deployer-impl.ts          # 🔧 集成检查逻辑
│       │       └── plugin-ext-backend-module.ts     # 🔧 DI 注册
│       │
│       ├── data/
│       │   └── theia-api-signatures.json            # 📦 生成的签名文件（随 IDE 发布）
│       │
│       └── package.json
│           └── scripts:
│               ├── "build"                           # 🚀 构建命令
│               └── "extract-api-signatures"          # 🚀 提取签名
│
└── 用户插件项目/
    ├── src/                                          # 插件代码
    ├── plugin-api-usage.json                         # 📦 插件 API 使用清单
    └── package.json
```

---

## 6. 使用流程

### 6.1 IDE 开发和发布流程

```bash
# 步骤 1: 开发 IDE 新功能
git add .
git commit -m "feat: add new terminal APIs"

# 步骤 2: 更新版本号
npm version 1.48.0

# 步骤 3: 构建 IDE（自动提取 API 签名）
cd packages/plugin-ext
npm run build

# 输出:
# 🔍 Extracting API signatures from: ../plugin/src/theia.d.ts
# 📦 IDE Version: 1.48.0
# ✅ API signatures extracted successfully!
# 📄 Output file: ./data/theia-api-signatures.json
# 📊 Total namespaces: 15
# 📊 Total APIs: 284

# 步骤 4: 验证生成的签名文件
cat packages/plugin-ext/data/theia-api-signatures.json

# 步骤 5: 打包发布
npm run package

# 🎉 theia-api-signatures.json 随 IDE 一起发布
```

### 6.2 插件开发和发布流程

```bash
# 步骤 1: 开发插件
# (编写插件代码...)

# 步骤 2: 构建插件
npm run compile

# 步骤 3: 提取 API 使用（可选，需要额外工具）
# theia-plugin-api-analyzer ./
# 生成: plugin-api-usage.json

# 步骤 4: 打包插件
vsce package

# 步骤 5: 发布插件
vsce publish

# 🎉 plugin-api-usage.json 包含在 .vsix 中（如果生成了）
```

### 6.3 用户安装插件流程

```bash
# 用户尝试安装插件
theia --install-extension my-extension.vsix

# IDE 内部流程:
# 1. 解压 .vsix 文件
# 2. 读取 IDE 的 theia-api-signatures.json
# 3. 读取插件的 plugin-api-usage.json
# 4. 执行兼容性检查

# 场景 A: 兼容
# ✅ Installing extension 'my-extension'...
# ✅ Extension 'my-extension' installed successfully!

# 场景 B: 不兼容
# ❌ Plugin 'my-extension@1.0.0' is not compatible with current IDE version:
#   • window.createTerminal: PARAMETER_TYPE_CHANGED
#     Parameter 'name' type changed from string to number
#   • Terminal.sendText: REQUIRED_PARAMETER_REMOVED
#     Required parameter 'text' was removed
# ❌ Installation aborted.
```

---

## 7. 兼容性检查示例

### 示例 1: 注释变化（兼容）✅

```typescript
// IDE 1.0
function createTerminal(name: string): Terminal

// IDE 2.0
/**
 * Creates a new terminal instance
 * @param name Terminal name
 */
function createTerminal(name: string): Terminal
```

**签名对比**:
```json
// 两个版本的签名相同
{
  "parameters": [{"name": "name", "type": "string", "optional": false}],
  "returnType": "Terminal"
}
```

**结果**: ✅ 兼容

---

### 示例 2: 参数名变化（兼容）✅

```typescript
// IDE 1.0
function createTerminal(name: string): Terminal

// IDE 2.0
function createTerminal(terminalName: string): Terminal
```

**签名对比**:
```json
// 参数名不同，但类型结构相同
// IDE 1.0
{"name": "name", "type": "string", "optional": false}

// IDE 2.0
{"name": "terminalName", "type": "string", "optional": false}
```

**结果**: ✅ 兼容（参数名不影响调用）

---

### 示例 3: 添加可选参数（兼容）✅

```typescript
// IDE 1.0
function createTerminal(name: string): Terminal

// IDE 2.0
function createTerminal(name: string, options?: TerminalOptions): Terminal
```

**签名对比**:
```json
// 添加了可选参数
// IDE 1.0: 1 个参数
// IDE 2.0: 2 个参数（第 2 个是可选的）
```

**结果**: ✅ 兼容（插件可以不传第二个参数）

---

### 示例 4: 参数类型变化（不兼容）❌

```typescript
// IDE 1.0
function createTerminal(name: string): Terminal

// IDE 2.0
function createTerminal(name: number): Terminal
```

**签名对比**:
```json
// 参数类型改变
// IDE 1.0: "type": "string"
// IDE 2.0: "type": "number"
```

**结果**: ❌ 不兼容
```
❌ Parameter 'name' type changed from string to number
```

---

### 示例 5: 删除参数（不兼容）❌

```typescript
// IDE 1.0
function createTerminal(name: string, shellPath: string): Terminal

// IDE 2.0
function createTerminal(name: string): Terminal
```

**签名对比**:
```json
// 参数数量减少
// IDE 1.0: 2 个参数
// IDE 2.0: 1 个参数
```

**结果**: ❌ 不兼容
```
❌ Required parameter 'shellPath' was removed
```

---

## 8. 错误提示设计

### 8.1 控制台输出

```
[Error] Plugin 'my-extension@1.0.0' is not compatible with current IDE version (1.48.0):

  • window.createTerminal: PARAMETER_TYPE_CHANGED
    Parameter 'name' type changed from string to number

  • Terminal.sendText: REQUIRED_PARAMETER_REMOVED
    Required parameter 'text' was removed

  • commands.registerCommand: API_NOT_FOUND
    API 'commands.registerCommand' does not exist in current IDE version

Installation aborted. Please update the plugin to match IDE version 1.48.0
```

### 8.2 UI 提示（可选）

```
╔══════════════════════════════════════════════════════════╗
║  Plugin Installation Failed                               ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  Plugin: my-extension v1.0.0                              ║
║  IDE Version: Theia 1.48.0                                ║
║                                                           ║
║  The plugin is not compatible with this IDE version.      ║
║                                                           ║
║  Incompatible APIs (3):                                   ║
║  • window.createTerminal - Parameter type changed         ║
║  • Terminal.sendText - Required parameter removed         ║
║  • commands.registerCommand - API not found               ║
║                                                           ║
║  [View Details]  [Cancel]                                 ║
║                                                           ║
╚══════════════════════════════════════════════════════════╝
```

---

## 9. 测试策略

### 9.1 单元测试

**文件**: `packages/plugin-ext/src/main/node/plugin-api-compatibility-checker.spec.ts`

```typescript
import { expect } from 'chai';
import { PluginAPICompatibilityChecker } from './plugin-api-compatibility-checker';

describe('PluginAPICompatibilityChecker', () => {

    it('should accept compatible plugin (same signature)', () => {
        // ...
    });

    it('should accept plugin with comment changes', () => {
        // ...
    });

    it('should accept plugin with parameter name changes', () => {
        // ...
    });

    it('should accept plugin when optional parameter added', () => {
        // ...
    });

    it('should reject plugin when parameter type changed', () => {
        // ...
    });

    it('should reject plugin when required parameter removed', () => {
        // ...
    });

    it('should reject plugin when API not found', () => {
        // ...
    });
});
```

### 9.2 集成测试

创建测试插件，验证完整流程：

```bash
# 创建测试插件
mkdir test-plugin
cd test-plugin

# 创建 plugin-api-usage.json（模拟老版本 API）
cat > plugin-api-usage.json << EOF
{
  "usedApis": [
    {
      "namespace": "window",
      "member": "createTerminal",
      "signature": {
        "parameters": [{"name": "name", "type": "string", "optional": false}],
        "returnType": "Terminal"
      }
    }
  ]
}
EOF

# 尝试安装
theia --install-extension test-plugin

# 预期：如果 IDE 的 createTerminal 签名改了，安装失败
```

---

## 10. 常见问题

### Q1: 如果插件没有 plugin-api-usage.json 怎么办？

**A**: 允许安装，但记录警告日志。这样不会破坏现有插件的安装流程。

---

### Q2: 如何处理泛型类型？

**A**: 泛型参数会被规范化处理：

```typescript
// 规范化前
Array< string >
Map<string, number>

// 规范化后
Array<string>
Map<string,number>
```

---

### Q3: 如何处理联合类型和交叉类型？

**A**: 同样规范化处理：

```typescript
// 规范化前
string | number
Foo & Bar

// 规范化后
string|number
Foo&Bar
```

---

### Q4: 如何处理类型别名？

**A**: 使用 TypeScript Compiler API 解析后的完整类型：

```typescript
type MyType = string | number;
function foo(param: MyType): void

// 签名中会是解析后的类型
"parameters": [{"type": "string|number", ...}]
```

---

## 11. 性能优化

### 11.1 签名文件大小优化

预计签名文件大小：
- **约 300 个 API** × **平均 200 字节** = **60KB**
- Gzip 压缩后约 **15-20KB**

### 11.2 检查性能

- 读取签名文件: **< 5ms**
- 对比 50 个 API: **< 10ms**
- 总开销: **< 20ms**（可忽略不计）

---

## 12. 向后兼容策略

### Phase 1: 生成但不强制（1-2 个版本）

```typescript
if (!checkResult.compatible) {
    this.logger.warn(`⚠️  API compatibility issues found, but installation allowed`);
    // 仍然允许安装
}
```

### Phase 2: 警告但允许（1-2 个版本）

```typescript
if (!checkResult.compatible) {
    this.showWarningDialog('Plugin may not work correctly...');
    // 用户确认后允许安装
}
```

### Phase 3: 完全强制

```typescript
if (!checkResult.compatible) {
    return false; // 拒绝安装
}
```

---

## 13. 实施计划

| 阶段 | 任务 | 工作量 | 时间 |
|------|------|--------|------|
| **Phase 1** | API 签名提取工具 | 3 天 | 第 1 周 |
| **Phase 2** | 兼容性检查器 | 2 天 | 第 1 周 |
| **Phase 3** | 集成到部署流程 | 2 天 | 第 2 周 |
| **Phase 4** | 单元测试 | 2 天 | 第 2 周 |
| **Phase 5** | 集成测试 | 1 天 | 第 2 周 |
| **Phase 6** | 文档和优化 | 2 天 | 第 3 周 |

**总计**: 约 3 周

---

## 14. 总结

### 核心优势

✅ **简单高效**: 工具自动提取签名，安装时本地检查
✅ **准确性高**: 只检查真正的语义变化，忽略格式、注释等
✅ **离线可用**: 无需网络请求，所有数据本地可得
✅ **易于维护**: 与 IDE 版本强绑定，无需额外的版本管理
✅ **向后兼容**: 可以渐进式部署，不破坏现有流程

### 关键文件

- **theia-api-signatures.json**: IDE 的 API 签名清单（随 IDE 发布）
- **plugin-api-usage.json**: 插件的 API 使用清单（随插件发布）
- **extract-api-signatures.ts**: 签名提取工具
- **plugin-api-compatibility-checker.ts**: 兼容性检查器

---

**文档版本**: 2.0
**作者**: Theia 团队
**最后更新**: 2025-01-25
**状态**: 实施方案

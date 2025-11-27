# API 兼容性检查工具

## 核心文件

只有 **1 个核心文件**：`signature-based-analyzer.ts`

这个文件包含 3 个类，分别负责不同的功能。

---

## 功能 1: 提取 IDE 的 @theia/plugin API 声明

### 使用的类
**`IdeApiDeclarationGenerator`**

### 作用
从 IDE 的 `@theia/plugin` 包中提取所有 API 定义（包含签名信息）

### 使用方法
```typescript
import { IdeApiDeclarationGenerator } from './signature-based-analyzer';

const generator = new IdeApiDeclarationGenerator();

// 自动查找 @theia/plugin 包
const ideDeclaration = await generator.generateDeclaration();

// 或者手动指定路径
const ideDeclaration = await generator.generateDeclaration('/path/to/@theia/plugin');
```

### 输出结果
```typescript
{
  version: "1.57.1",
  generatedAt: "2025-11-27T...",
  apis: {
    "commands": {
      kind: "namespace",
      namespace: {
        "registerCommand": {
          kind: "function",
          signature: { parameters: [...], returnType: "..." }
        }
      }
    },
    "TreeItemCollapsibleState": {
      kind: "enum",
      enumValues: ["None", "Collapsed", "Expanded"]
    }
  }
}
```

---

## 功能 2: 提取插件的 API 使用情况

### 使用的类
**`PluginApiUsageExtractor`**

### 作用
扫描插件源码，提取所有使用的 @theia/plugin API（只记录是否使用，不记录次数）

### 使用方法
```typescript
import { PluginApiUsageExtractor } from './signature-based-analyzer';

const extractor = new PluginApiUsageExtractor();

// 传入插件目录路径
const pluginUsage = await extractor.extractUsage('/path/to/plugin');
```

### 输出结果
```typescript
{
  pluginId: "my-plugin",
  pluginVersion: "1.0.0",
  usedApis: [
    {
      apiName: "commands",
      usageType: "call",
      memberPath: ["commands", "registerCommand"],
      parameterCount: 2,
      locations: [
        { file: "src/extension.ts", line: 10 }
      ]
    },
    {
      apiName: "TreeItemCollapsibleState",
      usageType: "property",
      memberPath: ["TreeItemCollapsibleState", "None"],
      locations: [...]
    }
  ]
}
```

---

## 功能 3: 兼容性检查

### 使用的类
**`SignatureCompatibilityChecker`**

### 作用
比较插件使用和 IDE 声明，检查是否兼容（发现第一个不兼容就立即停止）

### 使用方法
```typescript
import { SignatureCompatibilityChecker } from './signature-based-analyzer';

const checker = new SignatureCompatibilityChecker();

// 传入上面两个步骤的结果
const result = checker.checkCompatibility(pluginUsage, ideDeclaration);

if (result.compatible) {
  console.log('✅ 插件兼容');
} else {
  console.log('❌ 不兼容:', result.issues[0].issue);
}
```

### 输出结果
```typescript
{
  compatible: false,
  issues: [
    {
      severity: "error",
      apiName: "window",
      memberPath: ["window", "onDidChangeActiveTextEditor"],
      issue: "Member 'onDidChangeActiveTextEditor' not found on 'window'",
      pluginUsage: {...}
    }
  ],
  summary: {
    totalApis: 141,
    compatibleApis: 0,
    incompatibleApis: 1,
    missingApis: 1
  }
}
```

---

## 完整使用示例

### 快速测试（使用测试脚本）
```bash
cd /root/theia/packages/plugin-ext
npx ts-node src/hosted/node/api-compatibility/test-signature-analyzer.ts /path/to/plugin
```

### 代码集成
```typescript
import {
  IdeApiDeclarationGenerator,
  PluginApiUsageExtractor,
  SignatureCompatibilityChecker
} from './signature-based-analyzer';

async function checkPluginCompatibility(pluginPath: string): Promise<boolean> {
  // 1. 生成 IDE API 声明（可以预先生成并缓存）
  const ideGenerator = new IdeApiDeclarationGenerator();
  const ideDeclaration = await ideGenerator.generateDeclaration();

  // 2. 提取插件 API 使用
  const usageExtractor = new PluginApiUsageExtractor();
  const pluginUsage = await usageExtractor.extractUsage(pluginPath);

  // 3. 检查兼容性（早期退出：发现第一个错误就停止）
  const checker = new SignatureCompatibilityChecker();
  const result = checker.checkCompatibility(pluginUsage, ideDeclaration);

  if (!result.compatible) {
    const issue = result.issues[0];
    console.error(`不兼容: ${issue.issue}`);
    console.error(`位置: ${issue.pluginUsage?.locations[0].file}:${issue.pluginUsage?.locations[0].line}`);
    return false;
  }

  return true;
}
```

---

## 性能特性

- ⚡ **早期退出**：发现第一个不兼容立即停止，不浪费时间
- 💾 **不生成文件**：不保存中间结果，节省空间
- 🎯 **只记录使用**：不统计使用次数，只记录是否使用
- 🔍 **精确匹配**：基于签名检查，支持枚举、命名空间等所有类型

---

## 文件说明

| 文件 | 说明 | 是否必需 |
|------|------|---------|
| `signature-based-analyzer.ts` | 核心实现（包含3个类） | ✅ 必需 |
| `test-signature-analyzer.ts` | 测试脚本（演示如何使用） | ✅ 推荐保留 |
| 其他 `.ts` 文件 | 旧版本实现 | ❌ 可删除 |

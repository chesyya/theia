# 插件 API 兼容性检查系统

## 概述

插件 API 兼容性检查系统用于在插件部署时自动检测插件使用的 API 是否与当前 IDE 环境兼容，防止不兼容的插件导致系统运行时错误。

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────────────────────┐
│                   插件部署流程                             │
│  PluginDeployerImpl → HostedPluginDeployerHandler        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
         ┌──────────────────────────┐
         │PluginApiCompatibilityService│
         │  (兼容性检查服务)           │
         └──────────┬───────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ↓                   ↓
    ┌─────────┐         ┌─────────┐
    │ 插件 API │         │ IDE API │
    │ 信息     │         │ 定义    │
    └─────────┘         └─────────┘
```

### 文件结构

```
packages/plugin-ext/src/hosted/node/
├── plugin-api-compatibility-service.ts    # 兼容性检查服务（新增）
├── hosted-plugin-deployer-handler.ts      # 插件部署处理器（已修改）
└── plugin-ext-hosted-backend-module.ts    # DI 模块配置（已修改）

packages/plugin/
└── ide-api-output.json                    # 当前 IDE 的 API 定义

plugins/xxx/
├── ide-api-output.json                    # 插件开发时的 IDE API 版本
└── plugin-api-usage.json                  # 插件的 API 使用情况
```

## 兼容性检查算法

### 1. 数据结构

#### IDE API 定义 (`ide-api-output.json`)

记录 IDE 提供的所有 API 的完整定义：

```typescript
interface IdeApiDeclaration {
    version: string;              // API 版本，如 "1.0.250201"
    generatedAt: string;          // 生成时间
    apis: Record<string, ApiDefinition>;  // 所有 API 定义
}

interface ApiDefinition {
    name: string;                 // API 名称
    kind: 'function' | 'class' | 'interface' | 'enum' | 'namespace' | 'type' | 'variable';

    // 函数/方法
    signature?: FunctionSignature;
    methods?: Record<string, FunctionSignature[]>;  // 支持重载

    // 类
    constructors?: FunctionSignature[];             // 构造函数（支持重载）
    properties?: Record<string, PropertyInfo>;      // 属性

    // 其他
    enumValues?: string[];        // 枚举值
    typeAlias?: string;           // 类型别名
    namespace?: Record<string, ApiDefinition>;  // 命名空间
}
```

#### 插件 API 使用情况 (`plugin-api-usage.json`)

记录插件实际使用的 API 列表：

```typescript
interface PluginApiUsage {
    pluginId: string;             // 插件 ID
    pluginVersion: string;        // 插件版本
    usedApis: UsedApiInfo[];      // 使用的 API 列表
    generatedAt: string;          // 生成时间
}

interface UsedApiInfo {
    apiName: string;              // 顶层 API 名称，如 "window"
    usageType: 'call' | 'construct' | 'property' | 'type';
    memberPath: string[];         // 成员路径，如 ["showInformationMessage"]
    fullPath: string[];           // 完整路径，如 ["window", "showInformationMessage"]
    parameterCount?: number;      // 传递的参数数量
    usageCount?: number;          // 使用次数
    locations: Array<{            // 使用位置
        file: string;
        line: number;
    }>;
}
```

### 2. 检查流程

```
开始检查
    │
    ├─ 是否是系统插件？
    │   └─ 是 → 返回兼容 ✅
    │
    ├─ 插件是否有兼容性文件？
    │   ├─ 无 ide-api-output.json → 返回不兼容 ❌
    │   └─ 无 plugin-api-usage.json → 返回不兼容 ❌
    │
    ├─ IDE API 是否已加载？
    │   └─ 否 → 记录警告，返回兼容 ⚠️
    │
    ├─ 加载插件的 API 信息
    │
    ├─ 遍历插件使用的每个 API
    │   │
    │   ├─ 在 V1 (插件版本) 中查找 API 定义
    │   │   └─ 未找到 → 跳过（可能是运行时 API）
    │   │
    │   ├─ 在 V2 (当前 IDE) 中查找 API 定义
    │   │   └─ 未找到 → 返回不兼容 ❌ "API 已被删除"
    │   │
    │   └─ 根据使用类型进行兼容性检查
    │       ├─ call → 检查函数签名兼容性
    │       ├─ construct → 检查构造函数兼容性
    │       ├─ property → 检查属性兼容性
    │       └─ type → 检查类型兼容性
    │
    └─ 所有 API 检查通过 → 返回兼容 ✅
```

### 3. 核心算法详解

#### 3.1 查找 API 定义 (`findApiDefinition`)

**目的**：在 API 定义树中定位具体的 API

**输入**：
- `apis`: API 定义集合
- `usage`: API 使用信息（包含 `apiName` 和 `memberPath`）

**算法**：
```typescript
function findApiDefinition(apis, usage) {
    // 1. 查找顶层 API
    let current = apis[usage.apiName];  // 如 apis["window"]
    if (!current) return null;

    // 2. 如果没有成员路径，返回顶层 API
    if (usage.memberPath.length === 0) {
        return current;
    }

    // 3. 遍历成员路径，深入查找
    for (memberName of usage.memberPath) {
        // 按优先级查找：namespace → methods → properties
        if (current.namespace?.[memberName]) {
            current = current.namespace[memberName];
        } else if (current.methods?.[memberName]) {
            return current.methods[memberName][0];  // 返回第一个重载
        } else if (current.properties?.[memberName]) {
            return current.properties[memberName];
        } else {
            return null;  // 未找到
        }
    }

    return current;
}
```

**示例**：
```javascript
// 插件代码：window.showInformationMessage("Hello")
usage = {
    apiName: "window",
    memberPath: ["showInformationMessage"],
    usageType: "call",
    parameterCount: 1
}

// 查找过程：
// 1. current = apis["window"]
// 2. current = current.methods["showInformationMessage"]
// 3. return current (FunctionSignature)
```

#### 3.2 函数调用兼容性检查 (`checkFunctionCallCompatibility`)

**目的**：检查函数调用是否兼容

**核心逻辑**：
```typescript
function checkFunctionCallCompatibility(usage, v1Def, v2Def) {
    // 1. 获取所有重载签名
    const v1Signatures = getAllFunctionSignatures(v1Def);
    const v2Signatures = getAllFunctionSignatures(v2Def);

    // 2. 根据插件传递的参数数量，在 V1 中找到匹配的重载
    const paramCount = usage.parameterCount;  // 插件实际传递的参数数量
    const v1MatchingSig = v1Signatures.find(sig => {
        const required = sig.parameters.filter(p => !p.optional).length;
        const total = sig.parameters.length;
        return paramCount >= required && paramCount <= total;
    });

    if (!v1MatchingSig) {
        return true;  // V1 中就不匹配，跳过检查
    }

    // 3. 在 V2 中找到匹配相同参数数量的重载
    const v2MatchingSig = v2Signatures.find(sig => {
        const required = sig.parameters.filter(p => !p.optional).length;
        const total = sig.parameters.length;
        return paramCount >= required && paramCount <= total;
    });

    if (!v2MatchingSig) {
        // V2 中没有接受这个参数数量的重载 → 不兼容
        return false;
    }

    // 4. 检查参数类型兼容性
    return checkParametersCompatibility(usage, v1MatchingSig, v2MatchingSig);
}
```

**示例**：
```javascript
// 插件代码：commands.registerCommand("id", handler)
// paramCount = 2

// V1 (插件开发时) API:
registerCommand(command: string, callback: Function): Disposable

// V2 (当前 IDE) API 变化:
registerCommand(command: string, callback: Function, thisArg?: any): Disposable

// 检查过程：
// 1. V1 匹配签名：2个参数（2个必需，0个可选）
// 2. V2 匹配签名：2个参数（2个必需，1个可选）
// 3. paramCount=2 在 V2 的有效范围内 [2, 3] ✅
// 4. 参数类型检查：string, Function ✅
// 结果：兼容 ✅
```

#### 3.3 参数兼容性检查 (`checkParametersCompatibility`)

**核心逻辑**：
```typescript
function checkParametersCompatibility(usage, v1Sig, v2Sig) {
    const paramCount = usage.parameterCount;
    const v2Params = v2Sig.parameters;

    // 1. 检查参数数量是否在 V2 的有效范围内
    const v2RequiredCount = v2Params.filter(p => !p.optional).length;
    const v2TotalCount = v2Params.length;

    if (paramCount < v2RequiredCount) {
        return false;  // ❌ 参数数量不足
    }

    if (paramCount > v2TotalCount) {
        return false;  // ❌ 参数数量过多
    }

    // 2. 逐个检查参数类型
    for (let i = 0; i < paramCount; i++) {
        const v1Param = v1Sig.parameters[i];
        const v2Param = v2Sig.parameters[i];

        if (!v2Param) {
            return false;  // ❌ 参数被删除
        }

        if (v1Param.type !== v2Param.type) {
            if (!isTypeCompatible(v1Param.type, v2Param.type)) {
                return false;  // ❌ 参数类型不兼容
            }
        }
    }

    return true;  // ✅ 兼容
}
```

#### 3.4 类型兼容性检查 (`isTypeCompatible`)

**简化的类型兼容性规则**：

```typescript
function isTypeCompatible(v1Type, v2Type) {
    // 1. 精确匹配
    if (v1Type === v2Type) return true;

    // 2. any 类型兼容所有类型
    if (v2Type === 'any') return true;

    // 3. 联合类型包含检查
    // 例如：v1Type = "string", v2Type = "string | undefined"
    if (v2Type.includes('|')) {
        const v2Types = v2Type.split('|').map(t => t.trim());
        if (v2Types.includes(v1Type)) return true;
    }

    return false;  // 其他情况认为不兼容
}
```

### 4. 不兼容场景示例

#### 场景 1：API 被删除
```javascript
// 插件使用：
system.onEvent("Browser.Disconnect", handler);

// V1 (插件开发时)：
system.onEvent(eventId: string, handler: Function): void  // ✅ 存在

// V2 (当前 IDE)：
// system.onEvent 不存在  // ❌ 已删除

// 结果：不兼容 ❌
// 错误：API system.onEvent 已被删除
```

#### 场景 2：必需参数增加
```javascript
// 插件使用：
Uri.file("/path/to/file");

// V1 API：
Uri.file(path: string): Uri

// V2 API 变更：
Uri.file(path: string, isDirectory: boolean): Uri

// 检查过程：
// paramCount = 1
// v2RequiredCount = 2
// 1 < 2 → 不兼容 ❌

// 结果：不兼容 ❌
// 错误：需要至少 2 个参数，但插件传递了 1 个
```

#### 场景 3：参数类型改变
```javascript
// 插件使用：
workspace.getConfiguration("editor");

// V1 API：
getConfiguration(section: string): Configuration

// V2 API 变更：
getConfiguration(section: ConfigurationTarget): Configuration

// 检查过程：
// v1Param.type = "string"
// v2Param.type = "ConfigurationTarget"
// "string" !== "ConfigurationTarget"
// isTypeCompatible("string", "ConfigurationTarget") = false

// 结果：不兼容 ❌
// 错误：第 1 个参数类型从 "string" 改变为 "ConfigurationTarget"
```

#### 场景 4：重载被移除
```javascript
// 插件使用：
new Position(1, 2, 3);  // 3个参数

// V1 API：
constructor(line: number, character: number)  // 2个参数
constructor(line: number, character: number, offset: number)  // 3个参数 ✅

// V2 API 变更：
constructor(line: number, character: number)  // 2个参数（3参数重载被移除）

// 检查过程：
// paramCount = 3
// V1 匹配签名：找到 3 参数重载 ✅
// V2 匹配签名：未找到 3 参数重载 ❌

// 结果：不兼容 ❌
// 错误：构造函数不再支持 3 个参数
```

## 部署策略

### 插件分类

| 插件类型 | 类型值 | 兼容性检查 | 文件要求 |
|---------|--------|-----------|---------|
| 系统插件 | `PluginType.System` | ❌ 跳过 | 无 |
| 用户插件 | `PluginType.User` | ✅ 必须 | 必须有 `ide-api-output.json` 和 `plugin-api-usage.json` |

### 部署决策

```typescript
// 位置：hosted-plugin-deployer-handler.ts:175-189

const isSystemPlugin = entry.type === PluginType.System;
const compatibilityResult = await this.compatibilityService.checkCompatibility(
    pluginPath,
    isSystemPlugin
);

if (!compatibilityResult.compatible) {
    // 记录详细错误信息
    logger.error(`Plugin is not compatible:
        - Plugin API version: ${compatibilityResult.pluginApiVersion}
        - Current IDE API version: ${compatibilityResult.currentIdeApiVersion}
        - Errors: ${compatibilityResult.errors}
    `);

    // 拒绝部署
    return false;
}

// 继续部署流程...
```

## 错误处理

### 1. 缺少兼容性文件（用户插件）
```
[ERROR] [API Compatibility] Plugin at /path/to/plugin is missing required
        compatibility files: ide-api-output.json, plugin-api-usage.json
[ERROR] [API Compatibility] Skipping deployment of incompatible plugin
```
**结果**：插件不部署 ❌

### 2. IDE API 定义未加载
```
[WARN] [API Compatibility] Current IDE API definition not loaded.
       This may indicate a system issue, but allowing plugin deployment to continue.
```
**结果**：插件正常部署 ⚠️（系统问题，不阻止插件）

### 3. 兼容性检查异常
```
[ERROR] [API Compatibility] Error checking plugin compatibility:
        JSON parse error...
```
**结果**：插件不部署 ❌（Fail-safe 策略）

### 4. API 不兼容
```
[ERROR] [API Compatibility] Plugin "my-plugin" is not compatible with current IDE API:
  - API system.onEvent 已被删除 (used in src/b.js:5)
  - 函数 window.showInformationMessage 不再支持 3 个参数 (used in src/main.js:42)
[ERROR] [API Compatibility] Skipping deployment of incompatible plugin
```
**结果**：插件不部署 ❌

## 配置与扩展

### 自定义 IDE API 位置

服务使用 `require.resolve` 自动定位 `@theia/plugin` 包：

```typescript
// plugin-api-compatibility-service.ts:459-472

constructor() {
    try {
        const pluginPackagePath = require.resolve('@theia/plugin/package.json');
        const pluginPackageDir = path.dirname(pluginPackagePath);
        this.currentIdeApiPath = path.join(pluginPackageDir, 'ide-api-output.json');
    } catch (error) {
        // 回退到相对路径
        this.currentIdeApiPath = path.join(__dirname, '../../../plugin/ide-api-output.json');
    }
}
```

### 扩展兼容性规则

如果需要自定义兼容性规则，可以修改以下方法：

1. **类型兼容性**：`isTypeCompatible()` - 添加更复杂的类型检查
2. **参数兼容性**：`checkParametersCompatibility()` - 自定义参数匹配规则
3. **属性兼容性**：`checkPropertyCompatibility()` - 添加属性访问规则

## 性能考虑

- **缓存 IDE API**：在服务初始化时加载一次，所有插件共享
- **惰性检查**：只在插件部署时检查，不影响运行时性能
- **增量检查**：只检查插件实际使用的 API，而非全量对比
- **快速失败**：发现第一个不兼容即停止检查并拒绝部署

## 相关文件

- **服务实现**：`packages/plugin-ext/src/hosted/node/plugin-api-compatibility-service.ts`
- **集成点**：`packages/plugin-ext/src/hosted/node/hosted-plugin-deployer-handler.ts`
- **DI 配置**：`packages/plugin-ext/src/hosted/node/plugin-ext-hosted-backend-module.ts`
- **原始算法**：`packages/plugin-ext/compatibility-checker.ts`（命令行工具版本）

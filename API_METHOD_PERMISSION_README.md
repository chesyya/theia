# Theia 插件 API 方法级别权限控制系统

## 概述

这是一个**细粒度的 API 方法级别权限控制系统**,可以精确控制插件对每个具体 API 方法的访问权限,而不仅仅是命名空间级别的控制。

## 核心特性

### 1. 细粒度控制
- ✅ 精确到单个 API 方法 (如 `window.showInformationMessage`)
- ✅ 每个方法独立配置权限
- ✅ 支持不同的策略: 允许(Allow)、拒绝(Deny)、询问(Ask)

### 2. 多维度限制
- 📊 **频率限制**: 每分钟/每小时调用次数
- 📏 **参数限制**: 文件大小、消息长度、按钮数量等
- 🛡️ **路径限制**: 文件访问路径的白名单/黑名单
- 👤 **用户批准**: 敏感操作需要用户确认

### 3. 灵活策略
- 🎯 全局默认策略
- 📋 未配置 API 的处理方式
- 📝 完整的调用日志

## 文件说明

| 文件名 | 说明 |
|--------|------|
| `plugin-api-method-permissions.xml` | 完整的 API 方法权限配置模板 |
| `plugin-api-method-permissions-scenarios.xml` | 6种实际场景的配置示例 |
| `api-permission-checker.ts` | TypeScript 实现的权限检查器 |

## XML 配置结构

### 基本结构

```xml
<Resource>
  <ResourceID>publisher.plugin-name</ResourceID>
  <TargetType>Plugin</TargetType>
  <ResourceName zh="插件名称" en="Plugin Name"/>

  <!-- 全局策略 -->
  <GlobalPolicy>
    <DefaultAction>Deny</DefaultAction>
    <AllowUnlistedApis>false</AllowUnlistedApis>
    <LogAllCalls>true</LogAllCalls>
  </GlobalPolicy>

  <!-- API 方法列表 -->
  <ApiMethods>
    <ApiMethod>
      <Namespace>window</Namespace>
      <MethodName>showInformationMessage</MethodName>
      <Attributes>
        <Attribute key="Allowed" type="boolean" default="true"/>
        <Attribute key="Action" type="enum" default="Allow"/>
        <!-- 更多属性... -->
      </Attributes>
    </ApiMethod>
  </ApiMethods>
</Resource>
```

### 全局策略说明

| 配置项 | 说明 | 可选值 |
|--------|------|--------|
| `DefaultAction` | 未配置 API 的默认动作 | Allow, Deny, Ask |
| `AllowUnlistedApis` | 是否允许未在列表中的 API | true, false |
| `LogAllCalls` | 是否记录所有 API 调用 | true, false |

## API 方法权限属性

### 通用属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `Allowed` | boolean | 是否允许调用该 API |
| `Action` | enum | 执行动作: Allow, Deny, Ask |
| `MaxCallsPerMinute` | number | 每分钟最大调用次数 |
| `MaxCallsPerHour` | number | 每小时最大调用次数 |
| `RequireUserApproval` | boolean | 是否需要用户批准 |

### window 命名空间专用属性

#### window.showInformationMessage / showWarningMessage / showErrorMessage

| 属性名 | 说明 |
|--------|------|
| `AllowModalOption` | 是否允许使用模态对话框选项 |
| `MaxMessageLength` | 最大消息长度(字符) |
| `MaxButtonCount` | 最大按钮数量 |

#### window.showInputBox

| 属性名 | 说明 |
|--------|------|
| `AllowPasswordInput` | 是否允许密码输入模式 |

#### window.showQuickPick

| 属性名 | 说明 |
|--------|------|
| `MaxItems` | 最大选项数量 |

#### window.createWebviewPanel

| 属性名 | 说明 |
|--------|------|
| `MaxWebviews` | 最大 WebView 数量 |
| `AllowScripts` | 是否允许 WebView 执行脚本 |
| `AllowedDomains` | 允许的域名列表(逗号分隔) |

#### window.createTerminal

| 属性名 | 说明 |
|--------|------|
| `MaxTerminals` | 最大终端数量 |

### workspace 命名空间专用属性

#### workspace.openTextDocument

| 属性名 | 说明 |
|--------|------|
| `AllowedPaths` | 允许的文件路径模式(glob) |
| `DeniedPaths` | 禁止的文件路径模式(glob) |
| `MaxFileSize` | 最大文件大小(字节) |

#### workspace.findFiles

| 属性名 | 说明 |
|--------|------|
| `MaxResults` | 最大搜索结果数 |
| `AllowedPaths` | 允许搜索的路径模式 |

#### workspace.getConfiguration

| 属性名 | 说明 |
|--------|------|
| `AllowedScopes` | 允许的配置作用域 |
| `AllowReadOtherConfigs` | 是否允许读取其他插件的配置 |

#### workspace.applyEdit

| 属性名 | 说明 |
|--------|------|
| `MaxEditSize` | 最大编辑大小(字符数) |

#### workspace.createFileSystemWatcher

| 属性名 | 说明 |
|--------|------|
| `MaxWatchers` | 最大文件监听器数量 |
| `AllowedPaths` | 允许监听的路径模式 |

### commands 命名空间专用属性

#### commands.registerCommand

| 属性名 | 说明 |
|--------|------|
| `MaxCommands` | 最大注册命令数 |
| `CommandPrefix` | 命令前缀要求 |

#### commands.executeCommand

| 属性名 | 说明 |
|--------|------|
| `AllowedCommands` | 允许执行的命令列表(逗号分隔) |
| `DeniedCommands` | 禁止执行的命令列表(逗号分隔) |
| `RequireApprovalForSensitive` | 敏感命令是否需要批准 |

### languages 命名空间专用属性

#### languages.register*Provider

| 属性名 | 说明 |
|--------|------|
| `AllowedLanguages` | 允许注册的语言ID列表(逗号分隔) |
| `MaxProviders` | 最大提供者数量 |

### debug 命名空间专用属性

#### debug.startDebugging

| 属性名 | 说明 |
|--------|------|
| `MaxSessions` | 最大调试会话数 |

### env 命名空间专用属性

#### env.openExternal

| 属性名 | 说明 |
|--------|------|
| `AllowedProtocols` | 允许的协议(逗号分隔) |
| `AllowedDomains` | 允许的域名(逗号分隔) |

#### env.clipboard.writeText / readText

| 属性名 | 说明 |
|--------|------|
| `MaxTextLength` | 最大文本长度 |

## 实际场景配置示例

### 场景 1: 只读插件

**需求**: 只能查看代码,不能修改

```xml
<Resource>
  <ResourceID>readonly.code-analyzer</ResourceID>
  <GlobalPolicy>
    <DefaultAction>Deny</DefaultAction>
    <AllowUnlistedApis>false</AllowUnlistedApis>
  </GlobalPolicy>
  <ApiMethods>
    <!-- ✅ 允许: 读取文件 -->
    <ApiMethod>
      <Namespace>workspace</Namespace>
      <MethodName>openTextDocument</MethodName>
      <Attributes>
        <Attribute key="Allowed" type="boolean" default="true"/>
      </Attributes>
    </ApiMethod>

    <!-- ❌ 禁止: 编辑文档 -->
    <ApiMethod>
      <Namespace>workspace</Namespace>
      <MethodName>applyEdit</MethodName>
      <Attributes>
        <Attribute key="Allowed" type="boolean" default="false"/>
        <Attribute key="Action" type="enum" default="Deny"/>
      </Attributes>
    </ApiMethod>
  </ApiMethods>
</Resource>
```

### 场景 2: 代码格式化工具

**需求**: 可以读写代码文件,但有大小限制

```xml
<ApiMethod>
  <Namespace>workspace</Namespace>
  <MethodName>applyEdit</MethodName>
  <Attributes>
    <Attribute key="Allowed" type="boolean" default="true"/>
    <Attribute key="Action" type="enum" default="Allow"/>
    <Attribute key="MaxEditSize" type="number" default="100000"/>
    <Attribute key="MaxCallsPerMinute" type="number" default="30"/>
  </Attributes>
</ApiMethod>
```

### 场景 3: 第三方未信任插件

**需求**: 所有操作都需要用户批准

```xml
<Resource>
  <ResourceID>unknown.untrusted-extension</ResourceID>
  <GlobalPolicy>
    <DefaultAction>Ask</DefaultAction>
    <AllowUnlistedApis>false</AllowUnlistedApis>
    <LogAllCalls>true</LogAllCalls>
  </GlobalPolicy>
  <ApiMethods>
    <!-- 询问用户 -->
    <ApiMethod>
      <Namespace>workspace</Namespace>
      <MethodName>openTextDocument</MethodName>
      <Attributes>
        <Attribute key="Action" type="enum" default="Ask"/>
        <Attribute key="RequireUserApproval" type="boolean" default="true"/>
        <Attribute key="DeniedPaths" type="string" default="**/.env,**/.ssh/**"/>
      </Attributes>
    </ApiMethod>

    <!-- 完全禁止 -->
    <ApiMethod>
      <Namespace>window</Namespace>
      <MethodName>createTerminal</MethodName>
      <Attributes>
        <Attribute key="Allowed" type="boolean" default="false"/>
        <Attribute key="Action" type="enum" default="Deny"/>
      </Attributes>
    </ApiMethod>
  </ApiMethods>
</Resource>
```

## TypeScript 实现

### 基本用法

```typescript
import { ApiPermissionChecker, PermissionAction } from './api-permission-checker';

// 1. 创建检查器实例
const checker = new ApiPermissionChecker();

// 2. 加载配置
const config = {
    pluginId: 'my.plugin',
    globalPolicy: {
        defaultAction: PermissionAction.Deny,
        allowUnlistedApis: false,
        logAllCalls: true
    },
    apiMethods: new Map([
        ['window.showInformationMessage', {
            namespace: 'window',
            methodName: 'showInformationMessage',
            allowed: true,
            action: PermissionAction.Allow,
            maxCallsPerMinute: 10
        }]
    ])
};

checker.loadConfig(config);

// 3. 检查权限
const result = await checker.checkPermission(
    'my.plugin',
    'window',
    'showInformationMessage',
    ['Hello World']
);

if (result.allowed) {
    // 允许调用
    console.log('Permission granted');
} else {
    // 拒绝调用
    console.error('Permission denied:', result.reason);
}
```

### 集成到 Theia Plugin API

```typescript
// 在插件 API 调用前拦截
class PluginApiProxy {
    constructor(private checker: ApiPermissionChecker) {}

    async callApi(
        pluginId: string,
        namespace: string,
        methodName: string,
        ...args: any[]
    ): Promise<any> {
        // 检查权限
        const permission = await this.checker.checkPermission(
            pluginId,
            namespace,
            methodName,
            args
        );

        if (!permission.allowed) {
            throw new Error(`Permission denied: ${permission.reason}`);
        }

        // 实际调用 API
        return this.invokeRealApi(namespace, methodName, ...args);
    }

    private invokeRealApi(namespace: string, methodName: string, ...args: any[]): any {
        // 实际的 API 调用逻辑
        // 例如: return vscode.window.showInformationMessage(...args);
    }
}
```

### 获取统计信息

```typescript
// 获取插件的 API 调用统计
const stats = checker.getStatistics('my.plugin');

console.log(`Total calls: ${stats.totalCalls}`);
console.log(`Allowed: ${stats.allowedCalls}`);
console.log(`Denied: ${stats.deniedCalls}`);
console.log('Top APIs:', stats.topApis);

// 输出示例:
// Total calls: 156
// Allowed: 142
// Denied: 14
// Top APIs: [
//   { api: 'window.showInformationMessage', count: 45 },
//   { api: 'workspace.openTextDocument', count: 38 },
//   { api: 'commands.executeCommand', count: 22 }
// ]
```

### 获取调用历史

```typescript
// 获取最近的调用记录
const history = checker.getCallHistory('my.plugin');

history.slice(-10).forEach(record => {
    console.log(
        `${new Date(record.timestamp).toISOString()} - ` +
        `${record.apiFullName}: ${record.allowed ? 'ALLOWED' : 'DENIED'} ` +
        `${record.denyReason || ''}`
    );
});

// 输出示例:
// 2025-11-10T10:30:15.234Z - window.showInformationMessage: ALLOWED
// 2025-11-10T10:30:16.456Z - workspace.openTextDocument: ALLOWED
// 2025-11-10T10:30:17.789Z - window.createTerminal: DENIED API explicitly denied
```

## API 分组策略

除了单个 API 的权限控制,还可以定义 **API 分组**,对一组相关的 API 应用统一策略:

```xml
<ApiGroups>
  <!-- UI 交互类 API -->
  <ApiGroup>
    <GroupName>UI_Interaction</GroupName>
    <Apis>
      <Api>window.showInformationMessage</Api>
      <Api>window.showWarningMessage</Api>
      <Api>window.showErrorMessage</Api>
    </Apis>
    <GroupPolicy>
      <MaxTotalCallsPerMinute>50</MaxTotalCallsPerMinute>
      <RequireUserConsent>false</RequireUserConsent>
    </GroupPolicy>
  </ApiGroup>

  <!-- 敏感操作类 API -->
  <ApiGroup>
    <GroupName>Sensitive_Operations</GroupName>
    <Apis>
      <Api>workspace.applyEdit</Api>
      <Api>window.createTerminal</Api>
      <Api>env.openExternal</Api>
    </Apis>
    <GroupPolicy>
      <AlwaysRequireUserApproval>true</AlwaysRequireUserApproval>
      <LogAllCalls>true</LogAllCalls>
      <MaxTotalCallsPerHour>20</MaxTotalCallsPerHour>
    </GroupPolicy>
  </ApiGroup>
</ApiGroups>
```

## 权限检查流程

```
用户调用插件 API
    ↓
1. 获取插件权限配置
    ↓
2. 查找该 API 的权限配置
    ↓
3. 如果未配置 → 使用全局默认策略
    ↓
4. 检查是否明确禁止 → 是 → 拒绝
    ↓
5. 检查频率限制 → 超限 → 拒绝
    ↓
6. 检查参数限制 → 不符合 → 拒绝
   (文件路径、大小、消息长度等)
    ↓
7. 是否需要用户批准?
   是 → 请求用户批准 → 拒绝 → 拒绝
    ↓
8. 记录调用日志
    ↓
9. 允许调用 ✅
```

## 优势对比

### 命名空间级别 vs API 方法级别

| 维度 | 命名空间级别 | API 方法级别 |
|------|-------------|-------------|
| **粒度** | 粗粒度 | 细粒度 |
| **示例** | 允许/禁止整个 `window` 命名空间 | 允许 `window.showInformationMessage`<br>但禁止 `window.createTerminal` |
| **灵活性** | 低 - 全有或全无 | 高 - 每个方法独立配置 |
| **安全性** | 低 - 无法精确控制 | 高 - 可以细致控制每个操作 |
| **配置复杂度** | 简单 | 较复杂 |
| **性能开销** | 低 | 稍高(需要更多检查) |

### 实际对比示例

**命名空间级别配置**:
```xml
<Attribute key="AllowWindowNamespace" type="boolean" default="true"/>
<!-- 问题: 允许了 window 命名空间就意味着允许了: -->
<!-- - window.showInformationMessage ✅ (安全) -->
<!-- - window.createTerminal ⚠️ (可能不安全) -->
<!-- - window.createWebviewPanel ⚠️ (可能不安全) -->
<!-- 无法精细控制! -->
```

**API 方法级别配置**:
```xml
<!-- ✅ 允许安全的 API -->
<ApiMethod>
  <Namespace>window</Namespace>
  <MethodName>showInformationMessage</MethodName>
  <Attributes>
    <Attribute key="Allowed" type="boolean" default="true"/>
  </Attributes>
</ApiMethod>

<!-- ❌ 禁止危险的 API -->
<ApiMethod>
  <Namespace>window</Namespace>
  <MethodName>createTerminal</MethodName>
  <Attributes>
    <Attribute key="Allowed" type="boolean" default="false"/>
  </Attributes>
</ApiMethod>

<!-- ⚠️ 需要批准的 API -->
<ApiMethod>
  <Namespace>window</Namespace>
  <MethodName>createWebviewPanel</MethodName>
  <Attributes>
    <Attribute key="Action" type="enum" default="Ask"/>
    <Attribute key="RequireUserApproval" type="boolean" default="true"/>
  </Attributes>
</ApiMethod>
```

## 最佳实践

### 1. 最小权限原则

只授予插件完成功能所必需的 API 权限:

```xml
<!-- ❌ 不好: 允许所有未配置的 API -->
<GlobalPolicy>
  <AllowUnlistedApis>true</AllowUnlistedApis>
</GlobalPolicy>

<!-- ✅ 好: 明确列出所需的 API -->
<GlobalPolicy>
  <AllowUnlistedApis>false</AllowUnlistedApis>
</GlobalPolicy>
<ApiMethods>
  <!-- 只列出必需的 API -->
</ApiMethods>
```

### 2. 敏感操作需要用户确认

```xml
<ApiMethod>
  <Namespace>workspace</Namespace>
  <MethodName>applyEdit</MethodName>
  <Attributes>
    <Attribute key="Action" type="enum" default="Ask"/>
    <Attribute key="RequireUserApproval" type="boolean" default="true"/>
  </Attributes>
</ApiMethod>
```

### 3. 设置合理的频率限制

```xml
<ApiMethod>
  <Namespace>window</Namespace>
  <MethodName>showInformationMessage</MethodName>
  <Attributes>
    <Attribute key="MaxCallsPerMinute" type="number" default="10"/>
    <Attribute key="MaxCallsPerHour" type="number" default="100"/>
  </Attributes>
</ApiMethod>
```

### 4. 使用路径过滤保护敏感文件

```xml
<ApiMethod>
  <Namespace>workspace</Namespace>
  <MethodName>openTextDocument</MethodName>
  <Attributes>
    <Attribute key="DeniedPaths" type="string"
      default="**/.env,**/.ssh/**,**/.git/**,**/node_modules/**"/>
  </Attributes>
</ApiMethod>
```

### 5. 启用审计日志

```xml
<GlobalPolicy>
  <LogAllCalls>true</LogAllCalls>
</GlobalPolicy>
```

## 与现有系统集成

可以将命名空间级别和 API 方法级别的权限系统结合使用:

1. **命名空间级别**: 作为第一道防线,快速过滤
2. **API 方法级别**: 作为第二道防线,精细控制

```typescript
// 两级检查
async function checkApiAccess(pluginId: string, namespace: string, method: string) {
    // 第一级: 命名空间检查
    if (!namespaceChecker.isAllowed(pluginId, namespace)) {
        return { allowed: false, reason: 'Namespace not allowed' };
    }

    // 第二级: API 方法检查
    return await apiMethodChecker.checkPermission(pluginId, namespace, method);
}
```

## 总结

这个 API 方法级别的权限系统提供了:

✅ **精确控制**: 每个 API 方法独立配置
✅ **多维限制**: 频率、参数、路径、用户批准
✅ **灵活策略**: Allow/Deny/Ask 三种模式
✅ **完整审计**: 调用历史和统计信息
✅ **易于扩展**: 可以添加新的限制维度

通过这个系统,你可以实现对插件 API 调用的**完全掌控**,确保系统安全的同时保持灵活性。

---

**版本**: 1.0
**最后更新**: 2025-11-10

# Theia 插件 API 权限资源系统

## 概述

本系统提供了一个基于 XML 的插件 API 权限管理方案,用于控制 Theia 插件对各类 API 的访问权限和资源配额。

## 文件说明

| 文件名 | 说明 |
|--------|------|
| `plugin-api-resources.xml` | 完整的权限配置模板，包含所有可配置属性 |
| `plugin-api-resources-example.xml` | 实际使用示例，包含6个不同场景的配置 |
| `plugin-api-resources.xsd` | XML Schema 定义文件，用于验证 XML 格式 |

## 核心概念

### Resource 元素

每个 `<Resource>` 元素代表一个插件的权限配置：

```xml
<Resource>
    <ResourceID>publisher.plugin-name</ResourceID>
    <TargetType>Plugin</TargetType>
    <ResourceName zh="插件名称" en="Plugin Name"/>
    <Attributes>
        <!-- 权限属性列表 -->
    </Attributes>
</Resource>
```

### 属性字段说明

- **ResourceID**: 插件的唯一标识符 (pluginId)
- **TargetType**: 目标类型
  - `Plugin`: 具体插件
  - `PluginTemplate`: 权限模板
  - `IDE`: IDE 级别资源
- **ResourceName**: 本地化资源名称
- **Attributes**: 权限属性列表

## 权限属性分类

### 1. 通用权限属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `Enabled` | boolean | 是否启用插件 API |
| `PermissionLevel` | enum | 权限级别: None, Read, Write, Execute, Full |
| `TrustLevel` | enum | 信任级别: Untrusted, Limited, Trusted, FullyTrusted |

### 2. 调用频率限制

| 属性 | 类型 | 说明 |
|------|------|------|
| `MaxCallsPerSecond` | number | 每秒最大调用次数 |
| `MaxCallsPerMinute` | number | 每分钟最大调用次数 |
| `MaxCallsPerHour` | number | 每小时最大调用次数 |
| `MaxCallsPerDay` | number | 每天最大调用次数 |
| `MaxConcurrentCalls` | number | 最大并发调用数 |
| `ApiTimeout` | number | API 调用超时时间(ms) |

### 3. 命名空间权限

控制对 Theia API 各个命名空间的访问：

| 属性 | 命名空间 | 常见 API |
|------|----------|----------|
| `AllowWindowNamespace` | window | showInformationMessage, showInputBox, activeTextEditor |
| `AllowWorkspaceNamespace` | workspace | getConfiguration, findFiles, openTextDocument |
| `AllowCommandsNamespace` | commands | registerCommand, executeCommand |
| `AllowLanguagesNamespace` | languages | registerCompletionItemProvider, getDiagnostics |
| `AllowDebugNamespace` | debug | startDebugging, registerDebugAdapterDescriptorFactory |
| `AllowScmNamespace` | scm | createSourceControl |
| `AllowExtensionsNamespace` | extensions | getExtension, onDidChange |

### 4. UI 交互权限

| 属性 | 说明 |
|------|------|
| `AllowShowInformationMessage` | 允许显示信息消息 |
| `MaxMessagesPerHour` | 每小时最大消息显示数 |
| `AllowModalDialogs` | 允许显示模态对话框 |
| `AllowWebviewCreation` | 允许创建 WebView |
| `MaxWebviews` | 最大 WebView 数量 |

### 5. 文件系统权限

| 属性 | 说明 |
|------|------|
| `AllowFileSystemRead` | 允许文件系统读取 |
| `AllowFileSystemWrite` | 允许文件系统写入 |
| `FileAccessPattern` | 文件访问路径模式 (glob) |
| `FileAccessDenyPattern` | 禁止访问路径模式 |
| `MaxFileReadSize` | 单次最大文件读取大小(字节) |
| `MaxFilesReadPerDay` | 每天最大文件读取总量(字节) |
| `AllowFileWatch` | 允许文件监听 |
| `MaxFileWatchers` | 最大文件监听数 |

### 6. 编辑器权限

| 属性 | 说明 |
|------|------|
| `AllowDocumentEdit` | 允许文档编辑 |
| `AllowOpenTextDocument` | 允许打开文本文档 |
| `AllowShowTextDocument` | 允许显示文本文档 |
| `MaxOpenDocuments` | 最大同时打开文档数 |

### 7. 命令执行权限

| 属性 | 说明 |
|------|------|
| `AllowRegisterCommand` | 允许注册命令 |
| `MaxRegisteredCommands` | 最大注册命令数 |
| `AllowExecuteCommand` | 允许执行命令 |
| `CommandWhitelist` | 命令白名单(逗号分隔) |
| `CommandBlacklist` | 命令黑名单(逗号分隔) |

### 8. 网络权限

| 属性 | 说明 |
|------|------|
| `AllowNetworkAccess` | 允许网络访问 |
| `AllowedDomains` | 允许的域名列表(逗号分隔) |
| `MaxNetworkRequestsPerDay` | 每天最大网络请求数 |
| `NetworkTimeout` | 网络请求超时(ms) |

### 9. 时间限制

| 属性 | 说明 |
|------|------|
| `AllowedStartTime` | 允许使用开始时间 (HH:mm) |
| `AllowedEndTime` | 允许使用结束时间 (HH:mm) |
| `AllowedDaysOfWeek` | 允许使用的星期 (1-7,逗号分隔) |
| `ExpirationDate` | 权限过期时间 (ISO 8601) |

### 10. 资源配额

| 属性 | 说明 |
|------|------|
| `MaxCpuUsage` | CPU 使用率限制(%) |
| `MaxMemoryUsage` | 内存使用限制(MB) |

### 11. 语言服务权限

| 属性 | 说明 |
|------|------|
| `AllowRegisterLanguageProvider` | 允许注册语言提供者 |
| `AllowedLanguages` | 允许的语言 ID 列表(逗号分隔) |

### 12. 调试权限

| 属性 | 说明 |
|------|------|
| `AllowDebugSession` | 允许启动调试会话 |
| `MaxDebugSessions` | 最大调试会话数 |

### 13. 终端权限

| 属性 | 说明 |
|------|------|
| `AllowCreateTerminal` | 允许创建终端 |
| `MaxTerminals` | 最大终端数量 |
| `AllowSendTextToTerminal` | 允许向终端发送文本 |

### 14. 配置权限

| 属性 | 说明 |
|------|------|
| `AllowReadConfiguration` | 允许读取配置 |
| `AllowUpdateConfiguration` | 允许修改配置 |
| `ConfigurationScope` | 配置访问范围: Global, Workspace, WorkspaceFolder, Self |

### 15. 安全相关

| 属性 | 说明 |
|------|------|
| `RequireUserConfirmation` | 敏感操作需要用户确认 |
| `AllowSensitiveApis` | 允许访问敏感 API |
| `ApiLogLevel` | API 调用日志级别: None, Error, Warn, Info, Debug, Trace |

## 使用场景

### 场景 1: 代码片段插件 (低风险)

**需求**: 读写代码片段文件，编辑文档，少量 UI 交互

```xml
<Resource>
    <ResourceID>vscode.snippets</ResourceID>
    <TargetType>Plugin</TargetType>
    <Attributes>
        <Attribute key="PermissionLevel" type="enum" default="Write"/>
        <Attribute key="AllowFileSystemWrite" type="boolean" default="true"/>
        <Attribute key="FileAccessPattern" type="string" default="**/*.{json,code-snippets}"/>
        <Attribute key="AllowDocumentEdit" type="boolean" default="true"/>
        <Attribute key="MaxMemoryUsage" type="number" default="64"/>
    </Attributes>
</Resource>
```

### 场景 2: Git 集成 (完全信任)

**需求**: 完整文件系统访问，终端执行，网络通信

```xml
<Resource>
    <ResourceID>vscode.git</ResourceID>
    <Attributes>
        <Attribute key="PermissionLevel" type="enum" default="Full"/>
        <Attribute key="TrustLevel" type="enum" default="FullyTrusted"/>
        <Attribute key="AllowFileSystemWrite" type="boolean" default="true"/>
        <Attribute key="AllowCreateTerminal" type="boolean" default="true"/>
        <Attribute key="AllowNetworkAccess" type="boolean" default="true"/>
        <Attribute key="AllowedDomains" type="string" default="github.com,gitlab.com"/>
    </Attributes>
</Resource>
```

### 场景 3: 主题插件 (只读 + 配置)

**需求**: 仅需修改自己的配置，无文件系统访问

```xml
<Resource>
    <ResourceID>publisher.my-theme</ResourceID>
    <Attributes>
        <Attribute key="PermissionLevel" type="enum" default="Read"/>
        <Attribute key="AllowFileSystemRead" type="boolean" default="false"/>
        <Attribute key="AllowUpdateConfiguration" type="boolean" default="true"/>
        <Attribute key="ConfigurationScope" type="enum" default="Self"/>
        <Attribute key="MaxMemoryUsage" type="number" default="32"/>
    </Attributes>
</Resource>
```

### 场景 4: 第三方未验证插件 (沙箱模式)

**需求**: 严格限制所有权限，记录所有操作

```xml
<Resource>
    <ResourceID>unknown.untrusted-plugin</ResourceID>
    <Attributes>
        <Attribute key="TrustLevel" type="enum" default="Untrusted"/>
        <Attribute key="MaxCallsPerSecond" type="number" default="5"/>
        <Attribute key="AllowFileSystemWrite" type="boolean" default="false"/>
        <Attribute key="AllowNetworkAccess" type="boolean" default="false"/>
        <Attribute key="RequireUserConfirmation" type="boolean" default="true"/>
        <Attribute key="ApiLogLevel" type="enum" default="Trace"/>
        <Attribute key="MaxMemoryUsage" type="number" default="128"/>
    </Attributes>
</Resource>
```

## 预定义权限模板

系统提供 4 个预定义模板，可以直接引用：

| 模板 ID | 适用场景 | 特点 |
|---------|---------|------|
| `template.restricted` | 高风险第三方插件 | 最小权限，严格限制 |
| `template.standard` | 常规功能插件 | 平衡权限，适合大多数插件 |
| `template.fulltrust` | 官方核心插件 | 完整权限，无限制 |
| `template.readonly` | 分析/查看类插件 | 只读权限，无修改能力 |

使用示例：

```xml
<!-- 继承模板 -->
<Resource>
    <ResourceID>my.plugin</ResourceID>
    <TargetType>Plugin</TargetType>
    <Template>template.standard</Template>
    <Attributes>
        <!-- 覆盖模板中的特定属性 -->
        <Attribute key="AllowNetworkAccess" type="boolean" default="true"/>
    </Attributes>
</Resource>
```

## 实现建议

### 1. 权限检查流程

```typescript
// 伪代码
function checkApiPermission(pluginId: string, apiName: string, namespace: string): boolean {
    const config = loadPluginPermissionConfig(pluginId);

    // 检查插件是否启用
    if (!config.Enabled) {
        return false;
    }

    // 检查命名空间权限
    const namespaceKey = `Allow${capitalize(namespace)}Namespace`;
    if (!config[namespaceKey]) {
        logDenied(pluginId, apiName, 'namespace not allowed');
        return false;
    }

    // 检查频率限制
    if (exceedsRateLimit(pluginId, config)) {
        logDenied(pluginId, apiName, 'rate limit exceeded');
        return false;
    }

    // 检查时间限制
    if (!isWithinAllowedTime(config)) {
        logDenied(pluginId, apiName, 'outside allowed time');
        return false;
    }

    // 检查是否需要用户确认
    if (config.RequireUserConfirmation && isSensitiveApi(apiName)) {
        return await requestUserConfirmation(pluginId, apiName);
    }

    return true;
}
```

### 2. 资源配额监控

```typescript
// 资源监控
class PluginResourceMonitor {
    private cpuUsage: Map<string, number> = new Map();
    private memoryUsage: Map<string, number> = new Map();

    checkAndEnforce(pluginId: string, config: PluginConfig): void {
        const cpu = this.cpuUsage.get(pluginId) || 0;
        const memory = this.memoryUsage.get(pluginId) || 0;

        if (cpu > config.MaxCpuUsage) {
            this.throttlePlugin(pluginId);
            console.warn(`Plugin ${pluginId} exceeded CPU limit`);
        }

        if (memory > config.MaxMemoryUsage * 1024 * 1024) {
            this.warnPlugin(pluginId);
            console.warn(`Plugin ${pluginId} exceeded memory limit`);
        }
    }
}
```

### 3. 审计日志

```typescript
// 日志记录
interface ApiCallLog {
    pluginId: string;
    apiName: string;
    namespace: string;
    timestamp: Date;
    allowed: boolean;
    denyReason?: string;
    parameters?: any;
}

function logApiCall(log: ApiCallLog): void {
    const logLevel = getPluginConfig(log.pluginId).ApiLogLevel;

    if (shouldLog(logLevel, log)) {
        auditLogger.log(log);
    }
}
```

## XML 验证

使用 XSD 验证 XML 文件：

```bash
# 使用 xmllint
xmllint --schema plugin-api-resources.xsd plugin-api-resources-example.xml

# 或使用在线工具
# https://www.freeformatter.com/xml-validator-xsd.html
```

## 最佳实践

### 1. 最小权限原则

只授予插件完成功能所必需的最小权限集合。

### 2. 分层权限管理

```
高风险操作 (需要用户确认)
  ├─ 文件系统写入
  ├─ 网络访问
  ├─ 终端执行
  └─ 配置修改

中等风险操作
  ├─ 文件系统读取
  ├─ 命令注册
  └─ UI 交互

低风险操作
  ├─ 读取配置
  ├─ 查看文档
  └─ 信息查询
```

### 3. 动态权限调整

根据用户信任度和插件行为，动态调整权限：

```typescript
// 用户首次安装 -> Untrusted
// 使用一段时间无异常 -> Limited
// 用户主动信任 -> Trusted
// 官方认证插件 -> FullyTrusted
```

### 4. 用户透明度

在 UI 中清晰展示插件请求的权限：

```
插件: vscode.git
请求权限:
  ✓ 读写文件系统
  ✓ 创建终端
  ✓ 访问网络 (github.com, gitlab.com)
  ✓ 注册 20 个命令
```

## 扩展性

### 添加新权限属性

1. 在 XML 模板中添加新的 `<Attribute>` 元素
2. 更新 XSD 文件（如需新的数据类型）
3. 在实现代码中添加权限检查逻辑
4. 更新文档

### 自定义权限策略

可以通过扩展 XML 支持自定义策略：

```xml
<Attribute
    key="CustomSecurityPolicy"
    type="string"
    default="company-policy-v1"/>

<Attribute
    key="RequireApproval"
    type="boolean"
    default="true"/>

<Attribute
    key="ApproverRole"
    type="string"
    default="admin,security-officer"/>
```

## 参考资源

- [Theia Plugin API 文档](https://theia-ide.org/docs/plugins/)
- [VS Code Extension Capabilities](https://code.visualstudio.com/api/references/extension-capabilities)
- [OWASP Application Security](https://owasp.org/www-project-application-security/)

---

**版本**: 1.0
**最后更新**: 2025-11-10

# Theia 插件 API 资源权限配置

## 格式说明

按照标准资源格式定义插件 API 权限：

```xml
<Resources>
  <Resource>
    <ResourceID>插件ID</ResourceID>
    <TargetType>Plugin</TargetType>
    <ResourceName zh="中文名称" en="English Name"/>
    <Attributes>
      <Attribute key="API名称" zh="中文说明" en="English" type="boolean" default="true/false"/>
    </Attributes>
  </Resource>
</Resources>
```

## 核心元素

### Resource
每个 `<Resource>` 代表一个插件的权限配置

| 元素 | 说明 | 示例 |
|------|------|------|
| `ResourceID` | 插件唯一标识符 | `publisher.my-plugin` |
| `TargetType` | 固定为 `Plugin` | `Plugin` |
| `ResourceName` | 插件名称(中英文) | `zh="我的插件" en="My Plugin"` |

### Attribute
每个 `<Attribute>` 代表一个 API 的访问权限

| 属性 | 说明 | 示例 |
|------|------|------|
| `key` | API 完整名称 (namespace.method) | `window.showInformationMessage` |
| `zh` | 中文说明 | `显示信息消息` |
| `en` | 英文说明 | `Show information message` |
| `type` | 数据类型，固定为 `boolean` | `boolean` |
| `default` | 默认值，`true` 允许，`false` 禁止 | `true` |

## API 命名规范

### 格式
`namespace.method`

### 示例

#### window 命名空间
```xml
<Attribute key="window.showInformationMessage" type="boolean" default="true"/>
<Attribute key="window.createTerminal" type="boolean" default="false"/>
```

#### workspace 命名空间
```xml
<Attribute key="workspace.openTextDocument" type="boolean" default="true"/>
<Attribute key="workspace.applyEdit" type="boolean" default="false"/>
```

#### commands 命名空间
```xml
<Attribute key="commands.registerCommand" type="boolean" default="true"/>
<Attribute key="commands.executeCommand" type="boolean" default="true"/>
```

#### languages 命名空间
```xml
<Attribute key="languages.registerCompletionItemProvider" type="boolean" default="false"/>
```

#### debug 命名空间
```xml
<Attribute key="debug.startDebugging" type="boolean" default="false"/>
```

#### env 命名空间
```xml
<Attribute key="env.openExternal" type="boolean" default="true"/>
<Attribute key="env.clipboard.writeText" type="boolean" default="true"/>
```

## 常用 API 列表

### UI 交互 (window)
| API | 说明 | 推荐默认值 |
|-----|------|-----------|
| `window.showInformationMessage` | 显示信息消息 | `true` |
| `window.showWarningMessage` | 显示警告消息 | `true` |
| `window.showErrorMessage` | 显示错误消息 | `true` |
| `window.showInputBox` | 显示输入框 | `true` |
| `window.showQuickPick` | 显示快速选择 | `true` |
| `window.showTextDocument` | 显示文本文档 | `true` |
| `window.createWebviewPanel` | 创建 WebView 面板 | `false` ⚠️ |
| `window.createTerminal` | 创建终端 | `false` ⚠️ |

### 文件系统 (workspace)
| API | 说明 | 推荐默认值 |
|-----|------|-----------|
| `workspace.openTextDocument` | 打开文本文档 | `true` |
| `workspace.findFiles` | 查找文件 | `true` |
| `workspace.getConfiguration` | 获取配置 | `true` |
| `workspace.applyEdit` | 应用编辑 | `false` ⚠️ |
| `workspace.createFileSystemWatcher` | 创建文件监听器 | `true` |

### 命令系统 (commands)
| API | 说明 | 推荐默认值 |
|-----|------|-----------|
| `commands.registerCommand` | 注册命令 | `true` |
| `commands.executeCommand` | 执行命令 | `true` |
| `commands.getCommands` | 获取命令列表 | `true` |

### 语言服务 (languages)
| API | 说明 | 推荐默认值 |
|-----|------|-----------|
| `languages.registerCompletionItemProvider` | 注册代码补全 | `false` |
| `languages.registerHoverProvider` | 注册悬停提示 | `false` |
| `languages.getDiagnostics` | 获取诊断信息 | `true` |

### 调试 (debug)
| API | 说明 | 推荐默认值 |
|-----|------|-----------|
| `debug.startDebugging` | 启动调试 | `false` ⚠️ |
| `debug.registerDebugAdapterDescriptorFactory` | 注册调试适配器 | `false` |

### 环境 (env)
| API | 说明 | 推荐默认值 |
|-----|------|-----------|
| `env.openExternal` | 打开外部链接 | `true` / `false` |
| `env.clipboard.writeText` | 写入剪贴板 | `true` |
| `env.clipboard.readText` | 读取剪贴板 | `false` ⚠️ |

⚠️ = 敏感操作，建议默认禁止

## 配置场景模板

### 场景 1: 只读插件 (查看/分析)
```xml
<Resource>
  <ResourceID>readonly.analyzer</ResourceID>
  <TargetType>Plugin</TargetType>
  <ResourceName zh="只读分析器" en="Read-only Analyzer"/>
  <Attributes>
    <!-- ✅ 允许 -->
    <Attribute key="window.showInformationMessage" type="boolean" default="true"/>
    <Attribute key="workspace.openTextDocument" type="boolean" default="true"/>
    <Attribute key="workspace.findFiles" type="boolean" default="true"/>
    <Attribute key="workspace.getConfiguration" type="boolean" default="true"/>

    <!-- ❌ 禁止 -->
    <Attribute key="workspace.applyEdit" type="boolean" default="false"/>
    <Attribute key="window.createTerminal" type="boolean" default="false"/>
  </Attributes>
</Resource>
```

### 场景 2: 编辑插件 (读写代码)
```xml
<Resource>
  <ResourceID>editor.formatter</ResourceID>
  <TargetType>Plugin</TargetType>
  <ResourceName zh="代码格式化" en="Code Formatter"/>
  <Attributes>
    <!-- ✅ 允许读写 -->
    <Attribute key="workspace.openTextDocument" type="boolean" default="true"/>
    <Attribute key="workspace.applyEdit" type="boolean" default="true"/>
    <Attribute key="window.showInformationMessage" type="boolean" default="true"/>

    <!-- ❌ 禁止危险操作 -->
    <Attribute key="window.createTerminal" type="boolean" default="false"/>
    <Attribute key="env.openExternal" type="boolean" default="false"/>
  </Attributes>
</Resource>
```

### 场景 3: 完全信任 (如 Git)
```xml
<Resource>
  <ResourceID>vscode.git</ResourceID>
  <TargetType>Plugin</TargetType>
  <ResourceName zh="Git版本控制" en="Git SCM"/>
  <Attributes>
    <!-- ✅ 允许所有必要操作 -->
    <Attribute key="window.showInformationMessage" type="boolean" default="true"/>
    <Attribute key="window.createTerminal" type="boolean" default="true"/>
    <Attribute key="workspace.openTextDocument" type="boolean" default="true"/>
    <Attribute key="workspace.applyEdit" type="boolean" default="true"/>
    <Attribute key="commands.registerCommand" type="boolean" default="true"/>
    <Attribute key="env.openExternal" type="boolean" default="true"/>
  </Attributes>
</Resource>
```

### 场景 4: 未信任插件 (最小权限)
```xml
<Resource>
  <ResourceID>untrusted.third-party</ResourceID>
  <TargetType>Plugin</TargetType>
  <ResourceName zh="未信任插件" en="Untrusted Plugin"/>
  <Attributes>
    <!-- ✅ 最小权限 -->
    <Attribute key="window.showInformationMessage" type="boolean" default="true"/>
    <Attribute key="workspace.getConfiguration" type="boolean" default="true"/>

    <!-- ❌ 禁止所有危险操作 -->
    <Attribute key="workspace.applyEdit" type="boolean" default="false"/>
    <Attribute key="window.createTerminal" type="boolean" default="false"/>
    <Attribute key="commands.executeCommand" type="boolean" default="false"/>
    <Attribute key="env.openExternal" type="boolean" default="false"/>
  </Attributes>
</Resource>
```

## 附加控制属性

除了具体 API 权限，还可以添加全局控制属性：

```xml
<Attributes>
  <!-- API 权限 -->
  <Attribute key="window.showInformationMessage" type="boolean" default="true"/>

  <!-- 全局限制 -->
  <Attribute key="MaxApiCallsPerMinute"
             zh="每分钟最大API调用次数"
             en="Max API calls per minute"
             type="number"
             min="1"
             max="10000"
             default="100"/>

  <Attribute key="MaxApiCallsPerHour"
             zh="每小时最大API调用次数"
             en="Max API calls per hour"
             type="number"
             min="1"
             max="100000"
             default="1000"/>
</Attributes>
```

## 实现建议

### 权限检查流程

```typescript
function checkApiPermission(pluginId: string, apiName: string): boolean {
    // 1. 加载插件配置
    const config = loadPluginConfig(pluginId);

    // 2. 查找 API 权限
    const apiAttr = config.attributes.find(attr => attr.key === apiName);

    // 3. 返回是否允许
    return apiAttr?.default === 'true';
}

// 使用示例
if (checkApiPermission('my.plugin', 'window.showInformationMessage')) {
    // 允许调用
    window.showInformationMessage('Hello');
} else {
    // 拒绝调用
    throw new Error('API access denied');
}
```

## 最佳实践

### 1. 最小权限原则
只授予插件完成功能所必需的 API

### 2. 危险 API 默认禁止
- ❌ `window.createTerminal`
- ❌ `window.createWebviewPanel`
- ❌ `workspace.applyEdit`
- ❌ `debug.startDebugging`
- ❌ `env.clipboard.readText`

### 3. 分类管理
- **只读插件**: 只允许读取 API
- **编辑插件**: 允许读写但不允许执行
- **系统插件**: 完全信任，允许所有 API
- **第三方插件**: 最小权限，严格限制

### 4. 定期审计
记录 API 调用日志，定期检查是否有异常行为

---

**文件**: `plugin-api-resources-format.xml`
**版本**: 1.0
**最后更新**: 2025-11-10

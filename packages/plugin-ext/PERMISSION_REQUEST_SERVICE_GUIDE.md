# Generic Permission Request Service - Implementation Guide

## 概述 (Overview)

已成功实现通用权限请求服务，提供可复用的用户权限确认功能，包含"记住选择"功能以避免频繁打扰用户。

The generic permission request service has been successfully implemented. It provides reusable user permission confirmation functionality with "remember choice" capability to avoid frequent user interruptions.

## 新增文件 (New Files)

### 1. `/packages/plugin-ext/src/common/permission-request-service.ts`
**通用权限请求接口定义 (Common Permission Request Interface)**

核心接口和类型定义：
- `PermissionSeverity`: 权限严重级别 (INFO, WARNING, HIGH, CRITICAL)
- `PermissionRequest`: 权限请求参数
- `PermissionDecision`: 权限决策结果
- `PermissionRememberScope`: 记住范围 (此操作/此类别/此插件/仅会话)
- `PermissionRequestService`: 通用权限服务接口

### 2. `/packages/plugin-ext/src/main/browser/permission-request-service-impl.ts`
**前端权限请求服务实现 (Frontend Permission Request Service)**

包含两个主要组件：
- `PermissionRequestDialog`: 自定义对话框，继承自 `AbstractDialog<PermissionDecision>`
  - 显示严重级别标识
  - 显示插件信息
  - 支持 Markdown 格式消息
  - "记住选择" 复选框
  - 记住范围下拉框（4个选项）

- `PermissionRequestServiceImpl`: 服务实现
  - 权限缓存管理
  - 避免重复弹窗
  - 支持多种记住范围
  - 通配符匹配缓存

### 3. `/packages/plugin-ext/src/main/browser/style/permission-dialog.css`
**权限对话框样式 (Permission Dialog Styles)**

包含：
- 严重级别标识样式（蓝/黄/橙/红）
- 插件信息区域样式
- 操作信息区域样式
- "记住选择" 区域样式

## 使用方法 (Usage)

### 基础用法 (Basic Usage)

```typescript
import { inject, injectable } from '@theia/core/shared/inversify';
import { PermissionRequestServiceImpl } from './permission-request-service-impl';
import {
    PermissionRequest,
    PermissionSeverity
} from '../../common/permission-request-service';

@injectable()
export class YourService {
    @inject(PermissionRequestServiceImpl)
    protected readonly permissionService: PermissionRequestServiceImpl;

    async someApiThatNeedsPermission(): Promise<void> {
        // 构建权限请求
        const request: PermissionRequest = {
            title: '权限请求标题',
            message: `详细说明\n\n可以使用 **Markdown** 格式`,
            severity: PermissionSeverity.WARNING,
            pluginId: 'your.plugin.id',
            pluginName: '你的插件名称',
            operationId: 'specific.operation.name',
            category: 'api', // 或 'module', 'network', 'filesystem' 等
            metadata: {
                // 可选的额外信息
                customData: 'value'
            }
        };

        try {
            // 请求权限（会显示对话框）
            const decision = await this.permissionService.$requestPermission(request);

            // 如果用户允许，继续执行
            console.log('Permission granted:', decision);
            // ... 执行需要权限的操作

        } catch (error) {
            // 用户拒绝
            console.error('Permission denied:', error);
        }
    }
}
```

### 记住范围说明 (Remember Scope Options)

用户可以选择以下记住范围：

1. **仅此操作 (THIS_OPERATION)**: 最精确
   - 缓存键: `pluginId:category:operationId`
   - 仅记住该具体操作

2. **此类别的所有操作 (THIS_CATEGORY)**: 中等范围
   - 缓存键: `pluginId:category:*`
   - 记住该插件此类别的所有操作
   - 例如：记住所有 `module` 类别操作

3. **此插件的所有操作 (THIS_PLUGIN)**: 最宽松
   - 缓存键: `pluginId:*:*`
   - 记住该插件的所有权限请求

4. **仅当前会话 (SESSION_ONLY)**: 临时
   - 不持久化，仅在当前会话有效

### 缓存管理 (Cache Management)

```typescript
// 获取缓存的权限
const cached = await permissionService.$getCachedPermission({
    pluginId: 'your.plugin.id',
    category: 'api',
    operationId: 'specific.operation'
});

// 清除插件的所有权限
await permissionService.$clearPluginPermissions('your.plugin.id');

// 清除特定类别的权限
await permissionService.$clearCategoryPermissions('your.plugin.id', 'api');
```

## 模块权限服务迁移示例 (Module Permission Service Migration)

`ModulePermissionService` 已经更新为使用通用权限服务：

```typescript
@injectable()
export class ModulePermissionService implements ModulePermissionChecker {
    @inject(PermissionRequestServiceImpl)
    protected readonly permissionRequestService: PermissionRequestServiceImpl;

    async $checkModulePermission(operation: ModuleOperation): Promise<void> {
        // 构建通用权限请求
        const request: PermissionRequest = {
            title: `模块权限请求 - ${operation.pluginName}`,
            message: `插件 **${operation.pluginName}** 正在尝试使用敏感模块功能...,
            severity: this.mapSensitivityToSeverity(config?.level),
            pluginId: operation.pluginId,
            pluginName: operation.pluginName,
            operationId: `${operation.moduleId}.${operation.functionName}`,
            category: 'module',
            metadata: { moduleId, functionName, args }
        };

        // 委托给通用服务
        const decision = await this.permissionRequestService.$requestPermission(request);
        // ...
    }
}
```

## 对话框特性 (Dialog Features)

### 严重级别标识 (Severity Badges)
- 📘 信息 (INFO) - 蓝色
- ⚠️ 警告 (WARNING) - 黄色
- 🔶 高危 (HIGH) - 橙色
- 🔴 严重 (CRITICAL) - 红色

### 用户交互 (User Interaction)
- **允许** 按钮：授予权限
- **拒绝** 按钮：拒绝权限
- **记住我的选择** 复选框：启用缓存
- **记住范围** 下拉框：选择缓存范围（勾选复选框后启用）

### Markdown 支持 (Markdown Support)
消息内容支持基础 Markdown：
- `**粗体**` → **粗体**
- `*斜体*` → *斜体*
- 换行 `\n` → 换行

## 架构优势 (Architecture Benefits)

1. **可复用性**: 任何需要用户确认的 API 都可以使用
2. **一致性**: 统一的权限请求界面和体验
3. **灵活性**: 支持多种记住范围和严重级别
4. **性能**: 避免重复弹窗，智能缓存
5. **用户友好**: 清晰的界面和灵活的记住选项

## 注册配置 (Registration)

服务已在 `/packages/plugin-ext/src/main/browser/plugin-ext-frontend-module.ts` 中注册：

```typescript
// CSS 导入
import '../../../src/main/browser/style/permission-dialog.css';

// 服务注册
bind(PermissionRequestServiceImpl).toSelf().inSingletonScope();
```

## 测试建议 (Testing Recommendations)

1. 测试不同严重级别的显示效果
2. 测试"记住选择"功能和不同范围
3. 测试缓存匹配逻辑（精确、类别、插件）
4. 测试避免重复弹窗机制
5. 测试缓存清除功能

## 未来扩展 (Future Extensions)

可能的扩展方向：
- 持久化权限决策（保存到配置文件）
- 权限管理界面（查看和管理所有权限）
- 权限审计日志
- 自定义对话框主题
- 支持更多 Markdown 语法

---

**实现状态**: ✅ 已完成并测试
**编译状态**: ✅ 通过
**服务器状态**: ✅ 运行中

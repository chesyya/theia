# ⚠️ FileSystemInterceptor - DEPRECATED

## 状态：已废弃

**此文件已被 `UnifiedModuleInterceptor` 取代。**

## 迁移指南

### Before (旧方式 - 已废弃)

```typescript
import { FileSystemInterceptor } from './file-system-interceptor';

// 在 loadPlugin 中
FileSystemInterceptor.interceptFsModule(plugin);
```

### After (新方式 - 推荐)

```typescript
import { UnifiedModuleInterceptor } from './unified-module-interceptor';

// 在初始化时（只需一次）
UnifiedModuleInterceptor.setupGlobalHook(permissionService);

// 在 loadPlugin 中
UnifiedModuleInterceptor.registerPlugin(plugin);
```

## 为什么废弃？

### 问题

1. **重复劫持** - `FileSystemInterceptor` 使用 `Module.prototype.require` 劫持，与 `module._load` 劫持冲突
2. **覆盖不全** - 只能拦截直接 require('fs')，无法拦截动态加载
3. **权限系统分散** - 文件系统权限和模块权限分开管理
4. **代码重复** - 与 `ModuleInterceptor` 有大量相似代码

### 解决方案

`UnifiedModuleInterceptor` 提供：

1. **统一拦截点** - 只在 `module._load` 一处劫持
2. **全面覆盖** - 拦截所有模块加载方式（import、require、动态 require）
3. **统一权限管理** - fs、child_process、http 等所有模块使用相同的权限检查
4. **简化代码** - 单一职责，易于维护

## 功能对比

| 特性 | FileSystemInterceptor | UnifiedModuleInterceptor |
|------|----------------------|-------------------------|
| 拦截方式 | Module.prototype.require | module._load |
| 拦截范围 | 只有 fs 相关模块 | 所有敏感模块 |
| 权限检查 | FileSystemPermissionChecker | ModulePermissionChecker (统一) |
| 覆盖方式 | import/require | 所有加载方式 |
| 代码维护 | 分散 | 集中 |

## 迁移步骤

如果你的代码中使用了 `FileSystemInterceptor`：

1. ✅ **移除导入**
   ```typescript
   // ❌ 删除
   import { FileSystemInterceptor } from './file-system-interceptor';
   ```

2. ✅ **移除调用**
   ```typescript
   // ❌ 删除
   FileSystemInterceptor.interceptFsModule(plugin);
   FileSystemInterceptor.setPermissionService(service);
   ```

3. ✅ **使用统一拦截器**
   ```typescript
   // ✅ 添加
   import { UnifiedModuleInterceptor } from './unified-module-interceptor';

   // 初始化时（只需一次）
   UnifiedModuleInterceptor.setupGlobalHook(permissionService);

   // 加载插件时
   UnifiedModuleInterceptor.registerPlugin(plugin);
   ```

## 时间线

- **2024-Q4** - `UnifiedModuleInterceptor` 创建，`FileSystemInterceptor` 标记为废弃
- **2025-Q1** - 所有代码迁移到 `UnifiedModuleInterceptor`
- **2025-Q2** - `FileSystemInterceptor` 文件删除（计划）

## 相关文件

- 新实现：`packages/plugin-ext/src/hosted/node/unified-module-interceptor.ts`
- 架构文档：`packages/plugin-ext/UNIFIED_PERMISSION_ARCHITECTURE.md`
- 设计文档：`packages/plugin-ext/UNIFIED_MODULE_PERMISSION_DESIGN.md`

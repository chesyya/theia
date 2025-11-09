# 简化 Category 设计方案

## 问题分析

当前设计要求每次调用权限检查时都要手动指定 `category`：

```typescript
await permissionService.$requestPermission({
    // ...
    operationId: 'fs.readFile',
    category: 'module',  // ❌ 需要手动维护
});
```

**问题**：
1. 需要给所有 API 和模块分类
2. 维护成本高，容易出错
3. 分类标准不统一

---

## 🎯 解决方案：自动提取 Category

### 方案 A：从 operationId 自动提取（推荐）

**规则**：
- `operationId` 格式：`<category>.<operation>`
- `category` 自动提取为第一个点之前的部分

**示例**：
```typescript
operationId: 'fs.readFile'           → category = 'fs'
operationId: 'child_process.exec'    → category = 'child_process'
operationId: 'terminal.sendText'     → category = 'terminal'
operationId: 'workspace.findFiles'   → category = 'workspace'
operationId: 'commands.execute'      → category = 'commands'
```

**实现**：

```typescript
// permission-request-service.ts

export interface PermissionRequest {
    title: string;
    message: string;
    severity: PermissionSeverity;
    pluginId: string;
    pluginName: string;

    /**
     * 操作标识符
     * 格式: `<category>.<operation>` 或 `<category>.<subcategory>.<operation>`
     *
     * 例如:
     * - 'fs.readFile'
     * - 'child_process.exec'
     * - 'workspace.fs.readFile'
     * - 'terminal.sendText'
     *
     * category 会自动从第一个点之前的部分提取
     */
    operationId: string;

    // ❌ 移除 category 字段
    // category: string;

    metadata?: Record<string, any>;
}

/**
 * 从 operationId 自动提取 category
 *
 * @param operationId 操作标识符，格式: 'category.operation'
 * @returns 提取的 category
 */
export function extractCategory(operationId: string): string {
    const firstDotIndex = operationId.indexOf('.');
    if (firstDotIndex === -1) {
        // 如果没有点，整个字符串就是 category
        return operationId;
    }
    return operationId.substring(0, firstDotIndex);
}

/**
 * 生成缓存键（使用自动提取的 category）
 */
export function generateCacheKeyString(pluginId: string, operationId: string): string {
    const category = extractCategory(operationId);
    return `${pluginId}:${category}:${operationId}`;
}
```

**调用时简化**：

```typescript
// ✅ 之前：需要手动指定 category
await permissionService.$requestPermission({
    title: '文件读取权限',
    message: '...',
    operationId: 'fs.readFile',
    category: 'module',  // ❌ 需要手动维护
    pluginId: 'test-plugin',
    pluginName: 'Test Plugin',
    severity: PermissionSeverity.HIGH
});

// ✅ 之后：category 自动提取
await permissionService.$requestPermission({
    title: '文件读取权限',
    message: '...',
    operationId: 'fs.readFile',  // ✅ category 自动提取为 'fs'
    pluginId: 'test-plugin',
    pluginName: 'Test Plugin',
    severity: PermissionSeverity.HIGH
});
```

---

## 方案 B：完全移除 Category（激进方案）

如果认为分类功能不重要，可以完全移除：

```typescript
export interface PermissionRequest {
    title: string;
    message: string;
    severity: PermissionSeverity;
    pluginId: string;
    pluginName: string;
    operationId: string;  // 唯一标识
    metadata?: Record<string, any>;
}

// 缓存键简化为
function generateCacheKeyString(pluginId: string, operationId: string): string {
    return `${pluginId}:${operationId}`;
}

// 记住范围简化
export enum PermissionRememberScope {
    THIS_OPERATION = 'this_operation',     // 仅此操作
    // ❌ 移除 THIS_CATEGORY
    THIS_PLUGIN = 'this_plugin',           // 此插件的所有操作
    SESSION_ONLY = 'session_only'          // 当前会话
}
```

**优点**：
- 最简化的设计
- 无需维护分类

**缺点**：
- 用户无法批量授权（如"允许所有 fs 操作"）
- 每个操作都需要单独授权（用户体验可能较差）

---

## 🏆 推荐方案：方案 A（自动提取）

### 优点

1. **简化调用**：不需要手动指定 category
2. **保留功能**：仍然支持"记住此类别的所有操作"
3. **自动分类**：基于命名约定自动提取
4. **向后兼容**：不改变用户体验

### 实现变更

#### 1. 修改接口定义

```typescript
// permission-request-service.ts

export interface PermissionRequest {
    title: string;
    message: string;
    severity: PermissionSeverity;
    pluginId: string;
    pluginName: string;
    operationId: string;  // ✅ 格式约定: 'category.operation'
    metadata?: Record<string, any>;
}

// ✅ 新增辅助函数
export function extractCategory(operationId: string): string {
    const firstDotIndex = operationId.indexOf('.');
    return firstDotIndex === -1 ? operationId : operationId.substring(0, firstDotIndex);
}

// ✅ 修改缓存键生成
export interface PermissionCacheKey {
    pluginId: string;
    operationId: string;  // ❌ 移除 category
}

export function generateCacheKeyString(key: PermissionCacheKey): string {
    const category = extractCategory(key.operationId);
    return `${key.pluginId}:${category}:${key.operationId}`;
}
```

#### 2. 修改权限服务实现

```typescript
// permission-request-service-impl.ts

async $requestPermission(request: PermissionRequest): Promise<PermissionDecision> {
    // ✅ 自动提取 category
    const category = extractCategory(request.operationId);

    const cacheKey: PermissionCacheKey = {
        pluginId: request.pluginId,
        operationId: request.operationId
    };

    // ... 其余逻辑不变
}

private async cacheDecisionWithScope(
    request: PermissionRequest,
    cacheKey: PermissionCacheKey,
    decision: PermissionDecision
): Promise<void> {
    const scope = decision.rememberScope || PermissionRememberScope.THIS_OPERATION;
    const category = extractCategory(request.operationId);

    switch (scope) {
        case PermissionRememberScope.THIS_OPERATION:
            await this.$cachePermission(cacheKey, decision);
            break;

        case PermissionRememberScope.THIS_CATEGORY:
            // ✅ 缓存同类别的所有操作
            const categoryKey: PermissionCacheKey = {
                pluginId: cacheKey.pluginId,
                operationId: `${category}.*`  // 通配符
            };
            await this.$cachePermission(categoryKey, decision);
            break;

        // ...
    }
}

async $getCachedPermission(key: PermissionCacheKey): Promise<PermissionDecision | null> {
    const category = extractCategory(key.operationId);

    // 1. 精确匹配
    const exactKey = generateCacheKeyString(key);
    if (this.permissionCache.has(exactKey)) {
        return this.permissionCache.get(exactKey)!;
    }

    // 2. 类别通配符匹配
    const categoryKey: PermissionCacheKey = {
        pluginId: key.pluginId,
        operationId: `${category}.*`
    };
    const categoryWildcardKey = generateCacheKeyString(categoryKey);
    if (this.permissionCache.has(categoryWildcardKey)) {
        return this.permissionCache.get(categoryWildcardKey)!;
    }

    // 3. 插件通配符匹配
    const pluginKey: PermissionCacheKey = {
        pluginId: key.pluginId,
        operationId: '*'
    };
    const pluginWildcardKey = generateCacheKeyString(pluginKey);
    if (this.permissionCache.has(pluginWildcardKey)) {
        return this.permissionCache.get(pluginWildcardKey)!;
    }

    return null;
}
```

#### 3. 修改对话框显示

```typescript
// permission-request-service-impl.ts

protected createMessageNode(): HTMLElement {
    const messageNode = document.createElement('div');

    // ✅ 自动提取并显示 category
    const category = extractCategory(this.request.operationId);

    const operationInfo = document.createElement('div');
    operationInfo.innerHTML = `
        <small>
            <strong>操作:</strong> ${this.escapeHtml(this.request.operationId)}
            <br>
            <strong>类别:</strong> ${this.escapeHtml(category)}
        </small>
    `;

    // ...
}
```

---

## operationId 命名规范

### 推荐格式

```
<category>.<operation>
或
<category>.<subcategory>.<operation>
```

### 示例

| operationId | 自动提取的 category | 说明 |
|------------|-------------------|------|
| `fs.readFile` | `fs` | 文件系统读取 |
| `fs.writeFile` | `fs` | 文件系统写入 |
| `child_process.exec` | `child_process` | 执行子进程 |
| `http.request` | `http` | HTTP 请求 |
| `workspace.findFiles` | `workspace` | 工作区文件查找 |
| `workspace.fs.readFile` | `workspace` | 工作区文件系统（多级） |
| `terminal.sendText` | `terminal` | 终端发送文本 |
| `commands.execute` | `commands` | 执行命令 |

### 对于没有点的 operationId

```typescript
// 如果 operationId 没有点，整个字符串就是 category
operationId: 'require'  → category = 'require'
```

---

## 迁移步骤

### 1. 更新类型定义
- 从 `PermissionRequest` 移除 `category` 字段
- 从 `PermissionCacheKey` 移除 `category` 字段
- 添加 `extractCategory()` 辅助函数

### 2. 更新实现
- 在需要 category 的地方调用 `extractCategory(operationId)`
- 更新缓存键生成逻辑

### 3. 更新调用代码
- 移除所有 `category: 'module'` 等手动指定
- 确保 `operationId` 格式符合规范

### 4. 更新文档
- 说明 operationId 命名规范
- 提供示例

---

## 总结

**推荐使用方案 A（自动提取 category）**：

✅ **优点**：
- 简化 API 调用
- 保留分类功能
- 自动化管理
- 向后兼容

❌ **缺点**：
- 需要约定 operationId 命名格式
- 需要开发者遵循规范

**实施后的效果**：

```typescript
// ✅ 简洁的 API
await permissionService.$requestPermission({
    title: '文件读取权限',
    message: '插件正在读取文件',
    operationId: 'fs.readFile',  // category 自动为 'fs'
    pluginId: 'my-plugin',
    pluginName: 'My Plugin',
    severity: PermissionSeverity.HIGH
});

// 用户选择"记住此类别的所有操作"
// → 自动记住所有 fs.* 操作（fs.readFile, fs.writeFile, fs.unlink 等）
```

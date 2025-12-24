# Tags 系统修复说明

## ❌ 修复前的严重问题

### 问题：Tags 缓存导致数据过时

**原始实现**：
```typescript
// deployed-plugin-deployer-handler.ts:334
// Tags 在插件部署时计算一次，然后永久缓存
deployed.tags = this.calculatePluginTags(id, type, key, options);
```

**问题场景示例**：

### 场景 1：共享插件被删除

```
时间线：
t1: 共享级安装 pluginA@2.0
t2: 用户 A 安装 pluginA@1.1（用户级）
    - 计算 tags: { hasSharedVersion: true, sharedVersion: '2.0', currentLevel: 'user' }
    - Tags 被缓存在 DeployedPlugin 对象中
t3: 管理员删除共享 pluginA@2.0
t4: ❌ 用户 A 的 tags 仍然显示 hasSharedVersion: true, sharedVersion: '2.0'
    - UI 错误显示插件有共享版本
    - shouldShowInSystemLevel 错误返回 true
    - 用户卸载时尝试恢复不存在的共享版本
```

### 场景 2：共享插件被安装

```
时间线：
t1: 用户 A 已安装 pluginA@1.1（用户级）
    - 计算 tags: { hasSharedVersion: false, currentLevel: 'user' }
t2: 管理员安装共享 pluginA@2.0
t3: ❌ 用户 A 的 tags 仍然显示 hasSharedVersion: false
    - UI 未显示有共享版本可用
    - shouldShowInSystemLevel 错误返回 false
```

### 场景 3：共享插件版本更新

```
时间线：
t1: 共享级有 pluginA@2.0
t2: 用户 A 安装 pluginA@1.1
    - 计算 tags: { sharedVersion: '2.0' }
t3: 管理员更新共享插件到 pluginA@2.5
t4: ❌ 用户 A 的 tags 仍然显示 sharedVersion: '2.0'
    - 版本信息过时，用户看到错误的版本号
```

## ✅ 修复后的实现

### 解决方案：实时计算 Tags

**新实现**：
```typescript
// 1. 部署时不计算 tags（line 333-334）
// 🆕 注意：tags 不在这里计算，而是在返回给前端时实时计算

// 2. 在所有返回插件的方法中实时计算 tags
async getDeployedPlugins(userId?: string): Promise<DeployedPlugin[]> {
    const allPlugins = [...frontend, ...backend];
    // 🆕 实时计算 tags，确保永远准确
    return this.attachTagsToPlugins(allPlugins, userId);
}

// 3. attachTagsToPlugins 为每个插件实时计算最新的 tags
protected attachTagsToPlugins(plugins: DeployedPlugin[], userId?: string): DeployedPlugin[] {
    return plugins.map(plugin => {
        const versionedId = PluginIdentifiers.componentsToVersionedId(plugin.metadata.model);
        const storageKey = this.determineStorageKey(plugin, userId);
        // 实时计算 tags - 每次请求都重新计算
        plugin.tags = this.calculatePluginTags(versionedId, plugin.type!, storageKey, { userId });
        return plugin;
    });
}
```

### 修复后的场景

```
场景 1（共享插件被删除）：
t1: 共享级安装 pluginA@2.0
t2: 用户 A 安装 pluginA@1.1
t3: 管理员删除共享 pluginA@2.0
t4: ✅ 前端请求插件列表
    - 后端实时计算 tags
    - 检查 deployedBackendPlugins.get('shared')?.get(pluginA) → undefined
    - 返回 { hasSharedVersion: false }
    - UI 正确显示无共享版本

场景 2（共享插件被安装）：
t1: 用户 A 已安装 pluginA@1.1
t2: 管理员安装共享 pluginA@2.0
t3: ✅ 前端请求插件列表
    - 后端实时计算 tags
    - 检查 deployedBackendPlugins.get('shared')?.get(pluginA) → pluginA@2.0
    - 返回 { hasSharedVersion: true, sharedVersion: '2.0' }
    - UI 正确显示有共享版本可用

场景 3（共享插件版本更新）：
t1: 共享级有 pluginA@2.0
t2: 用户 A 安装 pluginA@1.1
t3: 管理员更新共享插件到 pluginA@2.5
t4: ✅ 前端请求插件列表
    - 后端实时计算 tags
    - 检查 deployedBackendPlugins.get('shared')?.get(pluginA) → pluginA@2.5
    - 返回 { hasSharedVersion: true, sharedVersion: '2.5' }
    - UI 显示最新版本号
```

## 修改的文件和方法

### 1. hosted-plugin-deployer-handler.ts

**移除缓存计算**：
- Line 333-334: 删除部署时的 tags 计算

**添加实时计算**：
- `attachTagsToPlugins()`: 为插件数组批量附加最新 tags
- `determineStorageKey()`: 确定插件的存储范围
- `getDeployedBackendPlugins()`: 返回前添加实时 tags
- `getDeployedPlugins()`: 返回前添加实时 tags
- `getSystemPlugins()`: 返回前添加实时 tags
- `getDeployedPluginsById()`: 返回前添加实时 tags
- `getDeployedPlugin()`: 返回前添加实时 tags

## 性能影响

### 计算成本分析

```typescript
calculatePluginTags() {
    // 3 次 Map.get() 查询：
    const builtinPlugin = this.systemPlugins.get(unversionedId);           // O(1)
    const sharedPluginBackend = this.deployedBackendPlugins.get('shared')?.get(unversionedId);  // O(1)
    const userPluginBackend = this.deployedBackendPlugins.get(userId)?.get(unversionedId);     // O(1)
    // 总计：O(1) - 非常快
}
```

**结论**：
- 每个插件的 tags 计算 = 3 次 Map 查询 ≈ 几微秒
- 100 个插件 ≈ 几毫秒
- 性能影响可忽略不计

### 优势 vs 缓存方案

| 方案 | 数据准确性 | 实现复杂度 | 性能 | 维护成本 |
|------|----------|----------|-----|---------|
| **实时计算** | ✅ 永远准确 | ✅ 简单 | ✅ 可接受 | ✅ 低 |
| 缓存+通知 | ⚠️ 依赖通知 | ❌ 复杂 | ✅ 略好 | ❌ 高 |
| 缓存（旧方案） | ❌ 容易过时 | ✅ 简单 | ✅ 最好 | ❌ 数据不一致 |

## 验证测试

### 测试场景 1：删除共享插件

```bash
# 1. 管理员安装共享插件
POST /plugin/install { plugin: "test@1.0", scope: "shared" }

# 2. 用户 A 安装用户级插件
POST /plugin/install { plugin: "test@2.0", scope: "user", userId: "userA" }

# 3. 验证用户 A 看到共享版本
GET /plugins?userId=userA
# 预期：tags: { hasSharedVersion: true, sharedVersion: "1.0", currentLevel: "user" }

# 4. 管理员删除共享插件
DELETE /plugin/uninstall { plugin: "test@1.0", scope: "shared" }

# 5. ✅ 验证用户 A 不再看到共享版本
GET /plugins?userId=userA
# 预期：tags: { hasSharedVersion: false, currentLevel: "user" }
```

### 测试场景 2：安装共享插件

```bash
# 1. 用户 A 安装用户级插件
POST /plugin/install { plugin: "test@2.0", scope: "user", userId: "userA" }

# 2. 验证用户 A 未看到共享版本
GET /plugins?userId=userA
# 预期：tags: { hasSharedVersion: false, currentLevel: "user" }

# 3. 管理员安装共享插件
POST /plugin/install { plugin: "test@1.0", scope: "shared" }

# 4. ✅ 验证用户 A 现在看到共享版本
GET /plugins?userId=userA
# 预期：tags: { hasSharedVersion: true, sharedVersion: "1.0", currentLevel: "user" }
```

## 总结

### 修复的核心问题

1. **数据过时问题**：Tags 不再缓存，每次都实时计算最新状态
2. **UI 显示错误**：用户永远看到准确的版本信息
3. **分类错误**：插件视图分类基于最新的 tags
4. **卸载逻辑错误**：恢复逻辑基于准确的 tags

### 技术优势

1. **简单可靠**：不需要复杂的缓存失效和通知机制
2. **永远准确**：Tags 反映当前系统的真实状态
3. **性能可接受**：Map 查询非常快，几乎无性能影响
4. **易于维护**：逻辑集中，不会出现缓存不一致问题

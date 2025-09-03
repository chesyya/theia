# 按需用户插件管理系统使用指南

## 概览

新的按需用户插件管理系统解决了之前全量扫描用户目录的性能问题，实现了真正的多用户插件隔离。

## 架构变化

### 之前的问题
```
后端启动时：
├── 扫描 shared/ → 插件a, b
├── 扫描 users/bob/ → 插件c  
├── 扫描 users/alice/ → 插件d
└── 所有前端都看到: a, b, c, d ❌

Bob登录前端1 → 看到: a, b, c, d ❌
Alice登录前端2 → 看到: a, b, c, d ❌
```

### 现在的解决方案
```
后端启动时：
└── 扫描 shared/ → 插件a, b

Bob登录前端1时：
├── 识别用户: bob
├── 按需扫描: users/bob/ → 插件c
└── Bob看到: a, b, c ✅

Alice登录前端2时：
├── 识别用户: alice  
├── 按需扫描: users/alice/ → 插件d
└── Alice看到: a, b, d ✅
```

## 核心组件

### 1. UserSessionService - 用户会话管理
负责跟踪用户连接状态和会话信息。

```typescript
// 注册用户会话
sessionService.registerUserSession(sessionId, userId, isAdmin);

// 获取会话用户
const userId = sessionService.getUserForSession(sessionId);

// 检查管理员权限
const isAdmin = sessionService.isSessionAdmin(sessionId);
```

### 2. UserSessionPluginManager - 按需插件管理
监听会话事件，按需加载/卸载用户插件。

```typescript
// 获取会话插件
const plugins = sessionPluginManager.getSessionPlugins(sessionId);

// 重新加载用户插件（安装后）
await sessionPluginManager.reloadUserPlugins(userId);

// 重新加载共享插件
await sessionPluginManager.reloadSharedPlugins();
```

### 3. SessionAwarePluginService - 会话感知插件服务
提供会话级的插件查询和操作接口。

```typescript
// 获取会话可见插件
const plugins = sessionAwareService.getPluginsForSession(sessionId);

// 执行插件命令
const result = await sessionAwareService.executePluginCommand({
    sessionId,
    userId,
    pluginId: 'my-plugin',
    command: 'doSomething',
    args: ['arg1', 'arg2']
});

// 检查插件访问权限
const canAccess = sessionAwareService.canSessionAccessPlugin(sessionId, pluginId);
```

### 4. WebSocketSessionHandler - WebSocket会话处理
监听WebSocket连接，自动注册/注销用户会话。

## 用户身份识别

系统支持多种方式识别用户：

1. **查询参数**: `ws://localhost:3000/?userId=bob`
2. **请求头**: `X-User-ID: bob`
3. **Cookie**: `theia-user-id=bob`
4. **环境变量**: `THEIA_CURRENT_USER=bob`
5. **系统用户**: 使用当前系统用户名（fallback）

## 管理员权限识别

1. **配置服务**: 通过 `BaoskyConfigService.isAdminUser(userId)`
2. **环境变量**: `THEIA_IS_ADMIN=true`
3. **系统权限**: root用户或uid=0

## 插件安装流程

### 普通用户安装
```typescript
const result = await installationService.installPlugin({
    pluginPath: '/path/to/plugin.vsix',
    userId: 'alice',
    location: PluginInstallLocation.PERSONAL,  // 只能安装到个人目录
    isAdmin: false
});

// 安装后刷新用户会话
await sessionPluginManager.reloadUserPlugins('alice');
```

### 管理员安装
```typescript
// 安装到个人目录
const personalResult = await installationService.installPlugin({
    pluginPath: '/path/to/plugin.vsix',
    userId: 'admin',
    location: PluginInstallLocation.PERSONAL,
    isAdmin: true
});

// 安装到共享目录（所有用户可见）
const sharedResult = await installationService.installPlugin({
    pluginPath: '/path/to/plugin.vsix',
    userId: 'admin',
    location: PluginInstallLocation.SHARED,
    isAdmin: true
});

// 刷新所有会话（如果是共享插件）
if (sharedResult.success && location === PluginInstallLocation.SHARED) {
    await sessionPluginManager.reloadSharedPlugins();
}
```

## 前端集成

前端需要在建立WebSocket连接时传递用户信息：

```typescript
// 方法1: 查询参数
const wsUrl = `ws://localhost:3000/services/hostedPlugin?userId=${currentUserId}`;

// 方法2: 请求头
const socket = new WebSocket('ws://localhost:3000/services/hostedPlugin', [], {
    headers: {
        'X-User-ID': currentUserId
    }
});

// 方法3: Cookie
document.cookie = `theia-user-id=${currentUserId}; path=/`;
```

## 插件查询API

```typescript
// 获取所有插件
const allPlugins = sessionAwareService.getPluginsForSession(sessionId);

// 只获取用户插件
const userPlugins = sessionAwareService.getPluginsForSession(sessionId, {
    pluginType: 'user'
});

// 搜索插件
const foundPlugins = sessionAwareService.searchPlugins(sessionId, 'search-term');

// 获取插件统计
const stats = sessionAwareService.getSessionPluginStats(sessionId);
console.log(`总共 ${stats.totalPlugins} 个插件，其中用户插件 ${stats.userPlugins} 个`);
```

## 调试和监控

### 日志标识
- `[USER-SESSION]`: 用户会话管理
- `[SESSION-PLUGIN-MANAGER]`: 会话插件管理
- `[SESSION-PLUGIN-SERVICE]`: 会话插件服务
- `[WS-SESSION-HANDLER]`: WebSocket会话处理
- `[USER-PLUGIN-PARTICIPANT]`: 部署参与者
- `[USER-PLUGIN-RESOLVER]`: 目录解析器

### 监控API
```typescript
// 获取会话统计
const sessionStats = sessionService.getSessionStats();
console.log(`活跃会话: ${sessionStats.totalSessions}, 用户: ${sessionStats.totalUsers}`);

// 获取所有会话状态
const allStates = sessionPluginManager.getAllSessionPluginStates();

// 检查插件冲突
const conflicts = sessionAwareService.checkPluginConflicts(sessionId);
```

## 性能优化

1. **共享插件缓存**: 共享插件只在首次访问时扫描，后续复用缓存
2. **按需加载**: 用户插件只在用户连接时扫描
3. **会话复用**: 同一用户多个会话共享插件状态
4. **延迟清理**: 用户断开连接时，如果还有其他活跃会话则保持插件状态

## 向后兼容

系统通过 `THEIA_USER_PLUGINS_ENABLED` 环境变量控制：
- `true`: 启用新的按需加载系统
- `false` 或未设置: 使用原生插件管理系统

## 故障排除

### 用户插件未加载
1. 检查 `THEIA_USER_PLUGINS_ENABLED=true`
2. 验证用户身份识别是否正确
3. 检查插件目录权限 `.theia/plugins/users/用户名/`
4. 查看日志中的扫描信息

### 管理员权限问题
1. 检查 `THEIA_IS_ADMIN=true` 环境变量
2. 验证 `BaoskyConfigService.isAdminUser()` 实现
3. 确认系统用户权限（root或uid=0）

### WebSocket连接问题
1. 确认用户信息正确传递
2. 检查WebSocket验证器是否正确注册
3. 查看连接建立和断开日志
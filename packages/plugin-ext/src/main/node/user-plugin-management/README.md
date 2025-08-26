# 用户插件管理模块集成指南

## 概述

此模块提供了用户作用域的插件管理功能，支持在`.theia/plugins/`目录下创建用户专用的插件目录结构。

## 🔧 功能开关

用户插件管理功能通过环境变量控制，支持在原生插件管理模式和用户作用域插件管理模式之间切换：

### 启用用户作用域插件管理（推荐）
```bash
export THEIA_USER_PLUGINS_ENABLED=true
npm start
```

### 使用原生插件管理（默认）
```bash
export THEIA_USER_PLUGINS_ENABLED=false
# 或者不设置环境变量
npm start
```

> **注意**: 当 `THEIA_USER_PLUGINS_ENABLED` 不等于 `"true"` 时，系统将使用原生插件管理模式，保持完全的向后兼容性。

## 目录结构

```
.theia/plugins/
├── shared/           # 共享插件目录（所有用户可见）
└── users/            # 用户插件根目录
    ├── alice/        # 用户alice的私有插件
    ├── bob/          # 用户bob的私有插件
    └── admin/        # 管理员的私有插件
```

## 核心功能

### 1. 用户插件环境管理 (`UserPluginEnvironmentService`)
- 提供用户作用域的插件目录解析
- 支持共享插件和用户私有插件的目录管理
- 插件优先级：用户插件 > 共享插件 > 内置插件

### 2. 用户插件目录解析器 (`UserPluginDirectoryResolver`)
- 自动扫描用户插件目录和共享插件目录
- 支持的URL格式：
  - `user-plugins://` - 扫描所有用户插件目录
  - `user-plugins://userId` - 扫描特定用户的插件目录
  - `shared-plugins://` - 只扫描共享插件目录

### 3. 用户插件部署参与者 (`UserPluginDeployerParticipant`)
- 自动将用户插件目录注册到插件部署流程
- 在应用启动时自动扫描和部署用户插件

### 4. 用户插件安装服务 (`UserPluginInstallationService`)
- 支持管理员选择安装位置（个人/共享）
- 处理插件文件的复制和目录管理
- 确保权限和安全性

### 5. 用户插件清理服务 (`UserPluginCleanupService`)
- 监听用户删除事件
- 自动清理被删除用户的插件目录和部署缓存
- 确保系统资源的及时回收

## 集成步骤

### 步骤1：注册服务到依赖注入容器

在您的模块绑定文件中添加：

```typescript
// 在 plugin-ext-backend-module.ts 中添加
import { 
    UserPluginEnvironmentService,
    UserPluginCleanupService,
    UserPluginInstallationService,
    UserPluginDirectoryResolver,
    UserPluginDeployerParticipant
} from './node/user-plugin-management';

// 添加绑定
bind(UserPluginEnvironmentService).toSelf().inSingletonScope();
bind(UserPluginCleanupService).toSelf().inSingletonScope();
bind(UserPluginInstallationService).toSelf().inSingletonScope();
bind(UserPluginDirectoryResolver).toSelf().inSingletonScope();
bind(UserPluginDeployerParticipant).toSelf().inSingletonScope();

// 注册为插件部署系统的组件
bind(PluginDeployerResolver).toService(UserPluginDirectoryResolver);
bind(PluginDeployerParticipant).toService(UserPluginDeployerParticipant);
bind(BackendApplicationContribution).toService(UserPluginCleanupService);
```

### 步骤2：配置用户事件服务（可选）

如果您的系统有用户管理功能，需要在 `UserPluginCleanupService` 中集成用户删除事件：

```typescript
// 修改 getUserEventService() 方法
private getUserEventService(): UserEventService | undefined {
    try {
        // 从容器中获取您的用户事件服务
        return this.container.get(YourUserEventService);
    } catch {
        return undefined;
    }
}
```

### 步骤3：验证集成

1. 启动Theia应用
2. 检查日志中是否有用户插件管理服务的初始化信息
3. 在`.theia/plugins/shared/`目录放置测试插件
4. 验证插件是否被正确扫描和部署

## API使用示例

### 获取用户插件目录

```typescript
@inject(UserPluginEnvironmentService)
private userPluginEnvironment: UserPluginEnvironmentService;

// 获取共享插件目录
const sharedDir = await this.userPluginEnvironment.getSharedPluginsDirUri();

// 获取特定用户的插件目录
const userDir = await this.userPluginEnvironment.getUserPluginsDirUri('alice');

// 获取所有相关插件目录（按优先级排序）
const allDirs = await this.userPluginEnvironment.getAllPluginDirectories('alice');
```

### 安装插件到指定位置

```typescript
@inject(UserPluginInstallationService)
private installationService: UserPluginInstallationService;

// 管理员安装到共享目录
const result = await this.installationService.installPlugin({
    pluginPath: '/path/to/plugin.vsix',
    userId: 'admin',
    location: PluginInstallLocation.SHARED,
    isAdmin: true
});

// 用户安装到个人目录
const result = await this.installationService.installPlugin({
    pluginPath: '/path/to/plugin.vsix',
    userId: 'alice',
    location: PluginInstallLocation.PERSONAL,
    isAdmin: false
});
```

### 手动清理用户插件

```typescript
@inject(UserPluginCleanupService)
private cleanupService: UserPluginCleanupService;

// 手动清理特定用户的插件
await this.cleanupService.manualCleanup('alice');
```

## 注意事项

1. **权限管理**：确保只有管理员可以安装到共享目录
2. **目录权限**：确保应用进程有权限访问和修改`.theia/plugins/`目录
3. **用户隔离**：用户只能访问自己的插件目录和共享插件目录
4. **性能考虑**：大量用户时，建议优化目录扫描性能
5. **备份恢复**：重要插件建议实现备份机制

## 故障排除

### 插件未被扫描
- 检查插件文件格式（.vsix, .tgz等）
- 验证目录权限
- 查看日志中的扫描信息

### 安装失败
- 检查目标目录权限
- 验证用户权限（共享目录需要管理员权限）
- 确认插件文件完整性

### 清理服务未工作
- 检查用户事件服务是否正确集成
- 验证服务是否注册为BackendApplicationContribution
- 查看相关错误日志
# 模块拦截调试指南

## 🔍 执行流程详解

当插件执行 `const { exec } = require('child_process');` 时的完整流程：

```
1️⃣ require('child_process')
   ↓
   进入 Module.prototype.require (已被重写)
   日志: [Module Interceptor] 🔍 require('child_process') called

2️⃣ shouldIntercept('child_process') 检查
   ↓
   调用 isSensitiveModule('child_process')
   返回: true (因为 child_process 在敏感模块列表中)
   日志: [Module Interceptor] 🔍 shouldIntercept('child_process') = true

3️⃣ 检查 currentPlugin
   ↓
   如果 plugin 存在 → 继续
   如果 plugin 为 null → ⚠️ 问题所在！
   日志: [Module Interceptor] 🔍 currentPlugin = xxx 或 null

4️⃣ getProxiedModule()
   ↓
   检查缓存 → 没有则创建新代理
   日志: [Module Interceptor] 🚨 Intercepting module 'child_process' for plugin xxx

5️⃣ createModuleProxy()
   ↓
   创建 Proxy 对象
   日志: [Module Interceptor] 🎭 Creating proxy for module 'child_process'
   日志: [Module Interceptor] ✅ Created proxy for xxx:child_process

6️⃣ 返回 Proxy 对象 (看起来像 child_process 模块)
   ↓

7️⃣ 解构赋值: const { exec } = proxiedModule
   ↓
   触发 Proxy.get(target, 'exec')
   日志: [Module Interceptor] 🔍 Accessing property 'exec' on module 'child_process'
   日志: [Module Interceptor] ✅ Wrapping function 'exec' from module 'child_process'

8️⃣ 返回包装后的 exec 函数
   ↓

9️⃣ 当调用 exec('ls -la', callback) 时
   ↓
   触发包装函数
   日志: [Module Interceptor] 🔥 Function 'child_process.exec' is being called!

🔟 interceptFunctionCall() 进行权限检查
   ↓
   RPC 调用前端 → 显示权限对话框
   日志: [Module Interceptor] 🔍 Checking permission for xxx - child_process.exec(...)
```

## 🐛 常见问题排查

### 问题 1: currentPlugin 为 null

**症状**:
```
[Module Interceptor] ⚠️ No current plugin set, cannot intercept 'child_process'
```

**原因**:
- 拦截器启动时没有设置 currentPlugin
- 插件是在拦截器启动之前加载的

**解决方案**:
检查 `plugin-host-rpc.ts` 中的加载顺序：
```typescript
// 应该是这样的顺序：
FileSystemInterceptor.interceptFsModule(plugin);
ModuleInterceptor.startInterception(plugin);  // 设置 currentPlugin
return dynamicRequire(plugin.pluginPath);     // 加载插件代码
```

### 问题 2: 没有看到 require 日志

**症状**:
控制台没有任何 `[Module Interceptor]` 日志

**原因**:
- 拦截器根本没有启动
- 插件在后端进程中没有加载

**解决方案**:
1. 检查插件 package.json 是否配置了 `backend` 入口
2. 检查是否调用了 `ModuleInterceptor.startInterception()`

### 问题 3: 拦截了 require 但没有创建 Proxy

**症状**:
```
[Module Interceptor] 🔍 require('child_process') called
[Module Interceptor] 🔍 shouldIntercept('child_process') = true
[Module Interceptor] 🔍 currentPlugin = null
```

**原因**:
`isIntercepting` 标志已设置，但 `currentPlugin` 在多插件场景下被清空

**解决方案**:
修改 `startInterception()` 逻辑，支持多插件：
```typescript
if (this.isIntercepting) {
    // 只切换 currentPlugin，不返回
    this.currentPlugin = plugin;
    return;
}
```

### 问题 4: Proxy 创建了但 get 没有触发

**症状**:
```
[Module Interceptor] ✅ Created proxy for xxx:child_process
// 但是没有 "Accessing property 'exec'" 日志
```

**原因**:
- 插件可能使用了不同的方式访问函数
- 可能是缓存的模块

**解决方案**:
在 Proxy 的 get handler 中添加通用日志

## 📊 期望看到的完整日志

正常情况下，当插件执行 `const { exec } = require('child_process'); exec('ls');` 时，应该看到：

```
[Plugin Host] Starting module interception for plugin: module-permission-test
[Module Interceptor] 🔒 Starting interception for plugin: module-permission-test
[Module Interceptor] Permission service registered

// 当插件启动时
Plugin: module-permission-test activated

// 当执行 require('child_process') 时
[Module Interceptor] 🔍 require('child_process') called
[Module Interceptor] 🔍 shouldIntercept('child_process') = true
[Module Interceptor] 🔍 currentPlugin = module-permission-test
[Module Interceptor] 🚨 Intercepting module 'child_process' for plugin module-permission-test
[Module Interceptor] 🎭 Creating proxy for module 'child_process'
[Module Interceptor] ✅ Created proxy for module-permission-test:child_process

// 当执行 const { exec } = ... 时
[Module Interceptor] 🔍 Accessing property 'exec' on module 'child_process'
[Module Interceptor] ✅ Wrapping function 'exec' from module 'child_process'

// 当执行 exec('ls', ...) 时
[Module Interceptor] 🔥 Function 'child_process.exec' is being called!
[Module Interceptor] 🔍 Checking permission for module-permission-test - child_process.exec(...)
[Module Permission] 🔔 Requesting user permission for module-permission-test - child_process.exec

// 前端弹出对话框...
// 用户点击"允许"

[Module Permission] ✅ Cached decision for module-permission-test:child_process.exec = true
[Module Interceptor] ✅ Permission granted for module-permission-test - child_process.exec
```

## 🛠️ 调试命令

### 1. 查看编译后的代码
```bash
cat lib/hosted/node/module-interceptor.js | grep -A 5 "require('child_process')"
```

### 2. 检查拦截器是否正确导出
```bash
node -e "const MI = require('./lib/hosted/node/module-interceptor'); console.log(MI)"
```

### 3. 测试 isSensitiveModule
```bash
node -e "
const { isSensitiveModule } = require('./lib/common/module-permission-service');
console.log('child_process:', isSensitiveModule('child_process'));
console.log('fs:', isSensitiveModule('fs'));
console.log('path:', isSensitiveModule('path'));
"
```

### 4. 查看插件后端进程日志
```bash
# 启动 Theia 后，查找插件进程
ps aux | grep "plugin.*host"

# 查看进程输出
tail -f /path/to/plugin-host.log
```

## 🔧 如果还是不工作

1. **检查插件是否在后端运行**:
   ```json
   // package.json
   {
     "theiaPlugin": {
       "backend": "./out/backend.js"  // ✅ 必须有这个
     }
   }
   ```

2. **检查拦截器是否在插件加载前启动**:
   ```typescript
   // plugin-host-rpc.ts
   loadPlugin(plugin: Plugin): any {
       ModuleInterceptor.startInterception(plugin);  // ✅ 必须在 require 之前
       return dynamicRequire(plugin.pluginPath);
   }
   ```

3. **检查权限服务是否设置**:
   ```typescript
   // plugin-host-rpc.ts
   setupModuleInterception(): void {
       const service = this.rpc.getProxy(PLUGIN_RPC_CONTEXT.MODULE_PERMISSION_MAIN);
       ModuleInterceptor.setPermissionService(service);  // ✅ 必须调用
   }
   ```

4. **添加断点调试**:
   在 VS Code 中调试 Theia:
   - 在 `module-interceptor.ts` 的 `startInterception()` 设置断点
   - 在 `shouldIntercept()` 设置断点
   - 在 Proxy 的 `get` handler 设置断点

## ✅ 验证清单

- [ ] 编译成功，`lib/hosted/node/module-interceptor.js` 存在
- [ ] 插件有 `backend` 入口配置
- [ ] 看到 `[Module Interceptor] 🔒 Starting interception` 日志
- [ ] 看到 `require('child_process')` 被拦截的日志
- [ ] 看到 Proxy 创建成功的日志
- [ ] 看到属性访问 (`exec`) 的日志
- [ ] 看到函数调用时的权限检查日志

如果所有日志都出现，说明拦截系统工作正常！

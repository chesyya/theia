# 🎯 统一模块权限管理系统设计

## 核心理念

**所有模块（fs、child_process、http、net 等）都使用同一套权限检查机制**

不再区分"文件系统权限"和"模块权限"，而是统一为"模块操作权限"。

---

## 🏗️ 统一架构

```
┌────────────────────────────────────────────────────────────┐
│           UnifiedModuleInterceptor                         │
│           (Backend - Plugin Host Process)                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Global Hook: module._load                           │ │
│  │  ↓                                                    │ │
│  │  1. Identify Plugin (by parent.filename)             │ │
│  │  2. Check if Sensitive Module                        │ │
│  │  3. Return Proxied Module                            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Module Proxy (fs, child_process, etc.)              │ │
│  │  ↓                                                    │ │
│  │  On function call:                                   │ │
│  │  1. Build ModuleOperation                            │ │
│  │  2. Call UnifiedPermissionService (RPC)              │ │
│  │  3. Execute or reject based on decision              │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                          │ RPC
                          ↓
┌────────────────────────────────────────────────────────────┐
│        UnifiedModulePermissionService                      │
│        (Frontend - Browser)                                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  checkModulePermission(operation)                    │ │
│  │  ↓                                                    │ │
│  │  1. Check cache policy                               │ │
│  │  2. Show permission dialog if needed                 │ │
│  │  3. Update cache                                     │ │
│  │  4. Return decision (allow/deny)                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Policy Cache:                                             │
│  {                                                          │
│    "pluginId": {                                           │
│      "fs.readFileSync": "allow",                           │
│      "child_process.exec": "deny",                         │
│      "http.request": "ask"                                 │
│    }                                                        │
│  }                                                          │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 ModuleOperation 结构

所有模块操作都使用统一的数据结构：

```typescript
interface ModuleOperation {
    // 模块标识
    moduleId: string;           // 'fs', 'child_process', 'http', etc.

    // 函数名
    functionName: string;       // 'readFileSync', 'exec', 'request', etc.

    // 参数（清理后）
    args: any[];                // ['/etc/passwd'] or ['ls -la'] or ['https://api.com']

    // 插件信息
    pluginId: string;           // 'ms-python.python'
    pluginName: string;         // 'Python'

    // 可选：操作类型（用于分类）
    operationType?: 'read' | 'write' | 'execute' | 'network';
}
```

---

## 🔄 操作流程示例

### 示例 1: fs.readFileSync

```typescript
// 插件代码
import * as fs from 'fs';
const content = fs.readFileSync('/etc/passwd');

// 拦截流程
1. module._load('fs', ...)
   → UnifiedModuleInterceptor 返回代理模块

2. fs.readFileSync('/etc/passwd')
   → Proxy 拦截函数调用
   → 构建 ModuleOperation:
      {
        moduleId: 'fs',
        functionName: 'readFileSync',
        args: ['/etc/passwd'],
        pluginId: 'github.copilot',
        pluginName: 'GitHub Copilot'
      }

3. RPC call → Frontend UnifiedModulePermissionService

4. 前端弹窗:
   ┌─────────────────────────────────────────┐
   │ ⚠️  Permission Request                  │
   │                                          │
   │ Plugin: "GitHub Copilot"                │
   │ Module: fs.readFileSync                 │
   │ Path: /etc/passwd                       │
   │                                          │
   │ [Deny] [Allow Once] [Always Allow]      │
   └─────────────────────────────────────────┘

5. 用户选择 → 返回决策 → Backend 执行或拒绝
```

### 示例 2: child_process.exec

```typescript
// 插件代码
const { exec } = require('child_process');
exec('git status', (error, stdout, stderr) => { ... });

// 拦截流程
1. module._load('child_process', ...)
   → UnifiedModuleInterceptor 返回代理模块

2. exec('git status', callback)
   → Proxy 拦截函数调用
   → 构建 ModuleOperation:
      {
        moduleId: 'child_process',
        functionName: 'exec',
        args: ['git status', '[Function]'],
        pluginId: 'vscode.git',
        pluginName: 'Git'
      }

3. RPC call → Frontend

4. 前端弹窗:
   ┌─────────────────────────────────────────┐
   │ ⚠️  Permission Request                  │
   │                                          │
   │ Plugin: "Git"                           │
   │ Module: child_process.exec              │
   │ Command: git status                     │
   │                                          │
   │ ⚠️  This can execute system commands    │
   │                                          │
   │ [Deny] [Allow Once] [Always Allow]      │
   └─────────────────────────────────────────┘

5. 回调风格处理：
   - 如果允许：执行原始函数
   - 如果拒绝：调用 callback(PermissionError)
```

---

## 🎨 权限对话框设计

### 对话框内容生成逻辑

```typescript
function formatPermissionDialog(operation: ModuleOperation): DialogContent {
    const { moduleId, functionName, args, pluginName } = operation;

    // 根据模块类型定制显示内容
    switch(moduleId) {
        case 'fs':
        case 'fs/promises':
            return {
                title: 'File System Access',
                description: `Read/Write file: ${args[0]}`,
                warning: getFsWarning(functionName),
                icon: '📁'
            };

        case 'child_process':
            return {
                title: 'System Command Execution',
                description: `Execute command: ${args[0]}`,
                warning: '⚠️  This can execute arbitrary system commands',
                icon: '⚡'
            };

        case 'http':
        case 'https':
            return {
                title: 'Network Request',
                description: `Connect to: ${args[0] || 'remote server'}`,
                warning: 'This can send data to external servers',
                icon: '🌐'
            };

        case 'net':
            return {
                title: 'Network Socket',
                description: `Open connection to: ${args[0]}:${args[1]}`,
                warning: 'This can create network connections',
                icon: '🔌'
            };

        default:
            return {
                title: 'Module Access',
                description: `Use ${moduleId}.${functionName}`,
                warning: 'This may perform privileged operations',
                icon: '🔐'
            };
    }
}

function getFsWarning(functionName: string): string {
    if (functionName.includes('write') || functionName.includes('append')) {
        return '⚠️  This can modify files on your system';
    }
    if (functionName.includes('unlink') || functionName.includes('rm')) {
        return '⚠️  This can delete files on your system';
    }
    if (functionName.includes('exec') || functionName.includes('spawn')) {
        return '⚠️  This can execute programs';
    }
    return 'This will access files on your system';
}
```

---

## 🔐 权限策略

### 策略级别

```typescript
type PermissionDecision = 'allow' | 'deny' | 'ask';

interface PermissionPolicy {
    // 插件级别
    pluginId: string;

    // 模块级别策略
    modules: {
        [moduleId: string]: {
            // 默认策略
            default: PermissionDecision;

            // 函数级别策略
            functions?: {
                [functionName: string]: PermissionDecision;
            };

            // 路径/参数级别策略（可选）
            patterns?: {
                pattern: string;        // '/workspace/**' or 'git *'
                decision: PermissionDecision;
            }[];
        };
    };
}
```

### 策略示例

```json
{
    "github.copilot": {
        "modules": {
            "fs": {
                "default": "ask",
                "functions": {
                    "readFileSync": "allow",
                    "writeFileSync": "ask"
                },
                "patterns": [
                    {
                        "pattern": "/workspace/**",
                        "decision": "allow"
                    },
                    {
                        "pattern": "/etc/**",
                        "decision": "deny"
                    }
                ]
            },
            "https": {
                "default": "allow",
                "patterns": [
                    {
                        "pattern": "https://api.github.com/**",
                        "decision": "allow"
                    }
                ]
            },
            "child_process": {
                "default": "deny"
            }
        }
    },
    "vscode.git": {
        "modules": {
            "child_process": {
                "default": "ask",
                "patterns": [
                    {
                        "pattern": "git *",
                        "decision": "allow"
                    }
                ]
            }
        }
    }
}
```

---

## 🚀 实现步骤

### Phase 1: ✅ 已完成
- [x] 创建 `UnifiedModuleInterceptor`
- [x] 实现全局 `module._load` 劫持
- [x] 简化各个 init 文件

### Phase 2: 🔄 进行中
- [ ] 废弃或合并 `FileSystemInterceptor`
- [ ] 统一 RPC 接口（只保留 `ModulePermissionService`）
- [ ] 统一权限检查逻辑

### Phase 3: ⏳ 待实现
- [ ] 实现前端权限对话框
- [ ] 实现权限策略缓存
- [ ] 实现权限策略持久化
- [ ] 添加权限管理 UI

---

## 📊 对比：Before vs After

### Before (分散式)

```typescript
// FileSystemPermissionService
interface FileSystemOperation {
    operation: 'read' | 'write' | 'delete' | ...;
    path: string;
}

// ModulePermissionService
interface ModuleOperation {
    moduleId: string;
    functionName: string;
    args: any[];
}

// 两套不同的权限检查逻辑
// 两套不同的对话框
// 两套不同的策略存储
```

### After (统一式)

```typescript
// UnifiedModulePermissionService
interface ModuleOperation {
    moduleId: string;          // 包括 'fs'
    functionName: string;      // 包括 'readFileSync'
    args: any[];              // 包括 ['/path/to/file']
    pluginId: string;
    pluginName: string;
}

// 一套统一的权限检查逻辑
// 一套统一的对话框（根据模块类型定制显示）
// 一套统一的策略存储
```

---

## 💡 优势

1. **架构简化** - 从两套系统合并为一套
2. **用户体验统一** - 所有权限请求使用相同的对话框风格
3. **策略管理简化** - 一个文件管理所有权限
4. **易于扩展** - 添加新模块只需更新敏感模块列表
5. **维护成本降低** - 只需维护一套代码

---

## 🎯 下一步

1. 更新 `common/module-permission-service.ts`
   - 移除 `FileSystemPermissionChecker` 接口
   - 保留 `ModulePermissionChecker` 作为唯一接口

2. 更新 `UnifiedModuleInterceptor`
   - 确保能正确处理 fs 模块的所有函数

3. 实现前端 `UnifiedModulePermissionService`
   - 统一的权限对话框
   - 智能的提示信息（根据模块类型）
   - 策略缓存和持久化

4. 清理遗留代码
   - 标记 `FileSystemInterceptor` 为 deprecated
   - 更新文档
   - 更新测试用例

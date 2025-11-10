# API 文档 - 简化模板

## `namespace.methodName`

### 基本信息
- **命名空间**: `namespace`
- **完整路径**: `namespace.methodName()`
- **源文件**: `theia.d.ts:行号`

### 功能
简要描述 API 功能

### 方法签名
```typescript
export function methodName(param1: Type1, param2?: Type2): ReturnType;
```

### 参数

| 参数 | 类型 | 必填 | 获取方式 |
|------|------|------|----------|
| `param1` | `Type1` | ✓ | 🔧 直接传入 / 📥 从XX获取 |
| `param2` | `Type2` | ✗ | 🏗️ 构造对象 / 🔌 调用XX API |

**参数获取说明**:
- `param1`:
  - ✅ 可通过 `xxx()` 获取
  - ✅ 可直接传入字符串
- `param2`:
  - ✅ 接口定义: `interface Type2 { ... }`
  - ✅ 可通过 `yyy()` 获取

### 返回值
`ReturnType` - 说明

### 示例
```typescript
import * as theia from '@theia/plugin';

// 基本用法
const result = await theia.namespace.methodName('参数值');

// 参数从其他API获取
const param = await theia.other.getParam();
const result2 = await theia.namespace.methodName(param);
```

### 相关 API
- `namespace.relatedMethod1` - 说明
- `otherNamespace.relatedMethod2` - 说明

---

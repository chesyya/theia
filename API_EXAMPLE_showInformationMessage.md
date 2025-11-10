# API 文档示例 - window.showInformationMessage

## `window.showInformationMessage`

### 基本信息
- **命名空间**: `window`
- **完整路径**: `window.showInformationMessage()`
- **源文件**: `packages/plugin/src/theia.d.ts:5521`
- **API 类型**: 函数（有4个重载）

### 功能
在界面上显示一条信息消息，可以包含多个操作按钮供用户选择。消息会以通知的形式展示，用户可以选择某个按钮或直接关闭。

### 方法签名

```typescript
// 重载1: 接受字符串选项
export function showInformationMessage<T extends string>(
    message: string,
    ...items: T[]
): Thenable<T | undefined>;

// 重载2: 接受字符串选项 + 配置
export function showInformationMessage<T extends string>(
    message: string,
    options: MessageOptions,
    ...items: T[]
): Thenable<T | undefined>;

// 重载3: 接受 MessageItem 选项
export function showInformationMessage<T extends MessageItem>(
    message: string,
    ...items: T[]
): Thenable<T | undefined>;

// 重载4: 接受 MessageItem 选项 + 配置
export function showInformationMessage<T extends MessageItem>(
    message: string,
    options: MessageOptions,
    ...items: T[]
): Thenable<T | undefined>;
```

### 参数

| 参数 | 类型 | 必填 | 获取方式 |
|------|------|------|----------|
| `message` | `string` | ✓ | 🔧 直接传入 / 📥 从配置或用户输入获取 |
| `options` | `MessageOptions` | ✗ | 🏗️ 构造对象 |
| `items` | `T[]` | ✗ | 🔧 直接传入数组 / 🏗️ 构造 MessageItem 数组 |

#### 参数详细说明

**message: string**
- ✅ **直接传入**: 硬编码字符串
  ```typescript
  '保存成功！'
  ```
- ✅ **从配置读取**:
  ```typescript
  const config = workspace.getConfiguration('myPlugin');
  const message = config.get<string>('message', '默认消息');
  ```
- ✅ **从用户输入获取**:
  ```typescript
  const input = await window.showInputBox({ prompt: '输入消息' });
  ```
- ✅ **动态拼接**:
  ```typescript
  const fileName = document.fileName;
  const message = `文件 ${fileName} 已保存`;
  ```

**options: MessageOptions**
- ✅ **接口定义** (theia.d.ts:约5400行):
  ```typescript
  export interface MessageOptions {
      /**
       * 是否显示为模态对话框
       */
      modal?: boolean;
      /**
       * 详细信息文本
       */
      detail?: string;
  }
  ```
- ✅ **直接构造**:
  ```typescript
  const options: MessageOptions = {
      modal: true,
      detail: '这是详细说明文本'
  };
  ```
- ✅ **也可以内联构造**:
  ```typescript
  window.showInformationMessage('消息', { modal: true }, '按钮1');
  ```

**items: T[] (字符串数组或 MessageItem 数组)**
- ✅ **直接传入字符串数组**:
  ```typescript
  ['是', '否', '取消']
  ```
- ✅ **构造 MessageItem 数组**:
  ```typescript
  // MessageItem 接口定义 (theia.d.ts:约5420行)
  export interface MessageItem {
      title: string;                    // 按钮文本
      isCloseAffordance?: boolean;      // 是否作为关闭操作
  }

  // 使用示例
  const items: MessageItem[] = [
      { title: '确认', isCloseAffordance: false },
      { title: '取消', isCloseAffordance: true }
  ];
  ```
- ✅ **从其他 API 获取**:
  ```typescript
  // 从命令列表获取
  const commands = await commands.getCommands();
  const recentCommands = commands.slice(0, 5);

  // 从文件列表获取
  const files = await workspace.findFiles('**/*.ts', '**/node_modules/**', 10);
  const fileNames = files.map(uri => uri.fsPath);
  ```

### 返回值

| 返回类型 | 说明 |
|----------|------|
| `Thenable<T \| undefined>` | 异步返回用户选择的项，如果用户关闭消息则返回 undefined |

**返回值使用**:
```typescript
const result = await window.showInformationMessage('保存文件？', '是', '否');

if (result === '是') {
    // 保存文件
} else if (result === '否') {
    // 不保存
} else {
    // result === undefined，用户关闭了消息
}
```

### 类型依赖

| 类型名称 | 定义位置 | 如何获取 |
|---------|---------|----------|
| `MessageOptions` | `theia.d.ts:~5400` | 直接构造: `{ modal?: boolean, detail?: string }` |
| `MessageItem` | `theia.d.ts:~5420` | 直接构造: `{ title: string, isCloseAffordance?: boolean }` |
| `Thenable<T>` | TypeScript 内置 | Promise 兼容类型，可使用 async/await |

### 完整示例

#### 示例 1: 最简单的用法
```typescript
import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {
    const cmd = theia.commands.registerCommand('demo.hello', async () => {
        await theia.window.showInformationMessage('Hello Theia!');
    });
    context.subscriptions.push(cmd);
}
```

#### 示例 2: 带字符串选项
```typescript
const choice = await theia.window.showInformationMessage(
    '是否保存当前文件？',
    '保存',
    '不保存',
    '取消'
);

switch (choice) {
    case '保存':
        await saveFile();
        break;
    case '不保存':
        await discardChanges();
        break;
    case '取消':
    default:
        // 用户取消或关闭
        break;
}
```

#### 示例 3: 使用 MessageOptions（模态对话框）
```typescript
const result = await theia.window.showInformationMessage(
    '即将删除文件',
    { modal: true, detail: '此操作不可撤销，确认继续？' },
    '确认删除',
    '取消'
);

if (result === '确认删除') {
    await deleteFile();
}
```

#### 示例 4: 使用 MessageItem 对象
```typescript
const items: theia.MessageItem[] = [
    { title: '打开文件', isCloseAffordance: false },
    { title: '在新窗口打开', isCloseAffordance: false },
    { title: '取消', isCloseAffordance: true }
];

const result = await theia.window.showInformationMessage(
    '选择打开方式',
    ...items
);

if (result?.title === '打开文件') {
    await openInCurrentWindow();
} else if (result?.title === '在新窗口打开') {
    await openInNewWindow();
}
```

#### 示例 5: 参数从其他 API 动态获取
```typescript
// 从配置读取消息
const config = theia.workspace.getConfiguration('myExtension');
const welcomeMsg = config.get<string>('welcomeMessage', '欢迎使用插件');

// 从活动编辑器获取文件名
const editor = theia.window.activeTextEditor;
const fileName = editor?.document.fileName || '未知文件';

// 从用户输入获取
const customMsg = await theia.window.showInputBox({
    prompt: '自定义消息内容',
    value: welcomeMsg
});

// 显示消息
if (customMsg) {
    await theia.window.showInformationMessage(
        `${customMsg} - 当前文件: ${fileName}`,
        { modal: false },
        '确定'
    );
}
```

#### 示例 6: 组合多个 API 构建复杂参数
```typescript
// 1. 从文件系统获取文件列表
const files = await theia.workspace.findFiles('**/*.ts', '**/node_modules/**', 5);

// 2. 构造选项列表
const fileOptions = files.map(uri => {
    const fileName = uri.fsPath.split('/').pop() || uri.fsPath;
    return fileName;
});

// 3. 显示消息
const selected = await theia.window.showInformationMessage(
    `找到 ${files.length} 个 TypeScript 文件，选择一个打开：`,
    ...fileOptions
);

// 4. 处理选择结果
if (selected) {
    const selectedUri = files.find(uri => uri.fsPath.endsWith(selected));
    if (selectedUri) {
        await theia.window.showTextDocument(selectedUri);
    }
}
```

### 相关 API

| 相关 API | 命名空间 | 关系说明 |
|----------|----------|----------|
| `window.showWarningMessage` | `window` | 显示警告消息，API 签名相同 |
| `window.showErrorMessage` | `window` | 显示错误消息，API 签名相同 |
| `window.showInputBox` | `window` | 获取用户输入，可作为 message 参数来源 |
| `window.showQuickPick` | `window` | 显示快速选择列表，功能更强大 |
| `workspace.getConfiguration` | `workspace` | 获取配置值，可作为参数来源 |
| `window.activeTextEditor` | `window` | 获取当前编辑器状态，可用于构建动态消息 |

### 参数获取策略汇总

```
message: string
├─ ✅ 直接传入硬编码字符串
├─ ✅ workspace.getConfiguration().get<string>()
├─ ✅ window.showInputBox()
├─ ✅ 从文件/编辑器状态动态构建
└─ ✅ 字符串模板拼接

options: MessageOptions
├─ ✅ 直接构造对象 { modal: true }
└─ ✅ 内联传入 { modal: true, detail: '...' }

items: T[]
├─ ✅ 直接传入字符串数组 ['选项1', '选项2']
├─ ✅ 构造 MessageItem[] [{ title: '...', isCloseAffordance: ... }]
├─ ✅ commands.getCommands() 返回命令列表
├─ ✅ workspace.findFiles() 返回文件列表
└─ ✅ 任何返回字符串数组的 API
```

### 注意事项

- ⚠️ **返回值处理**: 必须检查返回值是否为 undefined（用户关闭消息的情况）
- ⚠️ **modal 选项**: 设置为 true 时会阻塞用户操作，谨慎使用
- ⚠️ **按钮数量**: 建议不超过 3-4 个按钮，过多会影响用户体验
- ⚠️ **异步调用**: 使用 await 等待用户响应，或使用 .then() 处理
- ⚠️ **MessageItem vs string**: 当需要设置 isCloseAffordance 时使用 MessageItem，否则简单字符串即可

### 实现原理

- **插件端**: `packages/plugin-ext/src/plugin/window-state.ts:showMessage()`
- **主端**: `packages/plugin-ext/src/main/browser/window-state-main.ts`
- **通信协议**: 通过 RPC 调用主端的 MessageService

---

**文档版本**: 1.0
**最后更新**: 2025-11-10

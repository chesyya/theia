# Theia Plugin Testing Suite

这是一个为Theia插件提供测试功能的完整测试套件，类似于VS Code的`@vscode/test-cli`和`@vscode/test-web`。该套件允许你在Web浏览器或Docker容器中运行Theia插件测试。

## 概述

该测试套件包含两个主要组件：

- **@theia/test-web**: Web端测试运行器，使用Playwright启动浏览器运行Theia实例
- **@theia/test-cli**: 命令行接口，提供便捷的测试执行和配置管理

## 功能特性

- ✅ **多平台支持**: 支持Web浏览器测试环境
- ✅ **Docker集成**: 支持使用Docker镜像运行Theia实例
- ✅ **开发模式**: 支持使用本地Theia源码进行测试
- ✅ **自动化测试**: 集成Mocha测试框架
- ✅ **代码覆盖率**: 支持测试覆盖率收集
- ✅ **监视模式**: 支持文件变化自动重新运行测试
- ✅ **配置灵活**: 支持多种配置方式和参数

## 安装

### 全局安装

```bash
npm install -g @theia/test-cli @theia/test-web
```

### 项目级安装

```bash
npm install --save-dev @theia/test-cli @theia/test-web
```

## 快速开始

### 1. 基本用法

在你的插件项目根目录下：

```bash
# 使用CLI运行测试
theia-test --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js

# 或者直接使用测试脚本路径
theia-test ./out/test/suite/index.js --extensionDevelopmentPath=.
```

### 2. 使用Docker镜像

```bash
theia-test --theiaImage=theiaide/theia:latest --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js
```

### 3. 使用本地Theia开发源码

```bash
theia-test --theiaDevPath=/path/to/theia/sources --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js
```

### 4. 启用监视模式

```bash
theia-test --watch --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js
```

## 配置选项

### 命令行参数

| 参数 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--extensionDevelopmentPath` | `-e` | 插件开发路径 | - |
| `--extensionTestsPath` | `-t` | 测试脚本路径 | - |
| `--quality` | `-q` | Theia版本质量 | `insiders` |
| `--commit` | - | 特定的Theia提交哈希 | - |
| `--theiaDevPath` | - | Theia开发源码路径 | - |
| `--theiaImage` | - | Docker镜像名称 | - |
| `--browserType` | `-b` | 浏览器类型 | `chromium` |
| `--headless` | - | 无头模式 | `true` |
| `--coverage` | `-c` | 启用代码覆盖率 | `false` |
| `--outputDir` | `-o` | 输出目录 | `./test-results` |
| `--timeout` | - | 测试超时(毫秒) | `60000` |
| `--reporter` | `-r` | Mocha报告器 | `spec` |
| `--workspaceFolder` | `-w` | 工作区文件夹 | - |
| `--verbose` | `-v` | 详细输出 | `false` |
| `--watch` | - | 监视模式 | `false` |

### package.json配置

在你的插件`package.json`中添加测试脚本：

```json
{
  "scripts": {
    "pretest": "npm run build",
    "test": "theia-test --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js",
    "test:web": "theia-test-web --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js --headless=true",
    "test:watch": "theia-test --watch --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js",
    "test:coverage": "theia-test --coverage --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js"
  },
  "devDependencies": {
    "@theia/test-cli": "^0.0.1",
    "@theia/test-web": "^0.0.1",
    "@types/mocha": "^10.0.2",
    "mocha": "^10.0.0"
  }
}
```

## 编写测试

### 测试入口文件

创建测试入口文件 `src/test/suite/index.ts`：

```typescript
import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
        timeout: 10000
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}
```

### 示例测试文件

创建测试文件 `src/test/suite/extension.test.ts`：

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { before, describe, it } from 'mocha';

describe('Extension Tests', () => {
    let extension: vscode.Extension<any> | undefined;

    before(async () => {
        extension = vscode.extensions.getExtension('your-publisher.your-extension');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    it('should be active', () => {
        assert.ok(extension?.isActive);
    });

    it('should register commands', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('your-extension.command'));
    });

    it('should execute command', async () => {
        await vscode.commands.executeCommand('your-extension.command');
        // 验证命令执行结果
    });
});
```

## 项目结构

推荐的插件项目结构：

```
your-plugin/
├── src/
│   ├── extension.ts          # 插件主文件
│   └── test/
│       └── suite/
│           ├── index.ts      # 测试入口
│           ├── extension.test.ts
│           └── integration.test.ts
├── out/                      # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

## 高级用法

### 程序化API

你也可以在代码中直接使用API：

```typescript
import { runTests } from '@theia/test-cli';

async function runMyTests() {
    try {
        await runTests({
            extensionDevelopmentPath: './my-extension',
            extensionTestsPath: './my-extension/out/test/suite/index.js',
            browserType: 'chromium',
            headless: true,
            coverage: true
        });
        console.log('Tests passed!');
    } catch (error) {
        console.error('Tests failed:', error);
        process.exit(1);
    }
}
```

### 自定义Theia实例

如果你有自定义的Theia构建或配置：

```bash
# 使用自定义Docker镜像
theia-test --theiaImage=my-custom-theia:latest

# 使用本地开发版本
theia-test --theiaDevPath=/home/user/theia

# 使用特定提交版本
theia-test --quality=stable --commit=abc123def
```

### 集成到CI/CD

在GitHub Actions中使用：

```yaml
name: Test Plugin
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build extension
        run: npm run build
      
      - name: Run tests
        run: npm test
```

## 故障排除

### 常见问题

1. **测试超时**
   ```bash
   theia-test --timeout=120000  # 增加超时时间到2分钟
   ```

2. **浏览器启动失败**
   ```bash
   theia-test --browserType=firefox  # 尝试不同的浏览器
   ```

3. **插件未激活**
   - 检查`package.json`中的`activationEvents`
   - 确保插件路径正确

4. **Docker相关问题**
   ```bash
   docker pull theiaide/theia:latest  # 手动拉取镜像
   ```

### 调试模式

启用详细输出来诊断问题：

```bash
theia-test --verbose --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js
```

## 示例项目

查看完整的示例插件项目：`/temp/test-plugin-example/`

该示例包含：
- 完整的插件实现
- 全面的测试用例
- 配置文件
- 构建脚本

## 贡献

欢迎贡献代码和改进建议！请参考[贡献指南](CONTRIBUTING.md)。

## 许可证

MIT License

## 更新日志

### v0.0.1
- 初始版本发布
- 支持Web端测试
- 支持CLI接口
- 支持Docker集成
- 支持监视模式
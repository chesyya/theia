# @theia/test-cli

Command-line runner for Theia plugin tests, similar to VS Code's `@vscode/test-cli`.

## Installation

```bash
npm install --save-dev @theia/test-cli
```

## Usage

### Command Line

```bash
# Run tests with extension development path
theia-test --extensionDevelopmentPath=./my-extension --extensionTestsPath=./my-extension/out/test/suite/index.js

# Run tests with test script as argument
theia-test ./out/test/suite/index.js --extensionDevelopmentPath=./my-extension

# Use Docker image
theia-test --theiaImage=theiaide/theia:latest --extensionDevelopmentPath=./my-extension --extensionTestsPath=./out/test/suite/index.js

# Watch mode
theia-test --watch --extensionDevelopmentPath=./my-extension --extensionTestsPath=./out/test/suite/index.js

# With coverage
theia-test --coverage --extensionDevelopmentPath=./my-extension --extensionTestsPath=./out/test/suite/index.js
```

### Programmatic API

```typescript
import { runTests } from '@theia/test-cli';

await runTests({
  extensionDevelopmentPath: './my-extension',
  extensionTestsPath: './my-extension/out/test/suite/index.js',
  browserType: 'chromium',
  headless: true,
  coverage: true
});
```

## CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--extensionDevelopmentPath` | `-e` | Extension development path | - |
| `--extensionTestsPath` | `-t` | Test runner script path | - |
| `--quality` | `-q` | Theia quality | `insiders` |
| `--theiaDevPath` | - | Theia development sources path | - |
| `--theiaImage` | - | Docker image name | - |
| `--browserType` | `-b` | Browser type | `chromium` |
| `--headless` | - | Headless mode | `true` |
| `--coverage` | `-c` | Enable code coverage | `false` |
| `--outputDir` | `-o` | Output directory | `./test-results` |
| `--timeout` | - | Test timeout (ms) | `60000` |
| `--reporter` | `-r` | Mocha reporter | `spec` |
| `--workspaceFolder` | `-w` | Workspace folder | - |
| `--verbose` | `-v` | Verbose output | `false` |
| `--watch` | - | Watch mode | `false` |

## Features

- ✅ Command-line interface
- ✅ Watch mode for development
- ✅ Code coverage support
- ✅ Multiple test reporters
- ✅ Docker integration
- ✅ Configuration flexibility
- ✅ CI/CD friendly

See the main [README](../README.md) for complete documentation.
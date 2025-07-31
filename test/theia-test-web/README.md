# @theia/test-web

Web-based test runner for Theia plugins, similar to VS Code's `@vscode/test-web`.

## Installation

```bash
npm install --save-dev @theia/test-web
```

## Usage

### Programmatic API

```typescript
import { runTests } from '@theia/test-web';

await runTests({
  browserType: 'chromium',
  extensionDevelopmentPath: './my-extension',
  extensionTestsPath: './my-extension/out/test/suite/index.js',
  headless: true
});
```

### Command Line

```bash
theia-test-web --extensionDevelopmentPath=./my-extension --extensionTestsPath=./my-extension/out/test/suite/index.js --headless=true
```

## Options

- `browserType`: Browser to use ('chromium', 'firefox', 'webkit', 'none')
- `extensionDevelopmentPath`: Path to extension under development
- `extensionTestsPath`: Path to test runner script
- `quality`: Theia quality ('insiders', 'stable')
- `theiaDevPath`: Path to Theia development sources
- `theiaImage`: Docker image name for Theia
- `headless`: Run in headless mode
- `verbose`: Enable verbose output

## Features

- ✅ Web-based testing environment
- ✅ Docker integration
- ✅ Development sources support
- ✅ Multiple browser support
- ✅ Headless testing
- ✅ Plugin integration

See the main [README](../README.md) for complete documentation.
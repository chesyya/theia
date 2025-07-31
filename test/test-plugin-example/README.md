# Test Plugin Example

This is an example Theia plugin that demonstrates how to use the Theia testing suite.

## Features

- Command registration (`testPlugin.helloWorld`, `testPlugin.showMessage`)
- Configuration support
- Status bar integration
- Document provider
- Event handling
- Comprehensive test suite

## Building

```bash
npm install
npm run build
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests with Theia Test Web
```bash
npm run test:web
```

### Run tests in development mode
```bash
npm run test:watch
```

## Test Structure

- `src/test/suite/index.ts` - Test runner entry point
- `src/test/suite/extension.test.ts` - Extension activation and API tests
- `src/test/suite/integration.test.ts` - Integration tests with VS Code APIs

## Test Coverage

The test suite covers:

- ✅ Extension activation
- ✅ Command registration and execution
- ✅ Configuration management
- ✅ API functionality
- ✅ Document provider
- ✅ Editor integration
- ✅ File system operations
- ✅ Concurrent operations
- ✅ Error handling

## Configuration

The plugin supports these configuration options:

- `testPlugin.enable`: Enable/disable plugin functionality
- `testPlugin.message`: Default message to display

## Usage with Theia Test Suite

This example demonstrates the recommended project structure and testing patterns for Theia plugins:

1. **Extension Structure**: Proper activation, command registration, and API exports
2. **Test Organization**: Separate test files for different concerns
3. **Configuration**: VS Code launch and task configurations
4. **Build Process**: TypeScript compilation and npm scripts

## Running Tests Manually

You can also run tests manually using the Theia test suite:

```bash
# Using CLI
theia-test --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js

# Using Web runner directly
theia-test-web --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js --headless=true

# With Docker
theia-test --theiaImage=theiaide/theia:latest --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js

# Watch mode
theia-test --watch --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite/index.js
```
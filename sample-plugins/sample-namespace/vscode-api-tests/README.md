# vscode-api-tests

This sample plugin mirrors the structure of VS Code's `vscode-api-tests` extension
and is intended to run through Theia's `--extensionDevelopmentPath` and
`--extensionTestsPath` flow.

## Layout

- `src/extension.ts`: plugin activation entrypoint.
- `src/singlefolder-tests/index.ts`: Mocha bootstrap with `ui: 'tdd'`.
- `src/singlefolder-tests/testrunner.ts`: minimal test-runner compatible with Theia's plugin host contract.
- `src/singlefolder-tests/extensions.test.ts`: initial `vscode.extensions` coverage.
- `out/`: compiled JavaScript output consumed by the plugin host.
- `tsconfig.json`: TypeScript build configuration.
- `.vscodeignore`: package exclusions for a VSIX-style artifact.

## How to run

Start Theia with:

- `--extensionDevelopmentPath=/abs/path/to/vscode-api-tests`
- `--extensionTestsPath=/abs/path/to/vscode-api-tests/out/singlefolder-tests/index.js`

The plugin host loads the extension under development and then executes the test
runner exported by the tests path, so the suite exercises the real `vscode` API
facade provided by Theia rather than a mock.

## Note

The current suite only covers the `vscode.extensions` namespace, but the layout is
ready for additional `singlefolder-tests` and `workspace-tests` files.

/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runCommand } from './args.mjs';

export async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('theia-test')
    .usage('$0 [options] [testScript]')
    .command(
      '$0 [testScript]',
      'Run Theia plugin tests',
      (yargs) => {
        return yargs
          .positional('testScript', {
            describe: 'Path to test script or directory',
            type: 'string',
          })
          .option('extensionDevelopmentPath', {
            alias: 'e',
            describe: 'Path to extension under development',
            type: 'string',
          })
          .option('extensionTestsPath', {
            alias: 't',
            describe: 'Path to test runner script',
            type: 'string',
          })
          .option('quality', {
            alias: 'q',
            describe: 'Theia quality to use',
            choices: ['insiders', 'stable'] as const,
            default: 'insiders' as const,
          })
          .option('commit', {
            describe: 'Specific Theia commit to use',
            type: 'string',
          })
          .option('theiaDevPath', {
            describe: 'Path to Theia development sources',
            type: 'string',
          })
          .option('theiaImage', {
            describe: 'Docker image name for Theia',
            type: 'string',
          })
          .option('browserType', {
            alias: 'b',
            describe: 'Browser to use for testing',
            choices: ['chromium', 'firefox', 'webkit'] as const,
            default: 'chromium' as const,
          })
          .option('headless', {
            describe: 'Run browser in headless mode',
            type: 'boolean',
            default: true,
          })
          .option('coverage', {
            alias: 'c',
            describe: 'Enable code coverage',
            type: 'boolean',
            default: false,
          })
          .option('outputDir', {
            alias: 'o',
            describe: 'Output directory for test results',
            type: 'string',
            default: './test-results',
          })
          .option('timeout', {
            describe: 'Test timeout in milliseconds',
            type: 'number',
            default: 60000,
          })
          .option('reporter', {
            alias: 'r',
            describe: 'Mocha reporter to use',
            type: 'string',
            default: 'spec',
          })
          .option('workspaceFolder', {
            alias: 'w',
            describe: 'Workspace folder to open in Theia',
            type: 'string',
          })
          .option('verbose', {
            alias: 'v',
            describe: 'Print verbose output',
            type: 'boolean',
            default: false,
          })
          .option('watch', {
            describe: 'Watch for file changes and re-run tests',
            type: 'boolean',
            default: false,
          })
          .example([
            ['$0 --extensionDevelopmentPath ./my-extension --extensionTestsPath ./my-extension/out/test', 'Run tests for extension in development'],
            ['$0 ./test-runner.js --theiaDevPath /path/to/theia/sources', 'Run test script with Theia development sources'],
            ['$0 --theiaImage theiaide/theia:latest --coverage', 'Run tests with Docker image and coverage'],
          ]);
      },
      runCommand
    )
    .help()
    .version()
    .parse();
}
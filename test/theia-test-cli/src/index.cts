/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import { runTests as runTestsWeb } from '@theia/test-web';
import { IConfig } from './runner.cjs';
import { resolve } from './cli/resolver.cjs';

export interface TestOptions {
  /**
   * Path to the Theia extension folder that includes the plugin manifest `package.json`.
   */
  extensionDevelopmentPath?: string;

  /**
   * Path to the test module script. This script should export a function `run()`.
   */
  extensionTestsPath?: string;

  /**
   * Quality/version of Theia to use. Defaults to 'insiders'.
   */
  quality?: 'insiders' | 'stable';

  /**
   * Commit hash of Theia to use.
   */
  commit?: string;

  /**
   * Path to Theia development sources.
   */
  theiaDevPath?: string;

  /**
   * Docker image name for Theia.
   */
  theiaImage?: string;

  /**
   * Browser type for testing. Defaults to 'chromium'.
   */
  browserType?: 'chromium' | 'firefox' | 'webkit';

  /**
   * Run tests in headless mode. Defaults to true.
   */
  headless?: boolean;

  /**
   * Additional browser options.
   */
  browserOptions?: string[];

  /**
   * Output directory for test results and coverage.
   */
  outputDir?: string;

  /**
   * Enable code coverage collection.
   */
  coverage?: boolean;

  /**
   * Timeout for test execution in milliseconds.
   */
  timeout?: number;

  /**
   * Mocha reporter to use.
   */
  reporter?: string;

  /**
   * Additional Mocha options.
   */
  mochaOptions?: any;

  /**
   * Workspace folder to open in Theia.
   */
  workspaceFolder?: string;

  /**
   * Print verbose output.
   */
  verbose?: boolean;
}

/**
 * Run Theia plugin tests.
 * 
 * @param options Test configuration options
 * @returns Promise that resolves when tests complete successfully
 */
export async function runTests(options: TestOptions): Promise<void> {
  const config = await resolve(options);
  
  if (config.platform === 'web') {
    return runTestsWeb({
      browserType: options.browserType || 'chromium',
      extensionDevelopmentPath: options.extensionDevelopmentPath,
      extensionTestsPath: options.extensionTestsPath!,
      quality: options.quality,
      commit: options.commit,
      theiaDevPath: options.theiaDevPath,
      theiaImage: options.theiaImage,
      headless: options.headless ?? true,
      browserOptions: options.browserOptions,
      folderPath: options.workspaceFolder,
      verbose: options.verbose,
    });
  } else {
    throw new Error('Desktop platform testing not yet implemented');
  }
}

export * from './runner.cjs';
export * from './cli/index.mts';
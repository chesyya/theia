/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import { runTests as runTestsWeb } from '@theia/test-web';
import { IConfig } from './runner.cjs';
import { resolve } from './cli/resolver.cjs';
import { checkAndPullImage, startTheiaContainer, stopTheiaContainer, checkDockerAvailability } from './docker-manager';
import * as path from 'path';

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
  // Validate required parameters
  if (!options.extensionTestsPath) {
    throw new Error('extensionTestsPath is required');
  }

  const config = await resolve(options);
  let containerId: string | undefined;
  
  if (config.platform === 'web') {
    // Handle Docker-based Theia testing if theiaImage is specified
    if (options.theiaImage) {
      // Check Docker availability
      if (!(await checkDockerAvailability())) {
        throw new Error('Docker is not available or not running. Please ensure Docker is installed and running.');
      }

      // Check and pull the Theia image
      await checkAndPullImage(options.theiaImage);

      // Start Theia container with plugins mounted
      const pluginsPath = options.extensionDevelopmentPath || path.resolve(process.cwd(), 'plugins');
      containerId = await startTheiaContainer(options.theiaImage, pluginsPath);

      console.log(`Theia container started, waiting for startup...`);
      // Wait a bit more for Theia to fully start
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    try {
      // Resolve test file path
      const testFilePath = path.resolve(options.extensionTestsPath);
      
      return await runTestsWeb({
        browserType: options.browserType || 'chromium',
        extensionDevelopmentPath: options.extensionDevelopmentPath,
        extensionTestsPath: testFilePath,
        quality: options.quality,
        commit: options.commit,
        theiaDevPath: options.theiaDevPath,
        theiaImage: options.theiaImage,
        headless: options.headless ?? true,
        browserOptions: options.browserOptions,
        folderPath: options.workspaceFolder,
        verbose: options.verbose,
        port: 3000, // Use port 3000 to connect to Docker container
      });
    } catch (error) {
      console.error('E2E tests failed:', error);
      throw error;
    } finally {
      // Clean up Docker container if we started one
      if (containerId) {
        await stopTheiaContainer(containerId);
      }
    }
  } else {
    throw new Error('Desktop platform testing not yet implemented');
  }
}

export * from './runner.cjs';
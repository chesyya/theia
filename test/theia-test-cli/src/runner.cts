/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import { spawn } from 'child_process';
import { resolve } from 'path';
import { IConfig } from './cli/resolver.cjs';

export { IConfig };

/**
 * Execute test runner with the provided configuration.
 */
export async function executeTests(config: IConfig): Promise<void> {
  if (config.platform === 'web') {
    return executeWebTests(config);
  } else {
    throw new Error('Desktop platform testing not yet implemented');
  }
}

async function executeWebTests(config: IConfig): Promise<void> {
  const { runTests } = await import('@theia/test-web');
  
  const options = {
    browserType: 'chromium' as const,
    extensionDevelopmentPath: config.extensionPath,
    extensionTestsPath: config.testScript,
    quality: config.theiaInstance.type === 'download' ? 
      (config.theiaInstance.location.startsWith('stable') ? 'stable' : 'insiders') as const : 
      undefined,
    theiaDevPath: config.theiaInstance.type === 'sources' ? config.theiaInstance.location : undefined,
    theiaImage: config.theiaInstance.type === 'docker' ? config.theiaInstance.location : undefined,
    headless: true,
    folderPath: config.workspaceFolder,
    verbose: config.verbose,
  };

  return runTests(options);
}

/**
 * Setup test environment and prepare for test execution.
 */
export async function setupTestEnvironment(config: IConfig): Promise<void> {
  // Create output directory if it doesn't exist
  const fs = await import('fs');
  await fs.promises.mkdir(config.outputDir, { recursive: true });

  // Setup coverage if enabled
  if (config.coverage) {
    console.log('Setting up code coverage...');
    // TODO: Implement coverage setup
  }

  if (config.verbose) {
    console.log('Test environment setup complete');
    console.log(`Output directory: ${config.outputDir}`);
    console.log(`Platform: ${config.platform}`);
    console.log(`Theia instance: ${config.theiaInstance.type} - ${config.theiaInstance.location}`);
  }
}
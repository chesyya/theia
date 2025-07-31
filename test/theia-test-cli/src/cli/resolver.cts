/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import { TestOptions } from '../index.cjs';

export interface IConfig {
  platform: 'web' | 'desktop';
  testScript: string;
  extensionPath?: string;
  theiaInstance: {
    type: 'docker' | 'sources' | 'download';
    location: string;
  };
  outputDir: string;
  coverage: boolean;
  timeout: number;
  reporter: string;
  workspaceFolder?: string;
  verbose: boolean;
}

export async function resolve(options: TestOptions): Promise<IConfig> {
  // Determine platform (currently only web is supported)
  const platform: 'web' | 'desktop' = 'web';

  // Determine Theia instance type
  let theiaInstance: IConfig['theiaInstance'];
  
  if (options.theiaDevPath) {
    theiaInstance = {
      type: 'sources',
      location: options.theiaDevPath
    };
  } else if (options.theiaImage) {
    theiaInstance = {
      type: 'docker',
      location: options.theiaImage
    };
  } else {
    theiaInstance = {
      type: 'download',
      location: `${options.quality || 'insiders'}${options.commit ? '@' + options.commit : ''}`
    };
  }

  return {
    platform,
    testScript: options.extensionTestsPath!,
    extensionPath: options.extensionDevelopmentPath,
    theiaInstance,
    outputDir: options.outputDir || './test-results',
    coverage: options.coverage || false,
    timeout: options.timeout || 60000,
    reporter: options.reporter || 'spec',
    workspaceFolder: options.workspaceFolder,
    verbose: options.verbose || false
  };
}
/*---------------------------------------------------------
 * Copyright (C) Theia Contributors. All rights reserved.
 *--------------------------------------------------------*/

import { TestOptions, runTests } from '../index.cjs';
import { resolve as resolvePath } from 'path';
import { existsSync } from 'fs';

export interface CliOptions extends TestOptions {
  testScript?: string;
  watch?: boolean;
}

export async function runCommand(argv: CliOptions): Promise<void> {
  console.log('🧪 Theia Test CLI v0.0.1');
  console.log('Starting plugin test execution...\n');

  // Resolve test script path
  if (argv.testScript) {
    if (!existsSync(argv.testScript)) {
      throw new Error(`Test script not found: ${argv.testScript}`);
    }
    argv.extensionTestsPath = resolvePath(argv.testScript);
  }

  // Validate required options
  if (!argv.extensionTestsPath) {
    throw new Error('extensionTestsPath is required. Use --extensionTestsPath or provide a test script as argument.');
  }

  // Validate extension development path if provided
  if (argv.extensionDevelopmentPath) {
    const packageJsonPath = resolvePath(argv.extensionDevelopmentPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error(`Extension package.json not found at: ${packageJsonPath}`);
    }
    argv.extensionDevelopmentPath = resolvePath(argv.extensionDevelopmentPath);
  }

  // Resolve workspace folder
  if (argv.workspaceFolder) {
    if (!existsSync(argv.workspaceFolder)) {
      throw new Error(`Workspace folder not found: ${argv.workspaceFolder}`);
    }
    argv.workspaceFolder = resolvePath(argv.workspaceFolder);
  }

  if (argv.verbose) {
    console.log('Configuration:');
    console.log(`  Extension Development Path: ${argv.extensionDevelopmentPath || 'Not specified'}`);
    console.log(`  Extension Tests Path: ${argv.extensionTestsPath}`);
    console.log(`  Quality: ${argv.quality}`);
    console.log(`  Browser Type: ${argv.browserType}`);
    console.log(`  Headless: ${argv.headless}`);
    console.log(`  Coverage: ${argv.coverage}`);
    console.log(`  Output Directory: ${argv.outputDir}`);
    console.log(`  Workspace Folder: ${argv.workspaceFolder || 'Not specified'}`);
    console.log(`  Theia Dev Path: ${argv.theiaDevPath || 'Not specified'}`);
    console.log(`  Theia Image: ${argv.theiaImage || 'Not specified'}`);
    console.log();
  }

  if (argv.watch) {
    return runWatchMode(argv);
  } else {
    return runSingleTest(argv);
  }
}

async function runSingleTest(options: CliOptions): Promise<void> {
  try {
    await runTests(options);
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  }
}

async function runWatchMode(options: CliOptions): Promise<void> {
  const chokidar = await import('chokidar');
  
  const watchPaths = [
    options.extensionTestsPath!,
    ...(options.extensionDevelopmentPath ? [options.extensionDevelopmentPath] : [])
  ];

  console.log('👀 Watch mode enabled. Watching for changes in:');
  watchPaths.forEach(path => console.log(`   ${path}`));
  console.log();

  let isRunning = false;

  const runTestsDebounced = debounce(async () => {
    if (isRunning) return;
    
    isRunning = true;
    console.log('🔄 Files changed, re-running tests...\n');
    
    try {
      await runTests(options);
      console.log('✅ Tests passed! Waiting for changes...\n');
    } catch (error) {
      console.error('❌ Tests failed:', error);
      console.log('Waiting for changes...\n');
    } finally {
      isRunning = false;
    }
  }, 1000);

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\\../,
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', runTestsDebounced);
  watcher.on('add', runTestsDebounced);
  watcher.on('unlink', runTestsDebounced);

  // Run tests initially
  await runTestsDebounced();

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\\n👋 Stopping watch mode...');
    watcher.close();
    process.exit(0);
  });
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
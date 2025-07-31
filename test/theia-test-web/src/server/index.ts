#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Theia Contributors. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfig, runServer, Static, Sources } from './main';
import { downloadAndUnzipTheia, directoryExists, fileExists, readFileInRepo } from './download';

import * as playwright from 'playwright';
import * as minimist from 'minimist';
import * as path from 'path';

export type BrowserType = 'chromium' | 'firefox' | 'webkit' | 'none';
export type TheiaQuality = 'insiders' | 'stable';

export type GalleryExtension = { readonly id: string; readonly preRelease?: boolean };
export interface Options {

	/**
	 * Browser to open: 'chromium' | 'firefox' | 'webkit' | 'none'.
	 */
	browserType: BrowserType;

	/**
	 * Browser command line options.
	 */
	browserOptions?: string[];

	/**
	 * Absolute path to folder that contains one or more plugins (in subfolders).
	 * Plugin folders include a `package.json` plugin manifest.
	 */
	extensionDevelopmentPath?: string;

	/**
	 * Absolute path to the extension tests runner module.
	 * Can be either a file path or a directory path that contains an `index.js`.
	 * The module is expected to have a `run` function of the following signature:
	 *
	 * ```ts
	 * function run(): Promise<void>;
	 * ```
	 *
	 * When running the extension test, the Extension Development Host will call this function
	 * that runs the test suite. This function should throws an error if any test fails.
	 */
	extensionTestsPath?: string;

	/**
	 * The quality of the Theia to use. Supported qualities are:
	 * - `'stable'` : The latest stable build will be used
	 * - `'insiders'` : The latest insiders build will be used
	 *
	 * Currently defaults to `insiders`, which is latest stable insiders.
	 *
	 * The setting is ignored when a theiaDevPath is provided.
	 */
	quality?: TheiaQuality;

	/**
	 * The commit of the Theia build to use. If not set, the latest build is used.
	 *
	 * The setting is ignored when a theiaDevPath is provided.
	 */
	commit?: string;

	/**
	 * @deprecated. Use `quality` or `theiaDevPath` instead.
	 */
	version?: string;

	/**
	 * Open the dev tools.
	 */
	devTools?: boolean;

	/**
	 * Do not show the browser. Defaults to `true` if a `extensionTestsPath` is provided, `false` otherwise.
	 */
	headless?: boolean;

	/**
	 * If set, opens the page with cross origin isolation enabled.
	 */
	coi?: boolean;

	/**
	 * If set, serves the page with ESM usage.
	 */
	esm?: boolean;

	/**
	 * If set, the server access log is printed to the console. Defaults to `false`.
	 */
	printServerLog?: boolean;

	/**
	 * Expose browser debugging on this port number, and wait for the debugger to attach before running tests.
	 */
	waitForDebugger?: number;

	/**
	 * A local path to open Theia on. Theia for the browser will open an a virtual
	 * file system ('theia-test-web://mount') where the files of the local folder will served.
	 * The file system is read/write, but modifications are stored in memory and not written back to disk.
	 */
	folderPath?: string;

	/**
	 * The folder URI to open Theia on. If 'folderPath' is set this will be ignored and 'theia-test-web://mount'
	 * is used as folder URI instead.
	 */
	folderUri?: string;

	/**
	 * Permissions granted to the opened browser. An list of permissions can be found at
	 * https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
	 * Example: [ 'clipboard-read', 'clipboard-write' ]
	 */
	permissions?: string[];

	/**
	 * Absolute paths pointing to built-in extensions to include.
	 */
	extensionPaths?: string[];

	/**
	 * List of extensions to include. The id format is ${publisher}.${name}.
	 */
	extensionIds?: GalleryExtension[];

	/**
	 * Absolute path pointing to Theia sources to use.
	 */
	theiaDevPath?: string;

	/**
	 * Docker image name for Theia runtime.
	 */
	theiaImage?: string;

	/**
	 * Print out more information while the server is running, e.g. the console output in the browser
	 */
	verbose?: boolean;

	/**
	 * The port to start the server on. Defaults to `3000`.
	 */
	port?: number;

	/**
	 * The host name to start the server on. Defaults to `localhost`
	 */
	host?: string;

	/**
	 * The temporary folder for storing the Theia builds used for running the tests. Defaults to `$CURRENT_WORKING_DIR/.theia-test-web`.
	 */
	testRunnerDataDir?: string;
}

export interface Disposable {
	dispose(): void;
}

/**
 * Runs the tests in a browser.
 *
 * @param options The options defining browser type, extension and test location.
 */
export async function runTests(options: Options & { extensionTestsPath: string }): Promise<void> {
	const config: IConfig = {
		extensionDevelopmentPath: options.extensionDevelopmentPath,
		extensionTestsPath: options.extensionTestsPath,
		build: await getBuild(options),
		folderUri: options.folderUri,
		folderMountPath: options.folderPath,
		printServerLog: options.printServerLog ?? false,
		extensionPaths: options.extensionPaths,
		extensionIds: options.extensionIds,
		coi: !!options.coi,
		esm: !!options.esm,
	};

	const host = options.host ?? 'localhost';
	const port = options.port ?? 3000;
	const server = await runServer(host, port, config);

	return new Promise(async (s, e) => {
		const endpoint = `http://${host}:${port}`;

		const configPage = async (page: playwright.Page, browser: playwright.Browser) => {
			type Severity = 'error' | 'warning' | 'info';
			const unreportedOutput: { type: Severity; args: unknown[] }[] = [];
			await page.exposeFunction('codeAutomationLog', (type: Severity, args: unknown[]) => {
				console[type](...args);
			});

			await page.exposeFunction('codeAutomationExit', async (code: number) => {
				try {
					await browser.close();
				} catch (error) {
					console.error(`Error when closing browser: ${error}`);
				}
				if (unreportedOutput.length) {
					console.error(`There were ${unreportedOutput.length} messages that could not be reported to the console:`);
					unreportedOutput.forEach(({ type, args }) => console[type](...args));
				}
				server.close();
				if (code === 0) {
					s();
				} else {
					e(new Error('Test failed'));
				}
			});
		};
		console.log(`Opening browser on ${endpoint}...`);
		const context = await openBrowser(endpoint, options, configPage);
		if (context) {
			context.once('close', () => server.close());
		} else {
			server.close();
			e(new Error('Can not run test as opening of browser failed.'));
		}
	});
}

async function getBuild(options: Options): Promise<Static | Sources> {
	if (options.theiaDevPath) {
		return {
			type: 'sources',
			location: options.theiaDevPath,
		};
	}
	if (options.theiaImage) {
		return {
			type: 'docker',
			location: options.theiaImage,
		} as any;
	}
	const quality = options.quality || options.version;
	const commit = options.commit;
	const testRunnerDataDir = options.testRunnerDataDir ?? path.resolve(process.cwd(), '.theia-test-web');
	return await downloadAndUnzipTheia(testRunnerDataDir, quality === 'stable' ? 'stable' : 'insider', commit);
}

export async function open(options: Options): Promise<Disposable> {
	const config: IConfig = {
		extensionDevelopmentPath: options.extensionDevelopmentPath,
		extensionTestsPath: options.extensionTestsPath,
		build: await getBuild(options),
		folderUri: options.folderUri,
		folderMountPath: options.folderPath,
		printServerLog: options.printServerLog ?? false,
		extensionPaths: options.extensionPaths,
		extensionIds: options.extensionIds,
		coi: !!options.coi,
		esm: !!options.esm,
	};

	const host = options.host ?? 'localhost';
	const port = options.port ?? 3000;
	const server = await runServer(host, port, config);

	const endpoint = `http://${host}:${port}`;

	const context = await openBrowser(endpoint, options);
	context?.once('close', () => server.close());
	return {
		dispose: () => {
			server.close();
			context?.browser()?.close();
		},
	};
}

async function openBrowser(endpoint: string, options: Options, configPage?: (page: playwright.Page, browser: playwright.Browser) => Promise<void>): Promise<playwright.BrowserContext | undefined> {
	if (options.browserType === 'none') {
		return undefined;
	}

	const browserType = await playwright[options.browserType];
	if (!browserType) {
		console.error(`Can not open browser type: ${options.browserType}`);
		return undefined;
	}

	const args: string[] = [];

	if (options.browserOptions) {
		args.push(...options.browserOptions);
	}

	if (process.platform === 'linux' && options.browserType === 'chromium') {
		args.push('--no-sandbox');
	}

	if (options.waitForDebugger) {
		args.push(`--remote-debugging-port=${options.waitForDebugger}`);
	}

	const headless = options.headless ?? options.extensionTestsPath !== undefined;

	const browser = await browserType.launch({ headless, args, devtools: options.devTools });
	const context = await browser.newContext({ viewport: null });
	if (options.permissions) {
		context.grantPermissions(options.permissions);
	}

	// forcefully close browser if last page is closed. workaround for https://github.com/microsoft/playwright/issues/2946
	let openPages = 0;
	context.on('page', page => {
		openPages++;
		page.once('close', () => {
			openPages--;
			if (openPages === 0) {
				browser.close();
			}
		});
	});

	const page = context.pages()[0] ?? (await context.newPage());
	if (configPage) {
		await configPage(page, browser);
	}
	if (options.waitForDebugger) {
		await page.waitForFunction(() => '__jsDebugIsReady' in globalThis);
	}
	if (options.verbose) {
		page.on('console', (message) => {
			console.log(message.text());
		});
	}

	await page.goto(endpoint);

	return context;
}

// ... remaining validation functions and CLI main code similar to vscode-test-web but adapted for Theia

if (require.main === module) {
	console.log('Theia Test Web Runner - Version 0.0.1');
	console.log('Use --help for usage information');
}
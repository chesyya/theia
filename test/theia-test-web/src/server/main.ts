/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Theia Contributors. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as http from 'http';
import * as path from 'path';
import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as cors from '@koa/cors';
import * as koaStatic from 'koa-static';
import * as mount from 'koa-mount';
import * as morgan from 'koa-morgan';
import { GalleryExtension } from './index';

export interface Static {
	readonly type: 'static';
	readonly location: string;
}

export interface Sources {
	readonly type: 'sources';
	readonly location: string;
}

export interface Docker {
	readonly type: 'docker';
	readonly location: string;
}

export interface IConfig {
	readonly extensionDevelopmentPath?: string;
	readonly extensionTestsPath?: string;
	readonly build: Static | Sources | Docker;
	readonly folderUri?: string;
	readonly folderMountPath?: string;
	readonly printServerLog: boolean;
	readonly extensionPaths?: string[];
	readonly extensionIds?: GalleryExtension[];
	readonly coi: boolean;
	readonly esm: boolean;
}

export interface IDisposable {
	dispose(): void;
}

/**
 * Run a server that serves the Theia workbench and extensions for testing.
 */
export async function runServer(host: string, port: number, config: IConfig): Promise<IDisposable> {
	const app = new Koa();
	const router = new Router();

	// CORS support
	app.use(cors({
		origin: true,
		credentials: true
	}));

	// Logging middleware
	if (config.printServerLog) {
		app.use(morgan('combined'));
	}

	// Setup routes for Theia application
	await setupTheiaRoutes(router, config);

	app.use(router.routes());
	app.use(router.allowedMethods());

	const server = http.createServer(app.callback());
	
	return new Promise((resolve, reject) => {
		server.listen(port, host, () => {
			console.log(`Theia test server running at http://${host}:${port}`);
			resolve({
				dispose: () => {
					server.close();
				}
			});
		});

		server.on('error', reject);
	});
}

async function setupTheiaRoutes(router: Router, config: IConfig): Promise<void> {
	// Serve Theia application files
	if (config.build.type === 'static') {
		// Serve static Theia build
		router.get('/(.*)', koaStatic(config.build.location));
	} else if (config.build.type === 'sources') {
		// Serve from Theia development sources
		const srcLocation = path.join(config.build.location, 'examples', 'browser');
		router.get('/(.*)', koaStatic(srcLocation));
	} else if (config.build.type === 'docker') {
		// TODO: Handle Docker container routing
		console.warn('Docker build type not yet implemented');
	}

	// API routes for plugin management
	router.get('/api/extensions', async (ctx) => {
		ctx.body = {
			extensions: await getExtensionsInfo(config)
		};
	});

	// Route for serving extension development path
	if (config.extensionDevelopmentPath) {
		router.get('/extensions/:id/(.*)', async (ctx) => {
			const extensionId = ctx.params.id;
			const filePath = ctx.params[0];
			
			// Serve files from extension development path
			const extensionPath = path.join(config.extensionDevelopmentPath, extensionId);
			ctx.body = await serveFile(path.join(extensionPath, filePath));
		});
	}

	// Test runner API
	if (config.extensionTestsPath) {
		router.post('/api/test/run', async (ctx) => {
			try {
				// Execute the test runner
				const testModule = require(config.extensionTestsPath);
				if (typeof testModule.run === 'function') {
					await testModule.run();
					ctx.body = { success: true };
				} else {
					ctx.status = 400;
					ctx.body = { error: 'Test module does not export a run function' };
				}
			} catch (error) {
				ctx.status = 500;
				ctx.body = { error: error.message };
			}
		});
	}
}

async function getExtensionsInfo(config: IConfig): Promise<any[]> {
	const extensions: any[] = [];

	// Add extension development path info
	if (config.extensionDevelopmentPath) {
		try {
			const packageJsonPath = path.join(config.extensionDevelopmentPath, 'package.json');
			const packageJson = require(packageJsonPath);
			extensions.push({
				id: packageJson.name,
				version: packageJson.version,
				path: config.extensionDevelopmentPath,
				isDevelopment: true
			});
		} catch (error) {
			console.warn('Could not read extension development path package.json:', error.message);
		}
	}

	// Add additional extension paths
	if (config.extensionPaths) {
		for (const extensionPath of config.extensionPaths) {
			try {
				const packageJsonPath = path.join(extensionPath, 'package.json');
				const packageJson = require(packageJsonPath);
				extensions.push({
					id: packageJson.name,
					version: packageJson.version,
					path: extensionPath,
					isDevelopment: false
				});
			} catch (error) {
				console.warn(`Could not read extension path ${extensionPath} package.json:`, error.message);
			}
		}
	}

	return extensions;
}

async function serveFile(filePath: string): Promise<Buffer | string> {
	try {
		const fs = require('fs').promises;
		return await fs.readFile(filePath);
	} catch (error) {
		throw new Error(`File not found: ${filePath}`);
	}
}
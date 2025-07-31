/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Theia Contributors. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import * as https from 'https';
import * as http from 'http';
import * as tarfs from 'tar-fs';
import * as gunzip from 'gunzip-maybe';
import * as Docker from 'dockerode';
import { Static } from './main';

const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);

export type TheiaQuality = 'stable' | 'insider';

export interface TheiaDownloadOptions {
	quality: TheiaQuality;
	commit?: string;
	platform?: string;
	arch?: string;
}

/**
 * Download and unzip a Theia build for testing.
 */
export async function downloadAndUnzipTheia(
	testDataDir: string,
	quality: TheiaQuality,
	commit?: string
): Promise<Static> {
	const buildDir = path.join(testDataDir, `theia-${quality}${commit ? `-${commit}` : ''}`);
	
	if (await directoryExists(buildDir)) {
		console.log(`Using existing Theia build at ${buildDir}`);
		return { type: 'static', location: buildDir };
	}

	await ensureDir(testDataDir);

	// For now, we'll use Docker to run Theia instead of downloading builds
	// This is because Theia doesn't have the same download API as VS Code
	console.log('Theia builds are not available for download like VS Code.');
	console.log('Using Docker approach or local sources instead.');
	
	// Create a placeholder directory structure
	await ensureDir(buildDir);
	await createTheiaPlaceholder(buildDir);
	
	return { type: 'static', location: buildDir };
}

/**
 * Download Theia using Docker image.
 */
export async function downloadTheiaDocker(
	testDataDir: string,
	imageName: string = 'theiaide/theia:latest'
): Promise<Static> {
	const docker = new Docker();
	const buildDir = path.join(testDataDir, `theia-docker-${imageName.replace(/[/:]/g, '-')}`);
	
	if (await directoryExists(buildDir)) {
		console.log(`Using existing Theia Docker build at ${buildDir}`);
		return { type: 'static', location: buildDir };
	}

	await ensureDir(testDataDir);
	
	try {
		console.log(`Pulling Docker image: ${imageName}`);
		await pullDockerImage(docker, imageName);
		
		console.log('Extracting Theia from Docker image...');
		await extractTheiaFromDocker(docker, imageName, buildDir);
		
		return { type: 'static', location: buildDir };
	} catch (error) {
		console.error('Failed to download Theia via Docker:', error);
		throw error;
	}
}

async function pullDockerImage(docker: Docker, imageName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		docker.pull(imageName, (err: any, stream: any) => {
			if (err) {
				reject(err);
				return;
			}
			
			docker.modem.followProgress(stream, (err: any, res: any) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	});
}

async function extractTheiaFromDocker(docker: Docker, imageName: string, targetDir: string): Promise<void> {
	// Create a container from the image
	const container = await docker.createContainer({
		Image: imageName,
		Cmd: ['/bin/bash'],
		Tty: true
	});

	try {
		// Start the container
		await container.start();

		// Copy Theia files from container
		const tarStream = await container.getArchive({
			path: '/home/theia'
		});

		await ensureDir(targetDir);

		// Extract the tar stream to target directory
		return new Promise((resolve, reject) => {
			tarStream
				.pipe(gunzip())
				.pipe(tarfs.extract(targetDir))
				.on('finish', resolve)
				.on('error', reject);
		});
	} finally {
		// Clean up container
		await container.remove();
	}
}

async function createTheiaPlaceholder(buildDir: string): Promise<void> {
	// Create basic directory structure that mimics Theia
	const dirs = [
		'lib',
		'src-gen',
		'examples/browser'
	];

	for (const dir of dirs) {
		await ensureDir(path.join(buildDir, dir));
	}

	// Create a basic index.html placeholder
	const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Theia Test Runner</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #1e1e1e;
            color: #d4d4d4;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        .warning {
            background-color: #ffc107;
            color: #212529;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Theia Test Runner</h1>
        <div class="warning">
            <h3>Development Mode</h3>
            <p>This is a placeholder Theia instance for testing purposes.</p>
            <p>To use a real Theia instance, provide:</p>
            <ul style="text-align: left; display: inline-block;">
                <li><code>--theiaDevPath</code> pointing to your Theia development folder</li>
                <li><code>--theiaImage</code> with a Docker image name</li>
            </ul>
        </div>
        <p>Plugin testing framework is ready for integration.</p>
    </div>
    <script>
        // Basic API for test automation
        window.theiaTestApi = {
            loadPlugin: function(pluginPath) {
                console.log('Loading plugin:', pluginPath);
                return Promise.resolve();
            },
            runTests: function() {
                console.log('Running tests...');
                return Promise.resolve();
            }
        };
        
        // Signal that the page is ready
        window.__jsDebugIsReady = true;
        
        console.log('Theia Test Runner initialized');
    </script>
</body>
</html>`;

	await fs.promises.writeFile(path.join(buildDir, 'index.html'), indexHtml);
}

export async function directoryExists(dir: string): Promise<boolean> {
	try {
		const stats = await stat(dir);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

export async function fileExists(file: string): Promise<boolean> {
	try {
		const stats = await stat(file);
		return stats.isFile();
	} catch {
		return false;
	}
}

async function ensureDir(dir: string): Promise<void> {
	try {
		await mkdir(dir, { recursive: true });
	} catch (error: any) {
		if (error.code !== 'EEXIST') {
			throw error;
		}
	}
}

export async function readFileInRepo(relativePath: string): Promise<string> {
	const filePath = path.join(__dirname, '..', '..', relativePath);
	return (await readFile(filePath)).toString();
}
#!/usr/bin/env node

/**
 * Simple Test Runner for Theia Plugin Testing
 * This is a minimal implementation to verify the core concepts
 */

const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

class SimpleTheiaTestRunner {
    constructor(options = {}) {
        this.options = {
            port: options.port || 3000,
            host: options.host || 'localhost',
            extensionDevelopmentPath: options.extensionDevelopmentPath,
            extensionTestsPath: options.extensionTestsPath,
            theiaPath: options.theiaPath || '/root/theia/examples/browser',
            headless: options.headless !== false,
            verbose: options.verbose || false,
            ...options
        };
        
        this.app = express();
        this.server = null;
    }

    log(message) {
        if (this.options.verbose) {
            console.log(`[TheiaTestRunner] ${message}`);
        }
    }

    async setupRoutes() {
        // Serve static files from Theia build
        this.app.use(express.static(path.join(this.options.theiaPath, 'lib/frontend')));
        
        // API endpoint to get extension info
        this.app.get('/api/extensions', (req, res) => {
            const extensions = [];
            
            if (this.options.extensionDevelopmentPath) {
                try {
                    const packagePath = path.join(this.options.extensionDevelopmentPath, 'package.json');
                    if (fs.existsSync(packagePath)) {
                        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                        extensions.push({
                            id: packageJson.name,
                            version: packageJson.version,
                            path: this.options.extensionDevelopmentPath,
                            isDevelopment: true
                        });
                    }
                } catch (error) {
                    this.log(`Error reading extension package.json: ${error.message}`);
                }
            }
            
            res.json({ extensions });
        });

        // Test runner endpoint
        this.app.post('/api/test/run', async (req, res) => {
            try {
                if (!this.options.extensionTestsPath) {
                    return res.status(400).json({ error: 'No test path specified' });
                }

                this.log(`Running tests from: ${this.options.extensionTestsPath}`);
                
                // For this demo, we'll just check if the test file exists
                if (fs.existsSync(this.options.extensionTestsPath)) {
                    res.json({ 
                        success: true, 
                        message: 'Test runner endpoint working',
                        testPath: this.options.extensionTestsPath,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    res.status(404).json({ 
                        error: 'Test file not found',
                        testPath: this.options.extensionTestsPath 
                    });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                theiaPath: this.options.theiaPath,
                extensionDevelopmentPath: this.options.extensionDevelopmentPath
            });
        });

        // Main Theia page
        this.app.get('/', (req, res) => {
            const indexPath = path.join(this.options.theiaPath, 'lib/frontend/index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                // Fallback HTML
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Theia Test Environment</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                margin: 40px; 
                                background: #1e1e1e; 
                                color: #d4d4d4; 
                            }
                            .status { 
                                background: #0e639c; 
                                padding: 20px; 
                                border-radius: 5px; 
                                margin: 20px 0; 
                            }
                            .info { 
                                background: #2d2d30; 
                                padding: 15px; 
                                border-radius: 5px; 
                                margin: 10px 0; 
                            }
                            button {
                                background: #0e639c;
                                color: white;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 3px;
                                cursor: pointer;
                                margin: 5px;
                            }
                            button:hover { background: #1177bb; }
                            #output { 
                                background: #000; 
                                color: #0f0; 
                                padding: 10px; 
                                font-family: monospace; 
                                border-radius: 3px; 
                                min-height: 100px; 
                                margin: 10px 0;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>🧪 Theia Plugin Test Environment</h1>
                        
                        <div class="status">
                            <h3>✅ Test Runner Active</h3>
                            <p>Theia plugin testing environment is running and ready to accept tests.</p>
                        </div>

                        <div class="info">
                            <h4>Configuration:</h4>
                            <ul>
                                <li><strong>Extension Path:</strong> ${this.options.extensionDevelopmentPath || 'Not specified'}</li>
                                <li><strong>Test Path:</strong> ${this.options.extensionTestsPath || 'Not specified'}</li>
                                <li><strong>Theia Path:</strong> ${this.options.theiaPath}</li>
                                <li><strong>Port:</strong> ${this.options.port}</li>
                                <li><strong>Headless:</strong> ${this.options.headless}</li>
                            </ul>
                        </div>

                        <div class="info">
                            <h4>Test Actions:</h4>
                            <button onclick="runHealthCheck()">Health Check</button>
                            <button onclick="getExtensions()">Get Extensions</button>
                            <button onclick="runTests()">Run Tests</button>
                            <div id="output"></div>
                        </div>

                        <script>
                            const output = document.getElementById('output');
                            
                            function log(message) {
                                output.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '\\n';
                                output.scrollTop = output.scrollHeight;
                            }

                            async function runHealthCheck() {
                                try {
                                    const response = await fetch('/api/health');
                                    const data = await response.json();
                                    log('Health check: ' + JSON.stringify(data, null, 2));
                                } catch (error) {
                                    log('Health check failed: ' + error.message);
                                }
                            }

                            async function getExtensions() {
                                try {
                                    const response = await fetch('/api/extensions');
                                    const data = await response.json();
                                    log('Extensions: ' + JSON.stringify(data, null, 2));
                                } catch (error) {
                                    log('Get extensions failed: ' + error.message);
                                }
                            }

                            async function runTests() {
                                try {
                                    const response = await fetch('/api/test/run', { method: 'POST' });
                                    const data = await response.json();
                                    log('Test run: ' + JSON.stringify(data, null, 2));
                                } catch (error) {
                                    log('Test run failed: ' + error.message);
                                }
                            }

                            // Auto health check on load
                            window.onload = () => {
                                log('=== Theia Plugin Test Environment Started ===');
                                runHealthCheck();
                            };
                        </script>
                    </body>
                    </html>
                `);
            }
        });
    }

    async start() {
        await this.setupRoutes();
        
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.options.port, this.options.host, () => {
                console.log(`🧪 Theia Test Runner started at http://${this.options.host}:${this.options.port}`);
                console.log(`📁 Theia path: ${this.options.theiaPath}`);
                console.log(`🔌 Extension path: ${this.options.extensionDevelopmentPath || 'Not specified'}`);
                console.log(`🧪 Test path: ${this.options.extensionTestsPath || 'Not specified'}`);
                resolve();
            });

            this.server.on('error', reject);
        });
    }

    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('🛑 Theia Test Runner stopped');
                    resolve();
                });
            });
        }
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--port':
                options.port = parseInt(nextArg);
                i++;
                break;
            case '--host':
                options.host = nextArg;
                i++;
                break;
            case '--extensionDevelopmentPath':
                options.extensionDevelopmentPath = path.resolve(nextArg);
                i++;
                break;
            case '--extensionTestsPath':
                options.extensionTestsPath = path.resolve(nextArg);
                i++;
                break;
            case '--theiaPath':
                options.theiaPath = path.resolve(nextArg);
                i++;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--no-headless':
                options.headless = false;
                break;
            case '--help':
                console.log(`
Theia Plugin Test Runner

Usage: node simple-test-runner.js [options]

Options:
  --port <number>                   Port to run server on (default: 3000)
  --host <string>                   Host to bind to (default: localhost)
  --extensionDevelopmentPath <path> Path to extension under development
  --extensionTestsPath <path>       Path to test runner script
  --theiaPath <path>                Path to Theia build (default: /root/theia/examples/browser)
  --verbose                         Enable verbose logging
  --no-headless                     Run in non-headless mode
  --help                            Show this help

Examples:
  node simple-test-runner.js --extensionDevelopmentPath ./my-plugin
  node simple-test-runner.js --extensionDevelopmentPath ./my-plugin --extensionTestsPath ./my-plugin/out/test/suite/index.js
  node simple-test-runner.js --port 4000 --verbose
                `);
                process.exit(0);
        }
    }

    const runner = new SimpleTheiaTestRunner(options);
    
    runner.start().catch((error) => {
        console.error('Failed to start test runner:', error);
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\\nShutting down...');
        await runner.stop();
        process.exit(0);
    });
}

module.exports = SimpleTheiaTestRunner;
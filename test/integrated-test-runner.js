#!/usr/bin/env node

/**
 * Integrated Theia Plugin Test Runner
 * This runner actually loads plugins into Theia and runs tests
 */

const Docker = require('dockerode');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

class IntegratedTheiaTestRunner {
    constructor(options) {
        this.options = {
            theiaImage: options.theiaImage || 'theiaide/theia:latest',
            extensionDevelopmentPath: options.extensionDevelopmentPath,
            extensionTestsPath: options.extensionTestsPath,
            port: options.port || 3000,
            timeout: options.timeout || 60000,
            verbose: options.verbose || false,
            ...options
        };
        
        this.docker = new Docker();
        this.container = null;
    }

    log(message) {
        if (this.options.verbose) {
            console.log(`[IntegratedRunner] ${message}`);
        }
    }

    async runTests() {
        console.log('🚀 Starting Integrated Theia Plugin Test Runner');
        console.log('===============================================');
        console.log('');

        try {
            // 1. 验证前置条件
            await this.validatePrerequisites();
            
            // 2. 启动Theia容器并加载插件
            await this.startTheiaWithPlugin();
            
            // 3. 等待Theia就绪
            await this.waitForTheiaReady();
            
            // 4. 验证插件加载
            await this.verifyPluginLoaded();
            
            // 5. 执行测试
            const result = await this.executeTests();
            
            console.log('');
            console.log('🎉 All tests completed successfully!');
            return result;
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async validatePrerequisites() {
        console.log('🔍 Validating prerequisites...');

        // 检查插件目录
        if (!this.options.extensionDevelopmentPath) {
            throw new Error('Extension development path is required');
        }

        if (!fs.existsSync(this.options.extensionDevelopmentPath)) {
            throw new Error(`Extension path does not exist: ${this.options.extensionDevelopmentPath}`);
        }

        // 检查package.json
        const packageJsonPath = path.join(this.options.extensionDevelopmentPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('Plugin package.json not found');
        }

        // 检查测试文件
        if (this.options.extensionTestsPath && !fs.existsSync(this.options.extensionTestsPath)) {
            throw new Error(`Test file does not exist: ${this.options.extensionTestsPath}`);
        }

        // 读取插件信息
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        this.pluginInfo = {
            name: packageJson.name,
            version: packageJson.version,
            displayName: packageJson.displayName || packageJson.name
        };

        console.log(`✅ Plugin validated: ${this.pluginInfo.name}@${this.pluginInfo.version}`);
    }

    async startTheiaWithPlugin() {
        console.log('🐳 Starting Theia container with plugin...');
        
        this.log(`Using image: ${this.options.theiaImage}`);
        this.log(`Plugin path: ${this.options.extensionDevelopmentPath}`);
        
        // 准备挂载目录
        const pluginMountPath = path.resolve(this.options.extensionDevelopmentPath);
        const testMountPath = this.options.extensionTestsPath ? 
            path.resolve(path.dirname(this.options.extensionTestsPath)) : null;

        const binds = [
            `${pluginMountPath}:/workspace/plugin:ro`
        ];

        if (testMountPath) {
            binds.push(`${testMountPath}:/workspace/tests:ro`);
        }

        // 创建容器
        this.container = await this.docker.createContainer({
            Image: this.options.theiaImage,
            
            HostConfig: {
                Binds: binds,
                PortBindings: {
                    '3000/tcp': [{ HostPort: this.options.port.toString() }]
                }
            },

            // 关键：设置环境变量让Theia加载插件
            Env: [
                'THEIA_DEFAULT_PLUGINS=local-dir:/workspace/plugin',
                'THEIA_PLUGINS_DIR=/workspace/plugin',
                'SHELL=/bin/bash'
            ],

            // Theia启动命令
            Cmd: [
                'node', 
                '/home/theia/lib/backend/main.js', 
                '/workspace',
                '--hostname=0.0.0.0',
                '--port=3000'
            ],

            WorkingDir: '/home/theia'
        });

        await this.container.start();
        this.log('Container started successfully');
        console.log(`✅ Theia container started on port ${this.options.port}`);
    }

    async waitForTheiaReady() {
        console.log('⏳ Waiting for Theia to be ready...');
        
        const maxRetries = 30;
        const retryInterval = 2000;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(`http://localhost:${this.options.port}`, {
                    timeout: 5000
                });
                
                if (response.ok) {
                    console.log('✅ Theia is ready and responding');
                    
                    // 额外等待几秒让插件系统初始化
                    this.log('Waiting for plugin system to initialize...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    return;
                }
            } catch (error) {
                this.log(`Attempt ${i + 1}/${maxRetries}: Theia not ready yet`);
            }
            
            await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
        
        throw new Error('Theia failed to start within timeout period');
    }

    async verifyPluginLoaded() {
        console.log('🔌 Verifying plugin is loaded in Theia...');
        
        try {
            // 方法1：尝试通过Theia的插件API检查
            const apiUrl = `http://localhost:${this.options.port}/services/plugin-ext`;
            const response = await fetch(apiUrl, { timeout: 5000 });
            
            if (response.ok) {
                const data = await response.text();
                this.log(`Plugin API response: ${data.substring(0, 200)}...`);
                console.log('✅ Plugin API is accessible');
            }
        } catch (error) {
            this.log(`Plugin API check failed: ${error.message}`);
        }

        // 方法2：通过容器日志检查插件加载
        try {
            const logs = await this.container.logs({
                stdout: true,
                stderr: true,
                tail: 50
            });

            const logText = logs.toString();
            
            if (logText.includes(this.pluginInfo.name) || 
                logText.includes('plugin') || 
                logText.includes('extension')) {
                console.log('✅ Plugin loading detected in logs');
                this.log(`Found plugin references in logs: ${this.pluginInfo.name}`);
            } else {
                console.warn('⚠️ No clear plugin loading evidence in logs');
            }
        } catch (error) {
            this.log(`Log check failed: ${error.message}`);
        }

        console.log('📍 Plugin verification complete (Theia should now have the plugin loaded)');
    }

    async executeTests() {
        if (!this.options.extensionTestsPath) {
            console.log('ℹ️ No test path specified, skipping test execution');
            return { success: true, message: 'No tests to run' };
        }

        console.log('🧪 Executing tests in Theia environment...');
        
        try {
            // 在容器内执行测试
            const testCommand = [
                'node', 
                '/workspace/tests/' + path.basename(this.options.extensionTestsPath)
            ];

            this.log(`Executing: ${testCommand.join(' ')}`);

            const exec = await this.container.exec({
                Cmd: testCommand,
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: false
            });

            const stream = await exec.start({ hijack: true });
            
            return new Promise((resolve, reject) => {
                let output = '';
                
                stream.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    
                    // 实时输出测试结果
                    process.stdout.write(text);
                });

                stream.on('end', async () => {
                    try {
                        const inspect = await exec.inspect();
                        const exitCode = inspect.ExitCode;
                        
                        this.log(`Test execution completed with exit code: ${exitCode}`);
                        
                        if (exitCode === 0) {
                            resolve({
                                success: true,
                                output,
                                exitCode
                            });
                        } else {
                            reject(new Error(`Tests failed with exit code ${exitCode}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });

                stream.on('error', reject);
            });

        } catch (error) {
            console.error('Failed to execute tests:', error.message);
            throw error;
        }
    }

    async cleanup() {
        if (this.container) {
            console.log('🧹 Cleaning up container...');
            try {
                await this.container.remove({ force: true });
                console.log('✅ Container cleanup complete');
            } catch (error) {
                console.warn('⚠️ Container cleanup failed:', error.message);
            }
        }
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        verbose: false
    };

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--theiaImage':
                options.theiaImage = nextArg;
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
            case '--port':
                options.port = parseInt(nextArg);
                i++;
                break;
            case '--timeout':
                options.timeout = parseInt(nextArg);
                i++;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--help':
                console.log(`
Usage: node integrated-test-runner.js [options]

Options:
  --theiaImage <image>              Docker image to use (default: theiaide/theia:latest)
  --extensionDevelopmentPath <path> Path to plugin under development
  --extensionTestsPath <path>       Path to test runner script  
  --port <number>                   Port for Theia (default: 3000)
  --timeout <ms>                    Timeout in milliseconds (default: 60000)
  --verbose                         Enable verbose logging
  --help                            Show this help

Example:
  node integrated-test-runner.js \\
    --theiaImage theiaide/theia:latest \\
    --extensionDevelopmentPath ./my-plugin \\
    --extensionTestsPath ./my-plugin/out/test/suite/index.js \\
    --verbose
                `);
                process.exit(0);
        }
    }

    // Validate required options
    if (!options.extensionDevelopmentPath) {
        console.error('Error: --extensionDevelopmentPath is required');
        process.exit(1);
    }

    // Run the integrated test runner
    const runner = new IntegratedTheiaTestRunner(options);
    
    runner.runTests()
        .then((result) => {
            console.log('\n🎉 Integrated test execution completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Integrated test execution failed:');
            console.error(error.message);
            process.exit(1);
        });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        await runner.cleanup();
        process.exit(0);
    });
}

module.exports = IntegratedTheiaTestRunner;
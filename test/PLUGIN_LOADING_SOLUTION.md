# Theia插件动态加载解决方案

## 🚨 当前问题分析

当前的测试套件实现有一个重大缺陷：**只是检测了插件但没有让Theia真正加载它们**。

### 问题症状：
- HTTP服务器可以启动 ✅
- 插件元数据可以读取 ✅  
- 静态文件可以服务 ✅
- **但Theia实例中看不到插件** ❌

## 🔧 解决方案

### 方案1：环境变量方式（推荐）

通过环境变量告诉Theia加载插件：

```typescript
// 修改 theia-test-web/src/server/index.ts
export async function runTests(options: Options & { extensionTestsPath: string }): Promise<void> {
    // 设置Theia插件路径环境变量
    if (options.extensionDevelopmentPath) {
        process.env.THEIA_DEFAULT_PLUGINS = `local-dir:${options.extensionDevelopmentPath}`;
        
        // 如果有多个插件路径
        if (options.extensionPaths) {
            const allPaths = [options.extensionDevelopmentPath, ...options.extensionPaths];
            process.env.THEIA_DEFAULT_PLUGINS = allPaths.map(p => `local-dir:${p}`).join(',');
        }
    }

    const config: IConfig = {
        // ... 其他配置
    };

    // 启动Theia时会自动读取环境变量
    const server = await runServer(host, port, config);
    // ...
}
```

### 方案2：修改Theia启动参数

```typescript
// 修改 theia-test-web/src/server/main.ts
async function startTheiaProcess(config: IConfig): Promise<ChildProcess> {
    const theiaArgs = [
        '--hostname=0.0.0.0',
        '--port=3000',
        '/tmp' // 工作区路径
    ];

    // 添加插件路径参数
    if (config.extensionDevelopmentPath) {
        theiaArgs.push(`--plugins=local-dir:${config.extensionDevelopmentPath}`);
    }

    // 启动Theia进程
    const theiaProcess = spawn('node', [
        path.join(config.build.location, 'lib/backend/main.js'),
        ...theiaArgs
    ], {
        env: {
            ...process.env,
            THEIA_DEFAULT_PLUGINS: config.extensionDevelopmentPath ? 
                `local-dir:${config.extensionDevelopmentPath}` : undefined
        }
    });

    return theiaProcess;
}
```

### 方案3：修改Theia配置文件

创建动态配置文件：

```typescript
// theia-test-web/src/server/theia-config.ts
export async function createTheiaConfig(config: IConfig): Promise<string> {
    const configPath = path.join(config.build.location, 'theia-test-config.json');
    
    const theiaConfig = {
        plugins: {},
        // 添加插件配置
    };

    if (config.extensionDevelopmentPath) {
        // 读取插件的package.json
        const packageJson = JSON.parse(
            await fs.readFile(path.join(config.extensionDevelopmentPath, 'package.json'), 'utf8')
        );

        theiaConfig.plugins[packageJson.name] = {
            path: config.extensionDevelopmentPath,
            enabled: true,
            development: true
        };
    }

    await fs.writeFile(configPath, JSON.stringify(theiaConfig, null, 2));
    return configPath;
}
```

### 方案4：Docker挂载方式（最实用）

修改Docker启动方式，挂载插件目录：

```typescript
// theia-test-web/src/server/docker-runner.ts
export async function runTheiaWithPlugin(options: {
    theiaImage: string;
    extensionDevelopmentPath: string;
    extensionTestsPath: string;
    port: number;
}): Promise<void> {
    const docker = new Docker();

    // 创建容器，挂载插件目录
    const container = await docker.createContainer({
        Image: options.theiaImage,
        
        // 挂载插件目录到容器内
        HostConfig: {
            Binds: [
                `${path.resolve(options.extensionDevelopmentPath)}:/workspace/plugin:ro`,
                `${path.resolve(path.dirname(options.extensionTestsPath))}:/workspace/tests:ro`
            ],
            PortBindings: {
                '3000/tcp': [{ HostPort: options.port.toString() }]
            }
        },

        // 设置环境变量让Theia加载插件
        Env: [
            'THEIA_DEFAULT_PLUGINS=local-dir:/workspace/plugin',
            'SHELL=/bin/bash'
        ],

        // 启动命令
        Cmd: [
            'node', '/home/theia/lib/backend/main.js', 
            '/workspace', 
            '--hostname=0.0.0.0', 
            '--port=3000'
        ],

        WorkingDir: '/home/theia'
    });

    try {
        await container.start();
        console.log(`Theia started with plugin at http://localhost:${options.port}`);
        
        // 等待测试完成或用户中断
        await waitForTestCompletion(container, options.extensionTestsPath);
        
    } finally {
        await container.remove({ force: true });
    }
}

async function waitForTestCompletion(container: Docker.Container, testPath: string): Promise<void> {
    // 等待一段时间让Theia启动
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 在容器内执行测试
    const exec = await container.exec({
        Cmd: ['node', '/workspace/tests/index.js'],
        AttachStdout: true,
        AttachStderr: true
    });

    const stream = await exec.start({ hijack: true });
    
    return new Promise((resolve, reject) => {
        let output = '';
        
        stream.on('data', (data: Buffer) => {
            output += data.toString();
            console.log(data.toString());
        });

        stream.on('end', () => {
            if (output.includes('failing')) {
                reject(new Error('Tests failed'));
            } else {
                resolve();
            }
        });
    });
}
```

## 🔄 完整的集成方案

让我们创建一个完整的解决方案：

```typescript
// theia-test-web/src/server/integrated-runner.ts
export class IntegratedTheiaTestRunner {
    private docker: Docker;
    private container?: Docker.Container;

    constructor(private options: TestOptions) {
        this.docker = new Docker();
    }

    async runTests(): Promise<TestResult> {
        console.log('🚀 Starting integrated Theia test runner...');

        try {
            // 1. 准备插件
            await this.preparePlugin();
            
            // 2. 启动Theia容器
            await this.startTheiaContainer();
            
            // 3. 等待Theia启动
            await this.waitForTheiaReady();
            
            // 4. 验证插件加载
            await this.verifyPluginLoaded();
            
            // 5. 执行测试
            const result = await this.executeTests();
            
            return result;
            
        } finally {
            await this.cleanup();
        }
    }

    private async preparePlugin(): Promise<void> {
        // 确保插件已编译
        if (!fs.existsSync(this.options.extensionTestsPath)) {
            throw new Error('Extension tests not found. Please build the extension first.');
        }

        // 验证插件结构
        const packageJsonPath = path.join(this.options.extensionDevelopmentPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('Plugin package.json not found');
        }

        console.log('✅ Plugin prepared');
    }

    private async startTheiaContainer(): Promise<void> {
        console.log('🐳 Starting Theia container...');

        this.container = await this.docker.createContainer({
            Image: this.options.theiaImage,
            
            HostConfig: {
                // 挂载插件和测试目录
                Binds: [
                    `${path.resolve(this.options.extensionDevelopmentPath)}:/workspace/extension:ro`,
                    `${path.resolve(path.dirname(this.options.extensionTestsPath))}:/workspace/tests:ro`
                ],
                PortBindings: {
                    '3000/tcp': [{ HostPort: '3000' }]
                }
            },

            // 关键：设置Theia插件环境变量
            Env: [
                'THEIA_DEFAULT_PLUGINS=local-dir:/workspace/extension',
                'THEIA_PLUGINS_DIR=/workspace/extension',
                'SHELL=/bin/bash'
            ],

            Cmd: [
                'node', 
                '/home/theia/lib/backend/main.js', 
                '/workspace',
                '--hostname=0.0.0.0',
                '--port=3000'
            ]
        });

        await this.container.start();
        console.log('✅ Theia container started');
    }

    private async waitForTheiaReady(): Promise<void> {
        console.log('⏳ Waiting for Theia to be ready...');
        
        const maxRetries = 30;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch('http://localhost:3000');
                if (response.ok) {
                    console.log('✅ Theia is ready');
                    return;
                }
            } catch (error) {
                // Still starting...
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Theia failed to start within timeout');
    }

    private async verifyPluginLoaded(): Promise<void> {
        console.log('🔌 Verifying plugin loaded...');
        
        // 通过Theia API检查插件是否加载
        try {
            const response = await fetch('http://localhost:3000/services/plugin-ext');
            const plugins = await response.json();
            
            const pluginName = JSON.parse(
                fs.readFileSync(path.join(this.options.extensionDevelopmentPath, 'package.json'), 'utf8')
            ).name;
            
            const isLoaded = plugins.some((p: any) => p.name === pluginName);
            
            if (isLoaded) {
                console.log('✅ Plugin successfully loaded in Theia');
            } else {
                throw new Error('Plugin not loaded in Theia');
            }
        } catch (error) {
            console.warn('⚠️ Could not verify plugin loading:', error.message);
        }
    }

    private async executeTests(): Promise<TestResult> {
        console.log('🧪 Executing tests...');
        
        // 在容器内执行测试
        const exec = await this.container!.exec({
            Cmd: ['node', '/workspace/tests/index.js'],
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start({ hijack: true });
        
        return new Promise((resolve, reject) => {
            let output = '';
            
            stream.on('data', (data: Buffer) => {
                const text = data.toString();
                output += text;
                console.log(text);
            });

            stream.on('end', async () => {
                const inspect = await exec.inspect();
                const exitCode = inspect.ExitCode;
                
                if (exitCode === 0) {
                    resolve({
                        success: true,
                        output,
                        exitCode
                    });
                } else {
                    reject(new Error(`Tests failed with exit code ${exitCode}`));
                }
            });
        });
    }

    private async cleanup(): Promise<void> {
        if (this.container) {
            console.log('🧹 Cleaning up container...');
            await this.container.remove({ force: true });
            console.log('✅ Cleanup complete');
        }
    }
}

interface TestOptions {
    theiaImage: string;
    extensionDevelopmentPath: string;
    extensionTestsPath: string;
}

interface TestResult {
    success: boolean;
    output: string;
    exitCode: number;
}
```

## 🎯 使用示例

```typescript
// 使用新的集成测试运行器
const runner = new IntegratedTheiaTestRunner({
    theiaImage: 'theiaide/theia:latest',
    extensionDevelopmentPath: './my-plugin',
    extensionTestsPath: './my-plugin/out/test/suite/index.js'
});

try {
    const result = await runner.runTests();
    console.log('🎉 Tests passed!', result);
} catch (error) {
    console.error('❌ Tests failed:', error);
}
```

## 📋 总结

要让Theia真正加载工作区的插件，关键是：

1. **环境变量**：`THEIA_DEFAULT_PLUGINS=local-dir:/path/to/plugin`
2. **目录挂载**：将插件目录挂载到容器内
3. **启动参数**：正确的Theia启动命令和参数
4. **验证机制**：确认插件确实被加载
5. **测试执行**：在真实的Theia环境中运行测试

这样才能实现真正的端到端插件测试！
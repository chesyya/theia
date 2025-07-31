#!/usr/bin/env node

/**
 * Actual Test Execution Script
 * This script demonstrates running real Mocha tests for Theia plugins
 */

const path = require('path');
const fs = require('fs');

async function runTests() {
    console.log('🧪 Running Actual Theia Plugin Tests');
    console.log('====================================');
    console.log('');

    const testPath = path.resolve(__dirname, 'test-plugin-example/out/test/suite/index.js');
    
    if (!fs.existsSync(testPath)) {
        console.error('❌ Test file not found:', testPath);
        console.log('   Please run: npm run build in test-plugin-example directory');
        process.exit(1);
    }

    console.log('📁 Test file found:', testPath);
    console.log('🚀 Loading test runner...');
    
    try {
        // Load and run the test suite
        const testRunner = require(testPath);
        
        if (typeof testRunner.run === 'function') {
            console.log('✅ Test runner loaded successfully');
            console.log('🧪 Starting test execution...');
            console.log('');
            
            await testRunner.run();
            
            console.log('');
            console.log('🎉 All tests completed successfully!');
        } else {
            console.error('❌ Test runner does not export a run function');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Test execution failed:');
        console.error(error.message);
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
        process.exit(1);
    }
}

// Mock VS Code API for testing
global.vscode = {
    extensions: {
        getExtension: (id) => {
            return {
                id: id,
                isActive: true,
                exports: {
                    sayHello: (name) => `Hello, ${name}!`,
                    getConfig: () => ({
                        get: (key, defaultValue) => {
                            const configs = {
                                'enable': true,
                                'message': 'Hello from Test Plugin!'
                            };
                            return configs[key] || defaultValue;
                        }
                    }),
                    showMessage: (msg) => console.log('Message:', msg)
                }
            };
        }
    },
    commands: {
        getCommands: async () => {
            return [
                'testPlugin.helloWorld',
                'testPlugin.showMessage'
            ];
        },
        executeCommand: async (command, ...args) => {
            console.log(`Executing command: ${command}`, args);
            return Promise.resolve();
        }
    },
    workspace: {
        getConfiguration: (section) => ({
            get: (key, defaultValue) => {
                const configs = {
                    'testPlugin.enable': true,
                    'testPlugin.message': 'Hello from Test Plugin!'
                };
                return configs[`${section}.${key}`] || configs[key] || defaultValue;
            }
        }),
        workspaceFolders: [{
            uri: { fsPath: '/tmp/test-workspace' },
            name: 'test-workspace'
        }],
        openTextDocument: async (options) => {
            return {
                getText: () => options.content || 'Mock document content',
                uri: { fsPath: '/tmp/mock-document.txt' }
            };
        }
    },
    window: {
        showInformationMessage: (msg) => {
            console.log('Info:', msg);
            return Promise.resolve();
        },
        showTextDocument: async (document) => {
            return {
                document: document,
                edit: async (callback) => {
                    const editBuilder = {
                        insert: (position, text) => console.log(`Insert at ${position.line}:${position.character}: ${text}`),
                        replace: (range, text) => console.log(`Replace range: ${text}`)
                    };
                    callback(editBuilder);
                    return true;
                }
            };
        },
        showInputBox: async (options) => {
            return 'Mock user input';
        }
    },
    Uri: {
        parse: (uri) => ({ toString: () => uri, fsPath: uri.replace('file://', '') })
    },
    Position: class Position {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Range: class Range {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    }
};

if (require.main === module) {
    runTests().catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests };
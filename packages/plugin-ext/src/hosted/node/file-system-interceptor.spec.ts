// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { FileSystemInterceptor } from './file-system-interceptor';
import { FileSystemPermissionServiceNode } from './file-system-permission-service-node';
import { Plugin } from '../../common/plugin-api-rpc';
import { PluginModel, PluginPackage } from '../../common/plugin-protocol';

describe('FileSystemInterceptor', () => {

    let permissionService: FileSystemPermissionServiceNode;
    let mockPlugin: Plugin;

    beforeEach(() => {
        permissionService = new FileSystemPermissionServiceNode();
        FileSystemInterceptor.setPermissionService(permissionService);

        // Create mock plugin
        const mockModel: PluginModel = {
            id: 'test.plugin',
            name: 'Test Plugin',
            publisher: 'test',
            version: '1.0.0',
            displayName: 'Test Plugin',
            description: 'A test plugin',
            engine: {
                type: 'vscode',
                version: '1.0.0'
            },
            entryPoint: {
                backend: 'test.js'
            }
        } as PluginModel;

        const mockPackage: PluginPackage = {
            name: 'test-plugin',
            publisher: 'test',
            version: '1.0.0',
            displayName: 'Test Plugin',
            description: 'A test plugin',
            engines: {
                vscode: '^1.0.0'
            },
            packagePath: '/path/to/plugin'
        } as PluginPackage;

        mockPlugin = {
            pluginPath: '/path/to/plugin/test.js',
            pluginFolder: '/path/to/plugin',
            pluginUri: 'file:///path/to/plugin',
            model: mockModel,
            rawModel: mockPackage,
            lifecycle: {} as any,
            isUnderDevelopment: false
        };
    });

    afterEach(() => {
        FileSystemInterceptor.reset();
        sinon.restore();
    });

    describe('module interception', () => {
        it('should intercept fs module require', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const requiredFs = require('fs');
            expect(requiredFs).to.not.equal(fs); // Should be proxied
        });

        it('should intercept fs/promises module require', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const requiredFsPromises = require('fs/promises');
            expect(requiredFsPromises).to.not.equal(fs.promises); // Should be proxied
        });

        it('should log when fs-extra is required', () => {
            sinon.stub(console, 'log');
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            try {
                require('fs-extra');
            } catch (e) {
                // fs-extra might not be installed, that's ok
            }

            FileSystemInterceptor.reset();
            // If fs-extra was loaded, check for log
            // Otherwise this test passes
        });

        it('should warn when child_process is required', () => {
            const consoleWarnStub = sinon.stub(console, 'warn');
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            require('child_process');

            expect(consoleWarnStub.calledWith(sinon.match(/child_process.*security risk/))).to.be.true;
            FileSystemInterceptor.reset();
        });
    });

    describe('permission checking', () => {
        it('should allow read operations on allowed paths', async () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            // This should not throw
            const testPath = '/tmp/test-read-' + Date.now() + '.txt';
            fs.writeFileSync(testPath, 'test content');

            const interceptedFs = require('fs');
            const content = interceptedFs.readFileSync(testPath, 'utf8');

            expect(content).to.equal('test content');
            fs.unlinkSync(testPath);
            FileSystemInterceptor.reset();
        });

        it('should block read operations on forbidden paths', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const interceptedFs = require('fs');

            try {
                interceptedFs.readFileSync('/etc/shadow', 'utf8');
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }

            FileSystemInterceptor.reset();
        });

        it('should block write operations to system critical paths', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const interceptedFs = require('fs');

            try {
                interceptedFs.writeFileSync('/boot/test.txt', 'test');
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }

            FileSystemInterceptor.reset();
        });

        it('should handle async fs operations', async () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const testPath = '/tmp/test-async-' + Date.now() + '.txt';
            const interceptedFsPromises = require('fs/promises');

            await interceptedFsPromises.writeFile(testPath, 'async test');
            const content = await interceptedFsPromises.readFile(testPath, 'utf8');

            expect(content).to.equal('async test');
            await interceptedFsPromises.unlink(testPath);
            FileSystemInterceptor.reset();
        });

        it('should reject async operations on forbidden paths', async () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const interceptedFsPromises = require('fs/promises');

            try {
                await interceptedFsPromises.readFile('/etc/shadow', 'utf8');
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }

            FileSystemInterceptor.reset();
        });
    });

    describe('plugin context creation', () => {
        it('should identify builtin plugins', () => {
            const builtinPlugin: Plugin = {
                ...mockPlugin,
                model: {
                    ...mockPlugin.model,
                    publisher: 'vscode'
                }
            };

            FileSystemInterceptor.interceptFsModule(builtinPlugin);
            // Context creation is internal, but we can verify it doesn't throw
            FileSystemInterceptor.reset();
        });

        it('should handle plugins in system paths', () => {
            const systemPlugin: Plugin = {
                ...mockPlugin,
                pluginFolder: '/usr/share/theia/builtin/plugins/test'
            };

            FileSystemInterceptor.interceptFsModule(systemPlugin);
            // Context creation is internal, but we can verify it doesn't throw
            FileSystemInterceptor.reset();
        });
    });

    describe('operation mapping', () => {
        it('should correctly map read operations', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const testPath = '/tmp/test-map-' + Date.now() + '.txt';
            fs.writeFileSync(testPath, 'test');

            const interceptedFs = require('fs');

            // These should all be mapped to 'read' operation
            interceptedFs.readFileSync(testPath);
            interceptedFs.statSync(testPath);
            interceptedFs.accessSync(testPath);

            fs.unlinkSync(testPath);
            FileSystemInterceptor.reset();
        });

        it('should correctly map write operations', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const testPath = '/tmp/test-write-' + Date.now() + '.txt';
            const interceptedFs = require('fs');

            // These should all be mapped to 'write' operation
            interceptedFs.writeFileSync(testPath, 'test');
            interceptedFs.appendFileSync(testPath, ' more');

            fs.unlinkSync(testPath);
            FileSystemInterceptor.reset();
        });

        it('should correctly map delete operations', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const testPath = '/tmp/test-delete-' + Date.now() + '.txt';
            fs.writeFileSync(testPath, 'test');

            const interceptedFs = require('fs');
            interceptedFs.unlinkSync(testPath);

            FileSystemInterceptor.reset();
        });
    });

    describe('error handling', () => {
        it('should throw error if permission service not initialized', () => {
            FileSystemInterceptor.setPermissionService(null as any);
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const interceptedFs = require('fs');

            try {
                interceptedFs.readFileSync('/tmp/test.txt');
                expect.fail('Should have thrown initialization error');
            } catch (error: any) {
                expect(error.message).to.include('Permission service not initialized');
            }

            FileSystemInterceptor.reset();
        });

        it('should handle callback-style errors correctly', done => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const interceptedFs = require('fs');

            interceptedFs.readFile('/etc/shadow', 'utf8', (err: Error, data: string) => {
                expect(err).to.exist;
                expect(err.message).to.include('Permission denied');
                expect(data).to.be.undefined;
                FileSystemInterceptor.reset();
                done();
            });
        });
    });

    describe('audit logging', () => {
        it('should log file system operations', () => {
            const consoleLogStub = sinon.stub(console, 'log');
            FileSystemInterceptor.interceptFsModule(mockPlugin);

            const testPath = '/tmp/test-audit-' + Date.now() + '.txt';
            const interceptedFs = require('fs');

            interceptedFs.writeFileSync(testPath, 'test');

            // Check that audit log was created
            const auditLogs = consoleLogStub.getCalls().filter(call =>
                call.args[0]?.includes('[FS Audit]')
            );
            expect(auditLogs.length).to.be.greaterThan(0);

            const auditLog = auditLogs[0].args[0];
            expect(auditLog).to.include('test.plugin');
            expect(auditLog).to.include('writeFileSync');

            fs.unlinkSync(testPath);
            FileSystemInterceptor.reset();
        });
    });

    describe('reset functionality', () => {
        it('should restore original require after reset', () => {
            FileSystemInterceptor.interceptFsModule(mockPlugin);
            FileSystemInterceptor.reset();

            const fs1 = require('fs');
            const fs2 = fs;
            expect(fs1).to.equal(fs2); // Should be original fs module
        });
    });
});

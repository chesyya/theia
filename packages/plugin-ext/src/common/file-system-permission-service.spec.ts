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
import { BaseFileSystemPermissionService, FileSystemPermissionContext } from './file-system-permission-service';
import URI from '@theia/core/lib/common/uri';

describe('FileSystemPermissionService', () => {

    class TestFileSystemPermissionService extends BaseFileSystemPermissionService {
        // Test implementation with configurable behavior
        private allowedOperations: Map<string, string[]> = new Map();
        private allowedPathsMap: Map<string, string[]> = new Map();

        setPluginPermissions(pluginId: string, operations: string[], paths: string[] | null): void {
            this.allowedOperations.set(pluginId, operations);
            if (paths !== null) {
                this.allowedPathsMap.set(pluginId, paths);
            }
        }

        protected isPluginAllowedOperation(operation: string, context?: FileSystemPermissionContext): boolean {
            if (!context?.pluginId) {
                return true;
            }
            const allowed = this.allowedOperations.get(context.pluginId);
            if (!allowed) {
                return true;
            }
            return allowed.includes(operation);
        }

        protected getPluginAllowedPaths(pluginId?: string): string[] | null {
            if (!pluginId) {
                return null;
            }
            return this.allowedPathsMap.get(pluginId) || null;
        }
    }

    let service: TestFileSystemPermissionService;

    beforeEach(() => {
        service = new TestFileSystemPermissionService();
    });

    describe('checkPermission', () => {
        it('should allow read operation on allowed path', async () => {
            const uri = new URI('/workspace/file.txt');
            await service.checkPermission('read', uri);
            // Should not throw
        });

        it('should block access to forbidden paths (/etc/shadow)', async () => {
            const uri = new URI('/etc/shadow');
            try {
                await service.checkPermission('read', uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
                expect(error.message).to.include('/etc/shadow');
            }
        });

        it('should block access to forbidden paths (/etc/passwd)', async () => {
            const uri = new URI('/etc/passwd');
            try {
                await service.checkPermission('read', uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });

        it('should block write to system critical paths', async () => {
            const uri = new URI('/boot/grub.cfg');
            try {
                await service.checkPermission('write', uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });

        it('should allow plugin-specific operation when configured', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'test.plugin',
                pluginMetadata: { version: '1.0.0' }
            };

            service.setPluginPermissions('test.plugin', ['read', 'write'], null);

            const uri = new URI('/tmp/test.txt');
            await service.checkPermission('read', uri, context);
            await service.checkPermission('write', uri, context);
            // Should not throw
        });

        it('should block plugin-specific operation when not allowed', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'test.plugin',
                pluginMetadata: { version: '1.0.0' }
            };

            service.setPluginPermissions('test.plugin', ['read'], null);

            const uri = new URI('/tmp/test.txt');
            try {
                await service.checkPermission('write', uri, context);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
                expect(error.message).to.include('write');
            }
        });

        it('should respect plugin-specific path restrictions', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'sandboxed.plugin',
                pluginMetadata: { version: '1.0.0' }
            };

            service.setPluginPermissions('sandboxed.plugin', ['read', 'write'], ['/tmp', '/workspace']);

            // Should allow access to allowed paths
            const allowedUri = new URI('/tmp/test.txt');
            await service.checkPermission('read', allowedUri, context);

            // Should block access to non-allowed paths
            const blockedUri = new URI('/home/user/test.txt');
            try {
                await service.checkPermission('read', blockedUri, context);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
                expect(error.message).to.include('sandboxed.plugin');
            }
        });

        it('should allow builtin plugins full access', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'vscode.git',
                pluginMetadata: {
                    version: '1.0.0',
                    isBuiltin: true
                }
            };

            service.setPluginPermissions('vscode.git', ['read'], ['/tmp']);

            // Builtin check happens in isPluginAllowedOperation
            // For this test, we're testing the base service behavior
            const uri = new URI('/workspace/test.txt');
            await service.checkPermission('read', uri, context);
            // Should not throw
        });
    });

    describe('isPathAllowed', () => {
        it('should return true for allowed paths', () => {
            const uri = new URI('/workspace/file.txt');
            expect(service.isPathAllowed(uri)).to.be.true;
        });

        it('should return false for forbidden paths', () => {
            const uri = new URI('/etc/shadow');
            expect(service.isPathAllowed(uri)).to.be.false;
        });

        it('should return false for system critical paths', () => {
            const uri = new URI('/boot/vmlinuz');
            expect(service.isPathAllowed(uri)).to.be.false;
        });

        it('should respect plugin-specific path restrictions', () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'restricted.plugin'
            };

            service.setPluginPermissions('restricted.plugin', ['read'], ['/tmp']);

            const allowedUri = new URI('/tmp/test.txt');
            expect(service.isPathAllowed(allowedUri, context)).to.be.true;

            const blockedUri = new URI('/workspace/test.txt');
            expect(service.isPathAllowed(blockedUri, context)).to.be.false;
        });
    });

    describe('path validation edge cases', () => {
        it('should handle relative paths correctly', async () => {
            const uri = new URI('../../../etc/passwd');
            try {
                await service.checkPermission('read', uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });

        it('should handle paths with trailing slashes', () => {
            const uri = new URI('/etc/');
            expect(service.isPathAllowed(uri)).to.be.false;
        });

        it('should handle symlink-like paths', async () => {
            const uri = new URI('/tmp/../etc/passwd');
            try {
                await service.checkPermission('read', uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });
    });

    describe('multiple plugin contexts', () => {
        it('should handle different permissions for different plugins', async () => {
            const restrictedContext: FileSystemPermissionContext = {
                pluginId: 'restricted.plugin'
            };
            const trustedContext: FileSystemPermissionContext = {
                pluginId: 'trusted.plugin'
            };

            service.setPluginPermissions('restricted.plugin', ['read'], ['/tmp']);
            service.setPluginPermissions('trusted.plugin', ['read', 'write'], null);

            const uri = new URI('/workspace/test.txt');

            // Restricted plugin should be blocked
            try {
                await service.checkPermission('read', uri, restrictedContext);
                expect.fail('Should have thrown permission error for restricted plugin');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }

            // Trusted plugin should be allowed
            await service.checkPermission('read', uri, trustedContext);
            await service.checkPermission('write', uri, trustedContext);
            // Should not throw
        });
    });

    describe('operation types', () => {
        it('should allow all standard file system operations on allowed paths', async () => {
            const uri = new URI('/tmp/test.txt');
            const operations = ['read', 'write', 'delete', 'stat', 'mkdir', 'rename', 'copy', 'readdir'];

            for (const operation of operations) {
                await service.checkPermission(operation as any, uri);
            }
            // Should not throw for any operation
        });

        it('should block all operations on forbidden paths', async () => {
            const uri = new URI('/etc/shadow');
            const operations = ['read', 'write', 'delete', 'stat'];

            for (const operation of operations) {
                try {
                    await service.checkPermission(operation as any, uri);
                    expect.fail(`Should have thrown permission error for ${operation}`);
                } catch (error: any) {
                    expect(error.message).to.include('Permission denied');
                }
            }
        });
    });
});

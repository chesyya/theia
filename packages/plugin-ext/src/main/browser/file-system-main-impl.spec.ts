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
import { Container } from '@theia/core/shared/inversify';
import { FileSystemMainImpl } from './file-system-main-impl';
import { FileSystemPermissionService } from './file-system-permission-service';
import { RPCProtocol } from '../../common/rpc-protocol';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { URI } from '@theia/core/shared/vscode-uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';

describe('FileSystemMainImpl', () => {

    let container: Container;
    let fileSystemMain: FileSystemMainImpl;
    let permissionService: FileSystemPermissionService;
    let mockRPC: sinon.SinonStubbedInstance<RPCProtocol>;
    let mockFileService: sinon.SinonStubbedInstance<FileService>;

    beforeEach(() => {
        container = new Container();

        // Create mocks
        mockRPC = sinon.createStubInstance(RPCProtocol as any);
        mockFileService = sinon.createStubInstance(FileService as any);
        permissionService = new FileSystemPermissionService();

        // Bind to container
        container.bind(RPCProtocol).toConstantValue(mockRPC as any);
        container.bind(FileService).toConstantValue(mockFileService as any);
        container.bind(FileSystemPermissionService).toConstantValue(permissionService);

        // Create instance
        fileSystemMain = new FileSystemMainImpl(mockRPC as any, container);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('permission checks', () => {
        it('should check permission before reading file', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace/test.txt');
            mockFileService.readFile.resolves({
                value: BinaryBuffer.fromString('test content'),
                resource: {} as any,
                name: 'test.txt',
                size: 12,
                mtime: Date.now(),
                ctime: Date.now(),
                etag: '123'
            });

            await fileSystemMain.$readFile(uri);

            expect(checkPermissionSpy.calledOnce).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('read');
        });

        it('should check permission before writing file', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace/test.txt');
            const content = BinaryBuffer.fromString('test content');
            mockFileService.writeFile.resolves({} as any);

            await fileSystemMain.$writeFile(uri, content);

            expect(checkPermissionSpy.calledOnce).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('write');
        });

        it('should check permission before deleting file', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace/test.txt');
            mockFileService.delete.resolves();

            await fileSystemMain.$delete(uri, { recursive: false, useTrash: false });

            expect(checkPermissionSpy.calledOnce).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('delete');
        });

        it('should check permission before creating directory', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace/newdir');
            mockFileService.createFolder.resolves({} as any);

            await fileSystemMain.$mkdir(uri);

            expect(checkPermissionSpy.calledOnce).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('mkdir');
        });

        it('should check permission before stat', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace/test.txt');
            mockFileService.resolve.resolves({
                resource: {} as any,
                name: 'test.txt',
                isFile: true,
                isDirectory: false,
                isSymbolicLink: false,
                size: 100,
                mtime: Date.now(),
                ctime: Date.now()
            } as any);

            await fileSystemMain.$stat(uri);

            expect(checkPermissionSpy.calledOnce).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('stat');
        });

        it('should check permission before readdir', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace');
            mockFileService.resolve.resolves({
                resource: {} as any,
                name: 'workspace',
                isFile: false,
                isDirectory: true,
                isSymbolicLink: false,
                children: [
                    {
                        name: 'file1.txt',
                        isFile: true,
                        isDirectory: false,
                        isSymbolicLink: false
                    } as any
                ]
            } as any);

            await fileSystemMain.$readdir(uri);

            expect(checkPermissionSpy.calledOnce).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('readdir');
        });

        it('should check permissions before rename', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const source = URI.file('/workspace/old.txt');
            const target = URI.file('/workspace/new.txt');
            mockFileService.move.resolves({} as any);

            await fileSystemMain.$rename(source, target, { overwrite: false });

            expect(checkPermissionSpy.calledTwice).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('rename');
            expect(checkPermissionSpy.secondCall.args[0]).to.equal('write');
        });

        it('should check permissions before copy', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const source = URI.file('/workspace/source.txt');
            const target = URI.file('/workspace/target.txt');
            mockFileService.copy.resolves({} as any);

            await fileSystemMain.$copy(source, target, { overwrite: false });

            expect(checkPermissionSpy.calledTwice).to.be.true;
            expect(checkPermissionSpy.firstCall.args[0]).to.equal('read');
            expect(checkPermissionSpy.secondCall.args[0]).to.equal('write');
        });
    });

    describe('permission denial', () => {
        it('should reject read on forbidden path', async () => {
            const uri = URI.file('/etc/shadow');

            try {
                await fileSystemMain.$readFile(uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });

        it('should reject write on system critical path', async () => {
            const uri = URI.file('/boot/grub.cfg');
            const content = BinaryBuffer.fromString('malicious content');

            try {
                await fileSystemMain.$writeFile(uri, content);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });

        it('should reject delete on forbidden path', async () => {
            const uri = URI.file('/etc/passwd');

            try {
                await fileSystemMain.$delete(uri, { recursive: false, useTrash: false });
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });

        it('should reject mkdir in forbidden location', async () => {
            const uri = URI.file('/boot/malicious');

            try {
                await fileSystemMain.$mkdir(uri);
                expect.fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).to.include('Permission denied');
            }
        });
    });

    describe('context passing', () => {
        it('should pass undefined context for RPC calls', async () => {
            const checkPermissionSpy = sinon.spy(permissionService, 'checkPermission');

            const uri = URI.file('/workspace/test.txt');
            mockFileService.readFile.resolves({
                value: BinaryBuffer.fromString('test'),
                resource: {} as any,
                name: 'test.txt',
                size: 4,
                mtime: Date.now(),
                ctime: Date.now(),
                etag: '123'
            });

            await fileSystemMain.$readFile(uri);

            // Third argument should be undefined (no plugin context)
            expect(checkPermissionSpy.firstCall.args[2]).to.be.undefined;
        });
    });

    describe('error handling', () => {
        it('should not call file service if permission check fails', async () => {
            const uri = URI.file('/etc/shadow');

            try {
                await fileSystemMain.$readFile(uri);
            } catch (error) {
                // Expected error
            }

            expect(mockFileService.readFile.called).to.be.false;
        });

        it('should handle file service errors correctly', async () => {
            const uri = URI.file('/workspace/test.txt');
            mockFileService.readFile.rejects(new Error('File not found'));

            try {
                await fileSystemMain.$readFile(uri);
                expect.fail('Should have thrown file service error');
            } catch (error: any) {
                expect(error.message).to.equal('File not found');
            }
        });
    });

    describe('integration with file service', () => {
        it('should call file service after permission check passes', async () => {
            const uri = URI.file('/workspace/test.txt');
            mockFileService.readFile.resolves({
                value: BinaryBuffer.fromString('test content'),
                resource: {} as any,
                name: 'test.txt',
                size: 12,
                mtime: Date.now(),
                ctime: Date.now(),
                etag: '123'
            });

            const result = await fileSystemMain.$readFile(uri);

            expect(mockFileService.readFile.calledOnce).to.be.true;
            expect(result.toString()).to.equal('test content');
        });

        it('should pass correct parameters to file service', async () => {
            const uri = URI.file('/workspace/test.txt');
            const content = BinaryBuffer.fromString('new content');
            mockFileService.writeFile.resolves({} as any);

            await fileSystemMain.$writeFile(uri, content);

            expect(mockFileService.writeFile.calledOnce).to.be.true;
            const callArgs = mockFileService.writeFile.firstCall.args;
            expect(callArgs[1]).to.equal(content);
        });
    });
});

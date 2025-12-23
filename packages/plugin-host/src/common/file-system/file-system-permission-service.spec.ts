Object.defineProperty(document, 'queryCommandSupported', {
  value: () => false,
});
import 'reflect-metadata';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
FrontendApplicationConfigProvider.set({});
import URI from '@theia/core/lib/common/uri';
import { BaseFileSystemPermissionService, FileSystemOperation, FileSystemPermissionContext } from './file-system-permission-service';

// 创建一个具体实现类用于测试
class TestFileSystemPermissionService extends BaseFileSystemPermissionService {
    // 暴露 protected 方法用于测试
    public testIsPluginAllowedOperation(operation: FileSystemOperation, context?: FileSystemPermissionContext): boolean {
        return this.isPluginAllowedOperation(operation, context);
    }

    public testGetPluginAllowedPaths(pluginId?: string): string[] | null {
        return this.getPluginAllowedPaths(pluginId);
    }
}

describe('BaseFileSystemPermissionService', () => {
    let service: TestFileSystemPermissionService;

    beforeEach(() => {
        service = new TestFileSystemPermissionService();
    });

    describe('checkPermission - 检查操作权限', () => {
        const allowedUri = new URI('file:///root/Workspaces/bsprojects/test.txt');
        const disallowedUri = new URI('file:///etc/passwd');

        it('应该允许没有 context 的操作', async () => {
            await expect(
                service.checkPermission('read', allowedUri)
            ).resolves.not.toThrow();
        });

        it('应该允许内置插件的所有操作', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'builtin-plugin',
                pluginMetadata: {
                    isBuiltin: true
                }
            };

            await expect(
                service.checkPermission('write', allowedUri, context)
            ).resolves.not.toThrow();
        });

        it('应该允许访问允许路径内的文件', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            await expect(
                service.checkPermission('read', allowedUri, context)
            ).resolves.not.toThrow();
        });

        it('应该拒绝访问不允许路径的文件', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin',
                pluginMetadata: {
                    displayName: '测试插件'
                }
            };

            await expect(
                service.checkPermission('read', disallowedUri, context)
            ).rejects.toThrow('插件 test-plugin 未拥有访问路径 file:///etc/passwd 的权限');
        });

        it('应该在错误消息中包含插件 ID', async () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'my-plugin'
            };

            await expect(
                service.checkPermission('read', disallowedUri, context)
            ).rejects.toThrow('插件 my-plugin 未拥有访问路径');
        });

        it('应该处理未知插件', async () => {
            const context: FileSystemPermissionContext = {};

            await expect(
                service.checkPermission('read', disallowedUri, context)
            ).rejects.toThrow('插件 unknown 未拥有访问路径');
        });

        it('应该检查所有文件系统操作类型', async () => {
            const operations: FileSystemOperation[] = [
                'read', 'write', 'delete', 'stat', 'mkdir', 'rename', 'copy', 'readdir'
            ];
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            for (const operation of operations) {
                await expect(
                    service.checkPermission(operation, allowedUri, context)
                ).resolves.not.toThrow();
            }
        });
    });

    describe('isPathAllowed - 检查路径是否允许访问', () => {
        it('应该允许访问允许路径内的文件', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/src/index.ts');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(true);
        });

        it('应该允许访问允许路径的根目录', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(true);
        });

        it('应该允许访问允许路径的子目录', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/deep/nested/path/file.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(true);
        });

        it('应该拒绝访问不允许的路径', () => {
            const uri = new URI('file:///etc/passwd');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(false);
        });

        it('应该拒绝访问部分匹配但不是子路径的路径', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects-other/file.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(false);
        });

        it('应该允许没有 pluginId 的访问（默认行为）', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/file.txt');

            expect(service.isPathAllowed(uri)).toBe(true);
        });

        it('应该处理空 context', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/file.txt');
            const context: FileSystemPermissionContext = {};

            expect(service.isPathAllowed(uri, context)).toBe(true);
        });

        it('应该处理相对路径', () => {
            const uri = new URI('file://./relative/path');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            const result = service.isPathAllowed(uri, context);
            expect(typeof result).toBe('boolean');
        });

        it('应该处理带特殊字符的路径', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/文件%20with%20空格.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(true);
        });
    });

    describe('isPluginAllowedOperation - 检查插件操作权限', () => {
        it('应该允许没有 context 的操作', () => {
            expect(service.testIsPluginAllowedOperation('read')).toBe(true);
        });

        it('应该允许没有 pluginId 的操作', () => {
            const context: FileSystemPermissionContext = {};

            expect(service.testIsPluginAllowedOperation('write', context)).toBe(true);
        });

        it('应该允许有 pluginId 的操作（当前实现返回 true）', () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.testIsPluginAllowedOperation('read', context)).toBe(true);
        });

        it('应该允许所有文件系统操作类型', () => {
            const operations: FileSystemOperation[] = [
                'read', 'write', 'delete', 'stat', 'mkdir', 'rename', 'copy', 'readdir'
            ];
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            operations.forEach(operation => {
                expect(service.testIsPluginAllowedOperation(operation, context)).toBe(true);
            });
        });

        it('应该处理包含完整 metadata 的 context', () => {
            const context: FileSystemPermissionContext = {
                pluginId: 'complex-plugin',
                pluginMetadata: {
                    version: '1.0.0',
                    displayName: '复杂插件',
                    isBuiltin: false
                }
            };

            expect(service.testIsPluginAllowedOperation('read', context)).toBe(true);
        });
    });

    describe('getPluginAllowedPaths - 获取插件允许访问的路径', () => {
        it('应该为没有 pluginId 的情况返回默认路径', () => {
            const paths = service.testGetPluginAllowedPaths();

            expect(paths).toEqual(['/root/Workspaces/bsprojects/']);
        });

        it('应该为 undefined pluginId 返回默认路径', () => {
            const paths = service.testGetPluginAllowedPaths(undefined);

            expect(paths).toEqual(['/root/Workspaces/bsprojects/']);
        });

        it('应该为指定 pluginId 返回路径（当前实现返回默认路径）', () => {
            const paths = service.testGetPluginAllowedPaths('test-plugin');

            expect(paths).toEqual(['/root/Workspaces/bsprojects/']);
        });

        it('应该返回路径数组', () => {
            const paths = service.testGetPluginAllowedPaths('any-plugin');

            expect(Array.isArray(paths)).toBe(true);
            expect(paths!.length).toBeGreaterThan(0);
        });

        it('应该为不同插件返回路径', () => {
            const paths1 = service.testGetPluginAllowedPaths('plugin-1');
            const paths2 = service.testGetPluginAllowedPaths('plugin-2');

            expect(paths1).toBeDefined();
            expect(paths2).toBeDefined();
            expect(Array.isArray(paths1)).toBe(true);
            expect(Array.isArray(paths2)).toBe(true);
        });
    });

    describe('集成测试 - 完整的权限检查流程', () => {
        it('应该完整验证允许的文件操作', async () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/src/main.ts');
            const context: FileSystemPermissionContext = {
                pluginId: 'my-plugin',
                pluginMetadata: {
                    version: '1.0.0',
                    displayName: '我的插件',
                    isBuiltin: false
                }
            };

            // 测试所有操作
            const operations: FileSystemOperation[] = [
                'read', 'write', 'delete', 'stat', 'mkdir', 'rename', 'copy', 'readdir'
            ];

            for (const operation of operations) {
                await expect(
                    service.checkPermission(operation, uri, context)
                ).resolves.not.toThrow();
            }
        });

        it('应该完整验证拒绝的文件操作', async () => {
            const uri = new URI('file:///unauthorized/path/file.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'restricted-plugin',
                pluginMetadata: {
                    displayName: '受限插件'
                }
            };

            await expect(
                service.checkPermission('read', uri, context)
            ).rejects.toThrow('未拥有访问路径');
        });

        it('应该处理多个连续的权限检查', async () => {
            const uris = [
                new URI('file:///root/Workspaces/bsprojects/file1.txt'),
                new URI('file:///root/Workspaces/bsprojects/file2.txt'),
                new URI('file:///root/Workspaces/bsprojects/dir/file3.txt')
            ];
            const context: FileSystemPermissionContext = {
                pluginId: 'batch-plugin'
            };

            for (const uri of uris) {
                await expect(
                    service.checkPermission('read', uri, context)
                ).resolves.not.toThrow();
            }
        });

        it('应该正确区分允许和不允许的路径', async () => {
            const allowedUri = new URI('file:///root/Workspaces/bsprojects/allowed.txt');
            const deniedUri = new URI('file:///home/user/denied.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            await expect(
                service.checkPermission('read', allowedUri, context)
            ).resolves.not.toThrow();

            await expect(
                service.checkPermission('read', deniedUri, context)
            ).rejects.toThrow();
        });
    });

    describe('边界情况测试', () => {
        it('应该处理空字符串路径', () => {
            const uri = new URI('file://');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            const result = service.isPathAllowed(uri, context);
            expect(typeof result).toBe('boolean');
        });

        it('应该处理根路径', () => {
            const uri = new URI('file:///');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            const result = service.isPathAllowed(uri, context);
            expect(typeof result).toBe('boolean');
        });

        it('应该处理很长的路径', () => {
            const longPath = '/root/Workspaces/bsprojects/' + 'a/'.repeat(100) + 'file.txt';
            const uri = new URI(`file://${longPath}`);
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            expect(service.isPathAllowed(uri, context)).toBe(true);
        });

        it('应该处理包含点号的路径', () => {
            const uri = new URI('file:///root/Workspaces/bsprojects/../bsprojects/file.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            const result = service.isPathAllowed(uri, context);
            expect(typeof result).toBe('boolean');
        });

        it('应该处理 Windows 风格路径', () => {
            const uri = new URI('file:///C:/root/Workspaces/bsprojects/file.txt');
            const context: FileSystemPermissionContext = {
                pluginId: 'test-plugin'
            };

            const result = service.isPathAllowed(uri, context);
            expect(typeof result).toBe('boolean');
        });
    });
});

(global as any).TextEncoder = require('util').TextEncoder;
(global as any).TextDecoder = require('util').TextDecoder;

Object.defineProperty(document, 'queryCommandSupported', {
    value: () => false,
});

import 'reflect-metadata';
// import sinon from "sinon";
import { Container, ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';

FrontendApplicationConfigProvider.set({});




import { KeybindingRegistry, KeybindingScope } from '@theia/core/lib/browser';
import { KeySequence } from '@theia/core/lib/browser/keyboard/keys';
import { KeymapsService } from '@theia/keymaps/lib/browser/keymaps-service';
import { ArgumentProcessorContribution, CommandRegistryMainImpl } from './command-registry-main';
import { RPCProtocol } from '../../common/rpc-protocol';
import { PluginContributionHandler } from './plugin-contribution-handler';
import { ContributionProvider, CommandRegistry } from '@theia/core';
import { IPluginCommandManager } from './command/plugin-command-manager-protocol';
import { MockPluginCommandManager } from './command/mock-plugin-command-manager';


describe('快捷键函数测试', () => {
    let container: Container;
    let instance: CommandRegistryMainImpl;
    let keyBindingMock: any;
    let keymapsServiceMock: any;
    let rpcMock: RPCProtocol;
    let commandRegistryMock: any;
    let contributionHandlerMock: any;
    // let pluginCommandManager: any;

    beforeAll(() => {
        // 创建 mock 对象
        keyBindingMock = {
            resolveKeybinding: jest.fn(),
            getKeybindingsByScope: jest.fn(),
            getKeybindingsForCommand: jest.fn()
        };

        keymapsServiceMock = {
            setKeybinding: jest.fn()
        };

        // 创建容器
        container = new Container();

        const fakeProcessor = { process: jest.fn() };
        const fakeContributionProvider = {
            getContributions: jest.fn(() => [fakeProcessor])
        };

        container
            .bind<ContributionProvider<any>>(ContributionProvider)
            .toConstantValue(fakeContributionProvider)
            .whenTargetNamed(ArgumentProcessorContribution);

        rpcMock = {
            getProxy: jest.fn().mockReturnValue({   // 返回一个假的 proxy
                $someMethod: jest.fn()             // 如果你后面会调用 proxy.$方法，就提前加进去
            })
        } as unknown as RPCProtocol;

        commandRegistryMock = {};
        contributionHandlerMock = {};
        const module = new ContainerModule((bind) => {
            bind(KeybindingRegistry).toConstantValue(keyBindingMock);
            bind(KeymapsService).toConstantValue(keymapsServiceMock);
            bind(CommandRegistryMainImpl).toSelf();
            bind(CommandRegistry).toConstantValue(commandRegistryMock);
            bind(PluginContributionHandler).toConstantValue(contributionHandlerMock);
            bind(MockPluginCommandManager).toSelf();
            bind(IPluginCommandManager).toService(MockPluginCommandManager)
        });

        container.load(module);
        instance = new CommandRegistryMainImpl(rpcMock, container);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('$getKeyBindingForKeybinding - 根据快捷键查找绑定', () => {
        const testKeybinding = 'ctrl+s';
        const mockKeySequence = { keys: ['ctrl+s'] };

        it('当没有匹配的绑定时应返回空数组', async () => {
            keyBindingMock.resolveKeybinding.mockReturnValue(mockKeySequence);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([]);

            const result = await instance.$getKeyBindingForKeybinding(testKeybinding);

            expect(result).toEqual([]);
            expect(keyBindingMock.resolveKeybinding).toHaveBeenCalledWith({ keybinding: testKeybinding });
        });

        it('应返回所有作用域中匹配的绑定', async () => {
            const candidateSeq = { keys: ['ctrl+s'] };
            const binding1 = { command: 'file.save', keybinding: 'ctrl+s' };
            const binding2 = { command: 'workbench.action.save', keybinding: 'ctrl+s' };
            const binding3 = { command: 'other.command', keybinding: 'ctrl+shift+s' };

            keyBindingMock.resolveKeybinding
                .mockReturnValueOnce(candidateSeq) // 候选键序列
                .mockReturnValueOnce(candidateSeq) // binding1 匹配
                .mockReturnValueOnce(candidateSeq) // binding2 匹配
                .mockReturnValueOnce({ keys: ['ctrl+shift+s'] }); // binding3 不匹配

            keyBindingMock.getKeybindingsByScope.mockImplementation(scope => {
                if (scope === KeybindingScope.DEFAULT) {
                    return [binding1, binding2, binding3];
                }
                return [];
            });


            // Mock KeySequence.equals
            const originalEquals = KeySequence.equals;
            KeySequence.equals = jest.fn((a, b) => {
                return a.keys[0] === b.keys[0];
            });

            const result = await instance.$getKeyBindingForKeybinding(testKeybinding);

            expect(result).toHaveLength(2);
            expect(result).toEqual([
                { id: 'file.save', value: 'ctrl+s' },
                { id: 'workbench.action.save', value: 'ctrl+s' }
            ]);

            // 恢复原始函数
            KeySequence.equals = originalEquals;
        });

        it('应从最高作用域到默认作用域依次检查', async () => {
            const candidateSeq = { keys: ['ctrl+c'] };
            keyBindingMock.resolveKeybinding.mockReturnValue(candidateSeq);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([]);

            await instance.$getKeyBindingForKeybinding('ctrl+c');

            // 验证是否检查了所有作用域
            const callCount = keyBindingMock.getKeybindingsByScope.mock.calls.length;
            expect(callCount).toBeGreaterThan(0);

            // 验证作用域是从高到低检查的
            for (let i = 0; i < callCount - 1; i++) {
                const currentScope = keyBindingMock.getKeybindingsByScope.mock.calls[i][0];
                const nextScope = keyBindingMock.getKeybindingsByScope.mock.calls[i + 1][0];
                expect(currentScope).toBeGreaterThanOrEqual(nextScope);
            }
        });

        it('应处理复杂的键序列', async () => {
            const complexKeybinding = 'ctrl+k ctrl+s';
            const candidateSeq = { keys: ['ctrl+k', 'ctrl+s'] };
            const binding = { command: 'keybindings.open', keybinding: 'ctrl+k ctrl+s' };

            keyBindingMock.resolveKeybinding
                .mockReturnValueOnce(candidateSeq)
                .mockReturnValueOnce(candidateSeq);

            keyBindingMock.getKeybindingsByScope.mockImplementation(scope => {
                if (scope === KeybindingScope.DEFAULT) {
                    return [binding];
                }
                return [];
            });


            const originalEquals = KeySequence.equals;
            KeySequence.equals = jest.fn(() => true);

            const result = await instance.$getKeyBindingForKeybinding(complexKeybinding);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ id: 'keybindings.open', value: 'ctrl+k ctrl+s' });

            KeySequence.equals = originalEquals;
        });

        it('应正确规范化输入的快捷键', async () => {
            const inputKeybinding = 'Ctrl+S'; // 大小写混合
            const normalizedSeq = { keys: ['ctrl+s'] };

            keyBindingMock.resolveKeybinding.mockReturnValue(normalizedSeq);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([]);

            await instance.$getKeyBindingForKeybinding(inputKeybinding);

            expect(keyBindingMock.resolveKeybinding).toHaveBeenCalledWith({ keybinding: inputKeybinding });
        });
    });

    describe('$editKeybinding - 编辑快捷键绑定', () => {
        const testKeyBinding = {
            id: 'file.save',
            value: 'ctrl+s',
            checkConflict: false
        };

        beforeEach(() => {
            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);
            keymapsServiceMock.setKeybinding.mockResolvedValue(undefined);
        });

        it('应成功编辑快捷键（不检查冲突）', async () => {
            const oldKeybinding = { command: 'file.save', keybinding: 'ctrl+shift+s' };
            keyBindingMock.getKeybindingsForCommand.mockReturnValue([oldKeybinding]);

            const result = await instance.$editKeybinding(testKeyBinding);

            expect(result).toBe(true);
            expect(keymapsServiceMock.setKeybinding).toHaveBeenCalledTimes(1);
            expect(keymapsServiceMock.setKeybinding).toHaveBeenCalledWith(
                {
                    ...oldKeybinding,
                    command: 'file.save',
                    keybinding: 'ctrl+s'
                },
                oldKeybinding
            );
        });

        it('应处理没有已存在绑定的情况', async () => {
            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);

            const result = await instance.$editKeybinding(testKeyBinding);

            expect(result).toBe(true);
            expect(keymapsServiceMock.setKeybinding).toHaveBeenCalledWith(
                {
                    command: 'file.save',
                    keybinding: 'ctrl+s'
                },
                undefined
            );
        });

        it('当检测到完全冲突时应返回 false', async () => {
            const keyBindingWithCheck = {
                id: 'file.save',
                value: 'ctrl+c',
                checkConflict: true
            };

            const conflictingBinding = { command: 'editor.copy', keybinding: 'ctrl+c' };
            const candidateSeq = { keys: ['ctrl+c'] };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);
            keyBindingMock.resolveKeybinding.mockReturnValue(candidateSeq);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([conflictingBinding]);

            // Mock KeySequence.compare
            const originalCompare = KeySequence.compare;
            KeySequence.compare = jest.fn(() => KeySequence.CompareResult.FULL);

            const result = await instance.$editKeybinding(keyBindingWithCheck);

            expect(result).toBe(false);
            expect(keymapsServiceMock.setKeybinding).not.toHaveBeenCalled();

            KeySequence.compare = originalCompare;
        });

        it('当检测到部分冲突时应返回 false', async () => {
            const keyBindingWithCheck = {
                id: 'custom.command',
                value: 'ctrl+k ctrl+s',
                checkConflict: true
            };

            const conflictingBinding = { command: 'other.command', keybinding: 'ctrl+k' };
            const candidateSeq = { keys: ['ctrl+k', 'ctrl+s'] };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);
            keyBindingMock.resolveKeybinding.mockReturnValue(candidateSeq);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([conflictingBinding]);

            const originalCompare = KeySequence.compare;
            KeySequence.compare = jest.fn(() => KeySequence.CompareResult.PARTIAL);

            const result = await instance.$editKeybinding(keyBindingWithCheck);

            expect(result).toBe(false);
            expect(keymapsServiceMock.setKeybinding).not.toHaveBeenCalled();

            KeySequence.compare = originalCompare;
        });

        it('当检测到遮蔽冲突时应返回 false', async () => {
            const keyBindingWithCheck = {
                id: 'custom.command',
                value: 'ctrl+k',
                checkConflict: true
            };

            const conflictingBinding = { command: 'other.command', keybinding: 'ctrl+k ctrl+s' };
            const candidateSeq = { keys: ['ctrl+k'] };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);
            keyBindingMock.resolveKeybinding.mockReturnValue(candidateSeq);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([conflictingBinding]);

            const originalCompare = KeySequence.compare;
            KeySequence.compare = jest.fn(() => KeySequence.CompareResult.SHADOW);

            const result = await instance.$editKeybinding(keyBindingWithCheck);

            expect(result).toBe(false);
            expect(keymapsServiceMock.setKeybinding).not.toHaveBeenCalled();

            KeySequence.compare = originalCompare;
        });

        it('当没有冲突时应成功设置快捷键（checkConflict=true）', async () => {
            const keyBindingWithCheck = {
                id: 'file.save',
                value: 'ctrl+alt+s',
                checkConflict: true
            };

            const nonConflictingBinding = { command: 'other.command', keybinding: 'ctrl+shift+s' };
            const candidateSeq = { keys: ['ctrl+alt+s'] };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);
            keyBindingMock.resolveKeybinding.mockReturnValue(candidateSeq);
            keyBindingMock.getKeybindingsByScope.mockReturnValue([nonConflictingBinding]);

            const originalCompare = KeySequence.compare;
            KeySequence.compare = jest.fn(() => KeySequence.CompareResult.NONE);

            const result = await instance.$editKeybinding(keyBindingWithCheck);

            expect(result).toBe(true);
            expect(keymapsServiceMock.setKeybinding).toHaveBeenCalledTimes(1);

            KeySequence.compare = originalCompare;
        });

        it('应只检查默认作用域的冲突', async () => {
            const keyBindingWithCheck = {
                id: 'custom.command',
                value: 'ctrl+x',
                checkConflict: true
            };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([]);
            keyBindingMock.resolveKeybinding.mockReturnValue({ keys: ['ctrl+x'] });
            keyBindingMock.getKeybindingsByScope.mockReturnValue([]);

            const originalCompare = KeySequence.compare;
            KeySequence.compare = jest.fn(() => KeySequence.CompareResult.NONE);

            await instance.$editKeybinding(keyBindingWithCheck);

            expect(keyBindingMock.getKeybindingsByScope).toHaveBeenCalledWith(KeybindingScope.DEFAULT);
            expect(keyBindingMock.getKeybindingsByScope).toHaveBeenCalledTimes(1);

            KeySequence.compare = originalCompare;
        });

        it('当设置快捷键失败时应抛出错误', async () => {
            const error = new Error('保存失败');
            keymapsServiceMock.setKeybinding.mockRejectedValue(error);

            await expect(
                instance.$editKeybinding(testKeyBinding)
            ).rejects.toThrow(`为命令 '${testKeyBinding.id}' 设置快捷键失败`);
        });

        it('应使用旧绑定的属性合并新绑定', async () => {
            const oldKeybinding = {
                command: 'file.save',
                keybinding: 'ctrl+shift+s',
                when: 'editorTextFocus',
                args: { some: 'data' }
            };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([oldKeybinding]);

            await instance.$editKeybinding(testKeyBinding);

            expect(keymapsServiceMock.setKeybinding).toHaveBeenCalledWith(
                {
                    ...oldKeybinding,
                    command: 'file.save',
                    keybinding: 'ctrl+s'
                },
                oldKeybinding
            );
        });

        it('应处理多个已存在绑定的情况（使用第一个）', async () => {
            const oldKeybinding1 = { command: 'file.save', keybinding: 'ctrl+shift+s' };
            const oldKeybinding2 = { command: 'file.save', keybinding: 'ctrl+alt+s' };

            keyBindingMock.getKeybindingsForCommand.mockReturnValue([oldKeybinding1, oldKeybinding2]);

            await instance.$editKeybinding(testKeyBinding);

            expect(keymapsServiceMock.setKeybinding).toHaveBeenCalledWith(
                {
                    ...oldKeybinding1,
                    command: 'file.save',
                    keybinding: 'ctrl+s'
                },
                oldKeybinding1
            );
        });
    });

});

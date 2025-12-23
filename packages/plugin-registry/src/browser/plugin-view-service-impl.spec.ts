Object.defineProperty(document, 'queryCommandSupported', {
  value: () => false,
});
import { Container } from '@theia/core/shared/inversify';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
FrontendApplicationConfigProvider.set({});
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core';
import { CommonConfirmDialogFactory } from '@baosky/platform/lib/browser/common-dialog/common-confirm-dialog';
import { PluginViewServiceImpl } from './plugin-view-service-impl';
import { BSXExtensionsModel } from '../common/bsx-extensions-model';

describe('pluginViewServiceImpl', () => {
    let container: Container;
    let pluginViewService: PluginViewServiceImpl;
    let bsxExtensionsModelMock: any;
    let widgetManagerMock: any;
    let shellMock: any;
    let messageServiceMock: any;
    let confirmDialogFactoryMock: jest.Mock;

    beforeEach(() => {
        // 创建 mock 对象
        bsxExtensionsModelMock = {
            getExtension: jest.fn(),
            refresh: jest.fn()
        };

        widgetManagerMock = {
            getWidget: jest.fn()
        };

        shellMock = {
            expandPanel: jest.fn(),
            activateWidget: jest.fn()
        };

        messageServiceMock = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        confirmDialogFactoryMock = jest.fn().mockReturnValue({
            open: jest.fn()
        });

        // 创建 container 并绑定 mock
        container = new Container();
        container.bind(BSXExtensionsModel).toConstantValue(bsxExtensionsModelMock);
        container.bind(WidgetManager).toConstantValue(widgetManagerMock);
        container.bind(ApplicationShell).toConstantValue(shellMock);
        container.bind(MessageService).toConstantValue(messageServiceMock);
        container.bind(CommonConfirmDialogFactory).toConstantValue(confirmDialogFactoryMock);

        // 创建被测试对象
        container.bind(PluginViewServiceImpl).toSelf();
        pluginViewService = container.get(PluginViewServiceImpl);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('检查插件更新 checkAndPromptPluginUpdate', () => {
        const pluginId = 'test.plugin';
        const currentVersion = '1.0.0';
        const latestVersion = '1.1.0';
        console.log(require.resolve('@baosky/plugin-registry/lib/common/bsx-extensions-model'));
console.log(require.resolve('../common/bsx-extensions-model'));


        it('插件不存在时应抛出错误', async () => {
            bsxExtensionsModelMock.getExtension.mockReturnValue(undefined);

            await expect(
                pluginViewService.checkAndPromptPluginUpdate(pluginId)
            ).rejects.toThrow(`未找到插件: ${pluginId} `);

            expect(bsxExtensionsModelMock.getExtension).toHaveBeenCalledTimes(1);
            expect(bsxExtensionsModelMock.getExtension).toHaveBeenCalledWith(pluginId);
        });

        it('内置插件应抛出不支持更新的错误', async () => {
            const builtinExtension = {
                builtin: true,
                version: currentVersion
            };
            bsxExtensionsModelMock.getExtension.mockReturnValue(builtinExtension);

            await expect(
                pluginViewService.checkAndPromptPluginUpdate(pluginId)
            ).rejects.toThrow(`内置插件 ${pluginId} 不支持更新`);
        });

        it('获取最新版本失败应抛出错误', async () => {
            const extension = {
                builtin: false,
                version: currentVersion
            };
            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            bsxExtensionsModelMock.refresh.mockResolvedValue(undefined);

            await expect(
                pluginViewService.checkAndPromptPluginUpdate(pluginId)
            ).rejects.toThrow('从在线插件商店获取插件');

            expect(bsxExtensionsModelMock.refresh).toHaveBeenCalledTimes(1);
            expect(bsxExtensionsModelMock.refresh).toHaveBeenCalledWith(pluginId);
        });

        it('插件已是最新版本时应显示提示信息', async () => {
            const extension = {
                builtin: false,
                version: currentVersion
            };
            const latestExtension = {
                dataVersion: currentVersion
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            bsxExtensionsModelMock.refresh.mockResolvedValue(latestExtension);

            await pluginViewService.checkAndPromptPluginUpdate(pluginId);

            expect(messageServiceMock.info).toHaveBeenCalledTimes(1);
            const callArg = messageServiceMock.info.mock.calls[0][0];
            expect(callArg).toContain('已是最新版本');
        });

        it('有新版本时应提示用户更新', async () => {
            const installMock = jest.fn().mockResolvedValue(undefined);
            const extension = {
                builtin: false,
                version: currentVersion,
                install: installMock
            };
            const latestExtension = {
                dataVersion: latestVersion
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            bsxExtensionsModelMock.refresh.mockResolvedValue(latestExtension);

            const dialogMock = { open: jest.fn().mockResolvedValue(true) };
            confirmDialogFactoryMock.mockReturnValue(dialogMock);

            await pluginViewService.checkAndPromptPluginUpdate(pluginId);

            expect(confirmDialogFactoryMock).toHaveBeenCalledTimes(1);
            expect(dialogMock.open).toHaveBeenCalledTimes(1);
            expect(installMock).toHaveBeenCalledTimes(1);
        });

        it('用户取消更新时不应安装', async () => {
            const installMock = jest.fn().mockResolvedValue(undefined);
            const extension = {
                builtin: false,
                version: currentVersion,
                install: installMock
            };
            const latestExtension = {
                dataVersion: latestVersion
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            bsxExtensionsModelMock.refresh.mockResolvedValue(latestExtension);

            const dialogMock = { open: jest.fn().mockResolvedValue(false) };
            confirmDialogFactoryMock.mockReturnValue(dialogMock);

            await pluginViewService.checkAndPromptPluginUpdate(pluginId);

            expect(confirmDialogFactoryMock).toHaveBeenCalledTimes(1);
            expect(dialogMock.open).toHaveBeenCalledTimes(1);
            expect(installMock).not.toHaveBeenCalled();
        });

        it('当前版本未定义时应使用默认版本 0.0.1', async () => {
            const extension = {
                builtin: false,
                version: undefined
            };
            const latestExtension = {
                dataVersion: latestVersion
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            bsxExtensionsModelMock.refresh.mockResolvedValue(latestExtension);

            const dialogMock = { open: jest.fn().mockResolvedValue(false) };
            confirmDialogFactoryMock.mockReturnValue(dialogMock);

            await pluginViewService.checkAndPromptPluginUpdate(pluginId);

            // Should compare with default version 0.0.1
            expect(confirmDialogFactoryMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('打开插件说明文档 openPluginReadme', () => {
        const pluginId = 'test.plugin';

        it('插件不存在时应抛出错误', async () => {
            bsxExtensionsModelMock.getExtension.mockReturnValue(undefined);

            await expect(
                pluginViewService.openPluginReadme(pluginId)
            ).rejects.toThrow(`未找到插件: ${pluginId} `);

            expect(bsxExtensionsModelMock.getExtension).toHaveBeenCalledTimes(1);
            expect(bsxExtensionsModelMock.getExtension).toHaveBeenCalledWith(pluginId);
        });

        it('应成功打开插件并聚焦视图', async () => {
            const openMock = jest.fn().mockResolvedValue(undefined);
            const extension = {
                open: openMock
            };

            const widgetMock = {
                focusAndReveal: jest.fn().mockResolvedValue(true),
                id: 'bsx-extensions:installed'
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            widgetManagerMock.getWidget.mockResolvedValue(widgetMock);

            await pluginViewService.openPluginReadme(pluginId);

            expect(openMock).toHaveBeenCalledTimes(1);
            expect(openMock).toHaveBeenCalledWith({ mode: 'activate' });
            expect(widgetManagerMock.getWidget).toHaveBeenCalledTimes(1);
            expect(widgetManagerMock.getWidget).toHaveBeenCalledWith('bsx-extensions', { id: 'installed' });
            expect(widgetMock.focusAndReveal).toHaveBeenCalledTimes(1);
            expect(widgetMock.focusAndReveal).toHaveBeenCalledWith(pluginId);
            expect(shellMock.expandPanel).toHaveBeenCalledTimes(1);
            expect(shellMock.expandPanel).toHaveBeenCalledWith('left');
            expect(shellMock.activateWidget).toHaveBeenCalledTimes(1);
            expect(shellMock.activateWidget).toHaveBeenCalledWith(widgetMock.id);
        });

        it('打开插件失败时应处理错误', async () => {
            const error = new Error('Failed to open');
            const extension = {
                open: jest.fn().mockRejectedValue(error)
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);

            await expect(
                pluginViewService.openPluginReadme(pluginId)
            ).rejects.toThrow('Failed to open');
        });
    });

    describe('聚焦插件视图 focusPluginView', () => {
        const pluginId = 'test.plugin';
        const type = 'installed';

        it('应成功聚焦并显示插件', async () => {
            const widgetMock = {
                focusAndReveal: jest.fn().mockResolvedValue(true),
                id: 'bsx-extensions:installed'
            };

            widgetManagerMock.getWidget.mockResolvedValue(widgetMock);

            const result = await pluginViewService.focusPluginView(pluginId, type);

            expect(result).toBe(true);
            expect(widgetManagerMock.getWidget).toHaveBeenCalledTimes(1);
            expect(widgetManagerMock.getWidget).toHaveBeenCalledWith('bsx-extensions', { id: type });
            expect(widgetMock.focusAndReveal).toHaveBeenCalledTimes(1);
            expect(widgetMock.focusAndReveal).toHaveBeenCalledWith(pluginId);
            expect(shellMock.expandPanel).toHaveBeenCalledTimes(1);
            expect(shellMock.expandPanel).toHaveBeenCalledWith('left');
            expect(shellMock.activateWidget).toHaveBeenCalledTimes(1);
            expect(shellMock.activateWidget).toHaveBeenCalledWith(widgetMock.id);
        });

        it('聚焦失败时应返回 false', async () => {
            const widgetMock = {
                focusAndReveal: jest.fn().mockResolvedValue(false),
                id: 'bsx-extensions:installed'
            };

            widgetManagerMock.getWidget.mockResolvedValue(widgetMock);

            const result = await pluginViewService.focusPluginView(pluginId, type);

            expect(result).toBe(false);
            expect(widgetMock.focusAndReveal).toHaveBeenCalledTimes(1);
            expect(widgetMock.focusAndReveal).toHaveBeenCalledWith(pluginId);
            expect(shellMock.expandPanel).not.toHaveBeenCalled();
            expect(shellMock.activateWidget).not.toHaveBeenCalled();
        });

        it('插件组件未找到时应抛出错误', async () => {
            widgetManagerMock.getWidget.mockResolvedValue(undefined);

            await expect(
                pluginViewService.focusPluginView(pluginId, type)
            ).rejects.toThrow();
        });

        it('应支持不同类型插件', async () => {
            const types = ['installed', 'builtin', 'searchResult', 'recommended'];

            for (const pluginType of types) {
                const widgetMock = {
                    focusAndReveal: jest.fn().mockResolvedValue(true),
                    id: `bsx-extensions:${pluginType}`
                };

                widgetManagerMock.getWidget.mockResolvedValue(widgetMock);

                const result = await pluginViewService.focusPluginView(pluginId, pluginType);

                expect(result).toBe(true);
                expect(widgetManagerMock.getWidget).toHaveBeenCalledWith('bsx-extensions', { id: pluginType });
            }
        });
    });

    describe('集成测试 Integration Tests', () => {
        it('应完整处理插件更新流程', async () => {
            const pluginId = 'test.plugin';
            const installMock = jest.fn().mockResolvedValue(undefined);
            const openMock = jest.fn().mockResolvedValue(undefined);

            const extension = {
                builtin: false,
                version: '1.0.0',
                install: installMock,
                open: openMock
            };

            const latestExtension = {
                dataVersion: '1.1.0'
            };

            const widgetMock = {
                focusAndReveal: jest.fn().mockResolvedValue(true),
                id: 'bsx-extensions:installed'
            };

            bsxExtensionsModelMock.getExtension.mockReturnValue(extension);
            bsxExtensionsModelMock.refresh.mockResolvedValue(latestExtension);
            widgetManagerMock.getWidget.mockResolvedValue(widgetMock);

            const dialogMock = { open: jest.fn().mockResolvedValue(true) };
            confirmDialogFactoryMock.mockReturnValue(dialogMock);

            // Check for updates
            await pluginViewService.checkAndPromptPluginUpdate(pluginId);
            expect(installMock).toHaveBeenCalledTimes(1);

            // Open plugin readme
            await pluginViewService.openPluginReadme(pluginId);
            expect(openMock).toHaveBeenCalledTimes(1);
            expect(shellMock.activateWidget).toHaveBeenCalledTimes(1);
        });

        it('应优雅处理异常场景', async () => {
            const pluginId = 'nonexistent.plugin';

            bsxExtensionsModelMock.getExtension.mockReturnValue(undefined);

            // Test checkPluginUpdates error
            await expect(
                pluginViewService.checkAndPromptPluginUpdate(pluginId)
            ).rejects.toThrow(`未找到插件: ${pluginId} `);

            // Test openPluginReadme error
            await expect(
                pluginViewService.openPluginReadme(pluginId)
            ).rejects.toThrow(`未找到插件: ${pluginId} `);
        });
    });
});

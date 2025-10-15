// *****************************************************************************
// Copyright (C) 2025 and others.
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
import { PluginRegistryMainImpl } from './plugin-registry-main';
import { RPCProtocol } from '../../common/rpc-protocol';
import { RequestService } from '@theia/core/shared/@theia/request';
import { WidgetManager, ApplicationShell } from '@theia/core/lib/browser';
import { VSXExtensionsWidget } from '@theia/vsx-registry/lib/browser/vsx-extensions-widget';
import { VSXExtensionsSourceOptions } from '@theia/vsx-registry/lib/browser/vsx-extensions-source';

describe('PluginRegistryMainImpl', () => {

    let container: Container;
    let pluginRegistryMain: PluginRegistryMainImpl;
    let mockRPC: sinon.SinonStubbedInstance<RPCProtocol>;
    let mockRequestService: sinon.SinonStubbedInstance<RequestService>;
    let mockWidgetManager: sinon.SinonStubbedInstance<WidgetManager>;
    let mockShell: sinon.SinonStubbedInstance<ApplicationShell>;

    beforeEach(() => {
        container = new Container();

        // Create mocks
        mockRPC = sinon.createStubInstance(RPCProtocol as any);
        mockRequestService = {} as any;
        mockWidgetManager = {
            getWidget: sinon.stub()
        } as any;
        mockShell = {
            expandPanel: sinon.stub(),
            activateWidget: sinon.stub()
        } as any;

        // Bind to container
        container.bind(RPCProtocol).toConstantValue(mockRPC as any);
        container.bind(RequestService).toConstantValue(mockRequestService as any);
        container.bind(WidgetManager).toConstantValue(mockWidgetManager as any);
        container.bind(ApplicationShell).toConstantValue(mockShell as any);

        // Create instance
        pluginRegistryMain = new PluginRegistryMainImpl(mockRPC as any, container);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('focusPluginAnywhere', () => {
        it('should search through all widget types', async () => {
            // Mock widget manager to return null for all widgets
            mockWidgetManager.getWidget.resolves(null);

            const result = await pluginRegistryMain.focusPluginAnywhere('test-plugin');

            expect(result).to.be.false;
            // Should try all four widget types
            expect(mockWidgetManager.getWidget.callCount).to.equal(4);

            // Verify it tried all widget type options
            const calls = mockWidgetManager.getWidget.getCalls().map(call => call.args[1]);
            expect(calls).to.deep.equal([
                { id: VSXExtensionsSourceOptions.INSTALLED },
                { id: VSXExtensionsSourceOptions.BUILT_IN },
                { id: VSXExtensionsSourceOptions.RECOMMENDED },
                { id: VSXExtensionsSourceOptions.SEARCH_RESULT }
            ]);
        });

        it('should focus plugin when found in installed widget', async () => {
            const mockWidget = {
                id: 'vsx-extensions:installed',
                focusAndReveal: sinon.stub().resolves(true)
            } as any;

            mockWidgetManager.getWidget.callsFake(async (id: string, options: any) => {
                if (options.id === VSXExtensionsSourceOptions.INSTALLED) {
                    return mockWidget;
                }
                return null;
            });

            mockShell.activateWidget.resolves(mockWidget);

            const result = await pluginRegistryMain.focusPluginAnywhere('test-plugin');

            expect(result).to.be.true;
            expect(mockWidget.focusAndReveal.calledWith('test-plugin')).to.be.true;
            expect(mockShell.expandPanel.calledWith('left')).to.be.true;
            expect(mockShell.activateWidget.calledWith('vsx-extensions:installed')).to.be.true;
        });

        it('should focus plugin when found in built-in widget', async () => {
            const mockWidget = {
                id: 'vsx-extensions:builtin',
                focusAndReveal: sinon.stub().resolves(true)
            } as any;

            mockWidgetManager.getWidget.callsFake(async (id: string, options: any) => {
                if (options.id === VSXExtensionsSourceOptions.BUILT_IN) {
                    return mockWidget;
                }
                return null;
            });

            mockShell.activateWidget.resolves(mockWidget);

            const result = await pluginRegistryMain.focusPluginAnywhere('test-plugin');

            expect(result).to.be.true;
            expect(mockWidget.focusAndReveal.calledWith('test-plugin')).to.be.true;
            expect(mockShell.expandPanel.calledWith('left')).to.be.true;
            expect(mockShell.activateWidget.calledWith('vsx-extensions:builtin')).to.be.true;
        });

        it('should continue searching if plugin not found in first widget', async () => {
            const firstWidget = {
                id: 'vsx-extensions:installed',
                focusAndReveal: sinon.stub().resolves(false)
            } as any;

            const secondWidget = {
                id: 'vsx-extensions:builtin',
                focusAndReveal: sinon.stub().resolves(true)
            } as any;

            mockWidgetManager.getWidget.callsFake(async (id: string, options: any) => {
                if (options.id === VSXExtensionsSourceOptions.INSTALLED) {
                    return firstWidget;
                }
                if (options.id === VSXExtensionsSourceOptions.BUILT_IN) {
                    return secondWidget;
                }
                return null;
            });

            mockShell.activateWidget.resolves(secondWidget);

            const result = await pluginRegistryMain.focusPluginAnywhere('test-plugin');

            expect(result).to.be.true;
            expect(firstWidget.focusAndReveal.calledOnce).to.be.true;
            expect(secondWidget.focusAndReveal.calledOnce).to.be.true;
            expect(mockShell.activateWidget.calledWith('vsx-extensions:builtin')).to.be.true;
        });

        it('should not open side panel or activate widget if plugin not found', async () => {
            const mockWidget = {
                id: 'vsx-extensions:installed',
                focusAndReveal: sinon.stub().resolves(false)
            } as any;

            mockWidgetManager.getWidget.resolves(mockWidget);

            const result = await pluginRegistryMain.focusPluginAnywhere('test-plugin');

            expect(result).to.be.false;
            expect(mockShell.expandPanel.called).to.be.false;
            expect(mockShell.activateWidget.called).to.be.false;
        });

        it('should handle widget that does not exist', async () => {
            mockWidgetManager.getWidget.resolves(null);

            const result = await pluginRegistryMain.focusPluginAnywhere('test-plugin');

            expect(result).to.be.false;
            expect(mockShell.expandPanel.called).to.be.false;
            expect(mockShell.activateWidget.called).to.be.false;
        });

        it('should handle widget manager errors gracefully', async () => {
            mockWidgetManager.getWidget.rejects(new Error('Widget manager error'));

            try {
                await pluginRegistryMain.focusPluginAnywhere('test-plugin');
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.equal('Widget manager error');
            }

            expect(mockShell.expandPanel.called).to.be.false;
            expect(mockShell.activateWidget.called).to.be.false;
        });
    });

    describe('$checkUpdates', () => {
        let mockVSXExtensionsModel: any;

        beforeEach(() => {
            // Mock VSXExtensionsModel
            mockVSXExtensionsModel = {
                getExtension: sinon.stub(),
                refresh: sinon.stub()
            };
            (pluginRegistryMain as any).vsxExtensionsModel = mockVSXExtensionsModel;
        });

        it('should return update available when newer version exists', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.0.0'
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '2.0.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.currentVersion).to.equal('1.0.0');
            expect(result.latestVersion).to.equal('2.0.0');
            expect(result.hasUpdate).to.be.true;
            expect(mockVSXExtensionsModel.getExtension.calledWith('test.plugin')).to.be.true;
            expect(mockVSXExtensionsModel.refresh.calledWith('test.plugin')).to.be.true;
        });

        it('should return no update when current version is latest', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '2.0.0'
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '2.0.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.currentVersion).to.equal('2.0.0');
            expect(result.latestVersion).to.equal('2.0.0');
            expect(result.hasUpdate).to.be.false;
        });

        it('should return no update when current version is newer than available', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '3.0.0'
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '2.0.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.currentVersion).to.equal('3.0.0');
            expect(result.latestVersion).to.equal('2.0.0');
            expect(result.hasUpdate).to.be.false;
        });

        it('should handle minor version updates', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.2.3'
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '1.3.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.hasUpdate).to.be.true;
        });

        it('should handle patch version updates', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.2.3'
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '1.2.4'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.hasUpdate).to.be.true;
        });

        it('should handle versions with different number of parts', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.0'
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '1.0.1'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.hasUpdate).to.be.true;
        });

        it('should throw error when VSXExtensionsModel not available', async () => {
            (pluginRegistryMain as any).vsxExtensionsModel = null;

            try {
                await pluginRegistryMain.$checkUpdates('test.plugin');
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.equal('VSXExtensionsModel service not available');
            }
        });

        it('should throw error when plugin not found', async () => {
            mockVSXExtensionsModel.getExtension.returns(null);

            try {
                await pluginRegistryMain.$checkUpdates('non-existent.plugin');
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.include('Plugin non-existent.plugin not found');
            }
        });

        it('should throw error when refresh returns null', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.0.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(null);

            try {
                await pluginRegistryMain.$checkUpdates('test.plugin');
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.include('Failed to fetch latest version for test.plugin');
            }
        });

        it('should throw error when refresh rejects', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.0.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.rejects(new Error('Network error'));

            try {
                await pluginRegistryMain.$checkUpdates('test.plugin');
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.equal('Network error');
            }
        });

        it('should handle missing version in current extension', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin'
                // No version field
            };

            const mockLatestExtension = {
                id: 'test.plugin',
                version: '1.0.0'
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.currentVersion).to.equal('0.0.0');
            expect(result.latestVersion).to.equal('1.0.0');
            expect(result.hasUpdate).to.be.true;
        });

        it('should handle missing version in latest extension', async () => {
            const mockCurrentExtension = {
                id: 'test.plugin',
                version: '1.0.0'
            };

            const mockLatestExtension = {
                id: 'test.plugin'
                // No version field
            };

            mockVSXExtensionsModel.getExtension.returns(mockCurrentExtension);
            mockVSXExtensionsModel.refresh.resolves(mockLatestExtension);

            const result = await pluginRegistryMain.$checkUpdates('test.plugin');

            expect(result.currentVersion).to.equal('1.0.0');
            expect(result.latestVersion).to.equal('1.0.0');
            expect(result.hasUpdate).to.be.false;
        });

        it('should log error when check updates fails', async () => {
            const consoleErrorStub = sinon.stub(console, 'error');
            mockVSXExtensionsModel.getExtension.returns(null);

            try {
                await pluginRegistryMain.$checkUpdates('test.plugin');
            } catch (error) {
                // Expected error
            }

            expect(consoleErrorStub.calledOnce).to.be.true;
            expect(consoleErrorStub.firstCall.args[0]).to.include('Failed to check updates for test.plugin');

            consoleErrorStub.restore();
        });
    });
});

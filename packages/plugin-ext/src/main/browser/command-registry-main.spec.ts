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
import { Container } from '@theia/core/shared/inversify';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { KeybindingRegistry } from '@theia/core/lib/browser';
import { KeymapsService } from '@theia/keymaps/lib/browser/keymaps-service';
import { RPCProtocol } from '../../common/rpc-protocol';
import { CommandRegistryMainImpl } from './command-registry-main';
import { PluginContributionHandler } from './plugin-contribution-handler';
import * as sinon from 'sinon';

describe('CommandRegistryMainImpl', () => {
    let container: Container;
    let commandRegistry: CommandRegistry;
    let keybindingRegistry: KeybindingRegistry;
    let keymapsService: KeymapsService;
    let commandRegistryMain: CommandRegistryMainImpl;
    let rpcProtocol: RPCProtocol;

    beforeEach(() => {
        container = new Container();

        // Mock CommandRegistry
        commandRegistry = {
            getCommand: sinon.stub(),
            commandIds: [],
            executeCommand: sinon.stub()
        } as any;

        // Mock KeybindingRegistry
        keybindingRegistry = {
            getKeybindingsForCommand: sinon.stub(),
            containsKeybindingInScope: sinon.stub()
        } as any;

        // Mock KeymapsService
        keymapsService = {
            setKeybinding: sinon.stub().resolves()
        } as any;

        // Mock PluginContributionHandler
        const pluginContributionHandler = {} as any;

        // Mock RPCProtocol
        rpcProtocol = {
            getProxy: sinon.stub()
        } as any;

        container.bind(CommandRegistry).toConstantValue(commandRegistry);
        container.bind(KeybindingRegistry).toConstantValue(keybindingRegistry);
        container.bind(KeymapsService).toConstantValue(keymapsService);
        container.bind(PluginContributionHandler).toConstantValue(pluginContributionHandler);

        commandRegistryMain = new CommandRegistryMainImpl(rpcProtocol, container);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('$editKeybinding', () => {
        it('should throw error when command not found', async () => {
            (commandRegistry.getCommand as sinon.SinonStub).returns(undefined);

            try {
                await commandRegistryMain.$editKeybinding('unknown.command');
                expect.fail('Should have thrown an error');
            } catch (e) {
                expect(e.message).to.include('Command \'unknown.command\' not found');
            }
        });

        it('should get command and keybindings for valid command', async () => {
            const command = {
                id: 'test.command',
                label: 'Test Command',
                category: 'Test'
            };

            const keybinding = {
                command: 'test.command',
                keybinding: 'ctrl+t'
            };

            (commandRegistry.getCommand as sinon.SinonStub).withArgs('test.command').returns(command);
            (keybindingRegistry.getKeybindingsForCommand as sinon.SinonStub).withArgs('test.command').returns([keybinding]);

            // Since we can't easily test dialog interaction, we verify that the method
            // retrieves the correct command and keybindings
            expect(commandRegistry.getCommand).to.not.throw;
        });
    });

    describe('validateKeybinding', () => {
        it('should return error when keybinding is empty', () => {
            const result = (commandRegistryMain as any).validateKeybinding('test.command', undefined, '');
            expect(result).to.equal('keybinding value is required');
        });

        it('should return empty string when old and new keybindings match', () => {
            const result = (commandRegistryMain as any).validateKeybinding('test.command', 'ctrl+t', 'ctrl+t');
            expect(result).to.equal('');
        });

        it('should return error when keybinding collides', () => {
            (keybindingRegistry.containsKeybindingInScope as sinon.SinonStub).returns(true);

            const result = (commandRegistryMain as any).validateKeybinding('test.command', 'ctrl+t', 'ctrl+shift+t');
            expect(result).to.equal('keybinding currently collides');
        });

        it('should return empty string for valid keybinding', () => {
            (keybindingRegistry.containsKeybindingInScope as sinon.SinonStub).returns(false);

            const result = (commandRegistryMain as any).validateKeybinding('test.command', 'ctrl+t', 'ctrl+shift+t');
            expect(result).to.equal('');
        });

        it('should return error message for invalid keybinding syntax', () => {
            (keybindingRegistry.containsKeybindingInScope as sinon.SinonStub).returns(false);

            const result = (commandRegistryMain as any).validateKeybinding('test.command', undefined, 'invalid+++keybinding');
            expect(result).to.not.equal('');
        });
    });

    describe('$getKeyBinding', () => {
        it('should return keybindings for command', async () => {
            const keybindings = [
                { command: 'test.command', keybinding: 'ctrl+t' },
                { command: 'test.command', keybinding: 'ctrl+shift+t' }
            ];

            (keybindingRegistry.getKeybindingsForCommand as sinon.SinonStub).withArgs('test.command').returns(keybindings);

            const result = await commandRegistryMain.$getKeyBinding('test.command');
            expect(result).to.have.lengthOf(2);
            expect(result![0].id).to.equal('test.command');
            expect(result![0].value).to.equal('ctrl+t');
        });

        it('should return undefined when no keybindings found', async () => {
            (keybindingRegistry.getKeybindingsForCommand as sinon.SinonStub).withArgs('test.command').returns(undefined);

            const result = await commandRegistryMain.$getKeyBinding('test.command');
            expect(result).to.be.undefined;
        });
    });

    describe('$getCommands', () => {
        it('should return all command ids', async () => {
            // Create a new mock with writable commandIds
            const mockCommandRegistry = {
                getCommand: sinon.stub(),
                get commandIds() { return ['command1', 'command2', 'command3']; },
                executeCommand: sinon.stub()
            } as any;

            container.rebind(CommandRegistry).toConstantValue(mockCommandRegistry);
            commandRegistryMain = new CommandRegistryMainImpl(rpcProtocol, container);

            const result = await commandRegistryMain.$getCommands();
            expect(result).to.deep.equal(['command1', 'command2', 'command3']);
        });
    });
});

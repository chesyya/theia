// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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

import { inject, injectable } from 'inversify';
import { CommandRegistry } from '../command';
import { Disposable } from '../disposable';
import { MenuPath } from './menu-types';

export type MenuCommandArguments = [menuPath: MenuPath, command: string, ...commandArgs: unknown[]];

export const MenuCommandExecutor = Symbol('MenuCommandExecutor');
export interface MenuCommandExecutor {
    isVisible(...args: MenuCommandArguments): boolean;
    isEnabled(...args: MenuCommandArguments): boolean;
    isToggled(...args: MenuCommandArguments): boolean;
    executeCommand(...args: MenuCommandArguments): Promise<unknown>;

    // Async versions for better plugin support
    isVisibleAsync?(...args: MenuCommandArguments): Promise<boolean>;
    isEnabledAsync?(...args: MenuCommandArguments): Promise<boolean>;
    isToggledAsync?(...args: MenuCommandArguments): Promise<boolean>;
};

export const MenuCommandAdapter = Symbol('MenuCommandAdapter');
export interface MenuCommandAdapter extends MenuCommandExecutor {
    /** Return values less than or equal to 0 are treated as rejections. */
    canHandle(...args: MenuCommandArguments): number;
}

export const MenuCommandAdapterRegistry = Symbol('MenuCommandAdapterRegistry');
export interface MenuCommandAdapterRegistry {
    registerAdapter(adapter: MenuCommandAdapter): Disposable;
    getAdapterFor(...args: MenuCommandArguments): MenuCommandAdapter | undefined;
}

@injectable()
export class MenuCommandExecutorImpl implements MenuCommandExecutor {
    @inject(MenuCommandAdapterRegistry) protected readonly adapterRegistry: MenuCommandAdapterRegistry;
    @inject(CommandRegistry) protected readonly commandRegistry: CommandRegistry;

    executeCommand(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): Promise<unknown> {
        return this.delegate(menuPath, command, commandArgs, 'executeCommand');
    }

    isVisible(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): boolean {
        return this.delegate(menuPath, command, commandArgs, 'isVisible');
    }

    isEnabled(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): boolean {
        return this.delegate(menuPath, command, commandArgs, 'isEnabled');
    }

    isToggled(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): boolean {
        return this.delegate(menuPath, command, commandArgs, 'isToggled');
    }

    // Async versions that utilize the command registry's async capabilities
    async isVisibleAsync(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): Promise<boolean> {
        return this.delegateAsync(menuPath, command, commandArgs, 'isVisibleAsync', 'isVisible');
    }

    async isEnabledAsync(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): Promise<boolean> {
        return this.delegateAsync(menuPath, command, commandArgs, 'isEnabledAsync', 'isEnabled');
    }

    async isToggledAsync(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): Promise<boolean> {
        return this.delegateAsync(menuPath, command, commandArgs, 'isToggledAsync', 'isToggled');
    }

    protected delegate<T extends keyof MenuCommandExecutor>(menuPath: MenuPath, command: string, commandArgs: unknown[], method: T): ReturnType<MenuCommandExecutor[T]> {
        const adapter = this.adapterRegistry.getAdapterFor(menuPath, command, commandArgs);
        return (adapter
            ? adapter[method](menuPath, command, ...commandArgs)
            : this.commandRegistry[method](command, ...commandArgs)) as ReturnType<MenuCommandExecutor[T]>;
    }

    protected async delegateAsync(
        menuPath: MenuPath,
        command: string,
        commandArgs: unknown[],
        asyncMethod: 'isVisibleAsync' | 'isEnabledAsync' | 'isToggledAsync',
        syncMethod: 'isVisible' | 'isEnabled' | 'isToggled'
    ): Promise<boolean> {
        const adapter = this.adapterRegistry.getAdapterFor(menuPath, command, commandArgs);

        if (adapter && adapter[asyncMethod]) {
            // Use adapter's async method if available
            return adapter[asyncMethod]!(menuPath, command, ...commandArgs);
        } else if (adapter) {
            // Use adapter's sync method
            return adapter[syncMethod](menuPath, command, ...commandArgs);
        } else {
            // Use command registry's async method if available, otherwise fall back to sync
            const commandRegistryAsyncMethod = asyncMethod.replace('Async', '') + 'Async' as keyof CommandRegistry;
            if (typeof this.commandRegistry[commandRegistryAsyncMethod] === 'function') {
                return (this.commandRegistry[commandRegistryAsyncMethod] as any)(command, ...commandArgs);
            } else {
                return this.commandRegistry[syncMethod](command, ...commandArgs);
            }
        }
    }
}

@injectable()
export class MenuCommandAdapterRegistryImpl implements MenuCommandAdapterRegistry {
    protected readonly adapters = new Array<MenuCommandAdapter>();

    registerAdapter(adapter: MenuCommandAdapter): Disposable {
        if (!this.adapters.includes(adapter)) {
            this.adapters.push(adapter);
            return Disposable.create(() => {
                const index = this.adapters.indexOf(adapter);
                if (index !== -1) {
                    this.adapters.splice(index, 1);
                }
            });
        }
        return Disposable.NULL;
    }

    getAdapterFor(menuPath: MenuPath, command: string, ...commandArgs: unknown[]): MenuCommandAdapter | undefined {
        let bestAdapter: MenuCommandAdapter | undefined = undefined;
        let bestScore = 0;
        let currentScore = 0;
        for (const adapter of this.adapters) {
            // Greater than or equal: favor later registrations over earlier.
            if ((currentScore = adapter.canHandle(menuPath, command, ...commandArgs)) >= bestScore) {
                bestScore = currentScore;
                bestAdapter = adapter;
            }
        }
        return bestAdapter;
    }
}

// *****************************************************************************
// Copyright (C) 2017 TypeFox and others.
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

import { injectable, inject } from 'inversify';
import { MenuBar, Menu as MenuWidget, Widget } from '@phosphor/widgets';
import { CommandRegistry as PhosphorCommandRegistry } from '@phosphor/commands';
import {
    CommandRegistry, environment, DisposableCollection, Disposable,
    MenuModelRegistry, MAIN_MENU_BAR, MenuPath, MenuNode, MenuCommandExecutor, CompoundMenuNode, CompoundMenuNodeRole, CommandMenuNode
} from '../../common';
import { KeybindingRegistry } from '../keybinding';
import { FrontendApplication } from '../frontend-application';
import { FrontendApplicationContribution } from '../frontend-application-contribution';
import { ContextKeyService, ContextMatcher } from '../context-key-service';
import { ContextMenuContext } from './context-menu-context';
import { waitForRevealed } from '../widgets';
import { ApplicationShell } from '../shell';
import { CorePreferences } from '../core-preferences';
import { PreferenceService } from '../preferences/preference-service';

export abstract class MenuBarWidget extends MenuBar {
    abstract activateMenu(label: string, ...labels: string[]): Promise<MenuWidget>;
    abstract triggerMenuItem(label: string, ...labels: string[]): Promise<MenuWidget.IItem>;
}

export interface BrowserMenuOptions extends MenuWidget.IOptions {
    commands: MenuCommandRegistry,
    context?: HTMLElement,
    contextKeyService?: ContextMatcher;
    rootMenuPath: MenuPath
};

@injectable()
export class BrowserMainMenuFactory implements MenuWidgetFactory {

    @inject(ContextKeyService)
    protected readonly contextKeyService: ContextKeyService;

    @inject(ContextMenuContext)
    protected readonly context: ContextMenuContext;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(MenuCommandExecutor)
    protected readonly menuCommandExecutor: MenuCommandExecutor;

    @inject(CorePreferences)
    protected readonly corePreferences: CorePreferences;

    @inject(KeybindingRegistry)
    protected readonly keybindingRegistry: KeybindingRegistry;

    @inject(MenuModelRegistry)
    protected readonly menuProvider: MenuModelRegistry;

    createMenuBar(): MenuBarWidget {
        const menuBar = new DynamicMenuBarWidget();
        menuBar.id = 'theia:menubar';
        this.corePreferences.ready.then(() => {
            this.showMenuBar(menuBar);
        });
        const disposable = new DisposableCollection(
            this.corePreferences.onPreferenceChanged(change => {
                if (change.preferenceName === 'window.menuBarVisibility') {
                    this.showMenuBar(menuBar, change.newValue);
                }
            }),
            this.keybindingRegistry.onKeybindingsChanged(() => {
                this.showMenuBar(menuBar);
            }),
            this.menuProvider.onDidChange(() => {
                this.showMenuBar(menuBar);
            })
        );
        menuBar.disposed.connect(() => disposable.dispose());
        return menuBar;
    }

    protected getMenuBarVisibility(): string {
        return this.corePreferences.get('window.menuBarVisibility', 'classic');
    }

    protected showMenuBar(menuBar: DynamicMenuBarWidget, preference = this.getMenuBarVisibility()): void {
        if (preference && ['classic', 'visible'].includes(preference)) {
            menuBar.clearMenus();
            this.fillMenuBar(menuBar);
        } else {
            menuBar.clearMenus();
        }
    }

    protected fillMenuBar(menuBar: MenuBarWidget): void {
        const menuModel = this.menuProvider.getMenu(MAIN_MENU_BAR);
        const menuCommandRegistry = this.createMenuCommandRegistry(menuModel);
        for (const menu of menuModel.children) {
            if (CompoundMenuNode.is(menu)) {
                const menuWidget = this.createMenuWidget(menu, { commands: menuCommandRegistry, rootMenuPath: MAIN_MENU_BAR });
                menuBar.addMenu(menuWidget);
            }
        }
    }

    createContextMenu(path: MenuPath, args?: unknown[], context?: HTMLElement, contextKeyService?: ContextMatcher, skipSingleRootNode?: boolean): MenuWidget {
        const menuModel = skipSingleRootNode ? this.menuProvider.removeSingleRootNode(this.menuProvider.getMenu(path), path) : this.menuProvider.getMenu(path);
        const menuCommandRegistry = this.createMenuCommandRegistry(menuModel, args).snapshot(path);
        const contextMenu = this.createMenuWidget(menuModel, { commands: menuCommandRegistry, context, rootMenuPath: path, contextKeyService });
        return contextMenu;
    }

    createMenuWidget(menu: CompoundMenuNode, options: BrowserMenuOptions): DynamicMenuWidget {
        return new DynamicMenuWidget(menu, options, this.services);
    }

    protected createMenuCommandRegistry(menu: CompoundMenuNode, args: unknown[] = []): MenuCommandRegistry {
        const menuCommandRegistry = new MenuCommandRegistry(this.services);
        this.registerMenu(menuCommandRegistry, menu, args);
        return menuCommandRegistry;
    }

    protected registerMenu(menuCommandRegistry: MenuCommandRegistry, menu: MenuNode, args: unknown[]): void {
        if (CompoundMenuNode.is(menu)) {
            menu.children.forEach(child => this.registerMenu(menuCommandRegistry, child, args));
        } else if (CommandMenuNode.is(menu)) {
            menuCommandRegistry.registerActionMenu(menu, args);
            if (CommandMenuNode.hasAltHandler(menu)) {
                menuCommandRegistry.registerActionMenu(menu.altNode, args);
            }

        }
    }

    protected get services(): MenuServices {
        return {
            context: this.context,
            contextKeyService: this.contextKeyService,
            commandRegistry: this.commandRegistry,
            keybindingRegistry: this.keybindingRegistry,
            menuWidgetFactory: this,
            commandExecutor: this.menuCommandExecutor,
        };
    }

}

export class DynamicMenuBarWidget extends MenuBarWidget {

    /**
     * We want to restore the focus after the menu closes.
     */
    protected previousFocusedElement: HTMLElement | undefined;

    constructor() {
        super();
        // HACK we need to hook in on private method _openChildMenu. Don't do this at home!
        DynamicMenuBarWidget.prototype['_openChildMenu'] = () => {
            if (this.activeMenu instanceof DynamicMenuWidget) {
                // `childMenu` is `null` if we open the menu. For example, menu is not shown and you click on `Edit`.
                // However, the `childMenu` is set, when `Edit` was already open and you move the mouse over `Select`.
                // We want to save the focus object for the former case only.
                if (!this.childMenu) {
                    const { activeElement } = document;
                    if (activeElement instanceof HTMLElement) {
                        this.previousFocusedElement = activeElement;
                    }
                }
                this.activeMenu.aboutToShow({ previousFocusedElement: this.previousFocusedElement });
            }
            super['_openChildMenu']();
        };
    }

    async activateMenu(label: string, ...labels: string[]): Promise<MenuWidget> {
        const menu = this.menus.find(m => m.title.label === label);
        if (!menu) {
            throw new Error(`could not find '${label}' menu`);
        }
        this.activeMenu = menu;
        this.openActiveMenu();
        await waitForRevealed(menu);

        const menuPath = [label, ...labels];

        let current = menu;
        for (const itemLabel of labels) {
            const item = current.items.find(i => i.label === itemLabel);
            if (!item || !item.submenu) {
                throw new Error(`could not find '${itemLabel}' submenu in ${menuPath.map(l => "'" + l + "'").join(' -> ')} menu`);
            }
            current.activeItem = item;
            current.triggerActiveItem();
            current = item.submenu;
            await waitForRevealed(current);
        }
        return current;
    }

    async triggerMenuItem(label: string, ...labels: string[]): Promise<MenuWidget.IItem> {
        if (!labels.length) {
            throw new Error('menu item label is not specified');
        }
        const menuPath = [label, ...labels.slice(0, labels.length - 1)];
        const menu = await this.activateMenu(menuPath[0], ...menuPath.slice(1));
        const item = menu.items.find(i => i.label === labels[labels.length - 1]);
        if (!item) {
            throw new Error(`could not find '${labels[labels.length - 1]}' item in ${menuPath.map(l => "'" + l + "'").join(' -> ')} menu`);
        }
        menu.activeItem = item;
        menu.triggerActiveItem();
        return item;
    }

}

export class MenuServices {
    readonly commandRegistry: CommandRegistry;
    readonly keybindingRegistry: KeybindingRegistry;
    readonly contextKeyService: ContextKeyService;
    readonly context: ContextMenuContext;
    readonly menuWidgetFactory: MenuWidgetFactory;
    readonly commandExecutor: MenuCommandExecutor;
}

export interface MenuWidgetFactory {
    createMenuWidget(menu: MenuNode & Required<Pick<MenuNode, 'children'>>, options: BrowserMenuOptions): MenuWidget;
}

/**
 * A menu widget that would recompute its items on update.
 */
export class DynamicMenuWidget extends MenuWidget {

    /**
     * We want to restore the focus after the menu closes.
     */
    protected previousFocusedElement: HTMLElement | undefined;

    protected readonly visibilityListeners = new DisposableCollection();

    constructor(
        protected menu: CompoundMenuNode,
        protected options: BrowserMenuOptions,
        protected services: MenuServices
    ) {
        super(options);
        if (menu.label) {
            this.title.label = menu.label;
        }
        if (menu.icon) {
            this.title.iconClass = menu.icon;
        }
        this.updateSubMenus(this, this.menu, this.options.commands);
        this.setupVisibilityListeners();
    }

    public aboutToShow({ previousFocusedElement }: { previousFocusedElement: HTMLElement | undefined }): void {
        this.preserveFocusedElement(previousFocusedElement);
        this.clearItems();
        this.runWithPreservedFocusContext(() => {
            this.options.commands.snapshot(this.options.rootMenuPath);
            this.updateSubMenus(this, this.menu, this.options.commands);
        });
    }

    protected startDynamicMenuTest(): void {
        // 只对包含动态菜单测试命令的菜单进行测试
        const hasDynamicTest = this.hasDynamicMenuTestCommands();
        if (hasDynamicTest) {
            console.log('检测到动态菜单测试，3秒后将自动切换 ContextKey 进行验证');

            setTimeout(() => {
                // 通过命令注册表执行测试命令
                const testCommand = 'dynamicMenuTest.menuTrigger';
                if (this.services.commandRegistry.getCommand(testCommand)) {
                    this.services.commandRegistry.executeCommand(testCommand).catch(err => {
                        console.log('动态菜单测试执行:', err?.message || '完成');
                    });
                }
            }, 3000);
        }
    }

    protected hasDynamicMenuTestCommands(): boolean {
        // 检查菜单中是否包含动态测试相关命令
        return this.checkMenuForCommands(this.menu, ['dynamicMenuTest.menuTrigger', 'dynamicMenuTest.showStatus']);
    }

    protected checkMenuForCommands(menu: MenuNode, targetCommands: string[]): boolean {
        if (CompoundMenuNode.is(menu)) {
            return menu.children.some(child => this.checkMenuForCommands(child, targetCommands));
        } else if (menu.command) {
            return targetCommands.includes(menu.command) ||
                   (menu.altNode ? targetCommands.includes(menu.altNode.command) : false);
        }
        return false;
    }

    public override close(): void {
        // 如果正在更新且设置了防止关闭标志，则阻止关闭
        if (this.preventAutoClose && this.isUpdating) {
            console.log('🛡️ 阻止菜单在更新过程中自动关闭');
            return;
        }
        console.log('🔚 菜单正在关闭');
        super.close();
    }

    public override open(x: number, y: number, options?: MenuWidget.IOpenOptions, anchor?: HTMLElement): void {
        console.log('🚀 菜单打开:', this.title.label);

        const cb = () => {
            // 如果正在更新，延迟关闭
            if (this.preventAutoClose && this.isUpdating) {
                console.log('🛡️ 延迟菜单关闭，等待更新完成');
                setTimeout(() => {
                    if (!this.isDisposed && !this.isUpdating) {
                        console.log('🔚 延迟关闭菜单:', this.title.label);
                        this.restoreFocusedElement();
                    }
                }, 100);
            } else {
                console.log('🔚 菜单即将关闭:', this.title.label);
                this.restoreFocusedElement();
            }
            this.aboutToClose.disconnect(cb);
        };
        this.aboutToClose.connect(cb);
        this.preserveFocusedElement();
        super.open(x, y, options, anchor);

        console.log('📋 菜单已打开，状态: visible =', this.isVisible, ', hidden =', this.isHidden);
        console.log('🎯 当前菜单项数量:', this.items.length);
        this.items.forEach((item, index) => {
            if (item.type === 'command') {
                console.log(`  ${index}: ${item.command}`);
            }
        });

        // 动态菜单测试：菜单打开后自动触发 ContextKey 变化测试
        this.startDynamicMenuTest();
    }

    protected updateSubMenus(parent: MenuWidget, menu: CompoundMenuNode, commands: MenuCommandRegistry): void {
        const items = this.buildSubMenus([], menu, commands);
        while (items[items.length - 1]?.type === 'separator') {
            items.pop();
        }
        for (const item of items) {
            parent.addItem(item);
        }
    }

    protected buildSubMenus(parentItems: MenuWidget.IItemOptions[], menu: MenuNode, commands: MenuCommandRegistry): MenuWidget.IItemOptions[] {
        if (CompoundMenuNode.is(menu)
            && menu.children.length
            && this.undefinedOrMatch(this.options.contextKeyService ?? this.services.contextKeyService, menu.when, this.options.context)) {
            const role = menu === this.menu ? CompoundMenuNodeRole.Group : CompoundMenuNode.getRole(menu);
            if (role === CompoundMenuNodeRole.Submenu) {
                const submenu = this.services.menuWidgetFactory.createMenuWidget(menu, this.options);
                if (submenu.items.length > 0) {
                    parentItems.push({ type: 'submenu', submenu });
                }
            } else if (role === CompoundMenuNodeRole.Group && menu.id !== 'inline') {
                const children = CompoundMenuNode.getFlatChildren(menu.children);
                const myItems: MenuWidget.IItemOptions[] = [];
                children.forEach(child => this.buildSubMenus(myItems, child, commands));
                if (myItems.length) {
                    if (parentItems.length && parentItems[parentItems.length - 1].type !== 'separator') {
                        parentItems.push({ type: 'separator' });
                    }
                    parentItems.push(...myItems);
                    parentItems.push({ type: 'separator' });
                }
            }
        } else if (menu.command) {
            const node = menu.altNode && this.services.context.altPressed ? menu.altNode : (menu as MenuNode & CommandMenuNode);
            if (commands.isVisible(node.command) && this.undefinedOrMatch(this.options.contextKeyService ?? this.services.contextKeyService, node.when, this.options.context)) {
                parentItems.push({
                    command: node.command,
                    type: 'command'
                });
            }
        }
        return parentItems;
    }

    protected undefinedOrMatch(contextKeyService: ContextMatcher, expression?: string, context?: HTMLElement): boolean {
        if (expression) { return contextKeyService.match(expression, context); }
        return true;
    }

    protected preserveFocusedElement(previousFocusedElement: Element | null = document.activeElement): boolean {
        if (!this.previousFocusedElement && previousFocusedElement instanceof HTMLElement) {
            this.previousFocusedElement = previousFocusedElement;
            return true;
        }
        return false;
    }

    protected restoreFocusedElement(): boolean {
        if (this.previousFocusedElement) {
            this.previousFocusedElement.focus({ preventScroll: true });
            this.previousFocusedElement = undefined;
            return true;
        }
        return false;
    }

    protected runWithPreservedFocusContext(what: () => void): void {
        let focusToRestore: HTMLElement | undefined = undefined;
        const { activeElement } = document;
        if (this.previousFocusedElement && activeElement instanceof HTMLElement && this.previousFocusedElement !== activeElement) {
            focusToRestore = activeElement;
            this.previousFocusedElement.focus({ preventScroll: true });
        }
        try {
            what();
        } finally {
            if (focusToRestore) {
                focusToRestore.focus({ preventScroll: true });
            }
        }
    }

    private refreshScheduled = false;
    private preventAutoClose = false;

    protected setupVisibilityListeners(): void {
        // 收集菜单项的 when 条件，监听相关 ContextKey 变化
        const allContextKeys = new Set<string>();
        this.collectWhenConditions(this.menu, allContextKeys);

        // 监听 ContextKey 变化（用于菜单项的 when 条件）
        if (allContextKeys.size > 0) {
            console.log('🎧 设置 ContextKey 监听器，监听的 keys:', Array.from(allContextKeys));
            const contextKeys = Array.from(allContextKeys);

            this.visibilityListeners.push(
                this.services.contextKeyService.onDidChange(e => {
                    // 防止事件风暴：检查是否已经调度了刷新
                    if (this.refreshScheduled) {
                        return;
                    }

                    // 检查是否影响我们关心的特定keys
                    let affected = false;
                    for (const key of contextKeys) {
                        if (e.affects && e.affects(new Set([key]))) {
                            affected = true;
                            break;
                        }
                    }

                    if (!affected) {
                        return;
                    }

                    console.log('✅ ContextKey 变化影响此菜单');

                    if (!this.isVisible || this.isHidden) {
                        console.log('❌ 菜单不可见，跳过刷新');
                        return;
                    }

                    // 使用微任务延迟执行，避免同步执行导致的事件风暴
                    this.refreshScheduled = true;
                    Promise.resolve().then(() => {
                        if (this.disposed) return;
                        this.refreshScheduled = false;
                        console.log('🔄 执行延迟的菜单刷新');
                        this.refreshVisibility();
                    });
                })
            );
        }

        // 监听命令处理器的变化事件（enablement 和 visibility 都由插件系统通过 ContextKey 自动处理）
        this.collectCommandHandlerEvents(this.menu);
    }

    protected collectWhenConditions(menu: MenuNode, contextKeys: Set<string>): void {
        // 收集菜单项的 when 条件
        if (menu.when) {
            const keys = this.services.contextKeyService.parseKeys(menu.when);
            if (keys) {
                keys.forEach(key => contextKeys.add(key));
            }
        }

        if (CompoundMenuNode.is(menu)) {
            menu.children.forEach(child => {
                this.collectWhenConditions(child, contextKeys);
            });
        }
    }

    protected collectCommandHandlerEvents(menu: MenuNode): void {
        if (CompoundMenuNode.is(menu)) {
            menu.children.forEach(child => {
                this.collectCommandHandlerEvents(child);
            });
        } else if (menu.command) {
            // 监听命令处理器的变化事件
            const handlers = this.services.commandRegistry.getAllHandlers(menu.command);
            handlers.forEach(handler => {
                if (handler.onDidChangeEnabled) {
                    this.visibilityListeners.push(
                        handler.onDidChangeEnabled(() => {
                            if (this.isVisible && !this.isHidden) {
                                this.refreshVisibility();
                            }
                        })
                    );
                }
                if (handler.onDidChangeVisible) {
                    this.visibilityListeners.push(
                        handler.onDidChangeVisible(() => {
                            if (this.isVisible && !this.isHidden) {
                                this.refreshVisibility();
                            }
                        })
                    );
                }
            });
        }
    }

    protected refreshVisibility(): void {
        console.log('🔄 refreshVisibility 被调用');
        console.log('📊 菜单状态检查: isVisible =', this.isVisible, ', isHidden =', this.isHidden);

        // 检查菜单是否已被销毁 - disposed 是一个 Signal 对象，需要检查 isDisposed
        const isDisposed = this.isDisposed;
        console.log('📊 销毁状态检查: isDisposed =', isDisposed);

        if (isDisposed) {
            console.log('❌ 菜单已被销毁，跳过更新');
            return;
        }

        // 检查菜单是否还在显示
        if (!this.isVisible || this.isHidden) {
            console.log('❌ 菜单已隐藏，跳过更新');
            return;
        }

        console.log('✅ 菜单仍然可见，执行增量更新');

        try {
            // 优化：只更新受影响的菜单项，而不是清空重建整个菜单
            this.updateVisibleItems();
            console.log('✅ 菜单更新完成');
        } catch (error) {
            console.error('❌ 菜单更新失败:', error);
        }
    }

    private isUpdating = false;

    protected updateVisibleItems(): void {
        console.log('🔄 updateVisibleItems 开始执行');

        // 防止在更新过程中重复调用
        if (this.isUpdating) {
            console.log('⚠️ 已在更新中，跳过此次调用');
            return;
        }

        this.isUpdating = true;
        this.preventAutoClose = true; // 阻止自动关闭

        try {
            // 获取当前菜单项
            const currentItems = this.items.slice(); // 创建副本避免修改过程中数组变化
            console.log('📋 当前菜单项数量:', currentItems.length);

            this.runWithPreservedFocusContext(() => {
                // 强制刷新命令状态，确保ContextKey变化被正确反映
                console.log('🔄 刷新命令快照...');
                this.options.commands.snapshot(this.options.rootMenuPath);

                console.log('🔄 开始处理菜单项可见性变化...');

                // 检查每个菜单项的可见性变化
                for (let i = currentItems.length - 1; i >= 0; i--) {
                    const item = currentItems[i];
                    if (item.type === 'command') {
                        const commandId = item.command;
                        const isCommandVisible = this.options.commands.isVisible(commandId);

                        // 需要找到对应的菜单节点来检查when条件
                        const menuNode = this.findMenuNodeByCommand(this.menu, commandId);
                        const whenConditionMatches = menuNode ?
                            this.undefinedOrMatch(this.options.contextKeyService ?? this.services.contextKeyService, menuNode.when, this.options.context) :
                            true;

                        const shouldBeVisible = isCommandVisible && whenConditionMatches;
                        const isInMenu = this.items.includes(item);

                        console.log(`🔍 检查命令 ${commandId}: 命令可见=${isCommandVisible}, when条件=${whenConditionMatches}, 最终应该可见=${shouldBeVisible}, 当前在菜单中=${isInMenu}`);

                        // 如果当前项应该隐藏但还在菜单中，移除它
                        if (!shouldBeVisible && isInMenu) {
                            console.log(`➖ 隐藏菜单项: ${commandId}`);
                            this.removeItem(item);
                        }
                    }
                }

                // 检查是否有新项需要添加
                console.log('🔄 检查需要添加的新菜单项...');
                this.addNewVisibleItems();
                console.log('✅ updateVisibleItems 执行完成');

                // 强制更新菜单布局
                console.log('🔄 更新菜单布局');
                this.update();
            });

        } catch (error) {
            console.error('❌ updateVisibleItems 执行出错:', error);
        } finally {
            this.isUpdating = false;
            this.preventAutoClose = false; // 恢复自动关闭
        }
    }

    protected addNewVisibleItems(): void {
        // 构建应该存在的所有项
        console.log('🔍 重新构建菜单项...');
        const expectedItems = this.buildSubMenus([], this.menu, this.options.commands);
        console.log(`📋 期望的菜单项数量: ${expectedItems.length}`);

        const currentCommands = new Set(
            this.items
                .filter(item => item.type === 'command')
                .map(item => item.command)
        );
        console.log(`🔍 当前菜单中的命令: [${Array.from(currentCommands).join(', ')}]`);

        // 按正确顺序添加新的可见项
        expectedItems.forEach((expectedItem, index) => {
            if (expectedItem.type === 'command' && expectedItem.command) {
                const commandId = expectedItem.command;
                const shouldBeVisible = this.options.commands.isVisible(commandId);
                const isAlreadyInMenu = currentCommands.has(commandId);

                console.log(`🔍 期望菜单项 ${commandId}: 应该可见=${shouldBeVisible}, 已在菜单中=${isAlreadyInMenu}`);

                if (shouldBeVisible && !isAlreadyInMenu) {
                    console.log(`➕ 添加菜单项: ${commandId} 在位置 ${index}`);

                    // 找到正确的插入位置
                    const insertIndex = this.findInsertIndex(expectedItems, index);
                    console.log(`📍 计算插入位置: ${insertIndex}`);
                    this.insertItem(insertIndex, expectedItem);

                    // 更新当前命令集合
                    currentCommands.add(commandId);
                }
            }
        });

        console.log(`✅ 菜单项添加完成，当前总数: ${this.items.length}`);
    }

    protected findInsertIndex(expectedItems: any[], targetIndex: number): number {
        // 计算在当前菜单中应该插入的位置
        let insertIndex = 0;
        for (let i = 0; i < targetIndex; i++) {
            const item = expectedItems[i];
            if (item.type === 'command') {
                const exists = this.items.some(currentItem =>
                    currentItem.type === 'command' && currentItem.command === item.command
                );
                if (exists) {
                    insertIndex++;
                }
            } else if (item.type === 'separator') {
                insertIndex++;
            }
        }
        return insertIndex;
    }

    protected findMenuNodeByCommand(menu: CompoundMenuNode, commandId: string): MenuNode | undefined {
        // CompoundMenuNode 本身不会有 command，检查其子节点
        if (menu.children) {
            for (const child of menu.children) {
                // 检查当前子节点是否是命令节点
                if (child.command === commandId) {
                    return child;
                }
                // 如果子节点是复合节点，递归搜索
                if (CompoundMenuNode.is(child)) {
                    const found = this.findMenuNodeByCommand(child, commandId);
                    if (found) {
                        return found;
                    }
                }
            }
        }

        return undefined;
    }

    override dispose(): void {
        this.visibilityListeners.dispose();
        super.dispose();
    }

}

@injectable()
export class BrowserMenuBarContribution implements FrontendApplicationContribution {

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    constructor(
        @inject(BrowserMainMenuFactory) protected readonly factory: BrowserMainMenuFactory
    ) { }

    onStart(app: FrontendApplication): void {
        this.appendMenu(app.shell);
    }

    get menuBar(): MenuBarWidget | undefined {
        return this.shell.topPanel.widgets.find(w => w instanceof MenuBarWidget) as MenuBarWidget | undefined;
    }

    protected appendMenu(shell: ApplicationShell): void {
        const logo = this.createLogo();
        shell.addWidget(logo, { area: 'top' });
        const menu = this.factory.createMenuBar();
        shell.addWidget(menu, { area: 'top' });
        // Hiding the menu is only necessary in electron
        // In the browser we hide the whole top panel
        if (environment.electron.is()) {
            this.preferenceService.ready.then(() => {
                menu.setHidden(['compact', 'hidden'].includes(this.preferenceService.get('window.menuBarVisibility', '')));
            });
            this.preferenceService.onPreferenceChanged(change => {
                if (change.preferenceName === 'window.menuBarVisibility') {
                    menu.setHidden(['compact', 'hidden'].includes(change.newValue));
                }
            });
        }
    }

    protected createLogo(): Widget {
        const logo = new Widget();
        logo.id = 'theia:icon';
        logo.addClass('theia-icon');
        return logo;
    }
}

/**
 * Stores Theia-specific action menu nodes instead of PhosphorJS commands with their handlers.
 */
export class MenuCommandRegistry extends PhosphorCommandRegistry {

    protected actions = new Map<string, [MenuNode & CommandMenuNode, unknown[]]>();
    protected toDispose = new DisposableCollection();

    constructor(protected services: MenuServices) {
        super();
    }

    registerActionMenu(menu: MenuNode & CommandMenuNode, args: unknown[]): void {
        const { commandRegistry } = this.services;
        const command = commandRegistry.getCommand(menu.command);
        if (!command) {
            return;
        }
        const { id } = command;
        if (this.actions.has(id)) {
            return;
        }
        this.actions.set(id, [menu, args]);
    }

    snapshot(menuPath: MenuPath): this {
        this.toDispose.dispose();
        for (const [menu, args] of this.actions.values()) {
            this.toDispose.push(this.registerCommand(menu, args, menuPath));
        }
        return this;
    }

    protected registerCommand(menu: MenuNode & CommandMenuNode, args: unknown[], menuPath: MenuPath): Disposable {
        const { commandRegistry, keybindingRegistry, commandExecutor } = this.services;
        const command = commandRegistry.getCommand(menu.command);
        if (!command) {
            return Disposable.NULL;
        }
        const { id } = command;
        if (this.hasCommand(id)) {
            // several menu items can be registered for the same command in different contexts
            return Disposable.NULL;
        }

        // We freeze the `isEnabled`, `isVisible`, and `isToggled` states so they won't change.
        const enabled = commandExecutor.isEnabled(menuPath, id, ...args);
        const visible = commandExecutor.isVisible(menuPath, id, ...args);
        const toggled = commandExecutor.isToggled(menuPath, id, ...args);
        const unregisterCommand = this.addCommand(id, {
            execute: () => commandExecutor.executeCommand(menuPath, id, ...args),
            label: menu.label,
            icon: menu.icon,
            isEnabled: () => enabled,
            isVisible: () => visible,
            isToggled: () => toggled
        });

        const bindings = keybindingRegistry.getKeybindingsForCommand(id);
        // Only consider the first active keybinding.
        if (bindings.length) {
            const binding = bindings.length > 1 ?
                bindings.find(b => !b.when || this.services.contextKeyService.match(b.when)) ?? bindings[0] :
                bindings[0];
            const keys = keybindingRegistry.acceleratorFor(binding, ' ', true);
            this.addKeyBinding({
                command: id,
                keys,
                selector: '.p-Widget' // We have the PhosphorJS dependency anyway.
            });
        }
        return Disposable.create(() => unregisterCommand.dispose());
    }

}

// import { MenuPath } from '@theia/core';
// import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
// // import {
// //   PluginDataRegistry,
// //   MenuPathMappings,
// //   PluginDataTypes
// // } from '@baosky/platform/lib/browser/plugin-data';
// import { ContributionPoint } from './vscode-theia-menu-mappings';
// import { SHELL_TABBAR_CONTEXT_MENU } from '@theia/core/lib/browser';
// import { DebugStackFramesWidget } from '@theia/debug/lib/browser/view/debug-stack-frames-widget';
// import { DebugThreadsWidget } from '@theia/debug/lib/browser/view/debug-threads-widget';
// import { DebugToolBar } from '@theia/debug/lib/browser/view/debug-toolbar-widget';
// import { DebugVariablesWidget } from '@theia/debug/lib/browser/view/debug-variables-widget';
// import { EDITOR_CONTEXT_MENU } from '@theia/editor/lib/browser';
// import { NAVIGATOR_CONTEXT_MENU } from '@theia/navigator/lib/browser/navigator-contribution';
// import { ScmTreeWidget } from '@theia/scm/lib/browser/scm-tree-widget';
// import { PLUGIN_SCM_CHANGE_TITLE_MENU } from '@theia/scm/lib/browser/dirty-diff/dirty-diff-widget';
// import { TIMELINE_ITEM_CONTEXT_MENU } from '@theia/timeline/lib/browser/timeline-tree-widget';
// import { COMMENT_CONTEXT, COMMENT_THREAD_CONTEXT, COMMENT_TITLE } from '../comments/comment-thread-widget';
// import { VIEW_ITEM_CONTEXT_MENU } from '../view/tree-view-widget';
// import { WEBVIEW_CONTEXT_MENU } from '../webview/webview';
// import { EDITOR_LINENUMBER_CONTEXT_MENU } from '@theia/editor/lib/browser/editor-linenumber-contribution';
// import { PLUGIN_TEST_VIEW_TITLE_MENU, TEST_VIEW_CONTEXT_MENU } from '@theia/test/lib/browser/view/test-view-contribution';
// import { TEST_RUNS_CONTEXT_MENU } from '@theia/test/lib/browser/view/test-run-view-contribution';
// import { TerminalMenus } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
// import {
//   PLUGIN_EDITOR_TITLE_MENU,
//   PLUGIN_EDITOR_TITLE_RUN_MENU,
//   PLUGIN_SCM_TITLE_MENU,
//   PLUGIN_VIEW_TITLE_MENU
// } from './vscode-theia-menu-mappings';

// /**
//  * 菜单映射注册中心
//  *
//  * 负责从 PluginDataRegistry 收集业务模块提供的菜单路径映射，
//  * 并与内置映射合并，提供统一的查询接口。
//  */
// @injectable()
// export class MenuMappingRegistry {
//   // @inject(PluginDataRegistry)
//   // protected readonly pluginDataRegistry: PluginDataRegistry;

//   /**
//    * VSCode contribution point 到 Theia menu path 的映射
//    */
//   private codeToTheiaMappings = new Map<ContributionPoint, MenuPath[]>();

//   /**
//    * MenuPath 到 name 的映射
//    */
//   private menuPathToNameMappings = new Map<string, string>();

//   /**
//    * 初始化标志
//    */
//   private initialized = false;

//   @postConstruct()
//   protected async init(): Promise<void> {
//     await this.initialize();
//   }

//   /**
//    * 初始化映射表
//    */
//   private async initialize(): Promise<void> {
//     if (this.initialized) {
//       return;
//     }

//     // 1. 先设置内置的映射（不依赖业务模块的核心映射）
//     this.setupBuiltinMappings();

//     // 2. 从 PluginDataRegistry 加载业务模块提供的映射
//     await this.loadContributedMappings();

//     this.initialized = true;
//   }

//   /**
//    * 设置内置的菜单映射（Theia 核心功能）
//    */
//   private setupBuiltinMappings(): void {
//     // Comments
//     this.codeToTheiaMappings.set('comments/comment/context', [COMMENT_CONTEXT]);
//     this.codeToTheiaMappings.set('comments/comment/title', [COMMENT_TITLE]);
//     this.codeToTheiaMappings.set('comments/commentThread/context', [COMMENT_THREAD_CONTEXT]);

//     // Debug
//     this.codeToTheiaMappings.set('debug/callstack/context', [
//       DebugStackFramesWidget.CONTEXT_MENU,
//       DebugThreadsWidget.CONTEXT_MENU
//     ]);
//     this.codeToTheiaMappings.set('debug/variables/context', [DebugVariablesWidget.CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('debug/toolBar', [DebugToolBar.MENU]);

//     // Editor
//     this.codeToTheiaMappings.set('editor/context', [EDITOR_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('editor/title', [PLUGIN_EDITOR_TITLE_MENU]);
//     this.codeToTheiaMappings.set('editor/title/context', [SHELL_TABBAR_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('editor/title/run', [PLUGIN_EDITOR_TITLE_RUN_MENU]);
//     this.codeToTheiaMappings.set('editor/lineNumber/context', [EDITOR_LINENUMBER_CONTEXT_MENU]);

//     // Explorer
//     this.codeToTheiaMappings.set('explorer/context', [NAVIGATOR_CONTEXT_MENU]);

//     // SCM
//     this.codeToTheiaMappings.set('scm/change/title', [PLUGIN_SCM_CHANGE_TITLE_MENU]);
//     this.codeToTheiaMappings.set('scm/resourceFolder/context', [ScmTreeWidget.RESOURCE_FOLDER_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('scm/resourceGroup/context', [ScmTreeWidget.RESOURCE_GROUP_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('scm/resourceState/context', [ScmTreeWidget.RESOURCE_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('scm/title', [PLUGIN_SCM_TITLE_MENU]);

//     // Testing
//     this.codeToTheiaMappings.set('testing/item/context', [TEST_VIEW_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('testing/message/context', [TEST_RUNS_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('testing/profiles/context', [PLUGIN_TEST_VIEW_TITLE_MENU]);

//     // Timeline
//     this.codeToTheiaMappings.set('timeline/item/context', [TIMELINE_ITEM_CONTEXT_MENU]);

//     // View
//     this.codeToTheiaMappings.set('view/item/context', [VIEW_ITEM_CONTEXT_MENU]);
//     this.codeToTheiaMappings.set('view/title', [PLUGIN_VIEW_TITLE_MENU]);

//     // Webview
//     this.codeToTheiaMappings.set('webview/context', [WEBVIEW_CONTEXT_MENU]);

//     // Extension
//     this.codeToTheiaMappings.set('extension/context', [['extensions_context_menu', '3_contribution']]);

//     // Terminal
//     this.codeToTheiaMappings.set('terminal/context', [TerminalMenus.TERMINAL_CONTRIBUTIONS]);
//     this.codeToTheiaMappings.set('terminal/title/context', [TerminalMenus.TERMINAL_TITLE_CONTRIBUTIONS]);

//     // MenuBar
//     this.codeToTheiaMappings.set('menuBar/plugin', [['menubar', '8_plugin']]);
//   }

//   /**
//    * 从 PluginDataRegistry 加载业务模块贡献的映射
//    *
//    * 使用按需查询：只加载 MENU_MAPPINGS 类型的数据
//    */
//   private async loadContributedMappings(): Promise<void> {
//     // 方式 1：按需加载特定类型的数据（推荐，性能更好）
//     await this.pluginDataRegistry.loadDataByType(PluginDataTypes.MENU_MAPPINGS);

//     // 获取菜单映射数据
//     const menuMappingsData = await this.pluginDataRegistry.getData<MenuPathMappings>(
//       PluginDataTypes.MENU_MAPPINGS
//     );

//     if (menuMappingsData) {
//       // 合并 contribution point 映射
//       if (menuMappingsData.contributionPointMappings) {
//         for (const [point, paths] of Object.entries(menuMappingsData.contributionPointMappings)) {
//           // 业务包提供的映射会覆盖内置映射（如果有重复）
//           this.codeToTheiaMappings.set(point as ContributionPoint, paths);
//         }
//       }

//       // 合并路径名称映射
//       if (menuMappingsData.pathNameMappings) {
//         for (const [path, name] of Object.entries(menuMappingsData.pathNameMappings)) {
//           this.menuPathToNameMappings.set(path, name);
//         }
//       }
//     }
//   }

//   /**
//    * 获取 VSCode contribution point 对应的 Theia menu paths
//    *
//    * @param contributionPoint VSCode contribution point
//    * @returns Theia menu paths，如果不存在则返回 undefined
//    */
//   getMenuPaths(contributionPoint: ContributionPoint): MenuPath[] | undefined {
//     return this.codeToTheiaMappings.get(contributionPoint);
//   }

//   /**
//    * 获取 menu path 对应的名称
//    *
//    * @param menuPath 菜单路径
//    * @returns 名称，如果不存在则返回 undefined
//    */
//   getMenuPathName(menuPath: string): string | undefined {
//     return this.menuPathToNameMappings.get(menuPath);
//   }

//   /**
//    * 获取所有映射
//    */
//   getAllMappings(): Map<ContributionPoint, MenuPath[]> {
//     return new Map(this.codeToTheiaMappings);
//   }

//   /**
//    * 检查是否支持某个 contribution point
//    */
//   hasMapping(contributionPoint: ContributionPoint): boolean {
//     return this.codeToTheiaMappings.has(contributionPoint);
//   }

//   /**
//    * 重新加载映射（用于动态更新场景）
//    */
//   async reload(): Promise<void> {
//     this.codeToTheiaMappings.clear();
//     this.menuPathToNameMappings.clear();
//     this.initialized = false;
//     await this.initialize();
//   }
// }

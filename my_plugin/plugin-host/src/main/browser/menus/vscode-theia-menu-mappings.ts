import { MenuPath } from '@theia/core';
import { SHELL_TABBAR_CONTEXT_MENU } from '@theia/core/lib/browser';
import { Navigatable } from '@theia/core/lib/browser/navigatable';
import { injectable } from '@theia/core/shared/inversify';
import { URI as CodeUri } from '@theia/core/shared/vscode-uri';
import { DebugStackFramesWidget } from '@theia/debug/lib/browser/view/debug-stack-frames-widget';
import { DebugThreadsWidget } from '@theia/debug/lib/browser/view/debug-threads-widget';
import { DebugToolBar } from '@theia/debug/lib/browser/view/debug-toolbar-widget';
import { DebugVariablesWidget } from '@theia/debug/lib/browser/view/debug-variables-widget';
import { EditorWidget, EDITOR_CONTEXT_MENU } from '@theia/editor/lib/browser';
import { NAVIGATOR_CONTEXT_MENU } from '@theia/navigator/lib/browser/navigator-contribution';
import { ScmTreeWidget } from '@theia/scm/lib/browser/scm-tree-widget';
import { PLUGIN_SCM_CHANGE_TITLE_MENU } from '@theia/scm/lib/browser/dirty-diff/dirty-diff-widget';
import { TIMELINE_ITEM_CONTEXT_MENU } from '@theia/timeline/lib/browser/timeline-tree-widget';
import { COMMENT_CONTEXT, COMMENT_THREAD_CONTEXT, COMMENT_TITLE } from '../comments/comment-thread-widget';
import { VIEW_ITEM_CONTEXT_MENU } from '../view/tree-view-widget';
import { WEBVIEW_CONTEXT_MENU, WebviewWidget } from '../webview/webview';
import { EDITOR_LINENUMBER_CONTEXT_MENU } from '@theia/editor/lib/browser/editor-linenumber-contribution';
import { PLUGIN_TEST_VIEW_TITLE_MENU, TEST_VIEW_CONTEXT_MENU } from '@theia/test/lib/browser/view/test-view-contribution';
import { TEST_RUNS_CONTEXT_MENU } from '@theia/test/lib/browser/view/test-run-view-contribution';
import { TerminalMenus } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { USER_MANUAL_MENU } from '@baosky/platform/lib/browser/go-to-help-service/usermanual-general-function-command'

export const PLUGIN_EDITOR_TITLE_MENU = ['plugin_editor/title'];
export const PLUGIN_EDITOR_TITLE_RUN_MENU = ['plugin_editor/title/run'];
export const PLUGIN_SCM_TITLE_MENU = ['plugin_scm/title'];
export const PLUGIN_VIEW_TITLE_MENU = ['plugin_view/title'];

export const implementedVSCodeContributionPoints = [
    'comments/comment/context',
    'comments/comment/title',
    'comments/commentThread/context',
    'debug/callstack/context',
    'debug/variables/context',
    'debug/toolBar',
    'editor/context',
    'editor/title',
    'editor/title/context',
    'editor/title/run',
    'editor/lineNumber/context',
    'explorer/context',
    'scm/change/title',
    'scm/resourceFolder/context',
    'scm/resourceGroup/context',
    'scm/resourceState/context',
    'scm/title',
    'timeline/item/context',
    'testing/item/context',
    'testing/message/context',
    'testing/profiles/context',
    'view/item/context',
    'view/title',
    'webview/context',
    'extension/context',
    'terminal/context',
    'terminal/title/context',

    'menuBar/plugin',

    'tree/pu/element',
    'tree/gvs/element',
    'tree/iomapping/element',
    'tree/udt/element',
    'tree/plc/element',
    'tree/task/element',
    'tree/software/element',
    'tree/gvs/folder',
    'tree/iomapping/folder',
    'tree/udt/folder',
    'tree/pu/folder',
    'tree/pu/category',
    'tree/gvs/category',
    'tree/iomapping/category',
    'tree/udt/category',
    'tree/plc/category',
    'tree/task/category',
    'tree/software/category',
    'tree/chart/element',
    'tree/chart/folder',
    'tree/chart/category',

    'table/head/context',
    'table/cell/context',
    'io-mapping/head/context',

    'pu/ld/segment',
    'pu/ld/singleNode',
    'pu/ld/boxNode',
    'pu/ld/connection',
    'pu/ld/bridge',
    'pu/ld/boxPin',
    'pu/ld/operand',
    'pu/ld/editor',
    'pu/ld/instanceName',
    'pu/ld/label',
    'pu/ld/st',
    'pu/st/body',
    'menubar/help/document'

] as const;

export type ContributionPoint = (typeof implementedVSCodeContributionPoints)[number];

/** The values are menu paths to which the VSCode contribution points correspond */
export const codeToTheiaMappings = new Map<ContributionPoint, MenuPath[]>([
    ['comments/comment/context', [COMMENT_CONTEXT]],
    ['comments/comment/title', [COMMENT_TITLE]],
    ['comments/commentThread/context', [COMMENT_THREAD_CONTEXT]],
    ['debug/callstack/context', [DebugStackFramesWidget.CONTEXT_MENU, DebugThreadsWidget.CONTEXT_MENU]],
    ['debug/variables/context', [DebugVariablesWidget.CONTEXT_MENU]],
    ['debug/toolBar', [DebugToolBar.MENU]],
    ['editor/context', [EDITOR_CONTEXT_MENU]],
    ['editor/title', [PLUGIN_EDITOR_TITLE_MENU]],
    ['editor/title/context', [SHELL_TABBAR_CONTEXT_MENU]],
    ['editor/title/run', [PLUGIN_EDITOR_TITLE_RUN_MENU]],
    ['editor/lineNumber/context', [EDITOR_LINENUMBER_CONTEXT_MENU]],
    ['explorer/context', [NAVIGATOR_CONTEXT_MENU]],
    ['scm/change/title', [PLUGIN_SCM_CHANGE_TITLE_MENU]],
    ['scm/resourceFolder/context', [ScmTreeWidget.RESOURCE_FOLDER_CONTEXT_MENU]],
    ['scm/resourceGroup/context', [ScmTreeWidget.RESOURCE_GROUP_CONTEXT_MENU]],
    ['scm/resourceState/context', [ScmTreeWidget.RESOURCE_CONTEXT_MENU]],
    ['scm/title', [PLUGIN_SCM_TITLE_MENU]],
    ['testing/item/context', [TEST_VIEW_CONTEXT_MENU]],
    ['testing/message/context', [TEST_RUNS_CONTEXT_MENU]],
    ['testing/profiles/context', [PLUGIN_TEST_VIEW_TITLE_MENU]],
    ['timeline/item/context', [TIMELINE_ITEM_CONTEXT_MENU]],
    ['view/item/context', [VIEW_ITEM_CONTEXT_MENU]],
    ['view/title', [PLUGIN_VIEW_TITLE_MENU]],
    ['webview/context', [WEBVIEW_CONTEXT_MENU]],
    ['extension/context', [['extensions_context_menu', '3_contribution']]],
    ['terminal/context', [TerminalMenus.TERMINAL_CONTRIBUTIONS]],
    ['terminal/title/context', [TerminalMenus.TERMINAL_TITLE_CONTRIBUTIONS]],

    ['menuBar/plugin', [['menubar', '8_plugin']]],

    ['tree/pu/element', [['programUnit-context-menu']]],
    ['tree/gvs/element', [['GVS-context-menu']]],
    ['tree/iomapping/element', [['io-mapping-context-menu']]],
    ['tree/udt/element', [['UDT-context-menu']]],
    ['tree/task/element', [['task-context-menu']]],

    ['tree/gvs/folder', [['gvs-subfolder']]],
    ['tree/iomapping/folder', [['io-mapping-subfolder']]],
    ['tree/udt/folder', [['gvs-subfolder']]],
    ['tree/pu/folder', [['program-unit-subfolder']]],

    ['tree/pu/category', [['program-unit-folder']]],
    ['tree/gvs/category', [['gvs-folder']]],
    ['tree/iomapping/category', [['io-mapping-folder-context-menu']]],
    ['tree/udt/category', [['UDT-folder']]],
    ['tree/plc/category', [['test-context-menu']]],
    ['tree/task/category', [['task-folder-context-menu']]],
    ['tree/software/category', [['software']]],

    ['tree/chart/category', [["chart-folder"]]],
    ['tree/chart/folder', [["chart-subfolder"]]],
    ['tree/chart/element', [["chart-file"]]],

    ['io-mapping/head/context', [['io-mapping-row-context-menu']]],

    ['pu/ld/segment', [['LD-context-menu-0-segment']]],
    ['pu/ld/singleNode', [['LD-context-menu-1-single-node']]],
    ['pu/ld/boxNode', [['LD-context-menu-2-box-node']]],
    ['pu/ld/connection', [['LD-context-menu-3-connection']]],
    ['pu/ld/bridge', [['LD-context-menu-4-bridge']]],
    ['pu/ld/boxPin', [['LD-context-menu-5-box-pin']]],
    ['pu/ld/operand', [['LD-context-menu-6-operand']]],
    ['pu/ld/editor', [['LD-context-menu-7-editor']]],
    ['pu/ld/instanceName', [['LD-context-menu-8-instance-name']]],
    ['pu/ld/label', [['LD-context-menu-9-lable']]],
    ['pu/ld/st', [['LD-context-menu-10-st-code']]],
    ['pu/st/body', [['editor_context_menu']]],

    ['table/head/context', [['text-table-menu']]],
    ['table/cell/context', [['text-table-cell-menu']]],

    ['menubar/help/document', [USER_MANUAL_MENU]]
]);

const treeNodeMenuPath = [
    'test-context-menu',
    'software',
    'gvs-folder',
    'gvs-subfolder',
    'GVS-context-menu',
    'program-unit-folder',
    'programUnit-context-menu',
    'program-unit-subfolder',
    'task-folder-context-menu',
    'task-context-menu',
    'UDT-folder',
    'UDT-subfolder',
    'UDT-context-menu',
    'io-mapping-folder-context-menu',
    'io-mapping-subfolder',
    'io-mapping-context-menu'
] as const;

export type menuPathContribution = (typeof treeNodeMenuPath)[number];

/**
 * menuPath to name 映射集
 */
export const menuPathMapping = new Map<menuPathContribution, string>(
    [
        ['test-context-menu', 'plc'],
        ['software', 'software'],
        ['gvs-folder', 'gvs_folder'],
        ['gvs-subfolder', 'gvs_subfolder'],
        ['GVS-context-menu', 'gvs'],
        ['program-unit-folder', 'pu_folder'],
        ['programUnit-context-menu', 'pu'], //
        ['program-unit-subfolder', 'pu_subfolder'],
        ['task-folder-context-menu', 'task_folder'],
        ['task-context-menu', 'task'],
        ['UDT-folder', 'udt_folder'],
        ['UDT-subfolder', 'udt_subfolder'],
        ['UDT-context-menu', 'udt'],
        ['io-mapping-folder-context-menu', 'iomapping_folder'],
        ['io-mapping-subfolder', 'iomapping_subfolder'],
        ['io-mapping-context-menu', 'iomapping']
    ]
)

type CodeEditorWidget = EditorWidget | WebviewWidget;
@injectable()
export class CodeEditorWidgetUtil {
    is(arg: unknown): arg is CodeEditorWidget {
        return arg instanceof EditorWidget || arg instanceof WebviewWidget;
    }
    getResourceUri(editor: CodeEditorWidget): CodeUri | undefined {
        const resourceUri = Navigatable.is(editor) && editor.getResourceUri();
        return resourceUri ? resourceUri['codeUri'] : undefined;
    }
}

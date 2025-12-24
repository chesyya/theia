/* eslint-disable @typescript-eslint/no-explicit-any */
/* tslint:disable:typedef */

import type * as baosky from '@baosky/plugin';
import { CommandRegistryImpl } from './command-registry';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { CancellationError, CancellationToken, CancellationTokenSource } from '@theia/core/lib/common/cancellation';
import { QuickOpenExtImpl } from './quick-open';
import {
    MAIN_RPC_CONTEXT,
    Plugin as InternalPlugin,
    PluginManager,
    PluginAPIFactory,
    MainMessageType,
    DebugConfigurationProviderTriggerKind,
    PLUGIN_RPC_CONTEXT
} from '../common/plugin-api-rpc';
import { RPCProtocol } from '../common/rpc-protocol';
import { MessageRegistryExt } from './message-registry';
import { StatusBarMessageRegistryExt } from './status-bar-message-registry';
import { WindowStateExtImpl } from './window-state';
import { WorkspaceExtImpl } from './workspace';
import { EnvExtImpl } from './env';
import { QueryParameters } from '../common/env';
import {
    ConfigurationTarget,
    Disposable,
    Position,
    Range,
    Selection,
    ViewColumn,
    TextEditorSelectionChangeKind,
    EndOfLine,
    SnippetString,
    ThemeColor,
    ThemeIcon,
    TextEditorRevealType,
    TextEditorLineNumbersStyle,
    DecorationRangeBehavior,
    OverviewRulerLane,
    StatusBarAlignment,
    RelativePattern,
    IndentAction,
    SyntaxTokenType,
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    TextEdit,
    SnippetTextEdit,
    CompletionTriggerKind,
    Diagnostic,
    DiagnosticRelatedInformation,
    DebugConsoleMode,
    DiagnosticSeverity,
    DiagnosticTag,
    CompletionItemTag,
    Location,
    LogLevel,
    Progress,
    ProgressOptions,
    ProgressLocation,
    ParameterInformation,
    SignatureInformation,
    SignatureHelp,
    SignatureHelpTriggerKind,
    Hover,
    EvaluatableExpression,
    InlineValueEvaluatableExpression,
    InlineValueText,
    InlineValueVariableLookup,
    InlineValueContext,
    DocumentHighlightKind,
    DocumentHighlight,
    MultiDocumentHighlight,
    DocumentLink,
    DocumentDropEdit,
    CodeLens,
    CodeActionKind,
    CodeActionTrigger,
    CodeActionTriggerKind,
    TextDocumentSaveReason,
    CodeAction,
    DataTransferItem,
    DataTransfer,
    TreeItem,
    TreeItemCollapsibleState,
    TreeItemCheckboxState,
    DocumentSymbol,
    SymbolTag,
    WorkspaceEdit,
    SymbolInformation,
    FileType,
    FileChangeType,
    ShellQuoting,
    ShellExecution,
    ProcessExecution,
    CustomExecution,
    TaskScope,
    TaskPanelKind,
    TaskRevealKind,
    TaskGroup,
    Task,
    Task2,
    DebugAdapterExecutable,
    DebugAdapterServer,
    DebugAdapterNamedPipeServer,
    DebugAdapterInlineImplementation,
    Breakpoint,
    SourceBreakpoint,
    FunctionBreakpoint,
    DebugStackFrame,
    DebugThread,
    FoldingRange,
    FoldingRangeKind,
    SelectionRange,
    Color,
    ColorInformation,
    ColorPresentation,
    OperatingSystem,
    WebviewPanelTargetArea,
    UIKind,
    FileSystemError,
    CommentThreadState,
    CommentThreadCollapsibleState,
    QuickInputButtons,
    QuickPickItemKind,
    CommentMode,
    CallHierarchyItem,
    CallHierarchyIncomingCall,
    CallHierarchyOutgoingCall,
    TypeHierarchyItem,
    TimelineItem,
    EnvironmentVariableMutatorType,
    SemanticTokensLegend,
    SemanticTokensBuilder,
    SemanticTokens,
    SemanticTokensEdits,
    SemanticTokensEdit,
    ColorThemeKind,
    SourceControlInputBoxValidationType,
    URI,
    FileDecoration,
    ExtensionMode,
    LinkedEditingRanges,
    LanguageStatusSeverity,
    TextDocumentChangeReason,
    InputBoxValidationSeverity,
    TerminalLink,
    TerminalLocation,
    TerminalExitReason,
    TerminalProfile,
    InlayHint,
    InlayHintKind,
    InlayHintLabelPart,
    TelemetryTrustedValue,
    NotebookCellKind,
    NotebookCellExecutionState,
    NotebookCellStatusBarAlignment,
    NotebookEditorRevealType,
    NotebookControllerAffinity,
    NotebookCellData,
    NotebookCellOutput,
    NotebookCellOutputItem,
    NotebookData,
    NotebookRange,
    NotebookCellStatusBarItem,
    NotebookEdit,
    NotebookKernelSourceAction,
    NotebookRendererScript,
    TestRunProfileKind,
    TestTag,
    TestRunRequest,
    TestMessage,
    TestMessageStackFrame,
    ExtensionKind,
    InlineCompletionItem,
    InlineCompletionList,
    InlineCompletionTriggerKind,
    TextTabInput,
    CustomEditorTabInput,
    NotebookDiffEditorTabInput,
    NotebookEditorTabInput,
    TerminalEditorTabInput,
    TextDiffTabInput,
    TextMergeTabInput,
    WebviewEditorTabInput,
    DocumentPasteEdit,
    DocumentPasteEditKind,
    DocumentPasteTriggerKind,
    DocumentDropOrPasteEditKind,
    ExternalUriOpenerPriority,
    EditSessionIdentityMatch,
    TerminalOutputAnchor,
    TerminalQuickFixTerminalCommand,
    TerminalQuickFixOpener,
    TestResultState,
    BranchCoverage,
    DeclarationCoverage,
    FileCoverage,
    StatementCoverage,
    TestCoverageCount,
    ChatRequestTurn,
    ChatResponseTurn,
    ChatResponseAnchorPart,
    ChatResponseCommandButtonPart,
    ChatResponseFileTreePart,
    ChatResponseMarkdownPart,
    ChatResponseProgressPart,
    ChatResponseReferencePart,
    ChatResultFeedbackKind,
    LanguageModelChatMessage,
    LanguageModelChatMessageRole,
    LanguageModelChatToolMode,
    LanguageModelError,
    LanguageModelPromptTsxPart,
    LanguageModelTextPart,
    LanguageModelToolCallPart,
    LanguageModelToolResult,
    LanguageModelToolResultPart,
    PortAutoForwardAction,
    PortAttributes,
    DebugVisualization,
    TerminalShellExecutionCommandLineConfidence
} from './types-impl';
import { AuthenticationExtImpl } from './authentication-ext';
import { SymbolKind } from '../common/plugin-api-rpc-model';
import { EditorsAndDocumentsExtImpl } from './editors-and-documents';
import { TextEditorsExtImpl } from './text-editors';
import { DocumentsExtImpl } from './documents';
import { TextEditorCursorStyle } from '../common/editor-options';
import { PreferenceRegistryExtImpl } from './preference-registry';
import { OutputChannelRegistryExtImpl } from './output-channel-registry';
import { TerminalServiceExtImpl, TerminalExtImpl } from './terminal-ext';
import { LanguagesExtImpl } from './languages';
import { fromDocumentSelector, pluginToPluginInfo, fromGlobPattern } from './type-converters';
import { DialogsExtImpl } from './dialogs';
import { NotificationExtImpl } from './notification';
import { score } from '@theia/editor/lib/common/language-selector';
import { MarkdownString } from './markdown-string';
import { TreeViewsExtImpl } from './tree/tree-views';
import { ConnectionImpl } from '../common/connection';
import { TasksExtImpl } from './tasks/tasks';
import { DebugExtImpl } from './debug/debug-ext';
import { FileSystemExtImpl } from './file-system-ext-impl';
import { ScmExtImpl } from './scm';
import { DecorationsExtImpl } from './decorations';
import { TextEditorExt } from './text-editor';
import { ClipboardExt } from './clipboard-ext';
import { WebviewsExtImpl } from './webviews';
import { ExtHostFileSystemEventService } from './file-system-event-service-ext-impl';
import { LabelServiceExtImpl } from '../plugin/label-service';
import { TimelineExtImpl } from './timeline';
import { ThemingExtImpl } from './theming';
import { CommentsExtImpl } from './comments';
import { CustomEditorsExtImpl } from './custom-editors';
import { WebviewViewsExtImpl } from './webview-views';
import { PluginPackage } from '../common';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import { FilePermission } from '@theia/filesystem/lib/common/files';
import { TabsExtImpl } from './tabs';
import { LocalizationExtImpl } from './localization-ext';
import { NotebooksExtImpl } from './notebook/notebooks';
import { TelemetryExtImpl } from './telemetry-ext';
import { NotebookDocument } from './notebook/notebook-document';
import { NotebookRenderersExtImpl } from './notebook/notebook-renderers';
import { NotebookKernelsExtImpl } from './notebook/notebook-kernels';
import { NotebookDocumentsExtImpl } from './notebook/notebook-documents';
import { NotebookEditorsExtImpl } from './notebook/notebook-editors';
import { TestingExtImpl } from './tests';
import { UriExtImpl } from './uri-ext';
import { isObject } from '@theia/core';
import { ProjectRegistryExt } from './project/project-registry';
import { PluginEvent as eventId, SystemEventExtImpl } from './events/system-event';
import { PluginTreeNodeExtImpl } from './plugin-tree-node/plugin-tree-node-ext';
import { PlatformMessageServiceExtImpl } from './platform/message-service/message-service-ext';
import { InfoLevel } from '@baosky/platform/lib/common/info-view/info-level';
import { EditorRegistryExtImpl } from './platform/editor-registry/editor-registry-ext';
import { UserServiceExtImpl } from './project/user-service-ext';
import { PlatformServiceExtImpl } from './platform/platform-service/platform-service-ext';
import { PluginRegistryExtImpl } from './plugin-registry/plugin-registry-ext';
import { ModuleOperation } from '../common/file-system/module-permission-service';
import { LibraryExtImpl } from './plc/library-ext';
import { PlcExtImpl } from './plc/plc-ext';
import { LicenseableResource } from '@baosky/platform/lib/common/license/license-data-struct';
import { LicenseExtImpl } from './authorization/license-ext';
import { VersionServiceExtImpl } from './version-service/version-service-ext';
import { ProductType } from '@baosky/platform/lib/common/es-version-protocol';
import { LanguageStatusExtImpl } from './language-status/language-status-ext';

export function createAPIObject<T extends Object>(rawObject: T): T {
    return new Proxy(rawObject, {
        get(target, p, receiver) {
            const isOwnProperty = !!Object.getOwnPropertyDescriptor(target, p);
            const val = Reflect.get(target, p);
            if (!isOwnProperty && typeof val === 'function') {
                // bind functions that are inherited from the prototype to the object itself.
                // This should handle the case of events.
                return val.bind(target);
            }
            return val;
        },
    }) as T;
}

export function createAPIFactory(
    rpc: RPCProtocol,
    pluginManager: PluginManager,
    envExt: EnvExtImpl,
    debugExt: DebugExtImpl,
    preferenceRegistryExt: PreferenceRegistryExtImpl,
    editorsAndDocumentsExt: EditorsAndDocumentsExtImpl,
    workspaceExt: WorkspaceExtImpl,
    messageRegistryExt: MessageRegistryExt,
    projectRegistryExt: ProjectRegistryExt,
    clipboard: ClipboardExt,
    webviewExt: WebviewsExtImpl,
    localizationExt: LocalizationExtImpl
): PluginAPIFactory {

    const authenticationExt = rpc.set(MAIN_RPC_CONTEXT.AUTHENTICATION_EXT, new AuthenticationExtImpl(rpc));
    const commandRegistry = rpc.set(MAIN_RPC_CONTEXT.COMMAND_REGISTRY_EXT, new CommandRegistryImpl(rpc, pluginManager));
    const quickOpenExt = rpc.set(MAIN_RPC_CONTEXT.QUICK_OPEN_EXT, new QuickOpenExtImpl(rpc));
    const dialogsExt = new DialogsExtImpl(rpc);
    const windowStateExt = rpc.set(MAIN_RPC_CONTEXT.WINDOW_STATE_EXT, new WindowStateExtImpl(rpc));
    const notificationExt = rpc.set(MAIN_RPC_CONTEXT.NOTIFICATION_EXT, new NotificationExtImpl(rpc));
    const editors = rpc.set(MAIN_RPC_CONTEXT.TEXT_EDITORS_EXT, new TextEditorsExtImpl(rpc, editorsAndDocumentsExt));
    const documents = rpc.set(MAIN_RPC_CONTEXT.DOCUMENTS_EXT, new DocumentsExtImpl(rpc, editorsAndDocumentsExt));
    const notebooksExt = rpc.set(MAIN_RPC_CONTEXT.NOTEBOOKS_EXT, new NotebooksExtImpl(rpc, commandRegistry, editorsAndDocumentsExt, documents));
    const notebookEditors = rpc.set(MAIN_RPC_CONTEXT.NOTEBOOK_EDITORS_EXT, new NotebookEditorsExtImpl(notebooksExt));
    const notebookRenderers = rpc.set(MAIN_RPC_CONTEXT.NOTEBOOK_RENDERERS_EXT, new NotebookRenderersExtImpl(rpc, notebooksExt));
    const notebookKernels = rpc.set(MAIN_RPC_CONTEXT.NOTEBOOK_KERNELS_EXT, new NotebookKernelsExtImpl(rpc, notebooksExt, commandRegistry, webviewExt, workspaceExt));
    const notebookDocuments = rpc.set(MAIN_RPC_CONTEXT.NOTEBOOK_DOCUMENTS_EXT, new NotebookDocumentsExtImpl(notebooksExt));
    const statusBarMessageRegistryExt = new StatusBarMessageRegistryExt(rpc);
    const terminalExt = rpc.set(MAIN_RPC_CONTEXT.TERMINAL_EXT, new TerminalServiceExtImpl(rpc));
    const outputChannelRegistryExt = rpc.set(MAIN_RPC_CONTEXT.OUTPUT_CHANNEL_REGISTRY_EXT, new OutputChannelRegistryExtImpl(rpc));
    const treeViewsExt = rpc.set(MAIN_RPC_CONTEXT.TREE_VIEWS_EXT, new TreeViewsExtImpl(rpc, commandRegistry));
    const tasksExt = rpc.set(MAIN_RPC_CONTEXT.TASKS_EXT, new TasksExtImpl(rpc, terminalExt));
    const connectionExt = rpc.set(MAIN_RPC_CONTEXT.CONNECTION_EXT, new ConnectionImpl(rpc.getProxy(PLUGIN_RPC_CONTEXT.CONNECTION_MAIN)));
    const fileSystemExt = rpc.set(MAIN_RPC_CONTEXT.FILE_SYSTEM_EXT, new FileSystemExtImpl(rpc));
    const languagesExt = rpc.set(MAIN_RPC_CONTEXT.LANGUAGES_EXT, new LanguagesExtImpl(rpc, documents, commandRegistry, fileSystemExt));
    const extHostFileSystemEvent = rpc.set(MAIN_RPC_CONTEXT.ExtHostFileSystemEventService, new ExtHostFileSystemEventService(rpc, editorsAndDocumentsExt));
    const scmExt = rpc.set(MAIN_RPC_CONTEXT.SCM_EXT, new ScmExtImpl(rpc, commandRegistry));
    const decorationsExt = rpc.set(MAIN_RPC_CONTEXT.DECORATIONS_EXT, new DecorationsExtImpl(rpc));
    const labelServiceExt = rpc.set(MAIN_RPC_CONTEXT.LABEL_SERVICE_EXT, new LabelServiceExtImpl(rpc));
    const timelineExt = rpc.set(MAIN_RPC_CONTEXT.TIMELINE_EXT, new TimelineExtImpl(rpc, commandRegistry));
    const themingExt = rpc.set(MAIN_RPC_CONTEXT.THEMING_EXT, new ThemingExtImpl(rpc));
    const commentsExt = rpc.set(MAIN_RPC_CONTEXT.COMMENTS_EXT, new CommentsExtImpl(rpc, commandRegistry, documents));
    const tabsExt = rpc.set(MAIN_RPC_CONTEXT.TABS_EXT, new TabsExtImpl(rpc));
    const customEditorExt = rpc.set(MAIN_RPC_CONTEXT.CUSTOM_EDITORS_EXT, new CustomEditorsExtImpl(rpc, documents, webviewExt));
    const webviewViewsExt = rpc.set(MAIN_RPC_CONTEXT.WEBVIEW_VIEWS_EXT, new WebviewViewsExtImpl(rpc, webviewExt));
    const telemetryExt = rpc.set(MAIN_RPC_CONTEXT.TELEMETRY_EXT, new TelemetryExtImpl());
    const testingExt = rpc.set(MAIN_RPC_CONTEXT.TESTING_EXT, new TestingExtImpl(rpc, commandRegistry));
    const uriExt = rpc.set(MAIN_RPC_CONTEXT.URI_EXT, new UriExtImpl(rpc));
    rpc.set(MAIN_RPC_CONTEXT.DEBUG_EXT, debugExt);
    const systemEventExt = rpc.set(MAIN_RPC_CONTEXT.SYSTEMEVENT_EXT, new SystemEventExtImpl(rpc));
    const pluginTreeNodeExt = new PluginTreeNodeExtImpl(rpc);
    rpc.set(MAIN_RPC_CONTEXT.PLUGIN_TREE_NODE_EXT, pluginTreeNodeExt);
    const platformMessageServiceExt = new PlatformMessageServiceExtImpl(rpc);
    const editorRegistryExtImpl = new EditorRegistryExtImpl(rpc);
    const userServiceExt = new UserServiceExtImpl(rpc);
    const platformServiceExt = new PlatformServiceExtImpl(rpc);
    const pluginRegistry = new PluginRegistryExtImpl(rpc);
    const modulePermissionService = rpc.getProxy(PLUGIN_RPC_CONTEXT.MODULE_PERMISSION_MAIN);
    const libraryExt = new LibraryExtImpl(rpc);
    const plcExt = new PlcExtImpl(rpc);
    const licenseExt = new LicenseExtImpl(rpc);
    const versionServiceExt = new VersionServiceExtImpl(rpc);
    const languageStatusExt = new LanguageStatusExtImpl(rpc);


    return function (plugin: InternalPlugin): typeof baosky {
        commandRegistry.setPluginId(plugin.model.id);
        const authentication: typeof baosky.authentication = {
            registerAuthenticationProvider(id: string, label: string, provider: baosky.AuthenticationProvider, options?: baosky.AuthenticationProviderOptions): baosky.Disposable {
                return authenticationExt.registerAuthenticationProvider(id, label, provider, options);
            },
            getSession(providerId: string, scopes: string[], options: baosky.AuthenticationGetSessionOptions) {
                return authenticationExt.getSession(plugin, providerId, scopes, options as any);
            },
            get onDidChangeSessions(): baosky.Event<baosky.AuthenticationSessionsChangeEvent> {
                return authenticationExt.onDidChangeSessions;
            },
            getAccounts(providerId: string): Thenable<readonly baosky.AuthenticationSessionAccountInformation[]> {
                return authenticationExt.getAccounts(providerId);
            }
        };
        function commandIsDeclaredInPackage(id: string, model: PluginPackage): boolean {
            const rawCommands = model.contributes?.commands;
            if (!rawCommands) { return false; }
            return Array.isArray(rawCommands) ? rawCommands.some(candidate => candidate.command === id) : rawCommands.command === id;
        }
        const commands: typeof baosky.commands = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            registerCommand(command: baosky.CommandDescription | string, handler?: <T>(...args: any[]) => T | Thenable<T | undefined>, thisArg?: any): Disposable {
                // use of the ID when registering commands
                if (typeof command === 'string') {
                    if (handler && commandIsDeclaredInPackage(command, plugin.rawModel)) {
                        return commandRegistry.registerHandler(command, handler, thisArg) as any;
                    }
                    return commandRegistry.registerCommand({ id: command }, handler, thisArg) as any;
                }
                return commandRegistry.registerCommand(command, handler, thisArg) as any;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            executeCommand<T>(commandId: string, ...args: any[]): PromiseLike<T | undefined> {
                return commandRegistry.executeCommand<T>(commandId, ...args);
            },
            registerTextEditorCommand(command: string, handler: (textEditor: baosky.TextEditor, edit: baosky.TextEditorEdit, ...arg: any[]) => void, thisArg?: any): Disposable {
                const internalHandler = (...args: any[]): any => {
                    const activeTextEditor = editors.getActiveEditor();
                    if (!activeTextEditor) {
                        console.warn('Cannot execute ' + command + ' because there is no active text editor.');
                        return undefined;
                    }

                    return activeTextEditor.edit((edit: baosky.TextEditorEdit) => {
                        args.unshift(activeTextEditor, edit);
                        handler.apply(thisArg, args);
                    }).then(result => {
                        if (!result) {
                            console.warn('Edits from command ' + command + ' were not applied.');
                        }
                    }, err => {
                        console.warn('An error occurred while running command ' + command, err);
                    });
                };
                return commandIsDeclaredInPackage(command, plugin.rawModel)
                    ? commandRegistry.registerHandler(command, internalHandler) as any
                    : commandRegistry.registerCommand({ id: command }, internalHandler) as any;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            registerHandler(commandId: string, handler: (...args: any[]) => any, thisArg?: any): Disposable {
                return commandRegistry.registerHandler(commandId, handler, thisArg) as any;
            },
            getKeyBindingForCommand(commandId: string): PromiseLike<baosky.CommandKeyBinding[] | undefined> {
                return commandRegistry.getKeyBindingForCommand(commandId);
            },
            getKeyBindingForKeybinding(keyBinding: string): PromiseLike<baosky.CommandKeyBinding[] | undefined> {
                return commandRegistry.getKeyBindingForKeybinding(keyBinding);
            },
            editKeybinding(keyBinding: baosky.CommandKeyBinding): PromiseLike<boolean> {
                return commandRegistry.editKeybinding(keyBinding);
            },
            getCommands(filterInternal: boolean = false): PromiseLike<string[]> {
                return commandRegistry.getCommands(filterInternal);
            },
            registerDiffInformationCommand(command: string, callback: (diff: baosky.LineChange[], ...args: any[]) => any, thisArg?: any): Disposable {
                // Dummy implementation.
                return new Disposable(() => { });
            }
        };

        const { onDidChangeActiveTerminal, onDidChangeTerminalState, onDidCloseTerminal, onDidOpenTerminal } = terminalExt;
        const showInformationMessage = messageRegistryExt.showMessage.bind(messageRegistryExt, MainMessageType.Info);
        const showWarningMessage = messageRegistryExt.showMessage.bind(messageRegistryExt, MainMessageType.Warning);
        const showErrorMessage = messageRegistryExt.showMessage.bind(messageRegistryExt, MainMessageType.Error);

        const getCurrent = projectRegistryExt.getCurrentProject.bind(projectRegistryExt);
        // const addTreeNode = pluginTreeNodeExt.addTreeNode.bind(pluginTreeNodeExt);
        const doRefactor = projectRegistryExt.doRefactor.bind(projectRegistryExt);
        const getUserInfo = userServiceExt.getUserInfo.bind(userServiceExt);
        const isAdminUser = userServiceExt.isAdminUser.bind(userServiceExt);
        const focusNode = projectRegistryExt.focusNode.bind(projectRegistryExt);
        const saveProject = projectRegistryExt.saveProject.bind(projectRegistryExt);
        const countNode = projectRegistryExt.countNode.bind(projectRegistryExt);
        const projects = {
            getCurrent,
            registerTreeNodeProvider(provider: baosky.projects.TreeNodeProvider): baosky.projects.TreeNodeController {
                return createAPIObject(pluginTreeNodeExt.registerTreeNodeProvider(provider, plugin));
            },
            // async removeTreeNodeProvider(provider: baosky.projects.TreeNodeProvider) {
            //     return createAPIObject(pluginTreeNodeExt.removeTreeNodeProvider(provider, plugin));
            // }
            doRefactor,
            isAdminUser,
            focusNode,
            saveProject,
            countNode
        }
        const sendRoutineInfo = platformMessageServiceExt.sendRoutineInfo.bind(platformMessageServiceExt);
        const registerToolbar = editorRegistryExtImpl.registerToolbar.bind(editorRegistryExtImpl);
        const gotoService = platformServiceExt.gotoService.bind(platformServiceExt);
        const decorateInteractiveTarget = platformServiceExt.decorateInteractiveTarget.bind(platformServiceExt);
        const executeCrossReference = platformServiceExt.executeCrossReference.bind(platformServiceExt);
        const registerPreferenceSettings = platformServiceExt.registerPreference.bind(platformServiceExt);
        const getPreferenceValue = platformServiceExt.getPreferenceValue.bind(platformServiceExt);
        const getPreferenceChecked = platformServiceExt.getPreferenceChecked.bind(platformServiceExt);
        const platform = {
            registerPreferenceSettings,
            getPreferenceChecked,
            getPreferenceValue,
            getUserInfo,
            sendRoutineInfo,
            InfoLevel,
            registerToolbar,
            gotoService,
            executeCrossReference,
            decorateInteractiveTarget,
            gotoProblem(problem: baosky.ProblemLocation): Promise<void> {
                return platformServiceExt.gotoProblem(problem);
            },
            getProblems(resource?: baosky.Uri) {
                return <any>platformServiceExt.getProblems(resource as any);
            },
            async gotoHelp(route: string): Promise<void> {
                return await platformServiceExt.gotoHelp(route, plugin);
            },
            async openDialog(dialogProps: baosky.platform.DialogProps): Promise<void> {
                return await platformServiceExt.openDialog(dialogProps);
            },
            async getProjectPath(): Promise<URI> {
                return await platformServiceExt.getProjectPath() as any;
            },
            async getProjectInfo(): Promise<baosky.projects.ProjectObject> {
                return await platformServiceExt.getProjectInfo();
            },
            async getDeviceParamsByPath(uri: URI): Promise<baosky.DeviceParams> {
                return await platformServiceExt.getDeviceParamsByPath(uri as any);
            },
            async getDevicePathByName(name: string): Promise<URI> {
                return await platformServiceExt.getDevicePathByName(name) as any;
            },
            async getChildPathByDevice(uri: baosky.Uri, objectType: baosky.platform.CoreObject): Promise<baosky.Uri | undefined> {
                return await platformServiceExt.getChildPathByDevice(uri, objectType);
            },
            async getModelVersion(name: string): Promise<number> {
                return await platformServiceExt.getModelVersion(name);
            },
            async getAppVersion(): Promise<number> {
                return await platformServiceExt.getAppVersion();
            },
            async loadObject(deviceName: string, path: string | baosky.Uri, options?: baosky.platform.LoadOptions, ctx?: baosky.platform.DataContext): Promise<void> {
                return await platformServiceExt.loadObject(deviceName, path, options, ctx);
            },
            unloadObject(deviceName: string, path: string | baosky.Uri): void {
                return platformServiceExt.unloadObject(deviceName, path);
            },
            async reloadObject(deviceName: string, path: string | baosky.Uri, options?: baosky.platform.LoadOptions, ctx?: baosky.platform.DataContext): Promise<void> {
                return await platformServiceExt.reloadObject(deviceName, path, options, ctx);
            },
            async reloadContainer(path: baosky.Uri, newPath?: baosky.Uri): Promise<void> {
                return await platformServiceExt.reloadContainer(path, newPath);
            },
            async validateName(name: string, nameSourceType: string, options?: baosky.platform.NameValidationOptions): Promise<baosky.platform.ValidationResult[]> {
                return await platformServiceExt.validateName(name, nameSourceType, options);
            },
            async getNextName(location: baosky.Uri, options: baosky.platform.NextNameOptions): Promise<string> {
                return await platformServiceExt.getNextName(location, options);
            },
            async tryGetNextName(location: baosky.Uri, options: baosky.platform.NextNameOptions, nameList?: string[]): Promise<string> {
                return await platformServiceExt.tryGetNextName(location, options, nameList);
            },
            async releaseName(): Promise<void> {
                await platformServiceExt.releaseName();
            },
            async clearDirectiveStack(): Promise<void> {
                await platformServiceExt.clearDirectiveStack();
            },
            async getAttributesByIDEResource(resourceIds: string[]): Promise<LicenseableResource[]> {
                return licenseExt.getAttributesByIDEResource(resourceIds);
            },
            async getAppVersionByFile(projectPath: baosky.Uri): Promise<{ appMajorVersion: number; appMinorVersion: number; }> {
                return versionServiceExt.getAppVersionByFile(projectPath);
            },
            async getAppVersionNumberByFile(projectPath: baosky.Uri): Promise<number> {
                return versionServiceExt.getAppVersionNumberByFile(projectPath);
            },
            async getLatestAppVersion(): Promise<number> {
                return versionServiceExt.getLatestAppVersion();
            },
            async getLatestFullAppVersion(): Promise<{ appMajorVersion: number; appMinorVersion: number; hotfix: number; }> {
                return versionServiceExt.getLatestFullAppVersion();
            },
            getAppVersionSync(): number {
                return versionServiceExt.getAppVersionSync();
            },
            async getProductVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }> {
                return versionServiceExt.getProductVersionRange(product);
            },
            getProductVersionRangeSync(product: ProductType): { oldest: number; latest: number; } {
                return versionServiceExt.getProductVersionRangeSync(product);
            },
            async getModelVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }> {
                return versionServiceExt.getModelVersionRange(product);
            },
            async getLanguageVersionRange(product: ProductType): Promise<{ oldest: number; latest: number; }> {
                return versionServiceExt.getLanguageVersionRange(product);
            },
            async getLanguageVersionRangeString(product: ProductType): Promise<{ oldest: string; latest: string; }> {
                return versionServiceExt.getLanguageVersionRangeString(product);
            },
            async getMatchedVersionsByAppVersion(appVersion: number): Promise<{ languageVersion: number; projectVersion: number; }> {
                return versionServiceExt.getMatchedVersionsByAppVersion(appVersion);
            },
            async getMatchedPLCModelVersionByProject(projectVersion: number): Promise<number> {
                return versionServiceExt.getMatchedPLCModelVersionByProject(projectVersion);
            },
            async focusInfoViewTab(type: string, stopAutoScroll?: boolean): Promise<void>{
                return platformServiceExt.focusInfoViewTab(type, stopAutoScroll);
            }
        }

        const onEvent = systemEventExt.onEvent.bind(systemEventExt);
        const system = {
            onEvent,
            eventId
        };

        const plc: typeof baosky.plc = {
            library: {
                getAllLibraryElements(options: { plcUri: baosky.Uri; filterId: baosky.LibraryFilterId; withVersion?: boolean; }) {
                    return libraryExt.getAllLibraryElements(options);
                },

                addToRefLibByLibSet(plcUri: baosky.Uri, libSetParamters: { libSet: string; version: string; category: string; }) {
                    return libraryExt.addToRefLibByLibSet(plcUri, libSetParamters);
                },

                getAllReferenceLibElement(plcUri: baosky.Uri) {
                    return libraryExt.getAllReferenceLibElement(plcUri);
                },

                getAllLibraryInfo(type: baosky.LibraryCategory){
                    return libraryExt.getAllLibraryInfo(type);
                }
            },

            importPLCopen(options: baosky.ImportPLCopenOptions) {
                return plcExt.importPLCopen(options);
            },

            provideQuickFixAction(plcName: string) {
                return plcExt.provideQuickFixAction(plcName);
            },
            async getDefaultNamespace(plcName: string): Promise<string> {
                return plcExt.getDefaultNamespace(plcName);
            },
            getLanguageStatus() {
                return languageStatusExt.getStatus();
            }
        }

        const window: typeof baosky.window = {
            // registerToolbarButton(libraryName: string, button: baosky.UserLibraryButton): Disposable {
            //     return plcExt.registerToolbarButton(libraryName, button);
            // },

            selection() {
                return platformServiceExt.selection();
            },

            get activeTerminal(): TerminalExtImpl | undefined {
                return terminalExt.activeTerminal;
            },
            get activeTextEditor(): TextEditorExt | undefined {
                return editors.getActiveEditor();
            },
            get visibleTextEditors(): baosky.TextEditor[] {
                return editors.getVisibleTextEditors();
            },
            get terminals(): TerminalExtImpl[] {
                return terminalExt.terminals;
            },
            onDidChangeActiveTerminal,
            onDidChangeActiveTextEditor(listener, thisArg?, disposables?) {
                return editors.onDidChangeActiveTextEditor(listener, thisArg, disposables);
            },
            onDidChangeVisibleTextEditors(listener, thisArg?, disposables?) {
                return editors.onDidChangeVisibleTextEditors(listener, thisArg, disposables);
            },
            onDidChangeTextEditorSelection(listener, thisArg?, disposables?) {
                return editors.onDidChangeTextEditorSelection(listener, thisArg, disposables);
            },
            onDidChangeTextEditorOptions(listener, thisArg?, disposables?) {
                return editors.onDidChangeTextEditorOptions(listener, thisArg, disposables);
            },
            onDidChangeTextEditorViewColumn(listener, thisArg?, disposables?) {
                return editors.onDidChangeTextEditorViewColumn(listener, thisArg, disposables);
            },
            onDidChangeTextEditorVisibleRanges(listener, thisArg?, disposables?) {
                return editors.onDidChangeTextEditorVisibleRanges(listener, thisArg, disposables);
            },
            async showTextDocument(documentArg: baosky.TextDocument | URI,
                columnOrOptions?: baosky.TextDocumentShowOptions | baosky.ViewColumn,
                preserveFocus?: boolean
            ): Promise<baosky.TextEditor> {
                let documentOptions: baosky.TextDocumentShowOptions | undefined;
                const uri: URI = documentArg instanceof URI ? documentArg : documentArg.uri;
                if (typeof columnOrOptions === 'number') {
                    documentOptions = {
                        viewColumn: columnOrOptions
                    };
                } else if (columnOrOptions && (columnOrOptions.preserveFocus || columnOrOptions.preview || columnOrOptions.selection || columnOrOptions.viewColumn)) {
                    documentOptions = {
                        ...columnOrOptions
                    };
                }
                if (preserveFocus) {
                    if (documentOptions) {
                        documentOptions.preserveFocus = preserveFocus;
                    } else {
                        documentOptions = { preserveFocus };
                    }
                }
                await documents.showDocument(uri, documentOptions);
                const textEditor = editors.getVisibleTextEditors().find(editor => editor.document.uri.toString() === uri.toString());
                if (textEditor) {
                    return Promise.resolve(textEditor);
                } else {
                    throw new Error(`Failed to show text document ${documentArg.toString()}`);
                }
            },
            get visibleNotebookEditors(): baosky.NotebookEditor[] {
                return notebooksExt.visibleApiNotebookEditors;
            },
            onDidChangeVisibleNotebookEditors(listener, thisArg?, disposables?) {
                return notebooksExt.onDidChangeVisibleNotebookEditors(listener, thisArg, disposables);
            },
            get activeNotebookEditor(): baosky.NotebookEditor | undefined {
                return notebooksExt.activeApiNotebookEditor;
            }, onDidChangeActiveNotebookEditor(listener, thisArg?, disposables?) {
                return notebooksExt.onDidChangeActiveNotebookEditor(listener, thisArg, disposables);
            },
            onDidChangeNotebookEditorSelection(listener, thisArg?, disposables?) {
                return notebookEditors.onDidChangeNotebookEditorSelection(listener, thisArg, disposables);
            },
            onDidChangeNotebookEditorVisibleRanges(listener, thisArg?, disposables?) {
                return notebookEditors.onDidChangeNotebookEditorVisibleRanges(listener, thisArg, disposables);
            },
            showNotebookDocument(document: baosky.NotebookDocument, options?: baosky.NotebookDocumentShowOptions) {
                return notebooksExt.showNotebookDocument(document, options);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            showQuickPick(items: any, options?: baosky.QuickPickOptions, token?: baosky.CancellationToken): any {
                return quickOpenExt.showQuickPick(plugin, items, options, token);
            },
            createQuickPick<T extends baosky.QuickPickItem>(): baosky.QuickPick<T> {

                return createAPIObject(quickOpenExt.createQuickPick(plugin));
            },
            showWorkspaceFolderPick(options?: baosky.WorkspaceFolderPickOptions): PromiseLike<baosky.WorkspaceFolder | undefined> {
                return workspaceExt.pickWorkspaceFolder(options);
            },
            showInformationMessage,
            showWarningMessage,
            showErrorMessage,
            showOpenDialog(options: baosky.OpenDialogOptions): PromiseLike<URI[] | undefined> {
                return dialogsExt.showOpenDialog(options);
            },
            showSaveDialog(options: baosky.SaveDialogOptions): PromiseLike<URI | undefined> {
                return dialogsExt.showSaveDialog(options);
            },
            showUploadDialog(options: baosky.UploadDialogOptions): PromiseLike<URI[] | undefined> {
                return dialogsExt.showUploadDialog(options);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setStatusBarMessage(text: string, arg?: number | PromiseLike<any>): Disposable {
                return statusBarMessageRegistryExt.setStatusBarMessage(text, arg);
            },
            showInputBox(options?: baosky.InputBoxOptions, token?: baosky.CancellationToken): PromiseLike<string | undefined> {
                return quickOpenExt.showInput(options, token);
            },
            createStatusBarItem(alignmentOrId?: baosky.StatusBarAlignment | string, priorityOrAlignment?: number | baosky.StatusBarAlignment,
                priorityArg?: number): baosky.StatusBarItem {
                let id: string | undefined;
                let alignment: number | undefined;
                let priority: number | undefined;

                if (typeof alignmentOrId === 'string') {
                    id = alignmentOrId;
                    alignment = priorityOrAlignment;
                    priority = priorityArg;
                } else {
                    alignment = alignmentOrId;
                    priority = priorityOrAlignment;
                }

                // TODO: here
                return statusBarMessageRegistryExt.createStatusBarItem(alignment, priority, id);
            },
            createOutputChannel(name: string, options?: { log: true }): any {

                // TODO: here
                return !options
                    ? outputChannelRegistryExt.createOutputChannel(name, pluginToPluginInfo(plugin))
                    : outputChannelRegistryExt.createOutputChannel(name, pluginToPluginInfo(plugin), options);
            },
            createWebviewPanel(viewType: string,
                title: string,
                showOptions: baosky.ViewColumn | baosky.WebviewPanelShowOptions,
                options: baosky.WebviewPanelOptions & baosky.WebviewOptions = { controlOptions: [] }): baosky.WebviewPanel {
                return createAPIObject(webviewExt.createWebview(viewType, title, showOptions, options, plugin));
            },

            registerWebviewPanelSerializer(viewType: string, serializer: baosky.WebviewPanelSerializer): baosky.Disposable {
                return webviewExt.registerWebviewPanelSerializer(viewType, serializer, plugin);
            },
            registerCustomEditorProvider(viewType: string,
                provider: baosky.CustomTextEditorProvider | baosky.CustomReadonlyEditorProvider,
                options: { webviewOptions?: baosky.WebviewPanelOptions, supportsMultipleEditorsPerDocument?: boolean } = {}): baosky.Disposable {
                return customEditorExt.registerCustomEditorProvider(viewType, provider, options, plugin);
            },
            registerWebviewViewProvider(viewType: string,
                provider: baosky.WebviewViewProvider,
                options?: {
                    webviewOptions?: {
                        retainContextWhenHidden?: boolean
                    }
                }): baosky.Disposable {
                return webviewViewsExt.registerWebviewViewProvider(viewType, provider, plugin, options?.webviewOptions);
            },
            get state(): baosky.WindowState {
                return windowStateExt.getWindowState();
            },
            onDidChangeWindowState(listener, thisArg?, disposables?): baosky.Disposable {
                return windowStateExt.onDidChangeWindowState(listener, thisArg, disposables);
            },
            createTerminal(nameOrOptions: baosky.TerminalOptions | baosky.ExtensionTerminalOptions | baosky.ExtensionTerminalOptions | (string | undefined),
                shellPath?: string,
                shellArgs?: string[] | string): baosky.Terminal {
                return createAPIObject(terminalExt.createTerminal(plugin, nameOrOptions, shellPath, shellArgs));
            },
            onDidChangeTerminalState,
            onDidCloseTerminal,
            onDidOpenTerminal,
            createTextEditorDecorationType(options: baosky.DecorationRenderOptions): baosky.TextEditorDecorationType {
                return createAPIObject(editors.createTextEditorDecorationType(options));
            },
            registerTreeDataProvider<T>(viewId: string, treeDataProvider: baosky.TreeDataProvider<T>): Disposable {
                return treeViewsExt.registerTreeDataProvider(plugin, viewId, treeDataProvider);
            },
            createTreeView<T>(viewId: string, options: baosky.TreeViewOptions<T>): baosky.TreeView<T> {
                return createAPIObject(treeViewsExt.createTreeView(plugin, viewId, options));
            },
            withScmProgress<R>(task: (progress: baosky.Progress<number>) => Thenable<R>) {
                const options: ProgressOptions = { location: ProgressLocation.SourceControl };
                return notificationExt.withProgress(options, () => task({ report() { /* noop */ } }));
            },
            withProgress<R>(
                options: ProgressOptions,
                task: (progress: Progress<{ message?: string; increment?: number }>, token: baosky.CancellationToken) => PromiseLike<R>
            ): PromiseLike<R> {
                return notificationExt.withProgress(options, task);
            },
            registerFileDecorationProvider(provider: baosky.FileDecorationProvider): baosky.Disposable {
                return decorationsExt.registerFileDecorationProvider(provider, pluginToPluginInfo(plugin));
            },
            registerUriHandler(handler: baosky.UriHandler): baosky.Disposable {
                return uriExt.registerUriHandler(handler, pluginToPluginInfo(plugin));
            },
            createInputBox(): baosky.InputBox {
                return createAPIObject(quickOpenExt.createInputBox(plugin));
            },
            registerTerminalLinkProvider(provider: baosky.TerminalLinkProvider): baosky.Disposable {
                return terminalExt.registerTerminalLinkProvider(provider);
            },
            registerTerminalProfileProvider(id: string, provider: baosky.TerminalProfileProvider): baosky.Disposable {
                return terminalExt.registerTerminalProfileProvider(id, provider);
            },
            get activeColorTheme(): baosky.ColorTheme {
                return themingExt.activeColorTheme;
            },
            onDidChangeActiveColorTheme(listener, thisArg?, disposables?) {
                return themingExt.onDidChangeActiveColorTheme(listener, thisArg, disposables);
            },
            get tabGroups(): baosky.TabGroups {
                return tabsExt.tabGroups;
            },
            /** @stubbed ExternalUriOpener */
            registerExternalUriOpener(id: string, opener: baosky.ExternalUriOpener, metadata: baosky.ExternalUriOpenerMetadata): baosky.Disposable {
                return Disposable.NULL;
            },
            /** @stubbed ProfileContentHandler */
            registerProfileContentHandler(id: string, profileContentHandler: baosky.ProfileContentHandler): baosky.Disposable {
                return Disposable.NULL;
            },
            /** @stubbed TerminalQuickFixProvider */
            registerTerminalQuickFixProvider(id: string, provider: baosky.TerminalQuickFixProvider): baosky.Disposable {
                return terminalExt.registerTerminalQuickFixProvider(id, provider);
            },

            /** Theia-specific TerminalObserver */
            registerTerminalObserver(observer: baosky.TerminalObserver): baosky.Disposable {
                return terminalExt.registerTerminalObserver(observer);
            },

            /** @stubbed ShareProvider */
            registerShareProvider: () => Disposable.NULL,
            /** @stubbed Terminal Shell Ingration */
            onDidChangeTerminalShellIntegration: Event.None,
            /** @stubbed Terminal Shell Ingration */
            onDidEndTerminalShellExecution: Event.None,
            /** @stubbed Terminal Shell Ingration */
            onDidStartTerminalShellExecution: Event.None
        };

        function createFileSystemWatcher(pattern: RelativePattern, options?: baosky.FileSystemWatcherOptions): baosky.FileSystemWatcher;
        function createFileSystemWatcher(pattern: baosky.GlobPattern, ignoreCreateEvents?: boolean, ignoreChangeEvents?:
            boolean, ignoreDeleteEvents?: boolean): baosky.FileSystemWatcher;
        function createFileSystemWatcher(pattern: RelativePattern | baosky.GlobPattern,
            ignoreCreateOrOptions?: baosky.FileSystemWatcherOptions | boolean, ignoreChangeEventsBoolean?: boolean, ignoreDeleteEventsBoolean?: boolean): baosky.FileSystemWatcher {
            if (isObject<baosky.FileSystemWatcherOptions>(ignoreCreateOrOptions)) {
                const { ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents, excludes } = (ignoreCreateOrOptions as baosky.FileSystemWatcherOptions);
                return createAPIObject(
                    extHostFileSystemEvent.createFileSystemWatcher(fromGlobPattern(pattern),
                        ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents, excludes));
            } else {
                return createAPIObject(
                    extHostFileSystemEvent.createFileSystemWatcher(fromGlobPattern(pattern),
                        ignoreCreateOrOptions as boolean, ignoreChangeEventsBoolean, ignoreDeleteEventsBoolean));
            }
        }
        const workspace: typeof baosky.workspace = {
            /**
             * 创建fs代理，检查插件fs的操作权限
             * @date 2025/11/10 - 14:06:31 PM
             * @author wubing
             *
             * @async
             * @param
             * @returns {baosky.FileSystem}
             */
            get fs(): baosky.FileSystem {
                const originalFs = fileSystemExt.fileSystem.apiObject;
                const currentPlugin = plugin;

                return new Proxy(originalFs, {
                    get(target, prop, receiver) {
                        const original = Reflect.get(target, prop, receiver);

                        // 对函数调用进行包装，添加权限检查
                        if (typeof original === 'function') {
                            return async (...args: any[]) => {
                                const operation: ModuleOperation = {
                                    functionName: String(prop),
                                    args: args.map(arg => {
                                        if (arg && typeof arg === 'object' && 'fsPath' in arg) {
                                            return arg.fsPath;
                                        }
                                        return typeof arg === 'string' ? arg : '[object]';
                                    }),
                                    pluginId: currentPlugin.model.id,
                                    pluginName: currentPlugin.model.displayName || currentPlugin.model.name
                                };

                                // 调用 main 端的权限检查服务
                                await modulePermissionService.$checkModulePermission(operation, currentPlugin);

                                // 权限检查通过后，调用原方法
                                return original.apply(target, args);
                            };
                        }

                        return original;
                    }
                }) as baosky.FileSystem;
            },

            get rootPath(): string | undefined {
                return workspaceExt.rootPath;
            },
            get workspaceFolders(): baosky.WorkspaceFolder[] | undefined {
                return workspaceExt.workspaceFolders;
            },
            get workspaceFile(): URI | undefined {
                return workspaceExt.workspaceFile;
            },
            get name(): string | undefined {
                return workspaceExt.name;
            },
            onDidChangeWorkspaceFolders(listener, thisArg?, disposables?): baosky.Disposable {
                return workspaceExt.onDidChangeWorkspaceFolders(listener, thisArg, disposables);
            },
            get notebookDocuments(): baosky.NotebookDocument[] {
                return notebooksExt.getAllApiDocuments();
            },
            get textDocuments(): baosky.TextDocument[] {
                return documents.getAllDocumentData().map(data => data.document);
            },
            onDidChangeTextDocument(listener, thisArg?, disposables?) {
                return documents.onDidChangeDocument(listener, thisArg, disposables);
            },
            onDidCloseTextDocument(listener, thisArg?, disposables?) {
                return documents.onDidRemoveDocument(listener, thisArg, disposables);
            },
            onDidOpenNotebookDocument(listener, thisArg?, disposables?) {
                return notebooksExt.onDidOpenNotebookDocument(listener, thisArg, disposables);
            },
            onDidCloseNotebookDocument(listener, thisArg?, disposables?) {
                return notebooksExt.onDidCloseNotebookDocument(listener, thisArg, disposables);
            },
            onWillSaveNotebookDocument(listener, thisArg?, disposables?) {
                return Disposable.NULL;
            },
            onDidSaveNotebookDocument(listener, thisArg, disposables) {
                return notebookDocuments.onDidSaveNotebookDocument(listener, thisArg, disposables);
            },
            onDidChangeNotebookDocument(listener, thisArg, disposables) {
                return notebookDocuments.onDidChangeNotebookDocument(listener, thisArg, disposables);
            },
            onDidOpenTextDocument(listener, thisArg?, disposables?) {
                return documents.onDidAddDocument(listener, thisArg, disposables);
            },
            onWillSaveTextDocument(listener, thisArg?, disposables?) {
                return documents.onWillSaveTextDocument(listener, thisArg, disposables);
            },
            onDidSaveTextDocument(listener, thisArg?, disposables?) {
                return documents.onDidSaveTextDocument(listener, thisArg, disposables);
            },
            onDidCreateFiles: (listener, thisArg, disposables) => extHostFileSystemEvent.onDidCreateFile(listener, thisArg, disposables),
            onDidDeleteFiles: (listener, thisArg, disposables) => extHostFileSystemEvent.onDidDeleteFile(listener, thisArg, disposables),
            onDidRenameFiles: (listener, thisArg, disposables) => extHostFileSystemEvent.onDidRenameFile(listener, thisArg, disposables),
            onWillCreateFiles: (listener: (e: baosky.FileWillCreateEvent) => any, thisArg?: any, disposables?: baosky.Disposable[]) =>
                extHostFileSystemEvent.getOnWillCreateFileEvent(plugin)(listener, thisArg, disposables),
            onWillDeleteFiles: (listener: (e: baosky.FileWillDeleteEvent) => any, thisArg?: any, disposables?: baosky.Disposable[]) =>
                extHostFileSystemEvent.getOnWillDeleteFileEvent(plugin)(listener, thisArg, disposables),
            onWillRenameFiles: (listener: (e: baosky.FileWillRenameEvent) => any, thisArg?: any, disposables?: baosky.Disposable[]) =>
                extHostFileSystemEvent.getOnWillRenameFileEvent(plugin)(listener, thisArg, disposables),
            getConfiguration(section, resource): baosky.WorkspaceConfiguration {
                return preferenceRegistryExt.getConfiguration(section, resource);
            },
            onDidChangeConfiguration(listener, thisArgs?, disposables?): baosky.Disposable {
                return preferenceRegistryExt.onDidChangeConfiguration(listener, thisArgs, disposables);
            },
            async openTextDocument(uriOrFileNameOrOptions?: baosky.Uri | string | { language?: string; content?: string; }): Promise<baosky.TextDocument | undefined> {
                const options = uriOrFileNameOrOptions as { language?: string; content?: string; };

                let uri: URI;
                if (typeof uriOrFileNameOrOptions === 'string') {
                    uri = URI.file(uriOrFileNameOrOptions);

                } else if (uriOrFileNameOrOptions instanceof URI) {
                    uri = uriOrFileNameOrOptions;

                } else if (!options || typeof options === 'object') {
                    uri = await documents.createDocumentData(options);

                } else {
                    return Promise.reject(new Error('illegal argument - uriOrFileNameOrOptions'));
                }

                const data = await documents.openDocument(uri);
                return data && data.document;
            },
            async openNotebookDocument(uriOrType: baosky.Uri | string, content?: NotebookData): Promise<baosky.NotebookDocument | undefined> {
                let uri: URI;
                if (URI.isUri(uriOrType)) {
                    uri = uriOrType;
                    await notebooksExt.openNotebookDocument(uriOrType as URI);
                } else if (typeof uriOrType === 'string') {
                    uri = URI.revive(await notebooksExt.createNotebookDocument({ viewType: uriOrType, content }));
                } else {
                    throw new Error('Invalid arguments');
                }
                // Notebook extension will create a document in openNotebookDocument() or create openNotebookDocument()
                return notebooksExt.getNotebookDocument(uri).apiNotebook;
            },
            createFileSystemWatcher,
            findFiles(include: baosky.GlobPattern, exclude?: baosky.GlobPattern | null, maxResults?: number, token?: CancellationToken): PromiseLike<URI[]> {
                return workspaceExt.findFiles(include, exclude, maxResults, token);
            },
            findTextInFiles(query: baosky.TextSearchQuery, optionsOrCallback: baosky.FindTextInFilesOptions | ((result: baosky.TextSearchResult) => void),
                callbackOrToken?: CancellationToken | ((result: baosky.TextSearchResult) => void), token?: CancellationToken): Promise<baosky.TextSearchComplete> {
                return workspaceExt.findTextInFiles(query, optionsOrCallback, callbackOrToken, token);
            },
            save(uri: baosky.Uri): PromiseLike<baosky.Uri | undefined> {
                return editors.save(uri);
            },

            saveAs(uri: baosky.Uri): PromiseLike<baosky.Uri | undefined> {
                return editors.saveAs(uri);
            },
            saveAll(includeUntitled?: boolean): PromiseLike<boolean> {
                return editors.saveAll(includeUntitled);
            },
            applyEdit(edit: baosky.WorkspaceEdit, metadata?: baosky.WorkspaceEditMetadata): PromiseLike<boolean> {
                return editors.applyWorkspaceEdit(edit, metadata);
            },
            registerTextDocumentContentProvider(scheme: string, provider: baosky.TextDocumentContentProvider): baosky.Disposable {
                return workspaceExt.registerTextDocumentContentProvider(scheme, provider);
            },
            registerFileSystemProvider(scheme: string, provider: baosky.FileSystemProvider, options?: { isCaseSensitive?: boolean, isReadonly?: boolean | MarkdownString }):
                baosky.Disposable {
                return fileSystemExt.registerFileSystemProvider(scheme, provider, options);
            },
            getWorkspaceFolder(uri: baosky.Uri): baosky.WorkspaceFolder | undefined {
                return workspaceExt.getWorkspaceFolder(uri);
            },
            asRelativePath(pathOrUri: baosky.Uri | string, includeWorkspace?: boolean): string | undefined {
                return workspaceExt.getRelativePath(pathOrUri, includeWorkspace);
            },
            updateWorkspaceFolders: (index, deleteCount, ...workspaceFoldersToAdd) =>
                workspaceExt.updateWorkspaceFolders(index, deleteCount || 0, ...workspaceFoldersToAdd)
            ,
            registerTaskProvider(type: string, provider: baosky.TaskProvider): baosky.Disposable {
                return tasks.registerTaskProvider(type, provider);
            },
            registerResourceLabelFormatter(formatter: baosky.ResourceLabelFormatter): baosky.Disposable {
                return labelServiceExt.$registerResourceLabelFormatter(formatter);
            },
            registerTimelineProvider(scheme: string | string[], provider: baosky.TimelineProvider): baosky.Disposable {
                return timelineExt.registerTimelineProvider(plugin, scheme, provider);
            },
            registerNotebookSerializer(notebookType: string, serializer: baosky.NotebookSerializer, options?: baosky.NotebookDocumentContentOptions): baosky.Disposable {
                return notebooksExt.registerNotebookSerializer(plugin, notebookType, serializer, options);
            },
            get isTrusted(): boolean {
                return workspaceExt.trusted;
            },
            async requestWorkspaceTrust(options?: baosky.WorkspaceTrustRequestOptions): Promise<boolean | undefined> {
                return workspaceExt.requestWorkspaceTrust(options);
            },
            get onDidGrantWorkspaceTrust(): baosky.Event<void> {
                return workspaceExt.onDidGrantWorkspaceTrust;
            },
            registerEditSessionIdentityProvider(scheme: string, provider: baosky.EditSessionIdentityProvider) {
                return workspaceExt.$registerEditSessionIdentityProvider(scheme, provider);
            },
            /**
             * @stubbed
             * This is a stub implementation, that should minimally satisfy vscode built-in extensions
             * that currently use this proposed API.
             */
            onWillCreateEditSessionIdentity: () => Disposable.NULL,
            registerCanonicalUriProvider(scheme: string, provider: baosky.CanonicalUriProvider): baosky.Disposable {
                return workspaceExt.registerCanonicalUriProvider(scheme, provider);
            },
            getCanonicalUri(uri: baosky.Uri, options: baosky.CanonicalUriRequestOptions, token: CancellationToken): baosky.ProviderResult<baosky.Uri> {
                return workspaceExt.getCanonicalUri(uri, options, token);
            },
            /**
             * @stubbed
             * This is a stub implementation, that should minimally satisfy vscode extensions
             * that currently use this proposed API.
             */
            registerPortAttributesProvider: () => Disposable.NULL
        };

        const onDidChangeLogLevel = new Emitter<baosky.LogLevel>();
        const env: typeof baosky.env = Object.freeze({
            get appName(): string { return envExt.appName; },
            get appRoot(): string { return envExt.appRoot; },
            get appHost(): string { return envExt.appHost; },
            get language(): string { return envExt.language; },
            get isNewAppInstall(): boolean { return envExt.isNewAppInstall; },
            get isTelemetryEnabled(): boolean { return telemetryExt.isTelemetryEnabled; },
            get onDidChangeTelemetryEnabled(): baosky.Event<boolean> {
                return telemetryExt.onDidChangeTelemetryEnabled;
            },
            createTelemetryLogger(sender: baosky.TelemetrySender, options?: baosky.TelemetryLoggerOptions): baosky.TelemetryLogger {
                return createAPIObject(telemetryExt.createTelemetryLogger(sender, options));
            },
            get remoteName(): string | undefined { return envExt.remoteName; },
            get machineId(): string { return envExt.machineId; },
            get sessionId(): string { return envExt.sessionId; },
            get uriScheme(): string { return envExt.uriScheme; },
            get shell(): string { return terminalExt.defaultShell; },
            get onDidChangeShell(): baosky.Event<string> {
                return terminalExt.onDidChangeShell;
            },
            get uiKind(): baosky.UIKind { return envExt.uiKind; },
            clipboard,
            getEnvVariable(envVarName: string): PromiseLike<string | undefined> {
                return envExt.getEnvVariable(envVarName);
            },
            getQueryParameter(queryParamName: string): string | string[] | undefined {
                return envExt.getQueryParameter(queryParamName);
            },
            getQueryParameters(): QueryParameters {
                return envExt.getQueryParameters();
            },
            getClientOperatingSystem(): PromiseLike<baosky.OperatingSystem> {
                return envExt.getClientOperatingSystem();
            },
            openExternal(uri: baosky.Uri): PromiseLike<boolean> {
                return windowStateExt.openUri(uri);
            },
            asExternalUri(target: baosky.Uri): PromiseLike<baosky.Uri> {
                return windowStateExt.asExternalUri(target);
            },
            get logLevel(): baosky.LogLevel { return LogLevel.Info; },
            get onDidChangeLogLevel(): baosky.Event<baosky.LogLevel> { return onDidChangeLogLevel.event; }
        });

        const extensions: typeof baosky.extensions = Object.freeze({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getExtension<T = any>(extensionId: string, includeFromDifferentExtensionHosts: boolean = false): baosky.Extension<T | undefined> | undefined {
                includeFromDifferentExtensionHosts = false;
                const plg = pluginManager.getPluginById(extensionId.toLowerCase());
                if (plg) {
                    return new PluginExt(pluginManager, plg);
                }
                return undefined;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            get all(): readonly baosky.Extension<any>[] {
                return pluginManager.getAllPlugins().map(plg => new PluginExt(pluginManager, plg));
            },
            get allAcrossExtensionHosts(): readonly baosky.Extension<any>[] {
                // we only support one extension host ATM so equivalent to calling "all()"
                return this.all;
            },
            get onDidChange(): baosky.Event<void> {
                return pluginManager.onDidChange;
            }
        });

        const languages: typeof baosky.languages = {
            getLanguages(): PromiseLike<string[]> {
                return languagesExt.getLanguages();
            },
            setTextDocumentLanguage(document: baosky.TextDocument, languageId: string): PromiseLike<baosky.TextDocument> {
                return languagesExt.changeLanguage(document.uri, languageId);
            },
            match(selector: baosky.DocumentSelector, document: baosky.TextDocument): number {
                return score(fromDocumentSelector(selector), document.uri.scheme, document.uri.path, document.languageId, true);
            },
            get onDidChangeDiagnostics(): baosky.Event<baosky.DiagnosticChangeEvent> {
                return languagesExt.onDidChangeDiagnostics;
            },
            getDiagnostics(resource?: URI) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return <any>languagesExt.getDiagnostics(resource);
            },
            createDiagnosticCollection(name?: string): baosky.DiagnosticCollection {
                return createAPIObject(languagesExt.createDiagnosticCollection(name));
            },
            setLanguageConfiguration(language: string, configuration: baosky.LanguageConfiguration): baosky.Disposable {
                return languagesExt.setLanguageConfiguration(language, configuration);
            },
            registerCompletionItemProvider(selector: baosky.DocumentSelector, provider: baosky.CompletionItemProvider, ...triggerCharacters: string[]): baosky.Disposable {
                return languagesExt.registerCompletionItemProvider(selector, provider, triggerCharacters, pluginToPluginInfo(plugin));
            },
            registerInlineCompletionItemProvider(selector: baosky.DocumentSelector, provider: baosky.InlineCompletionItemProvider): baosky.Disposable {
                return languagesExt.registerInlineCompletionsProvider(selector, provider);
            },
            registerDefinitionProvider(selector: baosky.DocumentSelector, provider: baosky.DefinitionProvider): baosky.Disposable {
                return languagesExt.registerDefinitionProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerDeclarationProvider(selector: baosky.DocumentSelector, provider: baosky.DeclarationProvider): baosky.Disposable {
                return languagesExt.registerDeclarationProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerSignatureHelpProvider(
                selector: baosky.DocumentSelector, provider: baosky.SignatureHelpProvider, first?: string | baosky.SignatureHelpProviderMetadata, ...remaining: string[]
            ): baosky.Disposable {
                let metadata: baosky.SignatureHelpProviderMetadata;
                if (typeof first === 'object') {
                    metadata = first;
                } else {
                    const triggerCharacters: string[] = [];
                    metadata = { triggerCharacters, retriggerCharacters: [] };
                    if (first) {
                        triggerCharacters.push(first, ...remaining);
                    }
                }
                return languagesExt.registerSignatureHelpProvider(selector, provider, metadata, pluginToPluginInfo(plugin));
            },
            registerTypeDefinitionProvider(selector: baosky.DocumentSelector, provider: baosky.TypeDefinitionProvider): baosky.Disposable {
                return languagesExt.registerTypeDefinitionProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerImplementationProvider(selector: baosky.DocumentSelector, provider: baosky.ImplementationProvider): baosky.Disposable {
                return languagesExt.registerImplementationProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerHoverProvider(selector: baosky.DocumentSelector, provider: baosky.HoverProvider): baosky.Disposable {
                return languagesExt.registerHoverProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerEvaluatableExpressionProvider(selector: baosky.DocumentSelector, provider: baosky.EvaluatableExpressionProvider): baosky.Disposable {
                return languagesExt.registerEvaluatableExpressionProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerInlineValuesProvider(selector: baosky.DocumentSelector, provider: baosky.InlineValuesProvider): baosky.Disposable {
                return languagesExt.registerInlineValuesProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerDocumentHighlightProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentHighlightProvider): baosky.Disposable {
                return languagesExt.registerDocumentHighlightProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            /**
             * @stubbed
             * @monaco-uplift: wait until API is available in Monaco (1.85.0+)
             */
            registerMultiDocumentHighlightProvider(selector: baosky.DocumentSelector, provider: baosky.MultiDocumentHighlightProvider): baosky.Disposable {
                return Disposable.NULL;
            },
            registerWorkspaceSymbolProvider(provider: baosky.WorkspaceSymbolProvider): baosky.Disposable {
                return languagesExt.registerWorkspaceSymbolProvider(provider, pluginToPluginInfo(plugin));
            },
            registerDocumentFormattingEditProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentFormattingEditProvider): baosky.Disposable {
                return languagesExt.registerDocumentFormattingEditProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerDocumentRangeFormattingEditProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentRangeFormattingEditProvider): baosky.Disposable {
                return languagesExt.registerDocumentRangeFormattingEditProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerOnTypeFormattingEditProvider(
                selector: baosky.DocumentSelector,
                provider: baosky.OnTypeFormattingEditProvider,
                firstTriggerCharacter: string,
                ...moreTriggerCharacters: string[]
            ): baosky.Disposable {
                return languagesExt.registerOnTypeFormattingEditProvider(selector, provider, [firstTriggerCharacter].concat(moreTriggerCharacters), pluginToPluginInfo(plugin));
            },
            registerDocumentDropEditProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentDropEditProvider, metadata?: baosky.DocumentDropEditProviderMetadata) {
                return languagesExt.registerDocumentDropEditProvider(selector, provider, metadata);
            },
            registerDocumentLinkProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentLinkProvider): baosky.Disposable {
                return languagesExt.registerDocumentLinkProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerCodeActionsProvider(selector: baosky.DocumentSelector, provider: baosky.CodeActionProvider, metadata?: baosky.CodeActionProviderMetadata): baosky.Disposable {
                return languagesExt.registerCodeActionsProvider(selector, provider, plugin.model, pluginToPluginInfo(plugin), metadata);
            },
            registerCodeLensProvider(selector: baosky.DocumentSelector, provider: baosky.CodeLensProvider): baosky.Disposable {
                return languagesExt.registerCodeLensProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerReferenceProvider(selector: baosky.DocumentSelector, provider: baosky.ReferenceProvider): baosky.Disposable {
                return languagesExt.registerReferenceProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerDocumentSymbolProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentSymbolProvider,
                metadata?: baosky.DocumentSymbolProviderMetadata): baosky.Disposable {
                return languagesExt.registerDocumentSymbolProvider(selector, provider, pluginToPluginInfo(plugin), metadata);
            },
            registerColorProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentColorProvider): baosky.Disposable {
                return languagesExt.registerColorProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerInlayHintsProvider(selector: baosky.DocumentSelector, provider: baosky.InlayHintsProvider): baosky.Disposable {
                return languagesExt.registerInlayHintsProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerFoldingRangeProvider(selector: baosky.DocumentSelector, provider: baosky.FoldingRangeProvider): baosky.Disposable {
                return languagesExt.registerFoldingRangeProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerSelectionRangeProvider(selector: baosky.DocumentSelector, provider: baosky.SelectionRangeProvider): baosky.Disposable {
                return languagesExt.registerSelectionRangeProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerRenameProvider(selector: baosky.DocumentSelector, provider: baosky.RenameProvider): baosky.Disposable {
                return languagesExt.registerRenameProvider(selector, provider, pluginToPluginInfo(plugin));
            },
            registerDocumentSemanticTokensProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentSemanticTokensProvider, legend: baosky.SemanticTokensLegend):
                baosky.Disposable {
                return languagesExt.registerDocumentSemanticTokensProvider(selector, provider, legend, pluginToPluginInfo(plugin));
            },
            registerDocumentRangeSemanticTokensProvider(selector: baosky.DocumentSelector, provider: baosky.DocumentRangeSemanticTokensProvider, legend: baosky.SemanticTokensLegend):
                baosky.Disposable {
                return languagesExt.registerDocumentRangeSemanticTokensProvider(selector, provider, legend, pluginToPluginInfo(plugin));
            },
            registerCallHierarchyProvider(selector: baosky.DocumentSelector, provider: baosky.CallHierarchyProvider): baosky.Disposable {
                return languagesExt.registerCallHierarchyProvider(selector, provider);
            },
            registerTypeHierarchyProvider(selector: baosky.DocumentSelector, provider: baosky.TypeHierarchyProvider): baosky.Disposable {
                return languagesExt.registerTypeHierarchyProvider(selector, provider);
            },
            registerLinkedEditingRangeProvider(selector: baosky.DocumentSelector, provider: baosky.LinkedEditingRangeProvider): baosky.Disposable {
                return languagesExt.registerLinkedEditingRangeProvider(selector, provider);
            },
            createLanguageStatusItem(id: string, selector: baosky.DocumentSelector): baosky.LanguageStatusItem {
                return languagesExt.createLanguageStatusItem(plugin, id, selector);
            },
            registerDocumentPasteEditProvider(
                selector: baosky.DocumentSelector, provider: baosky.DocumentPasteEditProvider, metadata: baosky.DocumentPasteProviderMetadata
            ): baosky.Disposable {
                return languagesExt.registerDocumentPasteEditProvider(plugin, selector, provider, metadata);
            }
        };

        const tests: typeof baosky.tests = {
            createTestController(id, label: string) {
                return createAPIObject(testingExt.createTestController(id, label));
            }
        };
        /* End of Tests API */

        const plugins = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            get all(): baosky.Plugin<any>[] {
                return pluginManager.getAllPlugins().map(plg => new PluginExt(pluginManager, plg));
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getPlugin(pluginId: string): baosky.Plugin<any> | undefined {
                const plg = pluginManager.getPluginById(pluginId);
                if (plg) {
                    return new PluginExt(pluginManager, plg);
                }
                return undefined;
            },
            get onDidChange(): baosky.Event<void> {
                return pluginManager.onDidChange;
            },
            me: {
                checkUpdates: async () => {
                    return pluginRegistry.checkPluginUpdates(plugin);
                },
                openReadme: async () => {
                    pluginRegistry.openPluginReadme(plugin);
                }
            }

        };

        const debuggersContributions = plugin.rawModel.contributes && plugin.rawModel.contributes.debuggers || [];
        debugExt.assistedInject(connectionExt, commandRegistry);
        debugExt.registerDebuggersContributions(plugin.pluginFolder, plugin.model.entryPoint.frontend ? 'frontend' : 'backend', debuggersContributions);
        const debug: typeof baosky.debug = {
            get activeDebugSession(): baosky.DebugSession | undefined {
                return debugExt.activeDebugSession;
            },
            get activeDebugConsole(): baosky.DebugConsole {
                return debugExt.activeDebugConsole;
            },
            get breakpoints(): baosky.Breakpoint[] {
                return debugExt.breakpoints;
            },
            get onDidChangeActiveDebugSession(): baosky.Event<baosky.DebugSession | undefined> {
                return debugExt.onDidChangeActiveDebugSession;
            },
            get onDidStartDebugSession(): baosky.Event<baosky.DebugSession> {
                return debugExt.onDidStartDebugSession;
            },
            get onDidReceiveDebugSessionCustomEvent(): baosky.Event<baosky.DebugSessionCustomEvent> {
                return debugExt.onDidReceiveDebugSessionCustomEvent;
            },
            get onDidTerminateDebugSession(): baosky.Event<baosky.DebugSession> {
                return debugExt.onDidTerminateDebugSession;
            },
            get onDidChangeBreakpoints(): baosky.Event<baosky.BreakpointsChangeEvent> {
                return debugExt.onDidChangeBreakpoints;
            },
            get activeStackItem(): DebugThread | DebugStackFrame | undefined {
                return debugExt.activeStackItem;
            },
            get onDidChangeActiveStackItem(): baosky.Event<DebugThread | DebugStackFrame | undefined> {
                return debugExt.onDidChangeActiveStackItem;
            },
            registerDebugAdapterDescriptorFactory(debugType: string, factory: baosky.DebugAdapterDescriptorFactory): Disposable {
                return debugExt.registerDebugAdapterDescriptorFactory(debugType, factory);
            },
            registerDebugConfigurationProvider(
                debugType: string,
                provider: baosky.DebugConfigurationProvider,
                triggerKind?: baosky.DebugConfigurationProviderTriggerKind
            ): Disposable {
                return debugExt.registerDebugConfigurationProvider(debugType, provider, triggerKind || DebugConfigurationProviderTriggerKind.Initial);
            },
            registerDebugAdapterTrackerFactory(debugType: string, factory: baosky.DebugAdapterTrackerFactory): Disposable {
                return debugExt.registerDebugAdapterTrackerFactory(debugType, factory);
            },
            startDebugging(
                folder: baosky.WorkspaceFolder | undefined,
                nameOrConfiguration: string | baosky.DebugConfiguration,
                parentSessionOrOptions?: baosky.DebugSession | baosky.DebugSessionOptions
            ): Thenable<boolean> {
                if (!parentSessionOrOptions || (typeof parentSessionOrOptions === 'object' && 'configuration' in parentSessionOrOptions)) {
                    return debugExt.startDebugging(folder, nameOrConfiguration, { parentSession: parentSessionOrOptions });
                }
                return debugExt.startDebugging(folder, nameOrConfiguration, parentSessionOrOptions || {});
            },
            stopDebugging(session?: baosky.DebugSession): Thenable<void> {
                return debugExt.stopDebugging(session);
            },
            addBreakpoints(breakpoints: readonly baosky.Breakpoint[]): void {
                debugExt.addBreakpoints(breakpoints);
            },
            removeBreakpoints(breakpoints: readonly baosky.Breakpoint[]): void {
                debugExt.removeBreakpoints(breakpoints);
            },
            asDebugSourceUri(source: baosky.DebugProtocolSource, session?: baosky.DebugSession): baosky.Uri {
                return debugExt.asDebugSourceUri(source, session);
            },
            /** @stubbed Due to proposed API */
            registerDebugVisualizationProvider: () => Disposable.NULL,
            /** @stubbed Due to proposed API */
            registerDebugVisualizationTreeProvider: () => Disposable.NULL
        };

        const tasks: typeof baosky.tasks = {
            registerTaskProvider(type: string, provider: baosky.TaskProvider): baosky.Disposable {
                return tasksExt.registerTaskProvider(type, provider);
            },

            fetchTasks(filter?: baosky.TaskFilter): Thenable<baosky.Task[]> {
                return tasksExt.fetchTasks(filter);
            },

            executeTask(task: baosky.Task): Thenable<baosky.TaskExecution> {
                return tasksExt.executeTask(task);
            },

            get taskExecutions(): ReadonlyArray<baosky.TaskExecution> {
                // TODO: here
                return tasksExt.taskExecutions;
            },
            onDidStartTask(listener, thisArg?, disposables?) {
                return tasksExt.onDidStartTask(listener, thisArg, disposables);
            },
            onDidEndTask(listener, thisArg?, disposables?) {
                return tasksExt.onDidEndTask(listener, thisArg, disposables);
            },
            onDidStartTaskProcess(listener, thisArg?, disposables?) {
                return tasksExt.onDidStartTaskProcess(listener, thisArg, disposables);
            },
            onDidEndTaskProcess(listener, thisArg?, disposables?) {
                return tasksExt.onDidEndTaskProcess(listener, thisArg, disposables);
            }
        };

        const scm: typeof baosky.scm = {
            get inputBox(): baosky.SourceControlInputBox {
                const inputBox = scmExt.getLastInputBox(plugin);
                if (inputBox) {
                    return inputBox.apiObject;
                } else {
                    throw new Error('Input box not found!');
                }
            },
            createSourceControl(id: string, label: string, rootUri?: URI): baosky.SourceControl {
                return createAPIObject(scmExt.createSourceControl(plugin, id, label, rootUri));
            }
        };

        const comments: typeof baosky.comments = {
            createCommentController(id: string, label: string): baosky.CommentController {
                return createAPIObject(commentsExt.createCommentController(plugin, id, label));
            }
        };

        const l10n: typeof baosky.l10n = {
            // eslint-disable-next-line max-len
            t(...params: [message: string, ...args: Array<string | number | boolean>] | [message: string, args: Record<string, any>] | [{ message: string; args?: Array<string | number | boolean> | Record<string, any>; comment: string | string[] }]): string {
                if (typeof params[0] === 'string') {
                    const key = params.shift() as string;

                    // We have either rest args which are Array<string | number | boolean> or an array with a single Record<string, any>.
                    // This ensures we get a Record<string | number, any> which will be formatted correctly.
                    const argsFormatted = !params || typeof params[0] !== 'object' ? params : params[0];
                    return localizationExt.translateMessage(plugin.model.id, { message: key, args: argsFormatted as Record<string | number, any> | undefined });
                }
                return localizationExt.translateMessage(plugin.model.id, params[0]);
            },
            get bundle() {
                return localizationExt.getBundle(plugin.model.id);
            },
            get uri() {
                return localizationExt.getBundleUri(plugin.model.id);
            }
        };

        // notebooks API (@stubbed)
        // The following implementation is temporarily `@stubbed` and marked as such under `baosky.d.ts`
        const notebooks: typeof baosky.notebooks = {
            createNotebookController(
                id,
                notebookType,
                label,
                handler?: (cells: baosky.NotebookCell[],
                    notebook: baosky.NotebookDocument,
                    controller: baosky.NotebookController) => void | Thenable<void>,
                rendererScripts?: NotebookRendererScript[]
            ) {
                return notebookKernels.createNotebookController(plugin.model, id, notebookType, label, handler, rendererScripts);
            },
            createRendererMessaging(rendererId) {
                return notebookRenderers.createRendererMessaging(rendererId);
            },
            registerNotebookCellStatusBarItemProvider(
                notebookType,
                provider
            ) {
                return notebooksExt.registerNotebookCellStatusBarItemProvider(notebookType, provider);
            },
            onDidChangeNotebookCellExecutionState: notebookKernels.onDidChangeNotebookCellExecutionState,

            createNotebookControllerDetectionTask(notebookType: string) {
                return notebookKernels.createNotebookControllerDetectionTask(notebookType);
            },
            registerKernelSourceActionProvider(notebookType: string, provider: baosky.NotebookKernelSourceActionProvider) {
                return notebookKernels.registerKernelSourceActionProvider(notebookType, provider);
            }
        };

        const chat: typeof baosky.chat = {
            /** @stubbed MappedEditsProvider */
            registerMappedEditsProvider(documentSelector: baosky.DocumentSelector, provider: baosky.MappedEditsProvider): Disposable {
                return Disposable.NULL;
            },
            /** @stubbed MappedEditsProvider */
            registerMappedEditsProvider2(provider: baosky.MappedEditsProvider2) {
                return Disposable.NULL;
            },
            /** @stubbed ChatRequestHandler */
            createChatParticipant(id: string, handler: baosky.ChatRequestHandler): baosky.ChatParticipant {
                return {
                    id,
                    requestHandler: handler,
                    dispose() { },
                    onDidReceiveFeedback: (listener, thisArgs?, disposables?) => Event.None(listener, thisArgs, disposables)
                };
            }
        };

        const lm: typeof baosky.lm = {
            /** @stubbed LanguageModelChat */
            selectChatModels(selector?: baosky.LanguageModelChatSelector): Thenable<baosky.LanguageModelChat[]> {
                return Promise.resolve([]);
            },
            /** @stubbed LanguageModelChat */
            onDidChangeChatModels: (listener, thisArgs?, disposables?) => Event.None(listener, thisArgs, disposables),
            /** @stubbed LanguageModelTool */
            invokeTool(name: string, options: baosky.LanguageModelToolInvocationOptions<object>, token?: CancellationToken): Thenable<baosky.LanguageModelToolResult> {
                return Promise.resolve({ content: [] });
            },
            /** @stubbed LanguageModelTool */
            registerTool<T>(name: string, tool: baosky.LanguageModelTool<T>): Disposable {
                return Disposable.NULL;
            },
            /** @stubbed LanguageModelTool */
            tools: []
        };


        return {
            version: require('../../package.json').version,
            authentication,
            chat,
            commands,
            comments,
            window,
            plc,
            projects,
            platform,
            system,
            workspace,
            env,
            extensions,
            languages,
            plugins,
            debug,
            tasks,
            scm,
            notebooks,
            l10n,
            tests,
            lm,
            // Types
            StatusBarAlignment: StatusBarAlignment,
            Disposable: Disposable,
            EventEmitter: Emitter,
            CancellationTokenSource: CancellationTokenSource,
            MarkdownString,
            Position: Position,
            Range: Range,
            Selection: Selection,
            ViewColumn: ViewColumn,
            TextEditorSelectionChangeKind: TextEditorSelectionChangeKind,
            Uri: URI,
            EndOfLine,
            TextEditorRevealType,
            TextEditorCursorStyle,
            TextEditorLineNumbersStyle,
            ThemeColor,
            ThemeIcon,
            SnippetString,
            DecorationRangeBehavior,
            OverviewRulerLane,
            ConfigurationTarget,
            RelativePattern,
            IndentAction,
            SyntaxTokenType,
            CompletionItem,
            CompletionItemKind,
            CompletionList,
            DebugConsoleMode,
            DiagnosticSeverity,
            DiagnosticRelatedInformation,
            LanguageStatusSeverity,
            Location,
            LogLevel,
            DiagnosticTag,
            CompletionItemTag,
            Diagnostic,
            CompletionTriggerKind,
            TextEdit,
            SnippetTextEdit,
            ProgressLocation,
            ProgressOptions,
            Progress,
            ParameterInformation,
            QuickPickItemKind,
            SignatureInformation,
            SignatureHelp,
            SignatureHelpTriggerKind,
            Hover,
            EvaluatableExpression,
            InlineValueEvaluatableExpression,
            InlineValueText,
            InlineValueVariableLookup,
            InlineValueContext,
            DocumentHighlightKind,
            DocumentHighlight,
            MultiDocumentHighlight,
            DocumentLink,
            DocumentDropEdit,
            DocumentDropOrPasteEditKind,
            CodeLens,
            CodeActionKind,
            CodeActionTrigger,
            CodeActionTriggerKind,
            TextDocumentSaveReason,
            CodeAction,
            DataTransferItem,
            DataTransfer,
            TreeItem,
            TreeItemCollapsibleState,
            TreeItemCheckboxState,
            SymbolKind,
            SymbolTag,
            DocumentSymbol,
            WorkspaceEdit,
            SymbolInformation,
            FileType,
            FilePermission,
            FileChangeType,
            ShellQuoting,
            ShellExecution,
            ProcessExecution,
            CustomExecution,
            TaskScope,
            TaskRevealKind,
            TaskPanelKind,
            TaskGroup,
            Task,
            Task2,
            DebugAdapterExecutable,
            DebugAdapterServer,
            DebugAdapterNamedPipeServer,
            DebugAdapterInlineImplementation,
            DebugConfigurationProviderTriggerKind,
            Breakpoint,
            SourceBreakpoint,
            FunctionBreakpoint,
            DebugStackFrame,
            DebugThread,
            Color,
            ColorInformation,
            ColorPresentation,
            FoldingRange,
            SelectionRange,
            FoldingRangeKind,
            OperatingSystem,
            WebviewPanelTargetArea,
            UIKind,
            FileSystemError,
            CommentThreadState,
            CommentThreadCollapsibleState,
            QuickInputButtons,
            CommentMode,
            CallHierarchyItem,
            CallHierarchyIncomingCall,
            CallHierarchyOutgoingCall,
            TypeHierarchyItem,
            TimelineItem,
            EnvironmentVariableMutatorType,
            SemanticTokensLegend,
            SemanticTokensBuilder,
            SemanticTokens,
            SemanticTokensEdits,
            SemanticTokensEdit,
            TextDocumentChangeReason,
            ColorThemeKind,
            SourceControlInputBoxValidationType,
            FileDecoration,
            TerminalLink,
            TerminalProfile,
            CancellationError,
            ExtensionMode,
            LinkedEditingRanges,
            InputBoxValidationSeverity,
            InlayHint,
            InlayHintKind,
            InlayHintLabelPart,
            TelemetryTrustedValue,
            NotebookCellData,
            NotebookCellExecutionState,
            NotebookCellKind,
            NotebookCellOutput,
            NotebookCellOutputItem,
            NotebookCellStatusBarAlignment,
            NotebookCellStatusBarItem,
            NotebookControllerAffinity,
            NotebookData,
            NotebookEditorRevealType,
            NotebookDocument,
            NotebookRange,
            NotebookEdit,
            NotebookKernelSourceAction,
            NotebookRendererScript,
            TestRunProfileKind,
            TestTag,
            TestRunRequest,
            TestMessage,
            TestMessageStackFrame,
            ExtensionKind,
            InlineCompletionItem,
            InlineCompletionList,
            InlineCompletionTriggerKind,
            TabInputText: TextTabInput,
            TabInputTextDiff: TextDiffTabInput,
            TabInputTextMerge: TextMergeTabInput,
            TabInputCustom: CustomEditorTabInput,
            TabInputNotebook: NotebookEditorTabInput,
            TabInputNotebookDiff: NotebookDiffEditorTabInput,
            TabInputWebview: WebviewEditorTabInput,
            TabInputTerminal: TerminalEditorTabInput,
            TerminalLocation,
            TerminalOutputAnchor,
            TerminalExitReason,
            DocumentPasteEdit,
            DocumentPasteEditKind,
            DocumentPasteTriggerKind,
            ExternalUriOpenerPriority,
            TerminalQuickFixTerminalCommand,
            TerminalQuickFixOpener,
            EditSessionIdentityMatch,
            TestResultState,
            BranchCoverage,
            DeclarationCoverage,
            FileCoverage,
            StatementCoverage,
            TestCoverageCount,
            ChatRequestTurn,
            ChatResponseTurn,
            ChatResponseAnchorPart,
            ChatResponseCommandButtonPart,
            ChatResponseFileTreePart,
            ChatResponseMarkdownPart,
            ChatResponseProgressPart,
            ChatResponseReferencePart,
            ChatResultFeedbackKind,
            LanguageModelChatMessage,
            LanguageModelChatMessageRole,
            LanguageModelError,
            LanguageModelChatToolMode,
            LanguageModelPromptTsxPart,
            LanguageModelTextPart,
            LanguageModelToolCallPart,
            LanguageModelToolResult,
            LanguageModelToolResultPart,
            PortAutoForwardAction,
            PortAttributes,
            DebugVisualization,
            TerminalShellExecutionCommandLineConfidence
        } as any; // FIXME:
    };
}

/**
 * Represents a Theia plugin as well as a VSCode extension.
 */
export interface ExtensionPlugin<T> extends baosky.Plugin<T> {
    /**
     * The uri of the directory containing the extension. Same as {@linkcode baosky.Plugin.pluginUri}.
     */
    readonly extensionUri: baosky.Uri;

    /**
     * The absolute file path of the directory containing this extension.
     * Same as {@linkcode baosky.Plugin.pluginPath}.
     */
    readonly extensionPath: string;

    /**
     * The extension kind describes if an extension runs where the UI runs
     * or if an extension runs where the remote extension host runs. The extension kind
     * is defined in the `package.json`-file of extensions. When no remote extension host exists,
     * the value is {@linkcode ExtensionKind.UI}.
     */
    extensionKind: baosky.ExtensionKind;
}

export class Plugin<T> implements baosky.Plugin<T> {
    #pluginManager: PluginManager;

    id: string;
    pluginPath: string;
    pluginUri: baosky.Uri;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    packageJSON: any;
    pluginType: baosky.PluginType;

    constructor(pluginManager: PluginManager, plugin: InternalPlugin) {
        this.#pluginManager = pluginManager;

        this.id = plugin.model.id;
        this.pluginPath = plugin.pluginFolder;
        this.packageJSON = plugin.rawModel;
        const isInFrontendHost = pluginManager.getPluginKind() === ExtensionKind.UI;
        if (isInFrontendHost && plugin.model.entryPoint.frontend) {
            this.pluginType = 'frontend';
        } else {
            this.pluginType = 'backend';
        }

        if (this.pluginType === 'frontend') {
            const { origin } = new Endpoint();
            this.pluginUri = URI.parse(origin + '/' + PluginPackage.toPluginUrl(plugin.model, ''));
        } else {
            this.pluginUri = URI.parse(plugin.pluginUri);
        }
    }

    get isActive(): boolean {
        return this.#pluginManager.isActive(this.id);
    }

    get exports(): T {
        return <T>this.#pluginManager.getPluginExport(this.id);
    }

    activate(): PromiseLike<T> {
        return this.#pluginManager.activatePlugin(this.id).then(() => this.exports);
    }
}

export class PluginExt<T> extends Plugin<T> implements ExtensionPlugin<T> {
    #pluginManager: PluginManager;

    extensionPath: string;
    extensionUri: baosky.Uri;
    extensionKind: ExtensionKind;
    isFromDifferentExtensionHost: boolean;

    constructor(pluginManager: PluginManager, plugin: InternalPlugin, isFromDifferentExtensionHost = false) {
        super(pluginManager, plugin);
        this.#pluginManager = pluginManager;

        this.extensionPath = this.pluginPath;
        this.extensionUri = this.pluginUri;
        this.extensionKind = pluginManager.getPluginKind();
        this.isFromDifferentExtensionHost = isFromDifferentExtensionHost;
    }

    override get isActive(): boolean {
        return this.#pluginManager.isActive(this.id);
    }

    override get exports(): T {
        return <T>this.#pluginManager.getPluginExport(this.id);
    }

    override activate(): PromiseLike<T> {
        return this.#pluginManager.activatePlugin(this.id).then(() => this.exports);
    }
}

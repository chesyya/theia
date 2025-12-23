/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/da5fb7d5b865aa522abc7e82c10b746834b98639/src/vs/workbench/api/node/extHostExtensionService.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

import { generateUuid } from '@theia/core/lib/common/uuid';
import { injectable, inject, postConstruct, interfaces } from '@theia/core/shared/inversify';
import { PluginWorker } from './plugin-worker';
import { getPluginId, DeployedPlugin, HostedPluginServer, PluginIdentifiers } from '../../common/plugin-protocol';
import { HostedPluginWatcher } from './hosted-plugin-watcher';
import { ExtensionKind, MAIN_RPC_CONTEXT, PluginManagerExt, UIKind } from '../../common/plugin-api-rpc';
import { setUpPluginApi } from '../../main/browser/main-context';
import { RPCProtocol, RPCProtocolImpl } from '../../common/rpc-protocol';
import {
    Disposable, DisposableCollection, isCancelled,
    CommandRegistry, WillExecuteCommandEvent,
    CancellationTokenSource, ProgressService, nls,
    RpcProxy,
    MenuModelRegistry
} from '@theia/core';
import { PreferenceServiceImpl, PreferenceProviderProvider } from '@theia/core/lib/browser/preferences';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { PluginContributionHandler } from '../../main/browser/plugin-contribution-handler';
import { getQueryParameters } from '../../main/browser/env-main';
import { getPreferences } from '../../main/browser/preference-registry-main';
import { Deferred, waitForEvent } from '@theia/core/lib/common/promise-util';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
import { DebugConfigurationManager } from '@theia/debug/lib/browser/debug-configuration-manager';
import { Event, WaitUntilEvent } from '@theia/core/lib/common/event';
import { FileSearchService } from '@theia/file-search/lib/common/file-search-service';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { PluginViewRegistry } from '../../main/browser/view/plugin-view-registry';
import { WillResolveTaskProvider, TaskProviderRegistry, TaskResolverRegistry } from '@theia/task/lib/browser/task-contribution';
import { TaskDefinitionRegistry } from '@theia/task/lib/browser/task-definition-registry';
import { WebviewEnvironment } from '../../main/browser/webview/webview-environment';
import { WebviewWidget } from '../../main/browser/webview/webview';
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { TerminalService } from '@theia/terminal/lib/browser/base/terminal-service';
import URI from '@theia/core/lib/common/uri';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { environment } from '@theia/core/shared/@theia/application-package/lib/environment';
import { JsonSchemaStore } from '@theia/core/lib/browser/json-schema-store';
import { FileService, FileSystemProviderActivationEvent } from '@theia/filesystem/lib/browser/file-service';
import { PluginCustomEditorRegistry } from '../../main/browser/custom-editors/plugin-custom-editor-registry';
import { CustomEditorWidget } from '../../main/browser/custom-editors/custom-editor-widget';
import { StandaloneServices } from '@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices';
import { ILanguageService } from '@theia/monaco-editor-core/esm/vs/editor/common/languages/language';
import { LanguageService } from '@theia/monaco-editor-core/esm/vs/editor/common/services/languageService';
import { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } from '@theia/core/lib/common/message-rpc/uint8-array-message-buffer';
import { BasicChannel } from '@theia/core/lib/common/message-rpc/channel';
import { NotebookTypeRegistry, NotebookService, NotebookRendererMessagingService } from '@theia/notebook/lib/browser';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import {
    AbstractHostedPluginSupport, PluginContributions, PluginHost,
    ALL_ACTIVATION_EVENT, isConnectionScopedBackendPlugin
} from '../common/hosted-plugin';
import { isRemote } from '@theia/core/lib/browser/browser';
import { IAuthorizationService } from '../../common/authorization/i-authorization-service';
import { BaoskyConfigServer } from '@baosky/platform/lib/common/baosky-config/baosky-config-server';
import { UserLoginController } from '@baosky/project/lib/browser/es-server/controller/user-login-controller';
import { USER_NAME } from '@baosky/project/lib/browser/es-server/controller/impl/user-login-controller-impl';
import { EventId, SystemEventSubscriber } from '@baosky/platform/lib/browser/events';
import { UserLoginService } from '@baosky/platform/lib/browser/user-login/user-login-service';

export type DebugActivationEvent = 'onDebugResolve' | 'onDebugInitialConfigurations' | 'onDebugAdapterProtocolTracker' | 'onDebugDynamicConfigurations';

export const PluginProgressLocation = 'plugin';

@injectable()
export class HostedPluginSupport extends AbstractHostedPluginSupport<PluginManagerExt, RpcProxy<HostedPluginServer>> {

    protected static ADDITIONAL_ACTIVATION_EVENTS_ENV = 'ADDITIONAL_ACTIVATION_EVENTS';
    protected static BUILTIN_ACTIVATION_EVENTS = [
        '*',
        'onLanguage',
        'onCommand',
        'onDebug',
        'onDebugInitialConfigurations',
        'onDebugResolve',
        'onDebugAdapterProtocolTracker',
        'onDebugDynamicConfigurations',
        'onTaskType',
        'workspaceContains',
        'onView',
        'onUri',
        'onTerminalProfile',
        'onWebviewPanel',
        'onFileSystem',
        'onCustomEditor',
        'onStartupFinished',
        'onAuthenticationRequest',
        'onNotebook',
        'onNotebookSerializer'
    ];

    @inject(HostedPluginWatcher)
    protected readonly watcher: HostedPluginWatcher;

    @inject(PluginContributionHandler)
    protected readonly contributionHandler: PluginContributionHandler;

    @inject(PreferenceProviderProvider)
    protected readonly preferenceProviderProvider: PreferenceProviderProvider;

    @inject(PreferenceServiceImpl)
    protected readonly preferenceServiceImpl: PreferenceServiceImpl;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(NotebookService)
    protected readonly notebookService: NotebookService;

    @inject(NotebookRendererMessagingService)
    protected readonly notebookRendererMessagingService: NotebookRendererMessagingService;

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    @inject(DebugSessionManager)
    protected readonly debugSessionManager: DebugSessionManager;

    @inject(DebugConfigurationManager)
    protected readonly debugConfigurationManager: DebugConfigurationManager;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(FileSearchService)
    protected readonly fileSearchService: FileSearchService;

    @inject(FrontendApplicationStateService)
    protected readonly appState: FrontendApplicationStateService;

    @inject(NotebookTypeRegistry)
    protected readonly notebookTypeRegistry: NotebookTypeRegistry;

    @inject(PluginViewRegistry)
    protected readonly viewRegistry: PluginViewRegistry;

    @inject(TaskProviderRegistry)
    protected readonly taskProviderRegistry: TaskProviderRegistry;

    @inject(TaskResolverRegistry)
    protected readonly taskResolverRegistry: TaskResolverRegistry;

    @inject(TaskDefinitionRegistry)
    protected readonly taskDefinitionRegistry: TaskDefinitionRegistry;

    @inject(ProgressService)
    protected readonly progressService: ProgressService;

    @inject(WebviewEnvironment)
    protected readonly webviewEnvironment: WebviewEnvironment;

    @inject(WidgetManager)
    protected readonly widgets: WidgetManager;

    @inject(TerminalService)
    protected readonly terminalService: TerminalService;

    @inject(JsonSchemaStore)
    protected readonly jsonSchemaStore: JsonSchemaStore;

    @inject(PluginCustomEditorRegistry)
    protected readonly customEditorRegistry: PluginCustomEditorRegistry;

    @inject(ApplicationServer)
    protected readonly applicationServer: ApplicationServer;

    @inject(MenuModelRegistry)
    protected readonly menuModelRegistry: MenuModelRegistry;


    @inject(IAuthorizationService)
    protected readonly authorizationService: IAuthorizationService;

    @inject(BaoskyConfigServer)
    protected readonly baoskyConfigServer: BaoskyConfigServer;

    @inject(UserLoginController)
    protected readonly userLoginController: UserLoginController;

    @inject(UserLoginService)
    protected readonly userLoginService: UserLoginService;



    @inject(SystemEventSubscriber) protected readonly subscriber: SystemEventSubscriber;

    protected initialized: Promise<void>;

    protected userInfo: { userId?: string, isAdmin?: boolean } = {};

    protected _pluginsNeedRestart: boolean = false;

    constructor() {
        super(generateUuid());
    }

    @postConstruct()
    protected override init(): void {
        super.init();

        this.workspaceService.onWorkspaceChanged(() => this.updateStoragePath());

        const languageService = (StandaloneServices.get(ILanguageService) as LanguageService);
        for (const language of languageService['_requestedBasicLanguages'] as Set<string>) {
            this.activateByLanguage(language);
        }
        languageService.onDidRequestBasicLanguageFeatures(language => this.activateByLanguage(language));
        this.commands.onWillExecuteCommand(event => this.ensureCommandHandlerRegistration(event));
        this.debugSessionManager.onWillStartDebugSession(event => this.ensureDebugActivation(event));
        this.debugSessionManager.onWillResolveDebugConfiguration(event => this.ensureDebugActivation(event, 'onDebugResolve', event.debugType));
        this.debugConfigurationManager.onWillProvideDebugConfiguration(event => this.ensureDebugActivation(event, 'onDebugInitialConfigurations'));
        // Activate all providers of dynamic configurations, i.e. Let the user pick a configuration from all the available ones.
        this.debugConfigurationManager.onWillProvideDynamicDebugConfiguration(event => this.ensureDebugActivation(event, 'onDebugDynamicConfigurations', ALL_ACTIVATION_EVENT));
        this.viewRegistry.onDidExpandView(id => this.activateByView(id));
        this.taskProviderRegistry.onWillProvideTaskProvider(event => this.ensureTaskActivation(event));
        this.taskResolverRegistry.onWillProvideTaskResolver(event => this.ensureTaskActivation(event));
        this.fileService.onWillActivateFileSystemProvider(event => this.ensureFileSystemActivation(event));
        this.customEditorRegistry.onWillOpenCustomEditor(event => this.activateByCustomEditor(event));
        this.notebookService.onWillOpenNotebook(async event => this.activateByNotebook(event));
        this.notebookRendererMessagingService.onWillActivateRenderer(rendererId => this.activateByNotebookRenderer(rendererId));

        // Listen for authorization status changes and handle plugin activation/deactivation
        this.authorizationService.onDidUpdateAuthorizationStatus(event => {
            this.handleAuthorizationStatusChange(event.pluginId, event.status);
        });

        this.widgets.onDidCreateWidget(({ factoryId, widget }) => {
            // note: state restoration of custom editors is handled in `PluginCustomEditorRegistry.init`
            if (factoryId === WebviewWidget.FACTORY_ID && widget instanceof WebviewWidget) {
                const storeState = widget.storeState.bind(widget);
                const restoreState = widget.restoreState.bind(widget);

                widget.storeState = () => {
                    if (this.webviewRevivers.has(widget.viewType)) {
                        return storeState();
                    }
                    return undefined;
                };

                widget.restoreState = state => {
                    if (state.viewType) {
                        restoreState(state);
                        this.preserveWebview(widget);
                    } else {
                        widget.dispose();
                    }
                };
            }
        });
    }

    protected createTheiaReadyPromise(): Promise<unknown> {
        return Promise.all([this.preferenceServiceImpl.ready, this.workspaceService.roots]);
    }

    protected override runOperation(operation: () => Promise<void>): Promise<void> {
        return this.progressService.withProgress('', PluginProgressLocation, () => this.doLoad(this.userInfo));
    }

    override async onStart(container: interfaces.Container): Promise<void> {
        this.container = container;
        await this.initForUser().catch(console.error);
        this.load(this.userInfo);
        this.afterStart();
    }

    protected override async afterStart(): Promise<void> {

        this.watcher.onDidDeploy(async (userId) => {
            // if (await this.baoskyConfigServer.getESServerMode()) {
            //     const userInfo = await this.userLoginController.getCurrentUser();
            //     if (userId === userInfo.username)
            //         this.load(userId);
            // }
            // else
            //     this.load(userId)
            this.load(this.userInfo);

            //处理被卸载的插件
            // this.uninstalledPluginIds.map(async id => {
            //     try {
            //         if (this.contributions.has(id)) {
            //             await this.deactivatePlugin(id, 'unstalled');
            //             this.contributions.get(id)?.dispose();
            //         }
            //         // this.contributionHandler.disposePluginContributions(id);
            //     } catch (error) {
            //         this.logger.error('[PLUGIN-HOST]: Dispose plugin {id} failed.')
            //     }
            // })
        });
        this.server.onDidOpenConnection(() => {
            console.dir(`hosted-plugin listen OpenConnection`)
            this.load(this.userInfo)
        });
    }

    // Only load connection-scoped plugins
    protected acceptPlugin(plugin: DeployedPlugin): boolean {
        return isConnectionScopedBackendPlugin(plugin);
    }

    async initForUser(): Promise<void> {
        if (await this.baoskyConfigServer.getESServerMode()) {
            const self = this;
            try {
                // 尝试获取当前已登录用户
                const userInfo = await this.userLoginService.getCurrentUserName();
                if (userInfo && this.userLoginController.isAdminLogin()) {
                    this.userInfo.userId = 'admin';
                    this.userInfo.isAdmin = true;
                }
                else {
                    this.userInfo.userId = userInfo;
                    this.userInfo.isAdmin = false;
                }

                await self.pluginServer.deployPluginsForUser(this.userInfo.userId);
            } catch (error) {
                this.logger.error(`[PLUGIN-HOST] 用户暂未登录`);
            }
            this.subscriber.subscribe(EventId.LOGIN, {
                notify: async (event) => {
                    let username = event.get(USER_NAME);
                    if (this.userLoginController.isAdminLogin()) {
                        self.userInfo.isAdmin = true;
                        username = 'admin'
                    }
                    else
                        self.userInfo.isAdmin = false;

                    if (self.userInfo.userId !== username) {
                        self.userInfo.userId = username ?? '';
                        await self.pluginServer.deployPluginsForUser(username);
                        this.load(self.userInfo);
                    }
                }
            });
        }
    }

    //保证某用户的插件部署完成
    protected async ensureUserPluginsDeployed(): Promise<void> {
        if (await this.baoskyConfigServer.getESServerMode()) {
            const username = await this.userLoginService.getCurrentUserName();
            try {
                await this.pluginServer.deployPluginsForUser(username);
                this.onUserPluginsDeployedEmitter.fire(username)
            } catch (error) {
                this.logger.error(`[PLUGIN-HOST]: 用户 ${username} 插件部署失败`, error)
            }
        }
        return;
    }

    protected async deactivatePlugin(pluginId: string, reason?: string): Promise<void> {
        super.deactivatePlugin(pluginId, reason);
    }

    protected override async beforeSyncPlugins(toDisconnect: DisposableCollection): Promise<void> {
        await super.beforeSyncPlugins(toDisconnect);

        toDisconnect.push(Disposable.create(() => this.preserveWebviews()));
        this.server.onDidCloseConnection(() => toDisconnect.dispose());
    }

    protected override async beforeLoadContributions(toDisconnect: DisposableCollection): Promise<void> {
        // make sure that the previous state, including plugin widgets, is restored
        // and core layout is initialized, i.e. explorer, scm, debug views are already added to the shell
        // but shell is not yet revealed
        await this.appState.reachedState('initialized_layout');
    }

    protected override async afterLoadContributions(toDisconnect: DisposableCollection): Promise<void> {
        await this.viewRegistry.initWidgets();
        // remove restored plugin widgets which were not registered by contributions
        this.viewRegistry.removeStaleWidgets();
    }

    protected handleContributions(plugin: DeployedPlugin): Disposable {
        return this.contributionHandler.handleContributions(this.clientId, plugin);
    }

    protected override handlePluginStarted(manager: PluginManagerExt, plugin: DeployedPlugin): void {
        this.activateByWorkspaceContains(manager, plugin);
    }

    protected async obtainManager(host: string, hostContributions: PluginContributions[], toDisconnect: DisposableCollection): Promise<PluginManagerExt | undefined> {
        let manager = this.managers.get(host);
        if (!manager) {
            const pluginId = getPluginId(hostContributions[0].plugin.metadata.model);
            const rpc = this.initRpc(host, pluginId);
            toDisconnect.push(rpc);

            manager = rpc.getProxy(MAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT);
            this.managers.set(host, manager);
            toDisconnect.push(Disposable.create(() => this.managers.delete(host)));

            const [extApi, globalState, workspaceState, webviewResourceRoot, webviewCspSource, defaultShell, jsonValidation] = await Promise.all([
                this.server.getExtPluginAPI(),
                this.pluginServer.getAllStorageValues(undefined),
                this.pluginServer.getAllStorageValues({
                    workspace: this.workspaceService.workspace?.resource.toString(),
                    roots: this.workspaceService.tryGetRoots().map(root => root.resource.toString())
                }),
                this.webviewEnvironment.resourceRoot(host),
                this.webviewEnvironment.cspSource(),
                this.terminalService.getDefaultShell(),
                this.jsonSchemaStore.schemas
            ]);
            if (toDisconnect.disposed) {
                return undefined;
            }

            const isElectron = environment.electron.is();

            const supportedActivationEvents = [...HostedPluginSupport.BUILTIN_ACTIVATION_EVENTS];
            const [additionalActivationEvents, appRoot] = await Promise.all([
                this.envServer.getValue(HostedPluginSupport.ADDITIONAL_ACTIVATION_EVENTS_ENV),
                this.applicationServer.getApplicationRoot()
            ]);
            if (additionalActivationEvents && additionalActivationEvents.value) {
                additionalActivationEvents.value.split(',').forEach(event => supportedActivationEvents.push(event));
            }

            await manager.$init({
                preferences: getPreferences(this.preferenceProviderProvider, this.workspaceService.tryGetRoots()),
                globalState,
                workspaceState,
                env: {
                    queryParams: getQueryParameters(),
                    language: nls.locale || nls.defaultLocale,
                    shell: defaultShell,
                    uiKind: isElectron ? UIKind.Desktop : UIKind.Web,
                    appName: FrontendApplicationConfigProvider.get().applicationName,
                    appHost: isElectron ? 'desktop' : 'web', // TODO: 'web' could be the embedder's name, e.g. 'github.dev'
                    appRoot,
                    appUriScheme: FrontendApplicationConfigProvider.get().electron.uriScheme
                },
                extApi,
                webview: {
                    webviewResourceRoot,
                    webviewCspSource
                },
                jsonValidation,
                pluginKind: isRemote ? ExtensionKind.Workspace : ExtensionKind.UI,
                supportedActivationEvents
            });
            if (toDisconnect.disposed) {
                return undefined;
            }
            this.activationEvents.forEach(event => manager!.$activateByEvent(event));
        }
        return manager;
    }

    protected initRpc(host: PluginHost, pluginId: string): RPCProtocol {
        const rpc = host === 'frontend' ? new PluginWorker().rpc : this.createServerRpc(host);
        setUpPluginApi(rpc, this.container);
        this.mainPluginApiProviders.getContributions().forEach(p => p.initialize(rpc, this.container));
        return rpc;
    }

    protected createServerRpc(pluginHostId: string): RPCProtocol {

        const channel = new BasicChannel(() => {
            const writer = new Uint8ArrayWriteBuffer();
            writer.onCommit(buffer => {
                this.server.onMessage(pluginHostId, buffer);
            });
            return writer;
        });

        // Create RPC protocol before adding the listener to the watcher to receive the watcher's cached messages after the rpc protocol was created.
        const rpc = new RPCProtocolImpl(channel);

        this.watcher.onPostMessageEvent(received => {
            if (pluginHostId === received.pluginHostId) {
                channel.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(received.message));
            }
        });

        return rpc;
    }

    protected async updateStoragePath(): Promise<void> {
        const path = await this.getStoragePath();
        for (const manager of this.managers.values()) {
            manager.$updateStoragePath(path);
        }
    }

    protected async getStoragePath(): Promise<string | undefined> {
        const roots = await this.workspaceService.roots;
        return this.pluginPathsService.getHostStoragePath(this.workspaceService.workspace?.resource.toString(), roots.map(root => root.resource.toString()));
    }

    protected async getHostGlobalStoragePath(): Promise<string> {
        const configDirUri = await this.envServer.getConfigDirUri();
        const globalStorageFolderUri = new URI(configDirUri).resolve('globalStorage');

        // Make sure that folder by the path exists
        if (!await this.fileService.exists(globalStorageFolderUri)) {
            await this.fileService.createFolder(globalStorageFolderUri, { fromUserGesture: false });
        }
        const globalStorageFolderFsPath = await this.fileService.fsPath(globalStorageFolderUri);
        if (!globalStorageFolderFsPath) {
            throw new Error(`Could not resolve the FS path for URI: ${globalStorageFolderUri}`);
        }
        return globalStorageFolderFsPath;
    }

    async activateByViewContainer(viewContainerId: string): Promise<void> {
        await Promise.all(this.viewRegistry.getContainerViews(viewContainerId).map(viewId => this.activateByView(viewId)));
    }

    async activateByView(viewId: string): Promise<void> {
        await this.activateByEvent(`onView:${viewId}`);
    }

    async activateByLanguage(languageId: string): Promise<void> {
        await this.activateByEvent('onLanguage');
        await this.activateByEvent(`onLanguage:${languageId}`);
    }

    async activateByUri(scheme: string, authority: string): Promise<void> {
        await this.activateByEvent(`onUri:${scheme}://${authority}`);
    }

    async activateByCommand(commandId: string): Promise<void> {
        await this.activateByEvent(`onCommand:${commandId}`);
    }

    async activateByTaskType(taskType: string): Promise<void> {
        await this.activateByEvent(`onTaskType:${taskType}`);
    }

    async activateByCustomEditor(viewType: string): Promise<void> {
        await this.activateByEvent(`onCustomEditor:${viewType}`);
    }

    async activateByNotebook(viewType: string): Promise<void> {
        await this.activateByEvent(`onNotebook:${viewType}`);
    }

    async activateByNotebookSerializer(viewType: string): Promise<void> {
        await this.activateByEvent(`onNotebookSerializer:${viewType}`);
    }

    async activateByNotebookRenderer(rendererId: string): Promise<void> {
        await this.activateByEvent(`onRenderer:${rendererId}`);
    }

    activateByFileSystem(event: FileSystemProviderActivationEvent): Promise<void> {
        return this.activateByEvent(`onFileSystem:${event.scheme}`);
    }

    activateByTerminalProfile(profileId: string): Promise<void> {
        return this.activateByEvent(`onTerminalProfile:${profileId}`);
    }

    protected ensureFileSystemActivation(event: FileSystemProviderActivationEvent): void {
        event.waitUntil(this.activateByFileSystem(event).then(() => {
            if (!this.fileService.hasProvider(event.scheme)) {
                return waitForEvent(Event.filter(this.fileService.onDidChangeFileSystemProviderRegistrations,
                    ({ added, scheme }) => added && scheme === event.scheme), 3000);
            }
        }));
    }

    protected ensureCommandHandlerRegistration(event: WillExecuteCommandEvent): void {
        const activation = this.activateByCommand(event.commandId);
        if (this.commands.getCommand(event.commandId) &&
            (!this.contributionHandler.hasCommand(event.commandId) ||
                this.contributionHandler.hasCommandHandler(event.commandId))) {
            return;
        }
        const waitForCommandHandler = new Deferred<void>();
        const listener = this.contributionHandler.onDidRegisterCommandHandler(id => {
            if (id === event.commandId) {
                listener.dispose();
                waitForCommandHandler.resolve();
            }
        });
        const p = Promise.all([
            activation,
            waitForCommandHandler.promise
        ]);
        p.then(() => listener.dispose(), () => listener.dispose());
        event.waitUntil(p);
    }

    protected ensureTaskActivation(event: WillResolveTaskProvider): void {
        const promises = [this.activateByCommand('workbench.action.tasks.runTask')];
        const taskType = event.taskType;
        if (taskType) {
            if (taskType === ALL_ACTIVATION_EVENT) {
                for (const taskDefinition of this.taskDefinitionRegistry.getAll()) {
                    promises.push(this.activateByTaskType(taskDefinition.taskType));
                }
            } else {
                promises.push(this.activateByTaskType(taskType));
            }
        }

        event.waitUntil(Promise.all(promises));
    }

    protected ensureDebugActivation(event: WaitUntilEvent, activationEvent?: DebugActivationEvent, debugType?: string): void {
        event.waitUntil(this.activateByDebug(activationEvent, debugType));
    }

    async activateByDebug(activationEvent?: DebugActivationEvent, debugType?: string): Promise<void> {
        const promises = [this.activateByEvent('onDebug')];
        if (activationEvent) {
            promises.push(this.activateByEvent(activationEvent));
            if (debugType) {
                promises.push(this.activateByEvent(activationEvent + ':' + debugType));
            }
        }
        await Promise.all(promises);
    }

    protected async activateByWorkspaceContains(manager: PluginManagerExt, plugin: DeployedPlugin): Promise<void> {
        const activationEvents = plugin.contributes && plugin.contributes.activationEvents;
        if (!activationEvents) {
            return;
        }
        const paths: string[] = [];
        const includePatterns: string[] = [];
        // should be aligned with https://github.com/microsoft/vscode/blob/da5fb7d5b865aa522abc7e82c10b746834b98639/src/vs/workbench/api/node/extHostExtensionService.ts#L460-L469
        for (const activationEvent of activationEvents) {
            if (/^workspaceContains:/.test(activationEvent)) {
                const fileNameOrGlob = activationEvent.substring('workspaceContains:'.length);
                if (fileNameOrGlob.indexOf(ALL_ACTIVATION_EVENT) >= 0 || fileNameOrGlob.indexOf('?') >= 0) {
                    includePatterns.push(fileNameOrGlob);
                } else {
                    paths.push(fileNameOrGlob);
                }
            }
        }
        const activatePlugin = () => manager.$activateByEvent(`onPlugin:${plugin.metadata.model.id}`);
        const promises: Promise<boolean>[] = [];
        if (paths.length) {
            promises.push(this.workspaceService.containsSome(paths));
        }
        if (includePatterns.length) {
            const tokenSource = new CancellationTokenSource();
            const searchTimeout = setTimeout(() => {
                tokenSource.cancel();
                // activate eagerly if took to long to search
                activatePlugin();
            }, 7000);
            promises.push((async () => {
                try {
                    const result = await this.fileSearchService.find('', {
                        rootUris: this.workspaceService.tryGetRoots().map(r => r.resource.toString()),
                        includePatterns,
                        limit: 1
                    }, tokenSource.token);
                    return result.length > 0;
                } catch (e) {
                    if (!isCancelled(e)) {
                        console.error(e);
                    }
                    return false;
                } finally {
                    clearTimeout(searchTimeout);
                }
            })());
        }
        if (promises.length && await Promise.all(promises).then(exists => exists.some(v => v))) {
            await activatePlugin();
        }
    }

    protected readonly webviewsToRestore = new Map<string, WebviewWidget>();
    protected readonly webviewRevivers = new Map<string, (webview: WebviewWidget) => Promise<void>>();

    registerWebviewReviver(viewType: string, reviver: (webview: WebviewWidget) => Promise<void>): void {
        if (this.webviewRevivers.has(viewType)) {
            throw new Error(`Reviver for ${viewType} already registered`);
        }
        this.webviewRevivers.set(viewType, reviver);

        if (this.webviewsToRestore.has(viewType)) {
            this.restoreWebview(this.webviewsToRestore.get(viewType) as WebviewWidget);
        }
    }

    unregisterWebviewReviver(viewType: string): void {
        this.webviewRevivers.delete(viewType);
    }

    protected async preserveWebviews(): Promise<void> {
        for (const webview of this.widgets.getWidgets(WebviewWidget.FACTORY_ID)) {
            this.preserveWebview(webview as WebviewWidget);
        }
        for (const webview of this.widgets.getWidgets(CustomEditorWidget.FACTORY_ID)) {
            (webview as CustomEditorWidget).modelRef.dispose();
            if ((webview as any)['closeWithoutSaving']) {
                delete (webview as any)['closeWithoutSaving'];
            }
            this.customEditorRegistry.resolveWidget(webview as CustomEditorWidget);
        }
    }

    protected preserveWebview(webview: WebviewWidget): void {
        if (!this.webviewsToRestore.has(webview.viewType)) {
            this.activateByEvent(`onWebviewPanel:${webview.viewType}`);
            this.webviewsToRestore.set(webview.viewType, webview);
            webview.disposed.connect(() => this.webviewsToRestore.delete(webview.viewType));
        }
    }

    protected async restoreWebview(webview: WebviewWidget): Promise<void> {
        const restore = this.webviewRevivers.get(webview.viewType);
        if (restore) {
            try {
                await restore(webview);
            } catch (e) {
                webview.setHTML(this.getDeserializationFailedContents(`
                An error occurred while restoring '${webview.viewType}' view. Please check logs.
                `));
                console.error('Failed to restore the webview', e);
            }
        }
    }

    protected getDeserializationFailedContents(message: string): string {
        return `<!DOCTYPE html>
        <html>
            <head>
                <meta http-equiv="Content-type" content="text/html;charset=UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
            </head>
            <body>${message}</body>
        </html>`;
    }

    /**
     * Handle plugin authorization status changes
     */
    protected async handleAuthorizationStatusChange(pluginId: string, status: string): Promise<void> {

        let unversionedId: PluginIdentifiers.UnversionedId;
        if (pluginId.includes('.')) {
            unversionedId = pluginId as PluginIdentifiers.UnversionedId;
        } else {
            unversionedId = `${PluginIdentifiers.UNPUBLISHED}.${pluginId}` as PluginIdentifiers.UnversionedId;
        }
        if (status === 'granted') {

            try {
                const contributions = this.contributions.get(unversionedId);
                if (contributions && contributions.plugin) {
                    const disposable = this.contributionHandler.handleContributions(this.clientId, contributions.plugin);
                    contributions.push(disposable);
                }
                // Activate the plugin
                await this.activatePlugin(pluginId);
                console.log(`[PLUGIN-HOST] Successfully reauthorized and activated plugin: ${pluginId}`);
            } catch (error) {
                console.error(`[PLUGIN-HOST] Failed to reauthorize plugin ${pluginId}:`, error);
                this.load();
            }

        } else if (status === 'denied') {
            console.log(`[PLUGIN-HOST] Deactivating unauthorized plugin: ${pluginId}`);
            this.deactivatePlugin(pluginId, 'unauthorized')

            this.contributionHandler.disposePluginContributions(unversionedId);
            console.log(`[PLUGIN-HOST] Cleaned up contributions for plugin: ${unversionedId}`);
        }
    }

    /**
     * Check if plugins need restart
     */
    get pluginsNeedRestart(): boolean {
        return this._pluginsNeedRestart;
    }

    /**
     * Set whether plugins need to be restarted
     */
    setPluginsNeedRestart(value: boolean): void {
        this._pluginsNeedRestart = value;
    }

    /**
     * Restart the plugin system without reloading the window
     */
    async restartPluginSystem(): Promise<void> {
        console.log('[PLUGIN-HOST] Restarting plugin system...');

        try {
            // Set flag to false since we're restarting now
            this._pluginsNeedRestart = false;

            // Reload plugins which will filter out disabled ones
            await this.load(this.userInfo);

            console.log('[PLUGIN-HOST] Plugin system restarted successfully');
        } catch (error) {
            console.error('[PLUGIN-HOST] Failed to restart plugin system:', error);
            this._pluginsNeedRestart = true; // Set back to true if restart failed
            throw error;
        }
    }

    /**
     * Stop and cleanup a specific plugin
     */
    async stopPlugin(pluginId: string): Promise<void> {
        console.log(`[PLUGIN-HOST] Stopping plugin: ${pluginId}`);

        try {
            const unversionedId = pluginId as PluginIdentifiers.UnversionedId;

            // Stop the plugin in all managers
            await this.deactivatePlugin(pluginId, 'disabled');

            // Only dispose UI contributions, not the entire contributions collection
            // This keeps the plugin in the contributions map so getPlugin() still works
            // We manually dispose individual disposables instead of calling contributions.dispose()
            // which would trigger the delete callback
            const contributions = this.contributions.get(unversionedId);
            if (contributions) {
                // Create a new disposable collection with the same disposables
                // but without the one that deletes from contributions map
                const disposablesToKeep: any[] = [];

                // Dispose all disposables except we keep the contributions object itself
                while (contributions['disposables'] && contributions['disposables'].length > 0) {
                    const disposable = contributions['disposables'].pop();
                    // Don't execute the disposable that would delete from contributions map
                    // Just clear the array
                }
            }

            console.log(`[PLUGIN-HOST] Plugin ${pluginId} stopped successfully`);
        } catch (error) {
            console.error(`[PLUGIN-HOST] Failed to stop plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Reload a plugin - re-register contributions and activate it
     */
    async reloadPlugin(pluginId: string): Promise<void> {
        console.log(`[PLUGIN-HOST] Reloading plugin: ${pluginId}`);

        try {
            const unversionedId = pluginId as PluginIdentifiers.UnversionedId;

            // Get contributions for this plugin
            const contributions = this.contributions.get(unversionedId);
            if (!contributions || !contributions.plugin) {
                throw new Error(`Plugin ${pluginId} contributions not found`);
            }

            const plugin = contributions.plugin;

            // Re-register contributions (contributions were disposed but container still exists)
            const disposable = this.contributionHandler.handleContributions(this.clientId, plugin);
            contributions.push(disposable);

            // Get the manager for this plugin's host
            const host = plugin.metadata.host;
            const manager = this.managers.get(host);
            if (!manager) {
                throw new Error(`Manager for host '${host}' not found`);
            }

            // Get storage paths
            const [hostLogPath, hostStoragePath, hostGlobalStoragePath] = await Promise.all([
                this.pluginPathsService.getHostLogPath(),
                this.getStoragePath(),
                this.getHostGlobalStoragePath()
            ]);

            // Restart the plugin in the manager
            await manager.$start({
                plugins: [plugin.metadata],
                configStorage: {
                    hostLogPath,
                    hostStoragePath,
                    hostGlobalStoragePath
                },
                activationEvents: [...this.activationEvents]
            });

            // Update contribution state
            contributions.state = PluginContributions.State.STARTED;

            console.log(`[PLUGIN-HOST] Plugin ${pluginId} reloaded successfully`);
        } catch (error) {
            console.error(`[PLUGIN-HOST] Failed to reload plugin ${pluginId}:`, error);
            throw error;
        }
    }

}

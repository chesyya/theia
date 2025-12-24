import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { CustomEditor, DeployedPlugin } from '../../../common';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { CustomEditorOpener } from './custom-editor-opener';
import { Emitter } from '@theia/core';
import { ApplicationShell, DefaultOpenerService, OpenWithService, PreferenceService, WidgetManager } from '@theia/core/lib/browser';
import { CustomEditorWidget } from './custom-editor-widget';

@injectable()
export class PluginCustomEditorRegistry {
    private readonly editors = new Map<string, CustomEditor>();
    private readonly pendingEditors = new Map<CustomEditorWidget, { deferred: Deferred<void>, disposable: Disposable }>();
    private readonly resolvers = new Map<string, (widget: CustomEditorWidget) => Promise<void>>();

    private readonly onWillOpenCustomEditorEmitter = new Emitter<string>();
    readonly onWillOpenCustomEditor = this.onWillOpenCustomEditorEmitter.event;

    @inject(DefaultOpenerService)
    protected readonly defaultOpenerService: DefaultOpenerService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(OpenWithService)
    protected readonly openWithService: OpenWithService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @postConstruct()
    protected init(): void {
        this.widgetManager.onDidCreateWidget(({ factoryId, widget }) => {
            if (factoryId === CustomEditorWidget.FACTORY_ID && widget instanceof CustomEditorWidget) {
                const restoreState = widget.restoreState.bind(widget);

                widget.restoreState = state => {
                    if (state.viewType && state.strResource) {
                        restoreState(state);
                        this.resolveWidget(widget);
                    } else {
                        widget.dispose();
                    }
                };
            }
        });
    }

    registerCustomEditor(editor: CustomEditor, plugin: DeployedPlugin): Disposable {
        if (this.editors.has(editor.viewType)) {
            console.warn('editor with such id already registered: ', JSON.stringify(editor));
            return Disposable.NULL;
        }
        this.editors.set(editor.viewType, editor);

        const toDispose = new DisposableCollection();
        toDispose.push(Disposable.create(() => this.editors.delete(editor.viewType)));

        const editorOpenHandler = new CustomEditorOpener(
            editor,
            this.shell,
            this.widgetManager,
            this,
            this.preferenceService
        );
        toDispose.push(this.defaultOpenerService.addHandler(editorOpenHandler));
        toDispose.push(
            this.openWithService.registerHandler({
                id: editor.viewType,
                label: editorOpenHandler.label,
                providerName: plugin.metadata.model.displayName,
                canHandle: uri => editorOpenHandler.canOpenWith(uri),
                open: uri => editorOpenHandler.open(uri)
            })
        );
        return toDispose;
    }

    async resolveWidget(widget: CustomEditorWidget): Promise<void> {
        const resolver = this.resolvers.get(widget.viewType);
        if (resolver) {
            await resolver(widget);
        } else {
            const deferred = new Deferred<void>();
            const disposable = widget.onDidDispose(() => this.pendingEditors.delete(widget));
            this.pendingEditors.set(widget, { deferred, disposable });
            this.onWillOpenCustomEditorEmitter.fire(widget.viewType);
            return deferred.promise;
        }
    };

    registerResolver(viewType: string, resolver: (widget: CustomEditorWidget) => Promise<void>): Disposable {
        if (this.resolvers.has(viewType)) {
            throw new Error(`Resolver for ${viewType} already registered`);
        }

        for (const [editorWidget, { deferred, disposable }] of this.pendingEditors.entries()) {
            if (editorWidget.viewType === viewType) {
                resolver(editorWidget).then(() => deferred.resolve(), err => deferred.reject(err)).finally(() => disposable.dispose());
                this.pendingEditors.delete(editorWidget);
            }
        }

        this.resolvers.set(viewType, resolver);
        return Disposable.create(() => this.resolvers.delete(viewType));
    }
}

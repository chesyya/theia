import { ApplicationShell, FocusTracker, Widget } from '@theia/core/lib/browser';
import { ContextKey, ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { CustomEditorWidget } from '../custom-editors/custom-editor-widget';
import { WebviewWidget } from './webview';

@injectable()
export class WebviewContextKeys {

    /**
     * Context key representing the `viewType` of the active `WebviewWidget`, if any.
     */
    activeWebviewPanelId: ContextKey<string>;

    /**
     * Context key representing the `viewType` of the active `CustomEditorWidget`, if any.
     */
    activeCustomEditorId: ContextKey<string>;

    @inject(ApplicationShell)
    protected applicationShell: ApplicationShell;

    @inject(ContextKeyService)
    protected contextKeyService: ContextKeyService;

    @postConstruct()
    protected init(): void {
        this.activeWebviewPanelId = this.contextKeyService.createKey('activeWebviewPanelId', '');
        this.activeCustomEditorId = this.contextKeyService.createKey('activeCustomEditorId', '');
        this.applicationShell.onDidChangeCurrentWidget(this.handleDidChangeCurrentWidget, this);
    }

    protected handleDidChangeCurrentWidget(change: FocusTracker.IChangedArgs<Widget>): void {
        const { newValue } = change;
        if (newValue instanceof CustomEditorWidget) {
            this.activeCustomEditorId.set(newValue.viewType);
        } else {
            this.activeCustomEditorId.set('');
        }
        if (newValue instanceof WebviewWidget) {
            this.activeWebviewPanelId.set(newValue.viewType);
        } else {
            this.activeWebviewPanelId.set('');
        }
    }
}

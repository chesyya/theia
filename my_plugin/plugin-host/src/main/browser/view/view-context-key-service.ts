import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { ContextKey, ContextKeyService } from '@theia/core/lib/browser/context-key-service';

@injectable()
export class ViewContextKeyService {
    protected _viewItem: ContextKey<string>;
    get viewItem(): ContextKey<string> {
        return this._viewItem;
    }

    // for the next three keys, see https://code.visualstudio.com/api/references/when-clause-contexts#visible-view-container-when-clause-context

    protected _activeViewlet: ContextKey<string>;
    get activeViewlet(): ContextKey<string> {
        return this._activeViewlet;
    }

    protected _activePanel: ContextKey<string>;
    get activePanel(): ContextKey<string> {
        return this._activePanel;
    }

    protected _activeAuxiliary: ContextKey<string>;
    get activeAuxiliary(): ContextKey<string> {
        return this._activeAuxiliary;
    }

    protected _focusedView: ContextKey<string>;
    get focusedView(): ContextKey<string> {
        return this._focusedView;
    }

    @inject(ContextKeyService)
    protected readonly contextKeyService: ContextKeyService;

    @postConstruct()
    protected init(): void {
        this._viewItem = this.contextKeyService.createKey('viewItem', '');
        this._activeViewlet = this.contextKeyService.createKey('activeViewlet', '');
        this._activePanel = this.contextKeyService.createKey('activePanel', '');
        this._activeAuxiliary = this.contextKeyService.createKey('activeAuxiliary', '');
        this._focusedView = this.contextKeyService.createKey('focusedView', '');
    }

    match(expression: string | undefined): boolean {
        return !expression || this.contextKeyService.match(expression);
    }
}

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ContextKeyService, ContextKey } from '@theia/core/lib/browser/context-key-service';
import { Emitter } from '@theia/core/lib/common';

@injectable()
export class CommentsContextKeyService {

    @inject(ContextKeyService)
    protected readonly contextKeyService: ContextKeyService;
    protected readonly contextKeys: Set<string> = new Set();
    protected readonly onDidChangeEmitter = new Emitter<void>();
    readonly onDidChange = this.onDidChangeEmitter.event;
    protected _commentIsEmpty: ContextKey<boolean>;
    protected _commentController: ContextKey<string | undefined>;
    protected _comment: ContextKey<string | undefined>;

    get commentController(): ContextKey<string | undefined> {
        return this._commentController;
    }

    get comment(): ContextKey<string | undefined> {
        return this._comment;
    }

    get commentIsEmpty(): ContextKey<boolean> {
        return this._commentIsEmpty;
    }

    @postConstruct()
    protected init(): void {
        this.contextKeys.add('commentIsEmpty');
        this._commentController = this.contextKeyService.createKey<string | undefined>('commentController', undefined);
        this._comment = this.contextKeyService.createKey<string | undefined>('comment', undefined);
        this._commentIsEmpty = this.contextKeyService.createKey<boolean>('commentIsEmpty', true);
        this.contextKeyService.onDidChange(event => {
            if (event.affects(this.contextKeys)) {
                this.onDidChangeEmitter.fire();
            }
        });
    }

    setExpression(expression: string): void {
        this.contextKeyService.parseKeys(expression)?.forEach(key => {
            this.contextKeys.add(key);
        });
    }

    match(expression: string | undefined): boolean {
        return !expression || this.contextKeyService.match(expression);
    }

}

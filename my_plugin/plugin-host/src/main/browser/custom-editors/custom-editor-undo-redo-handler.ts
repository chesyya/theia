import { inject, injectable } from '@theia/core/shared/inversify';
import { ApplicationShell, UndoRedoHandler } from '@theia/core/lib/browser';
import { CustomEditorWidget } from './custom-editor-widget';

@injectable()
export class CustomEditorUndoRedoHandler implements UndoRedoHandler<CustomEditorWidget> {

    @inject(ApplicationShell)
    protected readonly applicationShell: ApplicationShell;

    priority = 190;
    select(): CustomEditorWidget | undefined {
        const current = this.applicationShell.currentWidget;
        if (current instanceof CustomEditorWidget) {
            return current;
        }
        return undefined;
    }
    undo(item: CustomEditorWidget): void {
        item.undo();
    }
    redo(item: CustomEditorWidget): void {
        item.redo();
    }
}

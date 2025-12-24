import { Event, Emitter } from '@theia/core';
import { MonacoEditorModel, WillSaveMonacoModelEvent } from '@theia/monaco/lib/browser/monaco-editor-model';
import { injectable, inject } from '@theia/core/shared/inversify';
import { MonacoTextModelService } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { MonacoWorkspace } from '@theia/monaco/lib/browser/monaco-workspace';
import { Schemes } from '../../common/uri-components';
import URI from '@theia/core/lib/common/uri';
import { Reference } from '@theia/core/lib/common/reference';

@injectable()
export class EditorModelService {

    private monacoModelService: MonacoTextModelService;
    private modelModeChangedEmitter = new Emitter<{ model: MonacoEditorModel, oldModeId: string }>();
    private onModelRemovedEmitter = new Emitter<MonacoEditorModel>();
    private modelDirtyEmitter = new Emitter<MonacoEditorModel>();
    private modelSavedEmitter = new Emitter<MonacoEditorModel>();
    private onModelWillSavedEmitter = new Emitter<WillSaveMonacoModelEvent>();

    readonly onModelDirtyChanged = this.modelDirtyEmitter.event;
    readonly onModelSaved = this.modelSavedEmitter.event;
    readonly onModelModeChanged = this.modelModeChangedEmitter.event;
    readonly onModelRemoved = this.onModelRemovedEmitter.event;
    readonly onModelWillSave = this.onModelWillSavedEmitter.event;

    constructor(@inject(MonacoTextModelService) monacoModelService: MonacoTextModelService,
        @inject(MonacoWorkspace) monacoWorkspace: MonacoWorkspace) {

        this.monacoModelService = monacoModelService;
        monacoModelService.models.forEach(model => this.modelCreated(model));
        monacoModelService.onDidCreate(this.modelCreated, this);
        monacoWorkspace.onDidCloseTextDocument(model => {
            setTimeout(() => {
                this.onModelRemovedEmitter.fire(model);
            }, 1);
        });
    }

    private modelCreated(model: MonacoEditorModel): void {
        model.textEditorModel.onDidChangeLanguage(e => {
            this.modelModeChangedEmitter.fire({ model, oldModeId: e.oldLanguage });
        });

        model.onDidSaveModel(_ => {
            this.modelSavedEmitter.fire(model);
        });

        model.onDirtyChanged(_ => {
            this.modelDirtyEmitter.fire(model);
        });
        model.onWillSaveModel(willSaveModelEvent => {
            this.onModelWillSavedEmitter.fire(willSaveModelEvent);
        });
    }

    get onModelAdded(): Event<MonacoEditorModel> {
        return this.monacoModelService.onDidCreate;
    }

    getModels(): MonacoEditorModel[] {
        return this.monacoModelService.models;
    }

    async save(uri: URI): Promise<boolean> {
        const model = this.monacoModelService.get(uri.toString());
        if (model) {
            await model.save();
            return true;
        }
        return false;
    }

    async saveAll(includeUntitled?: boolean): Promise<boolean> {
        const saves: any[] = [];
        for (const model of this.monacoModelService.models) {
            const { uri } = model.textEditorModel;
            if (model.dirty && (includeUntitled || uri.scheme !== Schemes.untitled)) {
                saves.push((async () => {
                    try {
                        await model.save();
                        return true;
                    } catch (e) {
                        console.error('Failed to save ', uri.toString(), e);
                        return false;
                    }
                })());
            }
        }
        const results = await Promise.all(saves);
        return results.reduce((a, b) => a && b, true);
    }

    async createModelReference(uri: URI): Promise<Reference<MonacoEditorModel>> {
        return this.monacoModelService.createModelReference(uri);
    }
}

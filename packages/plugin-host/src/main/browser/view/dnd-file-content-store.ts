import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class DnDFileContentStore {
    private static id: number = 0;
    private files: Map<string, File> = new Map();

    addFile(f: File): string {
        const id = (DnDFileContentStore.id++).toString();
        this.files.set(id, f);
        return id;
    }

    removeFile(id: string): boolean {
        return this.files.delete(id);
    }

    getFile(id: string): File {
        const file = this.files.get(id);
        if (file) {
            return file;
        }

        throw new Error(`File with id ${id} not found in dnd operation`);
    }
}

import { BSXExtension } from "../browser/bsx-extension";

export const BSXExtensionsModel = Symbol('BSXExtensionsModel');
export interface BSXExtensionsModel {
    getExtension(id: string): BSXExtension | undefined;

    refresh(id: string, version?: string): Promise<BSXExtension | undefined>;

}

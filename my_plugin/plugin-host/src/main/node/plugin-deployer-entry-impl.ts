import { PluginDeployerEntry, PluginDeployerEntryType, PluginType } from '../../common/plugin-protocol';
import { promises as fs } from 'fs';

export class PluginDeployerEntryImpl implements PluginDeployerEntry {

    private initPath: string;

    private currentPath: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private map: Map<string, any>;

    private resolved: boolean;
    private acceptedTypes: PluginDeployerEntryType[];

    private changes: string[];

    private resolvedByName: string;

    private _type = PluginType.System;
    private _rootPath: string | undefined;

    constructor(readonly originId: string, readonly pluginId: string, initPath?: string) {
        this.map = new Map();
        this.changes = [];
        this.acceptedTypes = [];
        if (initPath) {
            this.currentPath = initPath;
            this.initPath = initPath;
            this.resolved = true;
        } else {
            this.resolved = false;
        }
    }

    id(): string {
        return this.pluginId;
    }
    originalPath(): string {
        return this.initPath;
    }
    path(): string {
        return this.currentPath;
    }
    getValue<T>(key: string): T {
        return this.map.get(key);
    }
    storeValue<T>(key: string, value: T): void {
        this.map.set(key, value);
    }
    updatePath(newPath: string, transformerName?: string): void {
        if (transformerName) {
            this.changes.push(transformerName);
        }
        this.currentPath = newPath;
    }
    getChanges(): string[] {
        return this.changes;
    }
    async isFile(): Promise<boolean> {
        try {
            const stat = await fs.stat(this.currentPath);
            return stat.isFile();
        } catch {
            return false;
        }
    }
    async isDirectory(): Promise<boolean> {
        try {
            const stat = await fs.stat(this.currentPath);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }
    hasError(): boolean {
        throw new Error('Method not implemented.');
    }

    isResolved(): boolean {
        return this.resolved;
    }

    accept(...types: PluginDeployerEntryType[]): void {
        this.acceptedTypes = types;
    }

    isAccepted(...types: PluginDeployerEntryType[]): boolean {
        return types.some(type => this.acceptedTypes.indexOf(type) >= 0);
    }

    setResolvedBy(name: string): void {
        this.resolvedByName = name;
    }

    resolvedBy(): string {
        return this.resolvedByName;
    }

    get type(): PluginType {
        return this._type;
    }

    set type(type: PluginType) {
        this._type = type;
    }

    get rootPath(): string {
        return !!this._rootPath ? this._rootPath : this.path();
    }

    set rootPath(rootPath: string) {
        this._rootPath = rootPath;
    }

}


import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { FileSystemLocking } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import * as path from 'path';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';

@injectable()
export class DisabledPluginService {

    private disabledPlugins: Set<string> = new Set();
    private deferredInit = new Deferred<void>();
    private configFilePath: string | undefined;

    @inject(EnvVariablesServer)
    private envServer: EnvVariablesServer;

    @inject(FileSystemLocking)
    private fsLocking: FileSystemLocking;

    @postConstruct()
    protected init(): void {
        this.doInit().catch(e => {
            console.error('Failed to initialize DisabledPluginService', e);
            this.deferredInit.resolve();
        });
    }

    protected async doInit(): Promise<void> {
        try {
            const configDirUri = await this.envServer.getConfigDirUri();
            const configDir = FileUri.fsPath(configDirUri);
            await fs.ensureDir(configDir);
            this.configFilePath = path.join(configDir, 'disabled-plugins.json');
            await this.load();
        } finally {
            this.deferredInit.resolve();
        }
    }

    async isDisabled(id: string): Promise<boolean> {
        await this.deferredInit.promise;
        return this.disabledPlugins.has(id);
    }

    async disable(id: string): Promise<void> {
        await this.deferredInit.promise;
        if (!this.disabledPlugins.has(id)) {
            this.disabledPlugins.add(id);
            await this.save();
        }
    }

    async enable(id: string): Promise<void> {
        await this.deferredInit.promise;
        if (this.disabledPlugins.has(id)) {
            this.disabledPlugins.delete(id);
            await this.save();
        }
    }

    protected async load(): Promise<void> {
        if (this.configFilePath && await fs.pathExists(this.configFilePath)) {
             try {
                const content = await fs.readJSON(this.configFilePath);
                if (Array.isArray(content)) {
                    this.disabledPlugins = new Set(content);
                }
            } catch (error) {
                console.error('Failed to load disabled plugins', error);
            }
        }
    }

    protected async save(): Promise<void> {
        if (this.configFilePath) {
            await this.fsLocking.lockPath(this.configFilePath, async path => {
                await fs.writeJSON(path, Array.from(this.disabledPlugins));
            });
        }
    }
}

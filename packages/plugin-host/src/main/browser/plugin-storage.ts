import { interfaces } from '@theia/core/shared/inversify';
import { StorageMain } from '../../common/plugin-api-rpc';
import { PluginServer, PluginStorageKind } from '../../common/plugin-protocol';
import { KeysToAnyValues, KeysToKeysToAnyValue } from '../../common/types';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

export class StorageMainImpl implements StorageMain {

    private readonly pluginServer: PluginServer;
    private readonly workspaceService: WorkspaceService;

    constructor(container: interfaces.Container) {
        this.pluginServer = container.get(PluginServer);
        this.workspaceService = container.get(WorkspaceService);
    }

    $set(key: string, value: KeysToAnyValues, isGlobal: boolean): Promise<boolean> {
        return this.pluginServer.setStorageValue(key, value, this.toKind(isGlobal));
    }

    $get(key: string, isGlobal: boolean): Promise<KeysToAnyValues> {
        return this.pluginServer.getStorageValue(key, this.toKind(isGlobal));
    }

    $getAll(isGlobal: boolean): Promise<KeysToKeysToAnyValue> {
        return this.pluginServer.getAllStorageValues(this.toKind(isGlobal));
    }

    protected toKind(isGlobal: boolean): PluginStorageKind {
        if (isGlobal) {
            return undefined;
        }
        return {
            workspace: this.workspaceService.workspace?.resource.toString(),
            roots: this.workspaceService.tryGetRoots().map(root => root.resource.toString())
        };
    }

}

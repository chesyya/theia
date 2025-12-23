import { interfaces } from "@theia/core/shared/inversify";
import { PluginIdentifiers, PluginRegistryMain } from "../../../common";
import { PluginViewService } from "../../../common/plugin-view-service";

export class PluginRegistryMainImpl implements PluginRegistryMain{
    protected readonly pluginViewService: PluginViewService;

    constructor(container: interfaces.Container){
        this.pluginViewService = container.get(PluginViewService);
    }
    $openPluginReadme(pluginId: PluginIdentifiers.UnversionedId): Promise<void> {
        return this.pluginViewService.openPluginReadme(pluginId)
    }
    $checkPluginUpdates(pluginId: PluginIdentifiers.UnversionedId): Promise<void> {
        return this.pluginViewService.checkAndPromptPluginUpdate(pluginId);
    }

}

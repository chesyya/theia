import { injectable } from '@theia/core/shared/inversify';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { PLUGINS_LABEL, PluginWidget } from './plugin-ext-widget';

@injectable()
export class PluginFrontendViewContribution extends AbstractViewContribution<PluginWidget> {

    public static PLUGINS_WIDGET_FACTORY_ID = 'plugins';

    constructor() {
        super({
            widgetId: PluginFrontendViewContribution.PLUGINS_WIDGET_FACTORY_ID,
            widgetName: PLUGINS_LABEL,
            defaultWidgetOptions: {
                area: 'left',
                rank: 400
            },
            toggleCommandId: 'pluginsView:toggle'
        });
    }

}

import { CustomEditorWidget } from './custom-editor-widget';
import { interfaces } from '@theia/core/shared/inversify';
import { WebviewWidgetIdentifier, WebviewWidgetExternalEndpoint } from '../webview/webview';
import { WebviewEnvironment } from '../webview/webview-environment';

export class CustomEditorWidgetFactory {

    readonly id = CustomEditorWidget.FACTORY_ID;

    protected readonly container: interfaces.Container;

    constructor(container: interfaces.Container) {
        this.container = container;
    }

    async createWidget(identifier: WebviewWidgetIdentifier): Promise<CustomEditorWidget> {
        const externalEndpoint = await this.container.get(WebviewEnvironment).externalEndpoint();
        let endpoint = externalEndpoint.replace('{{uuid}}', identifier.id);
        if (endpoint[endpoint.length - 1] === '/') {
            endpoint = endpoint.slice(0, endpoint.length - 1);
        }
        const child = this.container.createChild();
        child.bind(WebviewWidgetIdentifier).toConstantValue(identifier);
        child.bind(WebviewWidgetExternalEndpoint).toConstantValue(endpoint);
        return child.get(CustomEditorWidget);
    }

}

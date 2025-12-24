import { interfaces } from '@theia/core/shared/inversify';
import { WebviewWidget, WebviewWidgetIdentifier, WebviewWidgetExternalEndpoint } from './webview';
import { WebviewEnvironment } from './webview-environment';
import { hashValue } from '@theia/core/lib/common/uuid';

export class WebviewWidgetFactory {

    readonly id = WebviewWidget.FACTORY_ID;

    protected readonly container: interfaces.Container;

    constructor(container: interfaces.Container) {
        this.container = container;
    }

    async createWidget(identifier: WebviewWidgetIdentifier): Promise<WebviewWidget> {
        const externalEndpoint = await this.container.get(WebviewEnvironment).externalEndpoint();
        let endpoint = externalEndpoint.replace('{{uuid}}', identifier.viewId ? hashValue(identifier.viewId) : identifier.id);
        if (endpoint[endpoint.length - 1] === '/') {
            endpoint = endpoint.slice(0, endpoint.length - 1);
        }
        const child = this.container.createChild();
        child.bind(WebviewWidgetIdentifier).toConstantValue(identifier);
        child.bind(WebviewWidgetExternalEndpoint).toConstantValue(endpoint);
        return child.get(WebviewWidget);
    }

}

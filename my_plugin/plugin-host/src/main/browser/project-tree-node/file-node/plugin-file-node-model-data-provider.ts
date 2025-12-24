import { DataContext, DataPair, DataProviderContribution } from '@baosky/platform/lib/browser/database/data-provider-contribution'
import { URI } from '@theia/core'
import { inject, injectable } from '@theia/core/shared/inversify';
import { RootContainer } from '@baosky/platform/lib/browser/project/decorator/root-container-decorator'
import { PLCObjectContainerFactory } from '@baosky/plc-protocol/lib/browser/plc/plc-object-container'
import { PLCContainerDecorator } from '@baosky/plc-protocol/lib/browser/plc/plc-container-decorator';
import { PLUGIN_FILE_NODE_SYMBOL, PluginFileNodeObject, PluginFileNodeObjectFactory } from './plugin-file-node-object';
import { ObjectSymbols } from '@baosky/platform/lib/common/const'

@injectable()
export class PluginFileNodeModelProvider implements DataProviderContribution {
    @inject(RootContainer)
    protected readonly rootContainer: RootContainer;

    @inject(PLCObjectContainerFactory)
    protected readonly pLCObjectContainerFactory: PLCObjectContainerFactory<PluginFileNodeObject>;

    @inject(PluginFileNodeObjectFactory)
    protected readonly pluginFileNodeObjectFactory: PluginFileNodeObjectFactory;

    @inject(PLCContainerDecorator)
    protected readonly pLCContainerDecorator: PLCContainerDecorator;

    public async canHandle(uri: URI, ctx?: DataContext): Promise<boolean> {
        if (uri.path.base.endsWith('.File'))
            return true
        return false;
    };

    public async loadData(fileUri: URI, ctx?: DataContext): Promise<DataPair | undefined> {

        let plcObject = this.rootContainer.getContainerByPath(fileUri);
        if (!plcObject) {
            // throw new Error(bnls.localizeByDefault('当前没有项目'))
            // let pluginObject = new DefaultPluginNodeObject(uri, 'name');
            let pluginObject = this.pluginFileNodeObjectFactory({ id: fileUri.toString(), parentId: fileUri.parent.toString() });
            pluginObject.name = fileUri.path.name;
            pluginObject.path = fileUri;

            return {
                key: {
                    identifiers: [ObjectSymbols.OBJECT_CONTAINER],
                    src: pluginObject.path,
                    name: pluginObject.name
                },
                value: pluginObject
            }
        }

        const decorator = this.pLCObjectContainerFactory({ target: plcObject, symbols: PLUGIN_FILE_NODE_SYMBOL });
        let object = decorator.getSingle(fileUri);
        if (!object) {
            // const description = await this.
            object = this.pluginFileNodeObjectFactory({ id: fileUri.toString(), parentId: fileUri.parent.toString() });
            object.name = fileUri.path.name;
            object.path = fileUri;
        }
        return decorator.getDataPair(object);
    }
}

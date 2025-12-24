/*
 * @Author: 胡雪纯
 * @Date: 2023-09-08 13:32:56
 * @FilePath: /workdir/packages/plc-protocol/src/browser/plc/plc-object.ts
 * Copyright (c) 2023 by BAOSIGHT,All Rights Reserved.
 * @Description:
 */
import { inject, injectable, interfaces } from "@theia/core/shared/inversify";
import { DataLoaderFactory } from "@baosky/platform/lib/browser/database/data-loader";
import { ObjectProps } from "@baosky/platform/lib/browser/project/models/base-device-object";
import { CoreObjectInterface } from "@baosky/platform/lib/common/state/core-object";
import { GlobalConfigObject } from "@baosky/platform/lib/browser/project/models/global-config-object";

export const PLUGIN_FILE_NODE_SYMBOL = Symbol("PFNS");

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PluginFileNodeObjectFactory = Symbol("PluginFileNodeObjectFactory");

/**
 * Description placeholder
 * @date 8/31/2023 - 2:36:16 PM
 * @author wubing
 *
 * @interface PluginFileNodeObjectFactory
 * @typedef {PluginFileNodeObjectFactory}
 */
export interface PluginFileNodeObjectFactory {
    (props: PluginFileNodeObjectProps): PluginFileNodeObject;
}

/**
 * PluginNode对象初始化。
 * @date 8/29/2023 - 9:33:28 AM
 * @author wubing
 *
 * @export
 * @class PluginFileNodeObjectProps
 * @typedef {PluginFileNodeObjectProps}
 */
@injectable()
export class PluginFileNodeObjectProps extends ObjectProps {
}

/**
 * Description placeholder
 * @date 8/29/2023 - 9:41:58 AM
 * @author wubing
 *
 * @export
 * @interface PluginFileNodeObjectInterface
 * @typedef {PluginFileNodeObjectInterface}
 * @extends {DeviceObjectInterface}
 */
export interface PluginFileNodeObjectInterface extends CoreObjectInterface {

}

/**
 * Description placeholder
 * @date 8/29/2023 - 2:34:23 AM
 * @author wubing
 *
 * @export
 * @class PluginFileNodeObject
 * @typedef {PluginFileNodeObject}
 * @extends {CoreObject}
 */
@injectable()
export class PluginFileNodeObject extends GlobalConfigObject {
    /**
     * Creates an instance of PluginFileNodeObject.
     * @date 8/29/2023 - 3:59:26 AM
     * @author wubing
     *
     * @constructor
     * @param {PluginFileNodeObjectProps} props
     */
    constructor(@inject(PluginFileNodeObjectProps) props: PluginFileNodeObjectProps, @inject(DataLoaderFactory) loaderFactory: DataLoaderFactory) {
        super(props, loaderFactory);
    }
}

/**
 * Description placeholder
 * @date 8/31/2023 - 2:37:39 PM
 * @author wubing
 *
 * @export
 * @param {interfaces.Bind} bind
 */
export function bindPluginFileNodeObject(bind: interfaces.Bind): void {
    bind(PluginFileNodeObjectFactory).toFactory((ctx) => (props: PluginFileNodeObjectProps) => {
        const child = ctx.container.createChild();
        child.bind(PluginFileNodeObjectProps).toConstantValue({ ...props });
        child.bind(PluginFileNodeObject).toSelf().inTransientScope();
        return child.get<PluginFileNodeObject>(PluginFileNodeObject);
    });
}

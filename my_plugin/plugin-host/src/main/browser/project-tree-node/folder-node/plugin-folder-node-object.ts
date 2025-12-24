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

export const PLUGIN_FOLDER_NODE_SYMBOL = Symbol("PNS");

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PluginFolderNodeObjectFactory = Symbol("PluginFolderNodeObjectFactory");

/**
 * Description placeholder
 * @date 8/31/2023 - 2:36:16 PM
 * @author 胡雪纯
 *
 * @interface PluginFolderNodeObjectFactory
 * @typedef {PluginFolderNodeObjectFactory}
 */
export interface PluginFolderNodeObjectFactory {
    (props: PluginFolderNodeObjectProps): PluginFolderNodeObject;
}

/**
 * PluginNode对象初始化。
 * @date 8/29/2023 - 9:33:28 AM
 * @author 沈杰
 *
 * @export
 * @class PluginFolderNodeObjectProps
 * @typedef {PluginFolderNodeObjectProps}
 */
@injectable()
export class PluginFolderNodeObjectProps extends ObjectProps {
    // order: number;
    // icon: string;
}

/**
 * Description placeholder
 * @date 8/29/2023 - 9:41:58 AM
 * @author 沈杰
 *
 * @export
 * @interface PluginFolderNodeObjectInterface
 * @typedef {PluginFolderNodeObjectInterface}
 * @extends {DeviceObjectInterface}
 */
export interface PluginFolderNodeObjectInterface extends CoreObjectInterface {
}

/**
 * Description placeholder
 * @date 8/29/2023 - 2:34:23 AM
 * @author 沈杰
 *
 * @export
 * @class PluginFolderNodeObject
 * @typedef {PluginFolderNodeObject}
 * @extends {CoreObject}
 */
@injectable()
export class PluginFolderNodeObject extends GlobalConfigObject {
    // order: number;
    // icon: string;
    /**
     * Creates an instance of PluginFolderNodeObject.
     * @date 8/29/2023 - 3:59:26 AM
     * @author 沈杰
     *
     * @constructor
     * @param {PluginFolderNodeObjectProps} props
     */
    constructor(@inject(PluginFolderNodeObjectProps) props: PluginFolderNodeObjectProps, @inject(DataLoaderFactory) loaderFactory: DataLoaderFactory) {
        super(props, loaderFactory);
        // this.order = props.order;
        // this.icon = props.icon;
    }
}

export function bindPluginFolderNodeObject(bind: interfaces.Bind): void {
    bind(PluginFolderNodeObjectFactory).toFactory((ctx) => (props: PluginFolderNodeObjectProps) => {
        const child = ctx.container.createChild();
        child.bind(PluginFolderNodeObjectProps).toConstantValue({ ...props });
        child.bind(PluginFolderNodeObject).toSelf().inTransientScope();
        return child.get<PluginFolderNodeObject>(PluginFolderNodeObject);
    });
}

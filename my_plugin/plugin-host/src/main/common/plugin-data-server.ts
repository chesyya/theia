// eslint-disable-next-line @typescript-eslint/naming-convention
export const pluginDataServerPath = "/tx/services/plugin-data-server";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PluginDataServer = Symbol("PluginDataServer");


/**
 * PluginData服务
 * @date 2025/12/18 - 13:25:45 PM
 * @author wubing
 *
 * @export
 * @interface PluginDataServer
 * @typedef {PluginDataServer}
 */
export interface PluginDataServer {

  /**
   * 版本升级时需要备份操作并还原的插件数据放在这个接口提供的目录下
   * @date 2025/12/18 - 13:27:07 PM
   * @author wubing
   *
   * @returns {Promise<string>}
   */
  getPluginDataPath(): Promise<string>;

}

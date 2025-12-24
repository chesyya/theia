import { EnvVariablesServer } from "@theia/core/lib/common/env-variables";
import { inject, postConstruct, injectable } from "@theia/core/shared/inversify";
import { FileUri } from "@theia/core/lib/node";
import path from "path";
import { PluginDataServer } from "../../common/plugin-data-server";
import { FileOperationServer } from "@baosky/platform/lib/common/file-operation-server";
import { WorkspaceConfig } from "@baosky/platform/lib/common";
import { UserDataServer } from '@baosky/platform/lib/common/user-data/user-data-service-interface';

@injectable()
export class PluginDataServerImpl implements PluginDataServer {
  @inject(UserDataServer) protected readonly userDataServer: UserDataServer;
  @inject(EnvVariablesServer) protected readonly envVariableServer: EnvVariablesServer;

  @inject(FileOperationServer) private readonly fileServer: FileOperationServer;

  protected pluginDataPath: string;

  /**
   * 获取插件数据目录
   * @date 2025/12/18 - 15:16:00 PM
   * @author wubing
   *
   * @public
   * @async
   * @returns {Promise<string>}
   */
  public async getPluginDataPath(): Promise<string> {
    if(!this.pluginDataPath){
        const userDataPath = await this.userDataServer.getUserDataPath();
        this.pluginDataPath = path.resolve(userDataPath, WorkspaceConfig.PluginDataName);
        await this.fileServer.ensureDir([{ path: this.pluginDataPath }]);
    }
    return this.pluginDataPath;
  }
}



/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-05 09:22:09
 * @FilePath: /workdir/packages/plugin-host/src/main/node/resolvers/local-bsx-file-plugin-deployer-reslover.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-12 09:50:16
 */
import * as path from 'path';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PluginDeployerResolverContext, PluginDeployOptions } from '../../../common';
import { LocalPluginDeployerResolver } from './local-plugin-deployer-resolver';
import { PluginBaoskyEnvironment } from '../plugin-baosky-environment';
import { isBaoskyPluginFile } from '../handlers/plugin-baosky-file-handle';
import { existsInDeploymentDir, unpackToDeploymentDir } from '../../../utils/plugin-baosky-utils';
import { PluginStorageKey, UserPluginEnvironment } from '../../common/user-plugin-management/user-plugin-environment-service';
import { PluginUserStorageAdapterFactory } from '../plugin-adapter/plugin-adapter-control';
import { DEFAULT_USER_NAME } from '@baosky/platform/lib/common/es-server/user-protocol';

@injectable()
export class LocalBSXFilePluginDeployerResolver extends LocalPluginDeployerResolver {
  static LOCAL_FILE = "local-file";
  static FILE_EXTENSION = ".bsx";

  @inject(PluginBaoskyEnvironment)
  protected readonly environment: PluginBaoskyEnvironment;
  @inject(UserPluginEnvironment)
  protected readonly userPluginEnvironment: UserPluginEnvironment;
  @inject(PluginUserStorageAdapterFactory)
  private readonly userStorageAdapterFactory: PluginUserStorageAdapterFactory;

  protected get supportedScheme(): string {
    return LocalBSXFilePluginDeployerResolver.LOCAL_FILE;
  }

  override accept(pluginId: string): boolean {
    return super.accept(pluginId) && isBaoskyPluginFile(pluginId);
  }

  async resolveFromLocalPath(
    pluginResolverContext: PluginDeployerResolverContext,
    localPath: string,
    options?: PluginDeployOptions
  ): Promise<void> {
    let userName = DEFAULT_USER_NAME;
    const extensionId = path.basename(
      localPath,
      LocalBSXFilePluginDeployerResolver.FILE_EXTENSION
    );
    if (
      await existsInDeploymentDir(
         options?.userId ? this.userPluginEnvironment : this.environment,
        extensionId,
        options?.userId ? options : undefined
      )
    ) {
      console.warn(
        `[${pluginResolverContext.getOriginId()}]: Target dir already exists in plugin deployment dir`
      );
      return;
    }
    if (options && options.userId) {
      userName = options.userId;
    }

    const adapter = await this.userStorageAdapterFactory({
      type: PluginStorageKey,
      userName: userName,
      shared: options?.shared,
    });
    const extensionDeploymentDir = await adapter.setPluginData(extensionId, {
      env: options?.userId ? this.userPluginEnvironment : this.environment,
      sourcePath: localPath,
      extensionId: extensionId,
      options: options?.userId ? options : undefined,
    });
    pluginResolverContext.addPlugin(extensionId, extensionDeploymentDir);
  }
}

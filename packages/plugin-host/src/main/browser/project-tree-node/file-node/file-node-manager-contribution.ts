/*
 * @Author:
 * @Date: 2025-05-06 14:56:08
 * @FilePath: /workdir/packages/platform/src/browser/log-manager/log-manager-dir-contribution.ts
 * Copyright (c) 2025 by BAOSIGHT, All Rights Reserved.
 * @Description
 * @LastEditors:
 * @LastEditTime: 2025-06-10 14:56:51
 */
import { injectable } from "@theia/core/shared/inversify";
import { ProjectSpecialFileOrDirectoryContribution } from '@baosky/platform/lib/browser/project/special-file-or-directory/project-special-file-or-directory-contribution'
import { ProjectConfig } from "@baosky/platform/lib/common";
const PluginFileManagerName = "plugin-file-manager";

/**
 * LogManagerDirContribution
 * @date 2025/05/06 - 14:58:27 PM
 * @author wubing
 *
 * @export
 * @class LogManagerDirContribution
 * @typedef {LogManagerDirContribution}
 * @implements {ProjectSpecialFileOrDirectoryContribution}
 */
@injectable()
export class FileManagerDirContribution implements ProjectSpecialFileOrDirectoryContribution {

  /**
   * registerSpecialDirectories
   * @date 2025/05/06 - 14:58:22 PM
   * @author wubing
   *
   * @public
   * @returns {string[]}
   */
  public registerSpecialFiles(): string[] {
    return [PluginFileManagerName, ProjectConfig.TheiaSettingName];
  }
}

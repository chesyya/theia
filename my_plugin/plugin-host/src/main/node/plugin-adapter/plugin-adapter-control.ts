/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-04 09:34:14
 * @FilePath: /workdir/packages/plugin-host/src/main/node/plugin-adapter/plugin-adapter-control.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-11 09:19:53
 */
import {
  IUserStorageAdapter,
  UserStorageAdapterFactory,
} from "@baosky/platform/lib/common/storage-space/user-storage/user-storage-adapter";
import { inject, injectable, interfaces } from "@theia/core/shared/inversify";
import { PluginBaoskyEnvironment } from "../plugin-baosky-environment";
import { UserPluginEnvironment } from "../../common/user-plugin-management/user-plugin-environment-service";
import { PluginDeployOptions } from "../../../common";
import * as path from "path";
import * as fs from "@theia/core/shared/fs-extra";
import filenamify from "filenamify";
import {
  decompressExtension,
  getTempDir,
  TMP_DIR_PREFIX,
} from "../../../utils/plugin-baosky-utils";

export const PluginUserStorageAdapterFactory = Symbol(
  "PluginUserStorageAdapterFactory"
);

// 类型安全：这个 factory 返回 PluginUserStorageAdapter
export type PluginUserStorageAdapterFactory =
  UserStorageAdapterFactory<PluginUserStorageAdapter>;

/**
 * 存数据所需属性
 * @date 2025-11-05 , 3:15:53 pm
 * @author 南天远
 *
 * @export
 * @interface PluginUserStorageProps
 * @typedef {PluginUserStorageProps}
 */
export interface PluginUserStorageSetDataProps {
  env: PluginBaoskyEnvironment | UserPluginEnvironment;
  sourcePath: string; // 插件压缩包的路径
  extensionId: string; // 插件 ID
  options?: PluginDeployOptions; // 部署选项（如是否为共享插件）
}

// 类型守卫：判断 value 是否符合插件数据结构
function isPluginUserStorageData(
  value: unknown
): value is PluginUserStorageSetDataProps {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).extensionId === "string" &&
    typeof (value as any).sourcePath === "string"
  );
}

/**
 * 插件个人空间适配器
 * @date 2025-11-05 , 2:29:23 pm
 * @author 南天远
 *
 * @export
 * @class PluginUserStorageAdapter
 * @typedef {PluginUserStorageAdapter}
 * @extends {IUserStorageAdapter}
 */
@injectable()
export class PluginUserStorageAdapter extends IUserStorageAdapter {
  private _pluginPath: string = "";
  /**
   * 初始化
   * @date 2025-11-04 , 9:39:18 am
   * @author 南天远
   *
   * @async
   * @returns {Promise<void>}
   */
  async initialize(): Promise<void> {
    console.dir("initialize");
    const path = await this.getCurrentPath();
    console.dir(path);
  }

  /**
   * 设置插件数据
   * @date 2025-11-05 , 4:13:13 pm
   * @author 南天远
   *
   * @async
   * @param {string} key
   * @param {PluginUserStorageSetDataProps} data
   * @returns {Promise<void>}
   */
  async setPluginData(
    key: string,
    data: PluginUserStorageSetDataProps
  ): Promise<string> {
    await this.setData(key, data); // 安全，因为已校验
    return this._pluginPath;
  }

  /**
   * setData
   * @date 2025-11-04 , 9:39:26 am
   * @author 南天远
   *
   * @async
   * @template T
   * @param {string} key
   * @param {T} value
   * @returns {Promise<void>}
   */
  async setData<T>(key: string, value: T): Promise<void> {
    if (!isPluginUserStorageData(value)) {
      throw new Error(`设置插件数据类型错误 收到的数据为: ${typeof value}`);
    }
    // 现在 TS 知道 value 是 PluginUserStorageSetDataProps
    const normalizedExtensionId = filenamify(key, {
      replacement: "_",
    });
    const userPath = await this.getCurrentPath();
    const filePath = path.join(userPath, normalizedExtensionId);
    this._pluginPath = filePath;
    if (await fs.pathExists(filePath)) {
      console.log(`[${key}]: deployment dir "${filePath}" already exists`);
      return;
    }

    // 创建临时目录用于解压
    const tempDir = await getTempDir(value.env, TMP_DIR_PREFIX, value.options);
    try {
      console.log(
        `[${key}]: trying to decompress "${value.sourcePath}" into "${tempDir}"...`
      );
      // 解压插件到临时目录
      if (!(await decompressExtension(value.sourcePath, tempDir))) {
        await fs.remove(tempDir);
        const msg = `[${key}]: decompressing "${value.sourcePath}" to "${tempDir}" failed`;
        console.error(msg);
        throw new Error(msg);
      }
    } catch (e) {
      await fs.remove(tempDir);
      const msg = `[${key}]: error while decompressing "${value.sourcePath}" to "${tempDir}"`;
      console.error(msg, e);
      throw e;
    }
    console.log(`[${key}]: decompressed to temp dir "${tempDir}"`);

    try {
      console.log(`[${key}]: renaming to extension dir "${filePath}"...`);
      // 重命名临时目录为目标目录
      await fs.rename(tempDir, filePath);
      return;
    } catch (e) {
      await fs.remove(tempDir);
      console.error(
        `[${key}]: error while renaming "${tempDir}" to "${filePath}"`,
        e
      );
      throw e;
    }
  }

  /**
   * getData
   * @date 2025-11-04 , 9:39:33 am
   * @author 南天远
   *
   * @async
   * @template T
   * @param {string} key
   * @returns {Promise<T | undefined>}
   */
  async getData<T>(key: string): Promise<T | undefined> {
    // console.dir("getData");
    return;
  }

  /**
   * delete
   * @date 2025-11-04 , 9:39:37 am
   * @author 南天远
   *
   * @async
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const userPath = await this.getCurrentPath(); // 只调用一次

    const deletePromises = keys.map(async (key) => {
      const normalizedExtensionId = filenamify(key, { replacement: "_" });
      const filePath = path.join(userPath, normalizedExtensionId);
      fs.remove(filePath).catch((err) =>
        console.error(`Failed to remove source for ${key} at ${location}`, err)
      );
    });

    await Promise.all(deletePromises);
  }
}

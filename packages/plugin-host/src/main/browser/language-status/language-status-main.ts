/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-28 09:13:28
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/authorization/license-main.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-28 09:18:22
 */
import { interfaces } from "@theia/core/shared/inversify";
import {
  LanguageStatusMain,
  PluginIdentifiers,
  PluginRegistryMain,
} from "../../../common";
import { PluginViewService } from "../../../common/plugin-view-service";
import { LanguageStatusBar } from "@baosky/plc-protocol/lib/browser/language-service/language-status-bar";

/**
 * 语言服务状态接口实现
 * @date 2025-11-28 , 9:17:57 am
 * @author 南天远
 *
 * @export
 * @class LanguageStatusMainImpl
 * @typedef {LanguageStatusMainImpl}
 * @implements {LanguageStatusMain}
 */
export class LanguageStatusMainImpl implements LanguageStatusMain {
  protected readonly languageStatusBar: LanguageStatusBar;

  constructor(container: interfaces.Container) {
    this.languageStatusBar = container.get(LanguageStatusBar);
  }

  /**
   * 获取状态
   * @date 2025-12-09 , 10:06:51 am
   * @author 南天远
   *
   * @returns {number}
   */
  $getStatus(): number {
    return this.languageStatusBar.getStatus();
  }
}

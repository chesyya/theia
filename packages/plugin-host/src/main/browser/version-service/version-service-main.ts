import { interfaces } from "@theia/core/shared/inversify";
import {
  VersionServiceMain,
  PluginIdentifiers,
  PluginRegistryMain,
} from "../../../common";
import { VersionService } from "@baosky/platform/lib/browser/version/version-service";
import URI, { UriComponents } from "@theia/core/lib/common/uri";
import { ProductType } from "@baosky/platform/lib/common/es-version-protocol";

/**
 * 许可证接口实现
 * @date 2025-11-28 , 9:17:57 am
 * @author 南天远
 *
 * @export
 * @class VersionServiceMainImpl
 * @typedef {VersionServiceMainImpl}
 * @implements {VersionServiceMain}
 */
export class VersionServiceMainImpl implements VersionServiceMain {
  protected readonly versionService: VersionService;

  constructor(container: interfaces.Container) {
    this.versionService = container.get(VersionService);
  }

  /**
   * 根据资源ID获取资源属性
   * @date 2025-11-28 , 9:18:09 am
   * @author 南天远
   *
   * @async
   * @param {string[]} resourceIds
   * @returns {Promise<LicenseableResource[]>}
   */
  $getAppVersionByFile(projectPath: UriComponents): Promise<{
    appMajorVersion: number;
    appMinorVersion: number;
  }> {
    const result = this.versionService.getAppVersionByFile(
      URI.fromComponents(projectPath)
    );
    return result;
  }

  /**
   * 获取当前应用版本号(.txproj): major_version*10000 + minor_version
   * @date 3/11/2024 - 10:47:47 AM
   * @author 胡雪纯
   *
   * @param {URI} [projectPath]
   * @returns {AppVersion}
   */
  $getAppVersionNumberByFile(projectPath: UriComponents): Promise<number> {
    const result = this.versionService.getAppVersionNumberByFile(
      URI.fromComponents(projectPath)
    );
    return result;
  }

  /**
   * 获取最新应用版本号 或 指定模型版本号对应的最大应用版本号
   * @date 3/13/2024 - 6:15:14 AM
   * @author 胡雪纯
   *
   * @returns {Promise<AppVersion>}
   */
  $getLatestAppVersion(): Promise<number> {
    return this.versionService.getLatestAppVersion();
  }

  /**
   * Description 获取最新的应用版本号， major_version*10000 + minor_version
   * @author songtao
   *
   * @returns {Promise<number>}
   */
  $getLatestFullAppVersion(): Promise<{
    appMajorVersion: number;
    appMinorVersion: number;
    hotfix: number;
  }> {
    return this.versionService.getLatestFullAppVersion();
  }

  /**
   * Description 获取最新的应用版本号
   * @author songtao
   *
   * @returns {number}
   */
  $getAppVersionSync(): number {
    return this.versionService.getAppVersionSync();
  }

  /**
   * Description 获取最新的产品版本信息
   * @author songtao
   *
   * @param {productType} product
   * @returns {Promise<MixedProductType>}
   */
  $getProductVersionRange(
    product: ProductType
  ): Promise<{ oldest: number; latest: number }> {
    return this.versionService.getProductVersionRange(product);
  }

  /**
   * Description 获取最新的产品版本信息
   * @author songtao
   *
   * @param {productType} product
   * @returns {Promise<MixedProductType>}
   */
  $getProductVersionRangeSync(product: ProductType): {
    oldest: number;
    latest: number;
  } {
    return this.versionService.getProductVersionRangeSync(product);
  }

  /**
   * Description 获取最新的产品model版本信息
   * @author songtao
   *
   * @param {productType} product
   * @returns {Promise<MixedProductType>}
   */
  $getModelVersionRange(
    product: ProductType
  ): Promise<{ oldest: number; latest: number }> {
    return this.versionService.getModelVersionRange(product);
  }

  /**
   * Description 获取最新的产品language版本信息
   * @author songtao
   *
   * @param {productType} product
   * @returns {Promise<MixedProductType>}
   */
  $getLanguageVersionRange(
    product: ProductType
  ): Promise<{ oldest: number; latest: number }> {
    return this.versionService.getLanguageVersionRange(product);
  }

  /**
   * 获取最新的产品language版本信息
   * @date 2025/09/24 - 14:07:12 PM
   * @author 胡雪纯
   *
   * @param {ProductType} product
   * @returns {Promise<{ oldest: string, latest: string }>}
   */
  $getLanguageVersionRangeString(
    product: ProductType
  ): Promise<{ oldest: string; latest: string }> {
    return this.versionService.getLanguageVersionRangeString(product);
  }

  /**
   * 根据应用版本号获取匹配的天行项目版本与编译器版本(es.version)
   * @date 3/27/2024 - 10:34:02 AM
   * @author 胡雪纯
   *
   * @param {number} appVersion
   * @returns {Promise<{
   *     languageVersion: number;
   *     projectVersion: number;
   *   }>}
   */
  $getMatchedVersionsByAppVersion(appVersion: number): Promise<{
    languageVersion: number;
    projectVersion: number;
  }> {
    return this.versionService.getMatchedVersionsByAppVersion(appVersion);
  }
  /**
   * 通过天行项目版本号获取匹配的PLC版本信息
   * @date 3/28/2024 - 3:54:44 AM
   * @author 胡雪纯
   * @param {productType} product
   * @param {number} projectVersion
   * @returns {Promise<number>}
   */
  $getMatchedPLCModelVersionByProject(projectVersion: number): Promise<number> {
    return this.versionService.getMatchedPLCModelVersionByProject(
      projectVersion
    );
  }
}

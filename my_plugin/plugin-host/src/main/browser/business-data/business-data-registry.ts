import { ContributionProvider } from '@theia/core';
import { inject, injectable, named } from '@theia/core/shared/inversify';
import { DataQueryOptions, PluginDataContribution, PluginDataItem } from '@baosky/platform/lib/common/plugin/plugin-data-contribution'
import { PluginDataType } from '@baosky/platform/lib/common/plugin/plugin-data-type';

@injectable()
export class BusinessDataRegistry {
  @inject(ContributionProvider)
  @named(PluginDataContribution)
  protected readonly contributionProvider: ContributionProvider<PluginDataContribution>;


  /**
   * 按照类型获取数据
   * @date 2025/12/23 - 12:44:17 PM
   * @author wubing
   *
   * @public
   * @async
   * @param {string} type
   * @returns {Promise<PluginDataItem[]>}
   */
  public async getDataByType(type: PluginDataType): Promise<PluginDataItem[]> {
    const rawItems = await this.fetchFromProviders({ type });

    //合并数据
    return this.aggregateItems(rawItems);
  }


  /**
   * 根据指定key获取数据
   * @date 2025/12/23 - 12:45:05 PM
   * @author wubing
   *
   * @public
   * @async
   * @template [T=any]
   * @param {string} key
   * @returns {Promise<T | undefined>}
   */
  public async getData<T = any>(key: string): Promise<T | undefined> {
    const rawItems = await this.fetchFromProviders({ key });

    if (rawItems.length === 0) {
      return undefined;
    }

    const aggregatedItems = this.aggregateItems(rawItems);

    return aggregatedItems.length > 0 ? (aggregatedItems[0].value as T) : undefined;
  }


  /**
   * 从provider获取数据
   * @date 2025/12/23 - 12:53:17 PM
   * @author wubing
   *
   * @private
   * @async
   * @param {DataQueryOptions} options
   * @returns {Promise<PluginDataItem[]>}
   * @security 1
   */
  private async fetchFromProviders(options: DataQueryOptions): Promise<PluginDataItem[]> {
    const contributions = this.contributionProvider.getContributions();
    // 并行请求
    const promises = contributions.map(c => c.provideData(options));
    const results = await Promise.all(promises);
    // 展平数组
    return results.flat();
  }


  /**
   * 处理key相同的数据
   * @date 2025/12/23 - 12:55:23 PM
   * @author wubing
   *
   * @private
   * @param {PluginDataItem[]} rawItems
   * @returns {PluginDataItem[]}
   * @security 1
   */
  private aggregateItems(rawItems: PluginDataItem[]): PluginDataItem[] {
    if (rawItems.length === 0) return [];
    if (rawItems.length === 1) return rawItems;

    const resultMap = new Map<string, PluginDataItem>();

    for (const item of rawItems) {
      if (resultMap.has(item.key)) {
        const existing = resultMap.get(item.key)!;
        const mergedValue = this.mergeValues(existing.value, item.value);

        resultMap.set(item.key, {
          ...existing,
          ...item,
          value: mergedValue
        });
      } else {
        resultMap.set(item.key, item);
      }
    }

    return Array.from(resultMap.values());
  }

  private mergeValues(existing: any, incoming: any): any {
    if (this.isPlainObject(existing) && this.isPlainObject(incoming)) {
      const merged = { ...existing };
      for (const key in incoming) {
        if (incoming.hasOwnProperty(key)) {
          if (key in merged) {
            merged[key] = this.mergeValues(merged[key], incoming[key]);
          } else {
            merged[key] = incoming[key];
          }
        }
      }
      return merged;
    }
    if (Array.isArray(existing) && Array.isArray(incoming)) {
      return [...existing, ...incoming];
    }
    return incoming;
  }

  private isPlainObject(obj: any): boolean {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
  }
}

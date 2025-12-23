/**
 * @file 插件系统中相关key-mapping的存储及服务
 * @date 2025/11/18 - 13:06:31 PM
 * @author wubing
 */

import { PLCObjectSymbols } from '@baosky/plc-protocol/lib/common/const';
export namespace Plugin_Maps {

    //项目树节点symbol类型到可读类型的map
    export const SYMBOL_TO_STRING_MAP = new Map<Symbol, string>([
        [PLCObjectSymbols.GVS_OBJECT, 'gvs'],
        [PLCObjectSymbols.UDT_OBJECT, 'udt'],
        [PLCObjectSymbols.IO_MAPPING_OBJECT, 'iomapping'],
        [PLCObjectSymbols.PROGRAM_UNIT_OBJECT, 'pu'],
        [PLCObjectSymbols.CENTRAL_DEVICE_OBJECT, 'plc'],
        [PLCObjectSymbols.TASK_OBJECT, 'task'],
        [PLCObjectSymbols.PROGRAM_UNIT_ENCRYPT_OBJECT, 'pu_encrypt']
    ]);

    //可读类型到项目树节点类型的map
    export const STRING_TO_SYMBOL_MAP = new Map<string, Symbol>();
    for (const [sym, str] of SYMBOL_TO_STRING_MAP) {
        STRING_TO_SYMBOL_MAP.set(str, sym);
    }
}


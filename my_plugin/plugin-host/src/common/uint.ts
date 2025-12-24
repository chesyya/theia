/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// based on https://github.com/microsoft/vscode/blob/04c36be045a94fee58e5f8992d3e3fd980294a84/src/vs/base/common/uint.ts

export const enum Constants {
    /**
     * Max unsigned integer that fits on 8 bits.
     */
    MAX_UINT_8 = 255, // 2^8 - 1
}

export function toUint8(v: number): number {
    if (v < 0) {
        return 0;
    }
    if (v > Constants.MAX_UINT_8) {
        return Constants.MAX_UINT_8;
    }
    return v | 0;
}

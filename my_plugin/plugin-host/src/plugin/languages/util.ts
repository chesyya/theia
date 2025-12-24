import * as theia from '@baosky/plugin';
import * as types from '../types-impl';

export function isLocationArray(array: unknown): array is types.Location[] {
    return Array.isArray(array) && array.length > 0 && array[0] instanceof types.Location;
}

export function isDefinitionLinkArray(array: unknown): array is theia.DefinitionLink[] {
    return Array.isArray(array) && array.length > 0 && array[0].hasOwnProperty('targetUri') && array[0].hasOwnProperty('targetRange');
}

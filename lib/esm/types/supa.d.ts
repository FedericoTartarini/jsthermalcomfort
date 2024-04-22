export function $map(arrays: any, op: any): any[];
/**
 * @template T
 * @param {number} length
 * @param {T} value
 *
 * @return {T[]}
 */
export function $array<T>(length: number, value: T): T[];
/**
 * @template T
 * @param arrays {T[][]}
 * @param op {(reduced: T, items: T[]) => T}
 * @param initial {T}
 *
 * @return {T}
 */
export function $reduce<T>(arrays: T[][], op: (reduced: T, items: T[]) => T, initial: T): T;
export function $average(array: any, weights: any): number;
export function $lerp(length: any, min: any, max: any): any[];
export function $sum(array: any): any;
export function $max(array: any, sentinel: any): any;
export function $min(array: any, sentinel: any): any;
export function $index(array: any, indicies: any): any;
//# sourceMappingURL=supa.d.ts.map
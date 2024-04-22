"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$index = exports.$min = exports.$max = exports.$sum = exports.$lerp = exports.$average = exports.$reduce = exports.$array = exports.$map = void 0;
function $map(arrays, op) {
    const mapLength = arrays[0].length;
    if (!arrays.every((a) => a.length === mapLength)) {
        throw new Error(`cannot $map over arrays of different lengths (${arrays[1].length} vs ${mapLength})`);
    }
    const result = [];
    for (let i = 0; i < mapLength; i++) {
        const items = arrays.map((a) => a[i]);
        result.push(op(items, i));
    }
    return result;
}
exports.$map = $map;
/**
 * @template T
 * @param {number} length
 * @param {T} value
 *
 * @return {T[]}
 */
function $array(length, value) {
    return Array(length).fill(value);
}
exports.$array = $array;
/**
 * @template T
 * @param arrays {T[][]}
 * @param op {(reduced: T, items: T[]) => T}
 * @param initial {T}
 *
 * @return {T}
 */
function $reduce(arrays, op, initial) {
    const reduceLength = arrays[0].length;
    if (!arrays.every((a) => a.length === reduceLength)) {
        throw new Error(`cannot $reduce over arrays of different lengths (${a.length} vs ${reduceLength})`);
    }
    let reduced = initial;
    for (let i = 0; i < reduceLength; i++) {
        const items = arrays.map((a) => a[i]);
        reduced = op(reduced, items);
    }
    return reduced;
}
exports.$reduce = $reduce;
function $average(array, weights) {
    return ($reduce([array, weights], (reduced, [array, weights]) => reduced + array * weights, 0) / $sum(weights));
}
exports.$average = $average;
function $lerp(length, min, max) {
    return Array(length)
        .fill(min)
        .map((x, i) => x + i * ((max - min) / (length - 1)));
}
exports.$lerp = $lerp;
function $sum(array) {
    return array.reduce((t, c) => t + c, 0);
}
exports.$sum = $sum;
function $max(array, sentinel) {
    return array.map((array) => (array < sentinel ? sentinel : array));
}
exports.$max = $max;
function $min(array, sentinel) {
    return array.map((array) => (array > sentinel ? sentinel : array));
}
exports.$min = $min;
function $index(array, indicies) {
    return array.filter((_, i) => indicies.includes(i));
}
exports.$index = $index;

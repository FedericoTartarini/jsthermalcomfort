"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$map = $map;
exports.$array = $array;
exports.$reduce = $reduce;
exports.$average = $average;
exports.$lerp = $lerp;
exports.$sum = $sum;
exports.$max = $max;
exports.$min = $min;
exports.$index = $index;
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
function $average(array, weights) {
    return ($reduce([array, weights], (reduced, [array, weights]) => reduced + array * weights, 0) / $sum(weights));
}
function $lerp(length, min, max) {
    return Array(length)
        .fill(min)
        .map((x, i) => x + i * ((max - min) / (length - 1)));
}
function $sum(array) {
    return array.reduce((t, c) => t + c, 0);
}
function $max(array, sentinel) {
    return array.map((array) => (array < sentinel ? sentinel : array));
}
function $min(array, sentinel) {
    return array.map((array) => (array > sentinel ? sentinel : array));
}
function $index(array, indicies) {
    return array.filter((_, i) => indicies.includes(i));
}

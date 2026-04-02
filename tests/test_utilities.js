import { expect } from "@jest/globals";

/**
 * @template {Object.<string, number>} T
 * @param {T} obj
 * @param {T} expected
 * @param {number} [tolerance=0.0001]
 */
export function deep_close_to_obj(obj, expected, tolerance = 0.0001) {
  const objLength = Object.keys(obj).length;
  const expectedLength = Object.keys(expected).length;
  expect(objLength).toEqual(expectedLength);

  for (let [key, value] of Object.entries(obj)) {
    expect(Math.abs(value - expected[key])).toBeLessThanOrEqual(tolerance);
  }
}

/**
 * @template {Object.<string, number[]>} T
 * @param {T} obj
 * @param {T} expected
 * @param {number} [tolerance=0.0001]
 */
export function deep_close_to_obj_arrays(obj, expected, tolerance = 0.0001) {
  const objLength = Object.keys(obj).length;
  const expectedLength = Object.keys(expected).length;
  expect(objLength).toEqual(expectedLength);

  for (let [key, value] of Object.entries(obj)) {
    deep_close_to_array(value, expected[key], tolerance);
  }
}

/**
 * @param {number[]} array
 * @param {number[]} expected
 * @param {number} [tolerance=0.0001]
 */
export function deep_close_to_array(array, expected, tolerance = 0.0001) {
  for (let [index, value] of array.entries()) {
    if (!isNaN(value) && !isNaN(expected[index])) {
      expect(Math.abs(value - expected[index])).toBeLessThanOrEqual(tolerance);
      continue;
    }
    if (isNaN(value) !== isNaN(expected[index]))
      throw new Error("one value is NaN but the other is not");
  }
}

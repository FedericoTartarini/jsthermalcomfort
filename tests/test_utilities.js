import { expect } from "@jest/globals";

/**
 * @template {Object.<string, number>} T
 * @param {T} obj
 * @param {T} expected
 * @param {number} tolerance
 */
export function deep_close_to_obj(obj, expected, tolerance) {
  const objLength = Object.keys(obj).length;
  const expectedLength = Object.keys(expected).length;
  expect(objLength).toEqual(expectedLength);

  for (let [key, value] of Object.entries(obj)) {
    expect(value).toBeCloseTo(expected[key], tolerance);
  }
}

/**
 * @template {Object.<string, number[]>} T
 * @param {T} obj
 * @param {T} expected
 * @param {number} tolerance
 */
export function deep_close_to_obj_arrays(obj, expected, tolerance) {
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
 * @param {number} tolerance
 */
export function deep_close_to_array(array, expected, tolerance) {
  for (let [index, value] of array.entries()) {
    if (!isNaN(value) && !isNaN(expected[index])) {
      expect(value).toBeCloseTo(expected[index], tolerance);
      continue;
    }
    if (isNaN(value) !== isNaN(expected[index]))
      throw new Error("one value is NaN but the other is not");
  }
}

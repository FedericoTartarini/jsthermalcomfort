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

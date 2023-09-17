import { expect, describe, it } from "@jest/globals";
import { find_span, solar_gain } from "../../src/models/solar_gain";
import {
  deep_close_to_array,
  deep_close_to_obj,
  get_validation_data,
} from "../test_utilities";

function slow_find_span(arr, x) {
  for (let i = 0; i < arr.length - 1; ++i) {
    if (arr[i + 1] >= x && x >= arr[i]) return i;
  }
  return -1;
}

describe("find_span", () => {
  it.each([
    {
      arr: [1, 2, 3, 4, 5],
      x: 1,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 1.1,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 2,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 3,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 4,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 5,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 6,
    },
    {
      arr: [1, 2, 3, 4, 5],
      x: 0,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 1,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 1.1,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 2,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 3,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 4,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 5,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 6,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 7,
    },
    {
      arr: [1, 2, 3, 4, 5, 6],
      x: 0,
    },
  ])("%j", ({ arr, x }) => {
    const result = find_span(arr, x);
    const slow_result = slow_find_span(arr, x);
    expect(result).toBe(slow_result);
  });
});

describe("solar_gain", () => {
  let reference_tables = get_validation_data();
  let tests = [];
  for (const table of reference_tables.reference_data.solar_gain) {
    for (const entry of table.data) {
      const inputs = entry.inputs;
      const outputs = entry.outputs;
      tests.push({
        ...inputs,
        expected: { ...outputs },
      });
    }
  }
  it.each(tests)(
    "%j",
    ({ alt, sharp, I_dir, t_sol, f_svv, f_bes, asa, posture, expected }) => {
      const result = solar_gain(
        alt,
        sharp,
        I_dir,
        t_sol,
        f_svv,
        f_bes,
        asa,
        posture,
      );
      expect(result.erf).toBeCloseTo(expected.erf);
      expect(result.delta_mrt).toBeCloseTo(expected.t_rsw);
    },
  );
});

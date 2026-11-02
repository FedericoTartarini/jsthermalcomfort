import { describe, expect, it, test } from "vitest";
import {
  v_relative,
  running_mean_outdoor_temperature,
  f_svv,
  clo_typical_ensembles,
  met_typical_tasks,
  clo_individual_garments,
} from "../../src/utilities/utilities";
import { round } from "../../src/_internal/round.ts";

const DEFAULT_TOLERANCE = 0.01;

// JS-only: upstream rounds with numpy, so `round` must round half to even
// on the scaled value exactly as `np.round` does.
describe("round", () => {
  test.each([
    [26.25, 1, 26.2],
    [26.35, 1, 26.4],
    [-2.5, 0, -2],
    [-1.5, 0, -2],
    [0.5, 0, 0],
    [1.5, 0, 2],
    [2.5, 0, 2],
    [26.26, 1, 26.3],
    [-26.26, 1, -26.3],
  ])("round(%p, %p) is %p", (number, precision, expected) => {
    expect(round(number, precision)).toBe(expected);
  });

  test("keeps the sign of a negative value that rounds to zero, like numpy", () => {
    expect(round(-0.4, 0)).toBe(-0);
    expect(round(-0.5, 0)).toBe(-0);
  });

  test("passes NaN through", () => {
    expect(round(NaN, 1)).toBeNaN();
  });
});

describe("v_relative", () => {
  it.each([
    { v: 2.0, met: 1.0, expected: 2.0 },
    { v: -1.5, met: 1.5, expected: -1.5 + 0.3 * 0.5 },
  ])(
    "returns $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      const result = v_relative(v, met);
      // Tolerance is manually defined because v_relative is not in the shared reference data
      expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.0001);
    },
  );

  // JS-only: upstream rounds with `np.around(..., 3)`. Expected values are
  // pythermalcomfort 4.6.0's for the same inputs.
  it.each([
    { v: 0, met: 1.005, expected: 0.001 },
    { v: 0.1, met: 1.015, expected: 0.104 },
  ])(
    "rounds as numpy does: $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      expect(v_relative(v, met)).toBe(expected);
    },
  );
});

describe("running_mean_outdoor_temperature", () => {
  it.each([
    {
      temp_array: [20, 20],
      alpha: 0.7,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [20, 20],
      alpha: 0.9,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [20, 20, 20, 20],
      alpha: 0.7,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [20, 20, 20, 20],
      alpha: 0.5,
      from_units: undefined,
      expected: 20,
    },
    {
      temp_array: [77, 77, 77, 77, 77, 77, 77],
      alpha: 0.8,
      from_units: "IP",
      expected: 77,
    },
  ])(
    "returns $expected when temp_array is $temp_array, alpha is $alpha and from_units is $from_units",
    ({ temp_array, alpha, from_units, expected }) => {
      const result = running_mean_outdoor_temperature(
        temp_array,
        alpha,
        from_units,
      );

      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );
});

describe("f_svv", () => {
  it.each([
    { width: 30, height: 10, distance: 3.3, expected: 0.27 },
    { width: 150, height: 10, distance: 3.3, expected: 0.31 },
    { width: 30, height: 6, distance: 3.3, expected: 0.2 },
    { width: 150, height: 6, distance: 3.3, expected: 0.23 },
    { width: 30, height: 10, distance: 6, expected: 0.17 },
    { width: 150, height: 10, distance: 6, expected: 0.21 },
    { width: 30, height: 6, distance: 6, expected: 0.11 },
    { width: 150, height: 6, distance: 6, expected: 0.14 },
    { width: 6, height: 9, distance: 3.3, expected: 0.14 },
    { width: 6, height: 6, distance: 3.3, expected: 0.11 },
    { width: 6, height: 6, distance: 6, expected: 0.04 },
    { width: 4, height: 4, distance: 3.3, expected: 0.06 },
    { width: 4, height: 4, distance: 6, expected: 0.02 },
  ])(
    "resturns $expected when width is $width, height is $height and distance is $distance",
    ({ width, height, distance, expected }) => {
      const result = f_svv(width, height, distance);

      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );
});

describe("clo_typical_ensembles", () => {
  it("is keyed the same way pythermalcomfort keys clo_typical_ensembles", () => {
    expect(clo_typical_ensembles["Walking shorts, short-sleeve shirt"]).toBe(
      0.36,
    );
    expect(clo_typical_ensembles["Trousers, long-sleeve shirt"]).toBe(0.61);
    expect(clo_typical_ensembles["Sweat pants, long-sleeve sweatshirt"]).toBe(
      0.74,
    );
    expect(clo_typical_ensembles["Typical winter indoor clothing"]).toBe(1.0);
  });

  it("includes the 0.57 ensemble missing from the old type union", () => {
    expect(
      clo_typical_ensembles[
        "Trousers, short-sleeve shirt, socks, shoes, underwear"
      ],
    ).toBe(0.57);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(clo_typical_ensembles)).toBe(true);
  });
});

describe("met_typical_tasks", () => {
  it("is keyed the same way pythermalcomfort keys met_typical_tasks", () => {
    expect(met_typical_tasks["Seated, quiet"]).toBe(1.0);
    expect(met_typical_tasks["Walking 2mph (3.2kmh)"]).toBe(2.0);
    expect(met_typical_tasks["Wrestling"]).toBe(7.8);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(met_typical_tasks)).toBe(true);
  });
});

describe("clo_individual_garments", () => {
  it("is keyed the same way pythermalcomfort keys clo_individual_garments", () => {
    expect(clo_individual_garments["Metal chair"]).toBe(0.0);
    expect(clo_individual_garments["Women's underwear"]).toBe(0.03);
    expect(clo_individual_garments["Double-breasted coat (thick)"]).toBe(0.48);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(clo_individual_garments)).toBe(true);
  });
});

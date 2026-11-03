import { describe, expect, it, test } from "vitest";
import {
  v_relative,
  running_mean_outdoor_temperature,
  f_svv,
  clo_typical_ensembles,
  met_typical_tasks,
  clo_individual_garments,
} from "../../src/utilities/index.ts";
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

  // Deviation _shared-88, deviation _shared-89, deviation _shared-90, deviation _shared-91, deviation _shared-92.
  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "0.1", [0.1]]) {
      expect(() => v_relative(bad, 1.2)).toThrow(
        new TypeError("v must be a number."),
      );
      expect(() => v_relative(0.1, bad)).toThrow(
        new TypeError("met must be a number."),
      );
    }
    expect(() => v_relative()).toThrow(new TypeError("v must be a number."));
    expect(() => v_relative(0.1)).toThrow(
      new TypeError("met must be a number."),
    );
  });

  it("does not throw for NaN", () => {
    expect(() => v_relative(NaN, 1.2)).not.toThrow();
    expect(() => v_relative(0.1, NaN)).not.toThrow();
  });
});

describe("running_mean_outdoor_temperature", () => {
  // Expected values below are pythermalcomfort 4.8.0's (ticket 50's
  // measure.out and constant_weeks.json, Python 3.12.15).
  it("takes the IP path for units in any case", () => {
    // The IP path and the SI path round this mean differently.
    expect(running_mean_outdoor_temperature([53.7, 106.1], 0.6, "IP")).toBe(
      73.4,
    );
    expect(running_mean_outdoor_temperature([53.7, 106.1], 0.6, "ip")).toBe(
      73.4,
    );
    expect(running_mean_outdoor_temperature([53.7, 106.1], 0.6, "SI")).toBe(
      73.3,
    );
  });

  it("rounds the exact binary value, as Python's round does", () => {
    // 29.95 is stored just below 29.95; numpy's round gives 30 (ADR 0026).
    expect(running_mean_outdoor_temperature([29.95])).toBe(29.9);
  });

  it("sums as Python 3.12's builtin sum does", () => {
    // Seven equal daily means; a plain left-to-right sum, rounded as Python
    // rounds, gives 1.8, -18.3 and -17.1.
    expect(running_mean_outdoor_temperature(Array(7).fill(1.75))).toBe(1.7);
    expect(running_mean_outdoor_temperature(Array(7).fill(-18.35))).toBe(-18.4);
    expect(running_mean_outdoor_temperature(Array(7).fill(-17.05))).toBe(-17);
  });

  it("keeps Python's signed zeros", () => {
    expect(Object.is(running_mean_outdoor_temperature([-0]), 0)).toBe(true);
    expect(Object.is(running_mean_outdoor_temperature([-0.04]), -0)).toBe(true);
  });

  it("throws RangeError with Python's message where it divides by zero", () => {
    expect(() => running_mean_outdoor_temperature([])).toThrow(
      new RangeError("division by zero"),
    );
    expect(() => running_mean_outdoor_temperature([], 0.8, "IP")).toThrow(
      new RangeError("division by zero"),
    );
    expect(() =>
      running_mean_outdoor_temperature([20, 21, 22, 23], -1),
    ).toThrow(new RangeError("division by zero"));
    expect(() => running_mean_outdoor_temperature([20.5, 21], -1)).toThrow(
      new RangeError("float division by zero"),
    );
    expect(() => running_mean_outdoor_temperature([20, 21], -1, "IP")).toThrow(
      new RangeError("float division by zero"),
    );
    expect(running_mean_outdoor_temperature([20, 21, 22], -1)).toBe(21);
  });

  // Deviation _shared-125, deviation _shared-126, deviation _shared-127, deviation _shared-128.
  it("throws TypeError for a temp_array that is not an array of numbers", () => {
    for (const bad of [null, true, 20, "20", { 0: 20 }]) {
      expect(() => running_mean_outdoor_temperature(bad)).toThrow(
        new TypeError("temp_array must be an array."),
      );
    }
    expect(() => running_mean_outdoor_temperature()).toThrow(
      new TypeError("temp_array must be an array."),
    );
    for (const bad of [
      [20, "21"],
      [20, null],
      [20, true],
      [20, [21]],
      [20, undefined],
    ]) {
      expect(() => running_mean_outdoor_temperature(bad)).toThrow(
        new TypeError("temp_array must be an array of numbers."),
      );
    }
  });

  it("throws TypeError for an alpha or units of the wrong type, naming it", () => {
    for (const bad of [null, true, "0.8", [0.8]]) {
      expect(() => running_mean_outdoor_temperature([20, 21], bad)).toThrow(
        new TypeError("alpha must be a number."),
      );
    }
    for (const bad of [null, true, 5, ["SI"]]) {
      expect(() =>
        running_mean_outdoor_temperature([20, 21], 0.8, bad),
      ).toThrow(new TypeError("units must be a string."));
    }
  });

  it("takes the defaults for an explicit undefined", () => {
    expect(
      running_mean_outdoor_temperature([20, 22], undefined, undefined),
    ).toBe(running_mean_outdoor_temperature([20, 22]));
  });

  it("does not throw for NaN", () => {
    expect(() => running_mean_outdoor_temperature([20, NaN])).not.toThrow();
    expect(() => running_mean_outdoor_temperature([20, 21], NaN)).not.toThrow();
  });
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

  // Deviation _shared-93, deviation _shared-94.
  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "30", [30]]) {
      expect(() => f_svv(bad, 10, 3.3)).toThrow(
        new TypeError("w must be a number."),
      );
      expect(() => f_svv(30, bad, 3.3)).toThrow(
        new TypeError("h must be a number."),
      );
      expect(() => f_svv(30, 10, bad)).toThrow(
        new TypeError("d must be a number."),
      );
    }
    expect(() => f_svv()).toThrow(new TypeError("w must be a number."));
    expect(() => f_svv(30)).toThrow(new TypeError("h must be a number."));
    expect(() => f_svv(30, 10)).toThrow(new TypeError("d must be a number."));
  });

  it("does not throw for NaN", () => {
    expect(() => f_svv(NaN, 10, 3.3)).not.toThrow();
    expect(() => f_svv(30, NaN, 3.3)).not.toThrow();
    expect(() => f_svv(30, 10, NaN)).not.toThrow();
  });
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

// Mirrors pythermalcomfort v4.8.0 tests/test_environment.py.
describe("test_environment", () => {
  test("test_running_mean_outdoor_temperature", () => {
    expect(running_mean_outdoor_temperature([20, 20], 0.7)).toBe(20);
    expect(running_mean_outdoor_temperature([20, 20], 0.9)).toBe(20);
    expect(running_mean_outdoor_temperature([20, 20, 20, 20], 0.7)).toBe(20);
    expect(running_mean_outdoor_temperature([20, 20, 20, 20], 0.5)).toBe(20);
    const temperatures_ip = [77, 77, 77, 77, 77, 77, 77];
    expect(running_mean_outdoor_temperature(temperatures_ip, 0.8, "IP")).toBe(
      77,
    );
    expect(temperatures_ip).toEqual([77, 77, 77, 77, 77, 77, 77]);
    expect(running_mean_outdoor_temperature(temperatures_ip, 0.8, "IP")).toBe(
      77,
    );
  });
});

// Mirrors the running_mean_outdoor_temperature row of pythermalcomfort v4.8.0
// tests/test_utilities.py, with np.isclose's tolerance (atol 1e-8, rtol 1e-5).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test("running_mean_outdoor_temperature", () => {
      expect(
        Math.abs(running_mean_outdoor_temperature([20, 21, 22]) - 20.9),
      ).toBeLessThanOrEqual(1e-8 + 1e-5 * 20.9);
    });
  });
});

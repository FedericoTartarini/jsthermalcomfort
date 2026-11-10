import { expect, describe, it, test } from "vitest";
import { mean_radiant_tmp } from "../../src/environment/index.ts";

describe("mean_radiant_tmp", () => {
  it.each([
    {
      tg: 53.2,
      tdb: 30,
      v: 0.3,
      d: 0.1,
      emissivity: 0.95,
      standard: "ISO",
      expected: 74.77130035314678,
    },
    // Low-wind ISO case: natural convection dominates, so a bug in the
    // 1.4 coefficient of h_n surfaces here. The high-wind case above
    // sits in the forced-convection regime and is insensitive to it.
    {
      tg: 20,
      tdb: 10,
      v: 0.1,
      d: 0.05,
      emissivity: 0.95,
      standard: "ISO",
      expected: 29.252190824509228,
    },
    {
      tg: 25.42,
      tdb: 26.1,
      v: 0.1931,
      d: 0.1,
      emissivity: 0.95,
      standard: "Mixed Convection",
      expected: 24.178925268687806,
    },
  ])(
    "test mean_radiant_tmp",
    ({ tg, tdb, v, d, emissivity, standard, expected }) => {
      const result = mean_radiant_tmp(tg, tdb, v, d, emissivity, standard);
      expect(result).toBeCloseTo(expected, 12);
    },
  );

  it("returns upstream's unrounded value in both branches", () => {
    // mean_radiant_tmp on pythermalcomfort 4.8.0 (ticket 50's measure.out).
    expect(mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "ISO")).toBeCloseTo(
      25.590124671500632,
      12,
    );
    expect(
      mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "Mixed Convection"),
    ).toBeCloseTo(26.17358846507034, 12);
  });

  it("accepts the standard in any case, as upstream lower-cases it", () => {
    expect(mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "MIXED CONVECTION")).toBe(
      mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "Mixed Convection"),
    );
    expect(mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "iso")).toBe(
      mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "ISO"),
    );
  });

  it("throws RangeError with upstream's message for an unknown standard", () => {
    expect(() => mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "foo")).toThrow(
      new RangeError(
        "Standard not recognized. Please choose either 'Mixed Convection' or 'ISO'.",
      ),
    );
  });

  // Deviation _shared-95, deviation _shared-96, deviation _shared-97, deviation _shared-98.
  it("throws TypeError for an argument of the wrong type, naming it", () => {
    for (const bad of [null, true, "20", [25]]) {
      expect(() => mean_radiant_tmp(bad, 24, 0.1)).toThrow(
        new TypeError("tg must be a number."),
      );
      expect(() => mean_radiant_tmp(25, bad, 0.1)).toThrow(
        new TypeError("tdb must be a number."),
      );
      expect(() => mean_radiant_tmp(25, 24, bad)).toThrow(
        new TypeError("v must be a number."),
      );
      expect(() => mean_radiant_tmp(25, 24, 0.1, bad)).toThrow(
        new TypeError("d must be a number."),
      );
      expect(() => mean_radiant_tmp(25, 24, 0.1, 0.15, bad)).toThrow(
        new TypeError("emissivity must be a number."),
      );
    }
    for (const bad of [null, true, 5, ["ISO"]]) {
      expect(() => mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, bad)).toThrow(
        new TypeError("standard must be a string."),
      );
    }
    expect(() => mean_radiant_tmp()).toThrow(
      new TypeError("tg must be a number."),
    );
    expect(() => mean_radiant_tmp(25)).toThrow(
      new TypeError("tdb must be a number."),
    );
    expect(() => mean_radiant_tmp(25, 24)).toThrow(
      new TypeError("v must be a number."),
    );
  });

  it("takes the defaults for an explicit undefined", () => {
    expect(mean_radiant_tmp(25, 24, 0.1, undefined, undefined, undefined)).toBe(
      mean_radiant_tmp(25, 24, 0.1),
    );
  });

  it("does not throw for NaN", () => {
    for (const standard of ["ISO", "Mixed Convection"]) {
      expect(() =>
        mean_radiant_tmp(NaN, 24, 0.1, 0.15, 0.95, standard),
      ).not.toThrow();
      expect(() =>
        mean_radiant_tmp(25, NaN, 0.1, 0.15, 0.95, standard),
      ).not.toThrow();
      expect(() =>
        mean_radiant_tmp(25, 24, NaN, 0.15, 0.95, standard),
      ).not.toThrow();
      expect(() =>
        mean_radiant_tmp(25, 24, 0.1, NaN, 0.95, standard),
      ).not.toThrow();
      expect(() =>
        mean_radiant_tmp(25, 24, 0.1, 0.15, NaN, standard),
      ).not.toThrow();
    }
  });
});

// Mirrors pythermalcomfort v4.8.0 tests/test_environment.py, one array element
// per case, with np.allclose's tolerance (atol 0.1, rtol 1e-5).
describe("test_environment", () => {
  describe("test_t_mrt", () => {
    test.each([
      [53.2, 30, 0.3, 0.1, "ISO", 74.8],
      [55, 30, 0.3, 0.1, "ISO", 77.8],
      [55, 30, 0.1, 0.1, "ISO", 71.9],
      [25.42, 26.1, 0.1931, 0.1, "Mixed Convection", 24.2],
      [26.42, 26.1, 0.1931, 0.1, "Mixed Convection", 27.0],
    ])(
      "mean_radiant_tmp(%s, %s, %s, %s, %s) is %s",
      (tg, tdb, v, d, standard, expected) => {
        expect(
          Math.abs(mean_radiant_tmp(tg, tdb, v, d, 0.95, standard) - expected),
        ).toBeLessThanOrEqual(0.1 + 1e-5 * expected);
      },
    );

    test.each([0.5, 0.03])("a Mixed Convection globe of %s m is NaN", (d) => {
      expect(
        mean_radiant_tmp(26.42, 26.1, 0.1931, d, 0.95, "Mixed Convection"),
      ).toBeNaN();
    });
  });
});

// Mirrors the mean_radiant_tmp row of pythermalcomfort v4.8.0
// tests/test_utilities.py, with np.allclose's tolerance (atol 0.1, rtol 1e-5).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test.each([
      [53.2, 0.3, 74.8],
      [55, 0.3, 77.8],
      [55, 0.1, 71.9],
    ])("mean_radiant_tmp: tg %s, v %s is %s", (tg, v, expected) => {
      expect(
        Math.abs(mean_radiant_tmp(tg, 30, v, 0.1, 0.95, "ISO") - expected),
      ).toBeLessThanOrEqual(0.1 + 1e-5 * expected);
    });
  });
});

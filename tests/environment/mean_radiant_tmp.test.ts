import { describe, expect, test } from "vitest";
import { mean_radiant_tmp } from "../../src/environment/index.ts";
import { mean_radiant_tmp as from_root } from "../../src/index.ts";
import { approx } from "../models/testUtils.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";

// Mirrors pythermalcomfort v4.8.1 tests/test_environment.py, test_t_mrt, one
// array element per case, with np.allclose's tolerance (rtol 1e-5, atol 0.1);
// its keyword calls are positional here.
describe("test_environment", () => {
  test("test_t_mrt", () => {
    for (const [tg, tdb, v, d, standard, expected] of [
      [53.2, 30, 0.3, 0.1, "ISO", 74.8],
      [55, 30, 0.3, 0.1, "ISO", 77.8],
      [55, 30, 0.1, 0.1, "ISO", 71.9],
      [25.42, 26.1, 0.1931, 0.1, "Mixed Convection", 24.2],
      [26.42, 26.1, 0.1931, 0.1, "Mixed Convection", 27.0],
    ] as const) {
      expect(
        approx(mean_radiant_tmp(tg, tdb, v, d, 0.95, standard), expected, {
          rel: 1e-5,
          abs: 0.1,
        }),
      ).toBe(true);
    }
    for (const d of [0.5, 0.03]) {
      expect(
        mean_radiant_tmp(26.42, 26.1, 0.1931, d, 0.95, "Mixed Convection"),
      ).toBeNaN();
    }
  });
});

// Mirrors the mean_radiant_tmp row of pythermalcomfort v4.8.1
// tests/test_utilities.py, one array element per case, with
// np.testing.assert_allclose's tolerance (rtol 1e-7, atol 0.1), without
// upstream's DeprecationWarning from an old import path the library does not
// serve (deviation _shared-135).
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test.each([
      [53.2, 0.3, 74.8],
      [55, 0.3, 77.8],
      [55, 0.1, 71.9],
    ])("mean_radiant_tmp: tg %s, v %s is %s", (tg, v, expected) => {
      expect(
        approx(mean_radiant_tmp(tg, 30, v, 0.1, 0.95, "ISO"), expected, {
          rel: 1e-7,
          abs: 0.1,
        }),
      ).toBe(true);
    });
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.8.1 in the
// parity image unless a test says otherwise.
describe("mean_radiant_tmp (JS-only)", () => {
  // A call with arguments the type rejects, to test the runtime.
  const call =
    (...args: unknown[]) =>
    () =>
      (mean_radiant_tmp as (...a: unknown[]) => unknown)(...args);

  test.each([
    {
      tg: 53.2,
      tdb: 30,
      v: 0.3,
      d: 0.1,
      emissivity: 0.95,
      standard: "ISO",
      expected: 74.77130035314678,
    },
    // Natural convection dominates at low wind, so the 1.4 coefficient of h_n
    // shows here, where the forced-convection case above is insensitive to it.
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
    "returns upstream's value, $expected, for tg $tg under $standard",
    ({ tg, tdb, v, d, emissivity, standard, expected }) => {
      expect(mean_radiant_tmp(tg, tdb, v, d, emissivity, standard)).toBeCloseTo(
        expected,
        12,
      );
    },
  );

  test("returns upstream's unrounded value in both branches", () => {
    expect(mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "ISO")).toBeCloseTo(
      25.590124671500632,
      12,
    );
    expect(
      mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "Mixed Convection"),
    ).toBeCloseTo(26.17358846507034, 12);
  });

  // _valid_range keeps both bounds (_internal/validation.py:24) and warns outside them, which the library does not (deviation _shared-147).
  test("computes a Mixed Convection globe of 0.04 to 0.15 m, and NaN outside", () => {
    expect(
      approx(
        mean_radiant_tmp(25, 24, 0.1, 0.04, 0.95, "Mixed Convection"),
        27.724735329366354,
        DEFAULT_TOLERANCE,
      ),
    ).toBe(true);
    expect(
      mean_radiant_tmp(25, 24, 0.1, 0.5, 0.95, "Mixed Convection"),
    ).toBeNaN();
    expect(
      mean_radiant_tmp(25, 24, 0.1, NaN, 0.95, "Mixed Convection"),
    ).toBeNaN();
  });

  test("accepts the standard in any case, as upstream lower-cases it", () => {
    expect(mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "MIXED CONVECTION")).toBe(
      mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "Mixed Convection"),
    );
    expect(mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "iso")).toBe(
      mean_radiant_tmp(25, 24, 0.1, 0.15, 0.95, "ISO"),
    );
  });

  // Deviation _shared-132.
  test("throws RangeError with upstream's message for an unknown standard", () => {
    expect(call(25, 24, 0.1, 0.15, 0.95, "foo")).toThrow(
      new RangeError(
        "Standard not recognized. Please choose either 'Mixed Convection' or 'ISO'.",
      ),
    );
  });

  // Deviation _shared-95, deviation _shared-96, deviation _shared-97, deviation _shared-98.
  test("throws TypeError for an argument of the wrong type, naming it", () => {
    for (const bad of [null, true, "20", [25]]) {
      expect(call(bad, 24, 0.1)).toThrow(new TypeError("tg must be a number."));
      expect(call(25, bad, 0.1)).toThrow(
        new TypeError("tdb must be a number."),
      );
      expect(call(25, 24, bad)).toThrow(new TypeError("v must be a number."));
      expect(call(25, 24, 0.1, bad)).toThrow(
        new TypeError("d must be a number."),
      );
      expect(call(25, 24, 0.1, 0.15, bad)).toThrow(
        new TypeError("emissivity must be a number."),
      );
    }
    for (const bad of [null, true, 5, ["ISO"]]) {
      expect(call(25, 24, 0.1, 0.15, 0.95, bad)).toThrow(
        new TypeError("standard must be a string."),
      );
    }
    expect(call()).toThrow(new TypeError("tg must be a number."));
    expect(call(25)).toThrow(new TypeError("tdb must be a number."));
    expect(call(25, 24)).toThrow(new TypeError("v must be a number."));
  });

  test("takes the defaults for an explicit undefined", () => {
    expect(mean_radiant_tmp(25, 24, 0.1, undefined, undefined, undefined)).toBe(
      mean_radiant_tmp(25, 24, 0.1),
    );
  });

  test("NaN and ±Infinity propagate", () => {
    for (const standard of ["ISO", "Mixed Convection"]) {
      expect(mean_radiant_tmp(NaN, 24, 0.1, 0.15, 0.95, standard)).toBeNaN();
      expect(mean_radiant_tmp(25, NaN, 0.1, 0.15, 0.95, standard)).toBeNaN();
      expect(mean_radiant_tmp(25, 24, NaN, 0.15, 0.95, standard)).toBeNaN();
      expect(mean_radiant_tmp(25, 24, 0.1, 0.15, NaN, standard)).toBeNaN();
    }
    expect(mean_radiant_tmp(25, 24, 0.1, NaN, 0.95, "ISO")).toBeNaN();
    expect(mean_radiant_tmp(Infinity, 24, 0.1, 0.15, 0.95, "ISO")).toBe(
      Infinity,
    );
    expect(
      mean_radiant_tmp(25, 24, Infinity, 0.15, 0.95, "Mixed Convection"),
    ).toBe(Infinity);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(mean_radiant_tmp);
  });
});

import { describe, expect, test } from "@jest/globals";
import {
  clo_area_factor,
  clo_dynamic_ashrae,
  clo_dynamic_iso,
  clo_dynamic_iso_vr,
  clo_insulation_air_layer,
  clo_total_insulation,
} from "../../src/utilities/clothing.ts";
import { v_relative } from "../../src/utilities/utilities.js";
import * as pkg from "../../src/index.js";

// Upstream's `np.isclose(..., atol=...)` on a scalar.
function expectClose(actual: number, expected: number, atol: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(atol);
}

// Mirrors pythermalcomfort's tests/test_clothing.py (v4.6.0), array inputs run
// element-wise.
describe("test_clothing", () => {
  test.todo(
    "test_intrinsic_insulation_ensemble: clo_intrinsic_insulation_ensemble is not ported",
  );

  test.todo(
    "test_clo_correction_factor_environment: clo_correction_factor_environment is not ported",
  );

  test("test_clo_area_factor", () => {
    expect(clo_area_factor(1)).toBe(1.28);
    expectClose(clo_area_factor(2), 1.56, 1e-8);
  });

  test("test_clo_air_layer_insulation", () => {
    expectClose(clo_insulation_air_layer(1, 1, 0.71), 0.365, 0.001);
    expectClose(clo_insulation_air_layer(0.2, 1, 0.71), 0.532, 0.001);
  });

  test("test_clo_total_insulation", () => {
    const i_cl = [0.61, 0.71, 1.01];
    const i_t = [1.21, 1.26, 1.56];
    i_t.forEach((value, i) =>
      expectClose(
        clo_total_insulation(value, 0.15, 0, 0.5, i_cl[i]),
        value,
        0.001,
      ),
    );

    // compare the normal_clothing results with the figure in the standard
    const v_walk = [1, 0.5, 0.25];
    const normal = [1.21 * 0.5, 1.26 * 0.565, 1.56 * 0.62];
    i_t.forEach((value, i) =>
      expectClose(
        clo_total_insulation(value, 2, v_walk[i], 0.5, i_cl[i]),
        normal[i],
        0.005,
      ),
    );

    // test that the nude function works as expected
    const i_a_static = [0.71, 0.61, 0.5];
    i_a_static.forEach((value) =>
      expectClose(clo_total_insulation(0, 0.15, 0, value, 0), value, 0.001),
    );

    // compare the nude results with the figure in the standard
    const vr = [0.5, 2, 3];
    const nude = [0.71 * 0.7, 0.61 * 0.4, 0.5 * 0.32];
    i_a_static.forEach((value, i) =>
      expectClose(
        clo_total_insulation(0, vr[i], 0.5, value, 0),
        nude[i],
        0.004,
      ),
    );

    // test that the low_clothing function works as expected
    expectClose(clo_total_insulation(1.2, 0.15, 0, 0.6, 0.6), 1.2, 0.001);
    expectClose(clo_total_insulation(0.6, 0.15, 0, 0.6, 0), 0.6, 0.001);

    const clo = 0.3;
    const i_a = 0.7;
    expectClose(
      clo_total_insulation(clo + i_a, 0.26, 0.06, i_a, clo),
      0.79,
      0.01,
    );
  });

  test("test_clo_dynamic_ashrae", () => {
    expect(clo_dynamic_ashrae(1, 1)).toBe(1);
    expect(clo_dynamic_ashrae(1, 0.5)).toBe(1);
    expect(clo_dynamic_ashrae(2, 0.5)).toBe(2);
    expectClose(clo_dynamic_ashrae(1.0, 1.0), 1, 1e-8);
    expectClose(clo_dynamic_ashrae(1.0, 1.2), 1, 1e-8);
    expectClose(clo_dynamic_ashrae(1.0, 2.0), 0.8, 1e-8);

    // Test invalid standard input
    // @ts-expect-error the only standard the type allows is "55-2023"
    expect(() => clo_dynamic_ashrae(1.0, 1.0, "invalid")).toThrow(Error);
  });

  test("test_clo_dynamic_iso", () => {
    expectClose(clo_dynamic_iso(1, 1, 0.2), 0.99, 0.01);
    expectClose(clo_dynamic_iso(1.5, 1, 0.2), 1.48, 0.01);

    const clo = [
      0.95, 1.07, 0.88, 0.59, 0.83, 0.66, 1.02, 0.71, 1.1, 0.68, 0.3,
    ];
    const met = [
      1.71, 1.11, 1.21, 1.77, 1.48, 1.5, 1.33, 1.33, 1.26, 1.47, 1.27,
    ];
    const v = [
      0.03, 0.08, 0.04, 0.03, 0.15, 0.15, 0.06, 0.03, 0.25, 0.05, 0.12,
    ];
    const expected = [
      0.85, 1.06, 0.86, 0.52, 0.76, 0.61, 0.97, 0.68, 1.03, 0.63, 0.17,
    ];
    clo.forEach((value, i) =>
      expectClose(clo_dynamic_iso(value, met[i], v[i]), expected[i], 0.01),
    );

    // Test invalid standard input
    expect(() =>
      // @ts-expect-error the only standard the type allows is "9920-2007"
      clo_dynamic_iso(1.0, 1.0, 0.2, undefined, "invalid"),
    ).toThrow(Error);
  });
});

// Mirrors the clothing rows of pythermalcomfort's tests/test_utilities.py
// (v4.6.0). Upstream's test also asserts a DeprecationWarning, because there
// `utilities` is the old import path of a function moved to `clothing`; here
// `utilities` is the functions' one namespace and nothing is deprecated.
describe("test_utilities", () => {
  describe("test_moved_public_utility_shims", () => {
    test.each([
      ["clo_dynamic_ashrae", () => clo_dynamic_ashrae(1, 2), 0.8],
      ["clo_dynamic_iso", () => clo_dynamic_iso(1, 1.2, 0.2), 0.95486298],
      ["clo_area_factor", () => clo_area_factor(1), 1.28],
      [
        "clo_insulation_air_layer",
        () => clo_insulation_air_layer(0.2, 0.1, 0.7),
        0.65224016,
      ],
      [
        "clo_total_insulation",
        () => clo_total_insulation(1.7, 0.2, 0.1, 0.7, 1),
        1.59879185,
      ],
    ])("%s", (_id, call, expected) => {
      expectClose(call(), expected, 1e-8);
    });

    test.todo(
      "clo_intrinsic_insulation_ensemble: clo_intrinsic_insulation_ensemble is not ported",
    );

    test.todo(
      "clo_correction_factor_environment: clo_correction_factor_environment is not ported",
    );
  });
});

// JS-only: upstream has no test at or across the thresholds. Expected values
// are pythermalcomfort 4.6.0's for the same inputs.
describe("clo_dynamic_ashrae", () => {
  test.each([
    [0.5, 1.2, 0.5],
    [0.5, 1.21, 0.465],
    [0.5, 1.4, 0.443],
    [0.5, 2, 0.4],
    [0.5, 4, 0.35],
    [0.61, 1.7, 0.51],
    [0.625, 1.6, 0.531],
    [1.0, 1.25, 0.92],
    [0.75, 3.0, 0.55],
  ])("clo %p at %p met is %p", (clo, met, expected) => {
    expect(clo_dynamic_ashrae(clo, met)).toBe(expected);
  });

  test("names the standard it serves when given another", () => {
    // @ts-expect-error an ISO 7730 edition is not an ASHRAE 55 one
    expect(() => clo_dynamic_ashrae(1, 1, "7730-2025")).toThrow(
      "PMV calculations can only be performed in compliance with ASHRAE 55-2023",
    );
  });
});

describe("clo_dynamic_iso", () => {
  // The three clothing branches of ISO 9920: nude at 0 clo, the interpolation
  // up to 0.6 clo, normal clothing above it.
  test.each([
    [0, 0.0],
    [0.3, 0.16770974752432755],
    [0.6, 0.563119283886116],
    [0.61, 0.5723628112481478],
    [1.4, 1.302827670148809],
  ])("clo %p at 1.4 met and 0.1 m/s is %p", (clo, expected) => {
    expect(clo_dynamic_iso(clo, 1.4, 0.1)).toBeCloseTo(expected, 9);
  });

  // The walking speed starts above 58 W/m2 (0.997 met) and is clipped to
  // 0.7 m/s from 3.31 met; the relative air speed departs from v above 1 met.
  test.each([
    [0.8, 0.8040169861890288],
    [0.99, 0.8040169861890288],
    [1, 0.8036948319089606],
    [1.01, 0.8022092132286942],
    [2, 0.6775156458687438],
    [3.3, 0.5680087746051452],
    [3.4, 0.565789638976345],
    [4, 0.5563823253534133],
  ])("0.8 clo at %p met and 0.1 m/s is %p", (met, expected) => {
    expect(clo_dynamic_iso(0.8, met, 0.1)).toBeCloseTo(expected, 9);
  });

  test("derives the relative air speed rounded as upstream rounds it", () => {
    expect(clo_dynamic_iso(0.8, 1.005, 0)).toBeCloseTo(0.8108809672064847, 9);
  });

  test("i_a defaults to 0.7 clo", () => {
    expect(clo_dynamic_iso(0.8, 1.4, 0.1)).toBe(
      clo_dynamic_iso(0.8, 1.4, 0.1, 0.7),
    );
    expect(clo_dynamic_iso(0.8, 1.4, 0.1, 0.5)).toBeCloseTo(
      0.7459768235805205,
      9,
    );
  });

  test("names the standard it serves when given another", () => {
    expect(() =>
      // @ts-expect-error ISO 7730 is not the standard the correction is from
      clo_dynamic_iso(1, 1, 0.2, 0.7, "7730-2025"),
    ).toThrow(
      "PMV calculations can only be performed in compliance with ISO 9920-2007",
    );
  });
});

// JS-only: pythermalcomfort has no function taking the relative air speed.
describe("clo_dynamic_iso_vr", () => {
  // pythermalcomfort 4.6.0's clo_dynamic_iso(0.61, 1.4, 0.1), whose relative
  // air speed is 0.22 m/s.
  test("corrects at the relative air speed it is given", () => {
    expect(clo_dynamic_iso_vr(0.61, 1.4, 0.22)).toBeCloseTo(
      0.5723628112481478,
      9,
    );
  });

  test.each([
    [0, 1.4, 0.1],
    [0.3, 1.27, 0.12],
    [0.8, 0.8, 0.1],
    [0.8, 1.005, 0],
    [1.1, 1.26, 0.25],
    [0.8, 4, 0.1],
  ])("at clo %p, %p met is clo_dynamic_iso's value for v %p", (clo, met, v) => {
    expect(clo_dynamic_iso_vr(clo, met, v_relative(v, met))).toBe(
      clo_dynamic_iso(clo, met, v),
    );
  });

  test("i_a defaults to 0.7 clo", () => {
    expect(clo_dynamic_iso_vr(0.8, 1.4, 0.22)).toBe(
      clo_dynamic_iso_vr(0.8, 1.4, 0.22, 0.7),
    );
    expect(clo_dynamic_iso_vr(0.8, 1.4, 0.22, 0.5)).toBe(
      clo_dynamic_iso(0.8, 1.4, 0.1, 0.5),
    );
  });

  test("names the standard it serves when given another", () => {
    expect(() =>
      // @ts-expect-error ISO 7730 is not the standard the correction is from
      clo_dynamic_iso_vr(1, 1, 0.2, 0.7, "7730-2025"),
    ).toThrow(
      "PMV calculations can only be performed in compliance with ISO 9920-2007",
    );
  });
});

describe("public API surface", () => {
  test.each([
    "clo_dynamic_ashrae",
    "clo_dynamic_iso",
    "clo_dynamic_iso_vr",
    "clo_area_factor",
    "clo_insulation_air_layer",
    "clo_total_insulation",
  ] as const)("%s is exported from the root and from utilities", (name) => {
    expect(typeof pkg[name]).toBe("function");
    expect(pkg.default.utilities[name]).toBe(pkg[name]);
  });

  test("clo_dynamic, which upstream split in two, is gone", () => {
    expect(pkg).not.toHaveProperty("clo_dynamic");
    expect(pkg.default.utilities).not.toHaveProperty("clo_dynamic");
  });
});

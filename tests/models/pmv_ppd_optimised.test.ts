import { describe, expect, test } from "vitest";
import { _pmv_ppd_optimized } from "../../src/models/_pmv_ppd_optimized.ts";
import { round } from "../../src/_internal/round.ts";
import { approx } from "./testUtils.ts";

// Mirrors pythermalcomfort v4.8.0 tests/test_pmv_ppd_optimised.py, through the
// kernel's own file (S2), as upstream imports it. Upstream's arrays are called
// element-wise.
describe("test_pmv_ppd_optimised", () => {
  describe("TestPmvPpdOptimized", () => {
    test("test_pmv_ppd_optimized", () => {
      expect(
        approx(_pmv_ppd_optimized(25, 25, 0.3, 50, 1.5, 0.7, 0), 0.55, {
          abs: 0.01,
        }),
      ).toBe(true);

      expect(
        [25, 25].map((tdb) =>
          round(_pmv_ppd_optimized(tdb, 25, 0.3, 50, 1.5, 0.7, 0), 2),
        ),
      ).toEqual([0.55, 0.55]);
    });

    test("test_pmv_typical_input", () => {
      const tdb = 25;
      const tr = 23;
      const vr = 0.1;
      const rh = 50;
      const met = 1.2;
      const clo = 0.5;
      const wme = 0;

      const expected_pmv = -0.197;

      expect(
        approx(
          _pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme),
          expected_pmv,
          {
            abs: 0.01,
          },
        ),
      ).toBe(true);
    });

    test("test_pmv_extreme_input", () => {
      const tdb = 35;
      const tr = 45;
      const vr = 2;
      const rh = 10;
      const met = 2.5;
      const clo = 1.5;
      const wme = 1;

      const expected_pmv = 1.86;

      expect(
        approx(
          _pmv_ppd_optimized(tdb, tr, vr, rh, met, clo, wme),
          expected_pmv,
          {
            abs: 0.01,
          },
        ),
      ).toBe(true);
    });

    test("test_nan_input_values", () => {
      expect(_pmv_ppd_optimized(NaN, 23, 0.1, 50, 1.2, 0.5, 0)).toBeNaN();
    });

    test("test_infinite_input_values", () => {
      expect(_pmv_ppd_optimized(Infinity, 23, 0.1, 50, 1.2, 0.5, 0)).toBeNaN();
    });
  });
});

describe("_pmv_ppd_optimized (JS-only)", () => {
  // pythermalcomfort 4.6.0's kernel gives -0.126788 here, where the 2005 guess gave -0.124249.
  test("starts from the ISO 7730:2025 Annex D clothing-temperature guess", () => {
    expect(
      approx(_pmv_ppd_optimized(20, 20, 0.1, 50, 1, 1.5, 0), -0.126788, {
        abs: 1e-6,
      }),
    ).toBe(true);
  });

  // numba's max(hcn, hcf) returns hcn for a NaN hcf; pythermalcomfort 4.7.0 gives 0.12393214675717237.
  test("a negative vr computes as vr = 0, as upstream's max does", () => {
    const at = (vr: number) => _pmv_ppd_optimized(25, 25, vr, 50, 1.2, 0.5, 0);
    expect(at(-0.1)).toBe(at(0));
    expect(approx(at(-0.1), 0.12393214675717237, { abs: 1e-12 })).toBe(true);
  });

  // _pmv_ppd_optimized.py:57-58: pythermalcomfort 4.7.0 raises StopIteration here (decision 69).
  test("throws upstream's message when the loop does not converge", () => {
    expect(() => _pmv_ppd_optimized(25, 25, 0, 50, 1, 20, 0)).toThrow(
      new Error("Max iterations exceeded"),
    );
  });
});

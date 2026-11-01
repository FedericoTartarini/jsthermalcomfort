import { describe, expect, test } from "vitest";
import { esi } from "../../src/models/index.ts";
import { approx } from "./testUtils.ts";

type Inputs = Parameters<typeof esi>[0];

// Mirrors pythermalcomfort v4.7.0 tests/test_esi.py. Its is_equal
// (tests/conftest.py:101-116) is np.isclose or np.allclose with the given atol
// and the default rtol, 1e-5, and its list call runs element-wise.
describe("test_esi", () => {
  // tests/test_esi.py:10 calls is_equal without asserting its result; this asserts it.
  test("test_esi", () => {
    const result = esi({ tdb: 30.2, rh: 42.2, sol_radiation_global: 766 });
    expect(approx(result.esi, 26.2, { rel: 1e-5, abs: 0.1 })).toBe(true);
  });

  // tests/test_esi.py:16 calls is_equal without asserting its result; this asserts it.
  test("test_esi_list_input", () => {
    const tdb = [30.2, 27.0];
    const rh = [42.2, 68.8];
    const sol = [766, 289];
    const expected = [26.2, 25.6];

    tdb.forEach((t, i) => {
      const result = esi({
        tdb: t,
        rh: rh[i] ?? NaN,
        sol_radiation_global: sol[i] ?? NaN,
      });
      expect(
        approx(result.esi, expected[i] ?? NaN, { rel: 1e-5, abs: 0.1 }),
      ).toBe(true);
    });
  });

  // Upstream's ValueError is a RangeError.
  test.each([
    [30, -5, 500], // negative relative humidity
    [30, 120, 500], // RH above 100%
    [30, 50, -10], // negative solar radiation
  ])(
    "test_esi_invalid_numeric_ranges: tdb %s, rh %s, sol %s",
    (tdb, rh, sol) => {
      expect(() => esi({ tdb, rh, sol_radiation_global: sol })).toThrow(
        RangeError,
      );
    },
  );

  // tests/test_esi.py:49 never asserts its 16.5, 19.5 and 18.0; 4.7.0 returns 19.9, 33.1 and 24.8 (upstream draft 46).
  test.each([
    [30, 0, 500, 19.9], // minimum RH
    [30, 100, 500, 33.1], // maximum RH
    [30, 50, 0, 24.8], // minimum solar radiation
  ])(
    "test_esi_boundary_conditions: tdb %s, rh %s, sol %s",
    (tdb, rh, sol, expected) => {
      const result = esi({ tdb, rh, sol_radiation_global: sol });
      expect(approx(result.esi, expected, { rel: 1e-5, abs: 0.1 })).toBe(true);
    },
  );

  test.each([
    ["30.0", 45, 500],
    [30, "45", 500],
    [30, 45, "500.0"],
  ])("test_esi_invalid_type: tdb %s, rh %s, sol %s", (tdb, rh, sol) => {
    expect(() =>
      esi({ tdb, rh, sol_radiation_global: sol } as unknown as Inputs),
    ).toThrow(TypeError);
  });
});

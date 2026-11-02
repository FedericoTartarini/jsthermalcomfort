import { describe, expect, test } from "vitest";
import { thi } from "../../src/models/index.ts";
import { approx } from "./testUtils.ts";

// Mirrors pythermalcomfort v4.7.0 tests/test_thi.py. Its is_equal
// (tests/conftest.py:101-116) is np.isclose or np.allclose with atol 1e-6 and
// the default rtol, 1e-5, and its list call runs element-wise.
describe("test_thi", () => {
  test.each([
    [30.0, 70.0, 81.4],
    [20.0, 50.0, 65.2],
  ])("test_scalar_rounding_default[%s-%s-%s]", (tdb, rh, expected) => {
    // Upstream also asserts a THI instance; the library's result is a frozen object.
    const result = thi({ tdb, rh });
    expect(typeof result.thi).toBe("number");
    expect(approx(result.thi, expected, { rel: 1e-5, abs: 1e-6 })).toBe(true);
  });

  test("test_scalar_no_rounding", () => {
    const [tdb, rh] = [30.0, 70.0];
    const expected = 1.8 * tdb + 32 - 0.55 * (1 - 0.01 * rh) * (1.8 * tdb - 26);
    const result = thi({ tdb, rh, round_output: false });
    expect(approx(result.thi, expected, { rel: 1e-5, abs: 1e-6 })).toBe(true);
  });

  test("test_list_input", () => {
    // Upstream also asserts an ndarray; the scalar model returns a number per call.
    const tdb_list = [30, 20];
    const rh_list = [70, 50];
    const expected = [81.4, 65.2];

    tdb_list.forEach((tdb, i) => {
      const result = thi({ tdb, rh: rh_list[i] ?? NaN });
      expect(
        approx(result.thi, expected[i] ?? NaN, { rel: 1e-5, abs: 1e-6 }),
      ).toBe(true);
    });
  });

  // Upstream's ValueError is a RangeError.
  test.each([
    [25.0, -5.0, RangeError],
    [25.0, 150.0, RangeError], // humidity should be between 0 and 100
    ["hot", "humid", TypeError], // invalid types
  ])(
    "test_invalid_inputs_raise_specific[%s-%s-%s]",
    (tdb, rh, expected_error) => {
      expect(() =>
        thi({ tdb, rh } as unknown as Parameters<typeof thi>[0]),
      ).toThrow(expected_error);
    },
  );
});

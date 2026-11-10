import { describe, expect, test } from "vitest";
import { thi, THI_INFO } from "../../src/models/index.ts";
import { thi as thi_from_root } from "../../src/index.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

type Inputs = Parameters<typeof thi>[0];

const call = (inputs: unknown) => thi(inputs as Inputs);

// Mirrors pythermalcomfort v4.8.0 tests/test_thi.py. Its is_equal
// (tests/conftest.py:100-115) is np.isclose or np.allclose with atol 1e-6 and
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

describeModelContract(thi, THI_INFO, { tdb: 30, rh: 70 });

const rh_message = "Relative humidity must be between 0 and 100 %";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("thi (JS-only)", () => {
  test.each([
    [30, 70, 81.38, 81.4],
    [20, 50, 65.25, 65.2],
    [25, 0, 66.55, 66.6],
    [0, 50, 39.15, 39.2],
    [-40, 0, 13.900000000000006, 13.9],
    [60, 100, 140.0, 140.0],
    [37, 30, 82.96900000000001, 83.0],
    [-50, 100, -58.0, -58.0],
    [0, 0, 46.3, 46.3],
    [25, -0.0, 66.55, 66.6],
    [25, 5e-324, 66.55, 66.6],
  ] as const)(
    "tdb %s, rh %s gives %s, rounded %s",
    (tdb, rh, expected, rounded) => {
      const result = thi({ tdb, rh, round_output: false });
      expect(approx(result.thi, expected, { rel: 1e-12, abs: 0 })).toBe(true);
      expect(thi({ tdb, rh }).thi).toBe(rounded);
    },
  );

  // Upstream's thi is nan at tdb 1e308 and rh 50, rounded or not, as inf - inf, measured on 4.8.0 in the parity image (models/thi.py:44).
  test("a tdb of 1e308 gives null", () => {
    expect(thi({ tdb: 1e308, rh: 50 }).thi).toBe(null);
    expect(thi({ tdb: 1e308, rh: 50, round_output: false }).thi).toBe(null);
  });

  // Deviation thi-3.
  test.each([-5, -Number.MIN_VALUE, 100.00000000000001, 150])(
    "rh %s throws upstream's message as a RangeError",
    (rh) => {
      expect(() => call({ tdb: 25, rh })).toThrow(new RangeError(rh_message));
    },
  );

  // Deviation thi-4.
  test.each([Infinity, -Infinity])(
    "rh %s throws the parse's message as a RangeError",
    (rh) => {
      expect(() => call({ tdb: 25, rh })).toThrow(
        new RangeError("rh must be a finite number."),
      );
    },
  );

  // classes_input.py:928-929.
  test("checks the range after the parse, as THIInputs' __post_init__ runs after BaseInputs'", () => {
    expect(() => call({ tdb: "25", rh: -5 })).toThrow(
      new TypeError("tdb must be a finite number."),
    );
  });

  // Deviation thi-2.
  test("returns no rows", () => {
    for (const [tdb, rh] of [
      [-50, 0],
      [30, 70],
      [60, 100],
    ] as const) {
      expect(thi({ tdb, rh }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(thi_from_root).toBe(thi);
  });
});

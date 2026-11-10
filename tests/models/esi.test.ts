import { describe, expect, test } from "vitest";
import { esi, ESI_INFO } from "../../src/models/index.ts";
import { esi as esi_from_root } from "../../src/index.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

type Inputs = Parameters<typeof esi>[0];

const call = (inputs: unknown) => esi(inputs as Inputs);

// Mirrors pythermalcomfort v4.8.0 tests/test_esi.py. Its is_equal
// (tests/conftest.py:100-115) is np.isclose or np.allclose with the given atol
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

  // tests/test_esi.py:49 never asserts its 16.5, 19.5 and 18.0; 4.7.0 returns 19.9, 33.1 and 24.8 (decision 253, pythermalcomfort#527).
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

describeModelContract(esi, ESI_INFO, {
  tdb: 30.2,
  rh: 42.2,
  sol_radiation_global: 766,
});

const rh_message = "Relative humidity must be between 0 and 100 %";
const sol_message = "Solar radiation must be greater than or equal to 0 W/m2";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("esi (JS-only)", () => {
  test.each([
    [30.2, 42.2, 766, 26.173880712178565, 26.2],
    [27.0, 68.8, 289, 25.554787492217226, 25.6],
    [30, 45, 500, 25.839854029194157, 25.8],
    [30, 0, 500, 19.89985402919416, 19.9],
    [30, 100, 500, 33.099854029194155, 33.1],
    [30, 50, 0, 24.77, 24.8],
    [30, 45, -0.0, 24.109999999999996, 24.1],
    [30, 50, 5e-324, 24.77, 24.8],
    [-20, 0, 0, -13.33, -13.3],
    [45, 100, 1400, 52.449947860867084, 52.4],
    [0, 30, 1000, 1.0999270072992702, 1.1],
  ] as const)(
    "tdb %s, rh %s, sol %s gives %s, rounded %s",
    (tdb, rh, sol_radiation_global, expected, rounded) => {
      const result = esi({
        tdb,
        rh,
        sol_radiation_global,
        round_output: false,
      });
      expect(approx(result.esi, expected, { rel: 1e-12, abs: 0 })).toBe(true);
      expect(esi({ tdb, rh, sol_radiation_global }).esi).toBe(rounded);
    },
  );

  // Deviation esi-3.
  test.each([-5, -Number.MIN_VALUE, 100.00000000000001, 120])(
    "rh %s throws upstream's message as a RangeError",
    (rh) => {
      expect(() => call({ tdb: 30, rh, sol_radiation_global: 500 })).toThrow(
        new RangeError(rh_message),
      );
    },
  );

  // Deviation esi-3.
  test.each([-10, -Number.MIN_VALUE])(
    "sol_radiation_global %s throws upstream's message as a RangeError",
    (sol_radiation_global) => {
      expect(() => call({ tdb: 30, rh: 50, sol_radiation_global })).toThrow(
        new RangeError(sol_message),
      );
    },
  );

  // Deviation esi-4.
  test.each([
    [{ rh: Infinity }, "rh must be a finite number."],
    [{ rh: -Infinity }, "rh must be a finite number."],
    [
      { sol_radiation_global: -Infinity },
      "sol_radiation_global must be a finite number.",
    ],
  ])("%o throws the parse's message as a RangeError", (inputs, message) => {
    expect(() =>
      call({ tdb: 30, rh: 50, sol_radiation_global: 500, ...inputs }),
    ).toThrow(new RangeError(message));
  });

  // classes_input.py:428-434.
  test("checks rh before sol_radiation_global, as ESIInputs does", () => {
    expect(() => call({ tdb: 30, rh: -5, sol_radiation_global: -10 })).toThrow(
      new RangeError(rh_message),
    );
  });

  // classes_input.py:425-426.
  test.each([
    [
      { tdb: "30", rh: -5, sol_radiation_global: 500 },
      "tdb must be a finite number.",
    ],
    [
      { tdb: 30, rh: -5, sol_radiation_global: "500" },
      "sol_radiation_global must be a finite number.",
    ],
  ])(
    "%o checks the ranges after the parse, as ESIInputs' __post_init__ runs after BaseInputs'",
    (inputs, message) => {
      expect(() => call(inputs)).toThrow(new TypeError(message));
    },
  );

  // Deviation esi-2.
  test("returns no rows", () => {
    for (const [tdb, rh, sol_radiation_global] of [
      [-20, 0, 0],
      [30.2, 42.2, 766],
      [45, 100, 1400],
    ] as const) {
      expect(esi({ tdb, rh, sol_radiation_global }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(esi_from_root).toBe(esi);
  });
});

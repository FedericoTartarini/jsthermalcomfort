import { describe, expect, test } from "vitest";
import { solar_gain, SOLAR_GAIN_INFO } from "../../src/models/index.ts";
import { Postures, Standard } from "../../src/utilities/index.ts";
import { solar_gain as solar_gain_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof solar_gain>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.solarGain,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_solar_gain.py.
describe("test_solar_gain", () => {
  test.each(reference_table.data)(
    "test_solar_gain: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      // As upstream, `solar_gain(**inputs)`.
      const result = solar_gain(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  test("test_solar_gain_regression_values", () => {
    const cases = [
      [0, 120, 800, 0.5, 0.5, 0.5, "sitting", 43.2839, 10.3649],
      [30, 60, 600, 0.6, 0.4, 0.6, "standing", 52.8099, 12.1402],
      [45, 90, 500, 0.7, 0.3, 0.7, "supine", 61.447, 14.1257],
      [90, 0, 1000, 1.0, 1.0, 1.0, "sitting", 326.6804, 78.2281],
      [15, 165, 250, 0.2, 0.1, 0.9, "standing", 8.9043, 2.047],
    ] as const;
    for (const [
      alt,
      sharp,
      rad,
      trans,
      svv,
      bes,
      posture,
      exp_erf,
      exp_d_mrt,
    ] of cases) {
      const result = solar_gain({
        sol_altitude: alt,
        sharp,
        sol_radiation_dir: rad,
        sol_transmittance: trans,
        f_svv: svv,
        f_bes: bes,
        posture,
        round_output: false,
      });
      expect(approx(result.erf, exp_erf, { rel: 1e-5, abs: 1e-3 })).toBe(true);
      expect(
        approx(result.delta_mrt, exp_d_mrt, { rel: 1e-5, abs: 1e-3 }),
      ).toBe(true);
    }
  });

  // Upstream's docstring (tests/test_solar_gain.py:59-67):
  //
  // Supine: the rotated angles are used only for the fp lookup.
  //
  // The floor-reflected term depends on the irradiance on the horizontal floor,
  // sol_radiation_dir * sin(sol_altitude) + i_diff, so it must use the solar altitude
  // and not the rotated altitude used to read the fp table. In every case the two
  // altitudes differ, so each case fails if the rotated altitude is used. The expected
  // values agree within 2e-4 with the ERF function of the CBE Thermal Comfort Tool
  // (static/js/erf.js); the first two cases are the supine cases of its tests
  // (erf.test.js: 65.8 / 15.1 and 70.9 / 16.3).
  test("test_solar_gain_supine_reflected_uses_solar_altitude", () => {
    const cases = [
      // sol_altitude, sharp, sol_radiation_dir, sol_transmittance, f_svv, f_bes,
      // expected erf, expected delta_mrt
      [45, 45, 700, 0.8, 0.2, 0.5, 65.8266, 15.1326], // rotated altitude 30
      [45, 45, 800, 0.5, 0.5, 0.5, 70.8746, 16.293], // rotated altitude 30
      [30, 0, 700, 0.8, 0.2, 0.5, 49.3611, 11.3474], // rotated altitude 60
      [0, 60, 800, 0.5, 0.5, 0.5, 39.9589, 9.186], // horizon, rotated 30
      [90, 0, 800, 0.5, 0.5, 0.5, 86.5421, 19.8947], // overhead, rotated 0
    ] as const;
    for (const [
      alt,
      sharp,
      rad,
      trans,
      svv,
      bes,
      exp_erf,
      exp_d_mrt,
    ] of cases) {
      const result = solar_gain({
        sol_altitude: alt,
        sharp,
        sol_radiation_dir: rad,
        sol_transmittance: trans,
        f_svv: svv,
        f_bes: bes,
        asw: 0.7,
        posture: "supine",
        round_output: false,
      });
      expect(approx(result.erf, exp_erf, { rel: 1e-5, abs: 1e-3 })).toBe(true);
      expect(
        approx(result.delta_mrt, exp_d_mrt, { rel: 1e-5, abs: 1e-3 }),
      ).toBe(true);
    }
  });

  test("test_solar_gain_out_of_range_returns_nan", () => {
    const common = {
      sol_radiation_dir: 800,
      sol_transmittance: 0.5,
      f_svv: 0.5,
      f_bes: 0.5,
    };
    // pytest.warns(UserWarning, match="sol_altitude") becomes the row.
    let result = solar_gain({ sol_altitude: 200, sharp: 90, ...common });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        key: "sol_altitude",
        value: 200,
        bound: { min: 0.0, max: 90.0 },
      }),
    ]);
    expect(result.erf).toBe(null);
    expect(result.delta_mrt).toBe(null);

    result = solar_gain({ sol_altitude: 45, sharp: 300, ...common });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        key: "sharp",
        value: 300,
        bound: { min: 0.0, max: 180.0 },
      }),
    ]);
    expect(result.erf).toBe(null);
    expect(result.delta_mrt).toBe(null);

    // mixed valid/invalid array: only the invalid element becomes null,
    // element-wise
    const [valid, invalid] = [45, 200].map((sol_altitude) =>
      solar_gain({ sol_altitude, sharp: 90, ...common }),
    );
    expect(valid?.erf).not.toBe(null);
    expect(invalid?.warnings).toEqual([
      expect.objectContaining({ key: "sol_altitude", value: 200 }),
    ]);
    expect(invalid?.erf).toBe(null);
  });

  test("test_solar_gain_array", () => {
    // The array call, element-wise.
    const cases = [
      [0, 120, 800, 0.5, 0.5, 0.5, 43.2839, 10.3649],
      [90, 0, 1000, 1.0, 1.0, 1.0, 326.6804, 78.2281],
    ] as const;
    for (const [
      alt,
      sharp,
      rad,
      trans,
      svv,
      bes,
      exp_erf,
      exp_d_mrt,
    ] of cases) {
      const result = solar_gain({
        sol_altitude: alt,
        sharp,
        sol_radiation_dir: rad,
        sol_transmittance: trans,
        f_svv: svv,
        f_bes: bes,
        posture: "sitting",
        round_output: false,
      });
      expect(approx(result.erf, exp_erf, { rel: 1e-5, abs: 1e-3 })).toBe(true);
      expect(
        approx(result.delta_mrt, exp_d_mrt, { rel: 1e-5, abs: 1e-3 }),
      ).toBe(true);
    }
  });
});

describeModelContract(
  solar_gain,
  SOLAR_GAIN_INFO,
  {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  },
  {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
    asw: 2,
  },
);

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, measured on pythermalcomfort 4.6.2
// (the supine values on 4.8.0), and what only the library adds.
describe("solar_gain (JS-only)", () => {
  const base = {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  };
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => solar_gain(inputs as Inputs);
  const POSTURE = "Posture has to be either 'standing', 'supine' or 'sitting'.";

  describe("values", () => {
    test("gives the docstring example's values", () => {
      const result = solar_gain({ ...base, asw: 0.7, posture: "sitting" });
      expect(result.erf).toBe(43.3);
      expect(result.delta_mrt).toBe(10.4);
    });

    // Upstream lower-cases posture (models/solar_gain.py:210): "Supine"
    // gives 40.0 and 9.2 on pythermalcomfort 4.8.0.
    test("posture is case-insensitive, as upstream", () => {
      for (const posture of ["standing", "supine", "sitting"] as const)
        for (const given of [
          posture.toUpperCase(),
          posture.charAt(0).toUpperCase() + posture.slice(1),
        ])
          expect(call({ ...base, posture: given })()).toEqual(
            solar_gain({ ...base, posture }),
          );
      expect(call({ ...base, posture: "Supine" })()).toMatchObject({
        erf: 40.0,
        delta_mrt: 9.2,
      });
    });

    // deviation _shared-29
    test("posture takes the constant or its string", () => {
      expect(solar_gain({ ...base, posture: Postures.standing })).toEqual(
        solar_gain({ ...base, posture: "standing" }),
      );
      expect(solar_gain({ ...base, posture: Postures.supine })).toEqual(
        solar_gain({ ...base, posture: "supine" }),
      );
      expect(solar_gain({ ...base, posture: Postures.sitting })).toEqual(
        solar_gain({ ...base, posture: "sitting" }),
      );
    });

    // np.round(erf, 1) (models/solar_gain.py:255-257); the unrounded values
    // are upstream's, measured on pythermalcomfort 4.6.2.
    test("round_output rounds both outputs to one decimal, and only then", () => {
      const unrounded = solar_gain({ ...base, round_output: false });
      expect(unrounded.erf).toBe(43.28387368421052);
      expect(unrounded.delta_mrt).toBe(10.364912280701752);
      expect(solar_gain(base)).toMatchObject({ erf: 43.3, delta_mrt: 10.4 });
    });

    // The supine path transposes sharp and sol_altitude for the fp lookup
    // (models/solar_gain.py:294-295); measured on pythermalcomfort 4.8.0.
    test("supine gives upstream's values at the table's corners", () => {
      for (const [sol_altitude, sharp, erf, delta_mrt] of [
        [0, 0, 25.86, 5.94],
        [90, 0, 86.54, 19.89],
        [90, 180, 86.54, 19.89],
        [0, 180, 25.86, 5.94],
      ] as const) {
        const result = solar_gain({
          ...base,
          sol_altitude,
          sharp,
          posture: "supine",
          round_output: false,
        });
        expect(Math.round((result.erf ?? NaN) * 100) / 100).toBe(erf);
        expect(Math.round((result.delta_mrt ?? NaN) * 100) / 100).toBe(
          delta_mrt,
        );
      }
    });
  });

  describe("errors", () => {
    // deviation solar_gain-5 (models/solar_gain.py:212-214)
    test("posture outside the three throws RangeError with upstream's message", () => {
      for (const bad of ["lying", "crouching", "", "sitting "])
        expect(call({ ...base, posture: bad })).toThrow(
          new RangeError(POSTURE),
        );
    });

    // deviation solar_gain-6
    test("posture that is not a string throws TypeError with the same message", () => {
      for (const bad of [null, 5, true, ["sitting"], {}])
        expect(call({ ...base, posture: bad })).toThrow(new TypeError(POSTURE));
    });
  });

  // Upstream's _valid_range on sol_altitude and sharp, with no limit_inputs
  // gate (deviation solar_gain-2), and ASHRAE 55 Table C-2's ranges, which
  // upstream does not check (deviation solar_gain-3, deviation solar_gain-4).
  // Upstream calls no other warnings.warn, so there are no notice rows.
  describe("warnings", () => {
    const { inputs } = SOLAR_GAIN_INFO;

    test("an in-range call has no rows", () => {
      expect(solar_gain(base).warnings).toEqual([]);
    });

    test("sol_altitude outside 0-90 gives a row and null", () => {
      const result = solar_gain({ ...base, sol_altitude: 95 });
      expect(result.warnings).toEqual([
        {
          kind: "range",
          key: "sol_altitude",
          role: "input",
          value: 95,
          unit: "°",
          bound: { min: 0.0, max: 90.0 },
        },
      ]);
      expect(result.warnings[0]).toHaveProperty(
        "bound",
        inputs.sol_altitude.applicability,
      );
      expect(result.erf).toBe(null);
      expect(result.delta_mrt).toBe(null);
    });

    test("sharp outside 0-180 gives a row and null, supine included", () => {
      for (const posture of ["sitting", "standing", "supine"] as const) {
        const result = solar_gain({ ...base, sharp: -1, posture });
        expect(result.warnings).toEqual([
          {
            kind: "range",
            key: "sharp",
            role: "input",
            value: -1,
            unit: "°",
            bound: { min: 0.0, max: 180.0 },
          },
        ]);
        expect(result.erf).toBe(null);
      }
    });

    test("sol_radiation_dir outside Table C-2's range gives a row and still computes", () => {
      for (const sol_radiation_dir of [150, 1001]) {
        const result = solar_gain({
          ...base,
          sol_radiation_dir,
          round_output: false,
        });
        expect(result.warnings).toEqual([
          {
            kind: "range",
            key: "sol_radiation_dir",
            role: "input",
            value: sol_radiation_dir,
            unit: "W/m²",
            bound: { min: 200, max: 1000 },
          },
        ]);
        expect(result.warnings[0]).toHaveProperty(
          "bound",
          inputs.sol_radiation_dir.applicability,
        );
        expect(Number.isFinite(result.erf)).toBe(true);
      }
      // Upstream gives 8.1 and 1.9 for 150 W/m², with no warning.
      expect(solar_gain({ ...base, sol_radiation_dir: 150 })).toMatchObject({
        erf: 8.1,
        delta_mrt: 1.9,
      });
    });

    test("asw outside Table C-2's range gives a row and still computes", () => {
      const result = solar_gain({ ...base, asw: 0.95, round_output: false });
      expect(result.warnings).toEqual([
        {
          kind: "range",
          key: "asw",
          role: "input",
          value: 0.95,
          unit: null,
          bound: { min: 0.2, max: 0.9 },
        },
      ]);
      // erf is linear in asw, so the number is upstream's formula unchanged.
      const at_default = solar_gain({ ...base, round_output: false });
      expect(approx(result.erf, ((at_default.erf ?? NaN) * 0.95) / 0.7)).toBe(
        true,
      );
    });

    test("every broken range has its own row, in the checks' order", () => {
      const result = solar_gain({
        ...base,
        sol_altitude: -1,
        sharp: 181,
        sol_radiation_dir: 1001,
        asw: 0.1,
      });
      expect(
        result.warnings.map((row) => row.kind === "range" && row.key),
      ).toEqual(["sol_altitude", "sharp", "sol_radiation_dir", "asw"]);
      expect(result.erf).toBe(null);
    });

    test("the bounds' ends are inside the range", () => {
      const result = solar_gain({
        ...base,
        sol_altitude: 90,
        sharp: 180,
        sol_radiation_dir: 1000,
        asw: 0.2,
      });
      expect(result.warnings).toEqual([]);
      expect(Number.isFinite(result.erf)).toBe(true);
    });
  });

  // deviation _shared-4 (models/solar_gain.py:83)
  test("INFO.standards is ASHRAE 55-2023", () => {
    expect(SOLAR_GAIN_INFO.standards).toEqual([Standard.ashrae_55_2023]);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(solar_gain_from_root).toBe(solar_gain);
  });
});

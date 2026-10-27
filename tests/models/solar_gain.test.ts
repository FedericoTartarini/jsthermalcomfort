import { describe, expect, test } from "vitest";
import { solar_gain, SOLAR_GAIN_INFO } from "../../src/models/index.ts";
import { Postures } from "../../src/utilities/index.ts";
import { solar_gain as solar_gain_from_root } from "../../src/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof solar_gain>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.solarGain,
);

/** numpy's `isclose(a, b, atol=atol)`, whose `rtol` defaults to 1e-5. */
function isclose(a: number, b: number, atol: number): boolean {
  return Math.abs(a - b) <= atol + 1e-5 * Math.abs(b);
}

// Mirrors pythermalcomfort v4.7.0 tests/test_solar_gain.py.
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
      expect(isclose(result.erf, exp_erf, 1e-3)).toBe(true);
      expect(isclose(result.delta_mrt, exp_d_mrt, 1e-3)).toBe(true);
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
      expect(isclose(result.erf, exp_erf, 1e-3)).toBe(true);
      expect(isclose(result.delta_mrt, exp_d_mrt, 1e-3)).toBe(true);
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
    expect(result.erf).toBeNaN();
    expect(result.delta_mrt).toBeNaN();

    result = solar_gain({ sol_altitude: 45, sharp: 300, ...common });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        key: "sharp",
        value: 300,
        bound: { min: 0.0, max: 180.0 },
      }),
    ]);
    expect(result.erf).toBeNaN();
    expect(result.delta_mrt).toBeNaN();

    // mixed valid/invalid array: only the invalid element becomes NaN,
    // element-wise
    const [valid, invalid] = [45, 200].map((sol_altitude) =>
      solar_gain({ sol_altitude, sharp: 90, ...common }),
    );
    expect(valid?.erf).not.toBeNaN();
    expect(invalid?.warnings).toEqual([
      expect.objectContaining({ key: "sol_altitude", value: 200 }),
    ]);
    expect(invalid?.erf).toBeNaN();
  });

  test("test_solar_gain_array", () => {
    // The array call, element-wise.
    const inputs = [
      [0, 120, 800, 0.5, 0.5, 0.5],
      [90, 0, 1000, 1.0, 1.0, 1.0],
    ] as const;
    const results = inputs.map(([alt, sharp, rad, trans, svv, bes]) =>
      solar_gain({
        sol_altitude: alt,
        sharp,
        sol_radiation_dir: rad,
        sol_transmittance: trans,
        f_svv: svv,
        f_bes: bes,
        posture: "sitting",
        round_output: false,
      }),
    );
    const erf = [43.2839, 326.6804];
    const delta_mrt = [10.3649, 78.2281];
    results.forEach((result, i) => {
      expect(isclose(result.erf, erf[i] ?? NaN, 1e-3)).toBe(true);
      expect(isclose(result.delta_mrt, delta_mrt[i] ?? NaN, 1e-3)).toBe(true);
    });
  });
});

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, measured on pythermalcomfort 4.6.2
// (the supine values on 4.7.0), and what only the library adds.
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

    // Upstream lower-cases posture (models/solar_gain.py:207): "Supine"
    // gives 40.0 and 9.2 on pythermalcomfort 4.7.0.
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

    test("undefined takes the default, as an omitted keyword does", () => {
      expect(
        solar_gain({
          ...base,
          asw: undefined,
          posture: undefined,
          floor_reflectance: undefined,
          round_output: undefined,
        }),
      ).toEqual(
        solar_gain({
          ...base,
          asw: 0.7,
          posture: "sitting",
          floor_reflectance: 0.6,
          round_output: true,
        }),
      );
    });

    // np.round(erf, 1) (models/solar_gain.py:252-254); the unrounded values
    // are upstream's, measured on pythermalcomfort 4.6.2.
    test("round_output rounds both outputs to one decimal, and only then", () => {
      const unrounded = solar_gain({ ...base, round_output: false });
      expect(unrounded.erf).toBe(43.28387368421052);
      expect(unrounded.delta_mrt).toBe(10.364912280701752);
      expect(solar_gain(base)).toMatchObject({ erf: 43.3, delta_mrt: 10.4 });
    });

    // The supine path transposes sharp and sol_altitude for the fp lookup
    // (models/solar_gain.py:291-292); measured on pythermalcomfort 4.7.0.
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
        expect(Math.round(result.erf * 100) / 100).toBe(erf);
        expect(Math.round(result.delta_mrt * 100) / 100).toBe(delta_mrt);
      }
    });
  });

  describe("errors", () => {
    // The model's own message (models/solar_gain.py:209-211), a RangeError
    // where upstream raises ValueError (deviation solar_gain-5).
    test("posture outside the three throws RangeError with upstream's message", () => {
      for (const bad of ["lying", "crouching", "", "sitting "])
        expect(call({ ...base, posture: bad })).toThrow(
          new RangeError(POSTURE),
        );
    });

    // Upstream's posture.lower() raises AttributeError for these (deviation
    // solar_gain-6).
    test("posture that is not a string throws TypeError with the same message", () => {
      for (const bad of [null, 5, true, ["sitting"], {}])
        expect(call({ ...base, posture: bad })).toThrow(new TypeError(POSTURE));
    });

    // Upstream reads True as 1, fails later on None and broadcasts an array
    // (deviation _shared-5, deviation _shared-6), and its message for another
    // type names Python's types (deviation _shared-10).
    test("a quantity that is not a number throws TypeError", () => {
      for (const key of Object.keys(SOLAR_GAIN_INFO.inputs).filter(
        (key) =>
          SOLAR_GAIN_INFO.inputs[key as keyof typeof SOLAR_GAIN_INFO.inputs]
            .kind === "numeric",
      ))
        for (const bad of ["1", null, true, [1]])
          expect(call({ ...base, [key]: bad })).toThrow(
            new TypeError(`${key} must be a finite number.`),
          );
    });

    // Upstream returns NaN for a NaN sol_altitude, with no warning (deviation
    // _shared-7).
    test("a quantity that is not finite throws RangeError", () => {
      for (const bad of [NaN, Infinity, -Infinity])
        for (const key of ["sol_altitude", "asw", "floor_reflectance"])
          expect(call({ ...base, [key]: bad })).toThrow(
            new RangeError(`${key} must be a finite number.`),
          );
    });

    // Upstream reads round_output for its truth value (deviation _shared-8).
    test("round_output that is not a boolean throws TypeError", () => {
      for (const bad of [0, 1, "true", null])
        expect(call({ ...base, round_output: bad })).toThrow(
          new TypeError("round_output must be a boolean."),
        );
    });

    // The library's messages, where Python's name its call binding (deviation
    // _shared-10).
    test("a missing quantity throws TypeError, naming the first", () => {
      expect(call({})).toThrow(new TypeError("sol_altitude is required."));
      expect(
        call({
          sol_altitude: 0,
          sharp: 120,
          sol_radiation_dir: 800,
          sol_transmittance: 0.5,
          f_svv: 0.5,
        }),
      ).toThrow(new TypeError("f_bes is required."));
    });

    test("an unknown key throws TypeError, naming the first", () => {
      for (const key of ["altitude", "limit_inputs", "units"])
        expect(call({ ...base, [key]: 1 })).toThrow(
          new TypeError(`${key} is not an input of solar_gain().`),
        );
    });

    // Every argument was positional before v2 (ADR 0002).
    test("anything but an inputs object throws TypeError", () => {
      for (const bad of [0, null, undefined, [0, 120, 800, 0.5, 0.5, 0.5]])
        expect(call(bad)).toThrow(
          new TypeError("solar_gain() takes one inputs object."),
        );
    });

    // Upstream checks posture after the ranges (models/solar_gain.py:198-212);
    // the library checks in the definition's order (deviation _shared-9).
    test("checks run in the definition's order", () => {
      expect(call({ ...base, sol_altitude: "x", posture: "lying" })).toThrow(
        new TypeError("sol_altitude must be a finite number."),
      );
      expect(
        call({ ...base, posture: "lying", floor_reflectance: "x" }),
      ).toThrow(new RangeError(POSTURE));
    });
  });

  describe("result", () => {
    // As upstream's frozen dataclass (classes_return.py:480).
    test("is frozen, its warnings included", () => {
      const result = solar_gain({ ...base, sol_altitude: 95 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.warnings)).toBe(true);
      expect(Object.isFrozen(result.warnings[0])).toBe(true);
      expect(() => {
        (result as { erf: number }).erf = 1;
      }).toThrow(TypeError);
    });

    test("has upstream's fields, then warnings", () => {
      expect(Object.keys(solar_gain(base))).toEqual([
        "erf",
        "delta_mrt",
        "warnings",
      ]);
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

    test("sol_altitude outside 0-90 gives a row and NaN", () => {
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
      expect(result.erf).toBeNaN();
      expect(result.delta_mrt).toBeNaN();
    });

    test("sharp outside 0-180 gives a row and NaN, supine included", () => {
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
        expect(result.erf).toBeNaN();
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
      expect(result.erf).toBeCloseTo((at_default.erf * 0.95) / 0.7, 10);
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
      expect(result.erf).toBeNaN();
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

  // deviation solar_gain-1
  describe("SOLAR_GAIN_INFO", () => {
    test("names the model, with no description", () => {
      expect(SOLAR_GAIN_INFO.name).toBe("solar_gain");
      expect(SOLAR_GAIN_INFO.label).toBe("Solar gain on people");
      expect(SOLAR_GAIN_INFO.standards).toEqual([]);
      expect(SOLAR_GAIN_INFO).not.toHaveProperty("description");
      expect(SOLAR_GAIN_INFO).not.toHaveProperty("derived");
    });

    test("lists every keyword argument, in upstream's order, with its defaults", () => {
      expect(SOLAR_GAIN_INFO.inputs).toEqual({
        sol_altitude: {
          kind: "numeric",
          unit: "°",
          applicability: { min: 0, max: 90 },
        },
        sharp: {
          kind: "numeric",
          unit: "°",
          applicability: { min: 0, max: 180 },
        },
        sol_radiation_dir: {
          kind: "numeric",
          unit: "W/m²",
          applicability: { min: 200, max: 1000 },
        },
        sol_transmittance: { kind: "numeric", unit: null },
        f_svv: { kind: "numeric", unit: null },
        f_bes: { kind: "numeric", unit: null },
        asw: {
          kind: "numeric",
          unit: null,
          applicability: { min: 0.2, max: 0.9 },
          default: 0.7,
        },
        posture: {
          kind: "choice",
          allowed: ["standing", "supine", "sitting"],
          default: "sitting",
          message: POSTURE,
        },
        floor_reflectance: { kind: "numeric", unit: null, default: 0.6 },
        round_output: { kind: "bool", default: true },
      });
      expect(Object.keys(SOLAR_GAIN_INFO.inputs)).toEqual([
        "sol_altitude",
        "sharp",
        "sol_radiation_dir",
        "sol_transmittance",
        "f_svv",
        "f_bes",
        "asw",
        "posture",
        "floor_reflectance",
        "round_output",
      ]);
    });

    test("erf in W/m² and delta_mrt in °C are the outputs", () => {
      expect(SOLAR_GAIN_INFO.outputs).toEqual({
        erf: { unit: "W/m²" },
        delta_mrt: { unit: "°C" },
      });
    });

    test("is frozen deeply", () => {
      const { inputs, outputs } = SOLAR_GAIN_INFO;
      expect(Object.isFrozen(SOLAR_GAIN_INFO)).toBe(true);
      expect(Object.isFrozen(SOLAR_GAIN_INFO.standards)).toBe(true);
      expect(Object.isFrozen(inputs.sol_altitude.applicability)).toBe(true);
      expect(Object.isFrozen(inputs.posture.allowed)).toBe(true);
      expect(Object.isFrozen(outputs.erf)).toBe(true);
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(solar_gain_from_root).toBe(solar_gain);
  });
});

import { describe, expect, test } from "vitest";
import * as validation from "../src/_internal/validation.ts";
import {
  _mapping,
  _valid_range,
  HEAT_INDEX_STRESS_CATEGORIES,
} from "../src/_internal/validation.ts";
import type { ModelWarning } from "../src/_internal/modelInfo.ts";
import {
  ASHRAE_55_LIMITS,
  _check_ashrae55_compliance,
} from "../src/_internal/ashrae55.ts";
import {
  BASE_INPUTS_UNITS,
  choiceFieldMessage,
  parseInputs,
} from "../src/_internal/define.ts";
import { CLO_TOUT_INFO } from "../src/models/index.ts";

// Mirrors pythermalcomfort v4.7.0 tests/test_internal.py, which tests
// _internal directly, so it imports the kernels' own file (seam S2). A
// UserWarning becomes a range row (deviation _shared-3), and a `match=` on its
// text becomes assertions on the row's key, value and bound.
describe("test_internal", () => {
  const bound = { min: 10.0, max: 40.0 };

  describe("TestValidRange", () => {
    test("test_scalar_out_of_range_warns", () => {
      const warnings: ModelWarning[] = [];
      const result = _valid_range(50.0, bound, "tdb", "input", "°C", warnings);
      expect(warnings).toMatchObject([{ key: "tdb", value: 50.0, bound }]);
      expect(result).toBeNaN();
    });

    // Upstream's array, element-wise: one row per value outside the bound.
    test("test_array_out_of_range_warns", () => {
      const warnings: ModelWarning[] = [];
      const result = [20.0, 50.0, 30.0, 45.0].map((x) =>
        _valid_range(x, bound, "tdb", "input", "°C", warnings),
      );
      expect(warnings).toMatchObject([
        { key: "tdb", value: 50.0, bound },
        { key: "tdb", value: 45.0, bound },
      ]);
      expect(result[1]).toBeNaN();
      expect(result[3]).toBeNaN();
      expect([result[0], result[2]]).toEqual([20.0, 30.0]);
    });

    test("test_in_range_no_warning", () => {
      const warnings: ModelWarning[] = [];
      const result = _valid_range(25.0, bound, "tdb", "input", "°C", warnings);
      expect(warnings).toHaveLength(0);
      expect(result).toBe(25.0);
    });

    test.todo(
      "test_no_param_name_auto_extracts_from_caller: param_name is required, since JavaScript cannot read the caller's source",
    );
    test.todo(
      "test_no_param_name_literal_falls_back_to_unknown: param_name is required, since JavaScript cannot read the caller's source",
    );
  });

  test("test_internal_renames_have_no_compatibility_aliases", () => {
    expect(validation).not.toHaveProperty("valid_range");
    expect(validation).not.toHaveProperty("mapping");
    // Upstream's {15: "low", 25: "medium", 35: "high"}, element-wise.
    const bins = {
      edges: [15, 25, 35],
      labels: ["low", "medium", "high"],
      right: true,
    };
    expect([10, 20, 30].map((value) => _mapping(value, bins))).toEqual([
      "low",
      "medium",
      "high",
    ]);
  });

  // Upstream's airspeed_control warnings are range rows keyed v_param_name
  // (deviation _shared-38): a `match=` on their text becomes the row's bound.
  describe("TestCheckAshrae55Compliance", () => {
    test("test_airspeed_control_cond1_warns", () => {
      const warnings: ModelWarning[] = [];
      _check_ashrae55_compliance(
        {
          tdb: 30,
          tr: 30,
          v: 1.0,
          met: 1.2,
          clo: 0.5,
          airspeed_control: false,
        },
        warnings,
      );
      expect(warnings).toMatchObject([
        { key: "v", value: 1.0, bound: { max: 0.8 } },
      ]);
      expect(warnings).toHaveLength(1);
    });

    // With tdb=tr=24, to=24; v_limit ≈ 0.32; v=0.5 > v_limit triggers cond2.
    test("test_airspeed_control_cond2_warns", () => {
      const warnings: ModelWarning[] = [];
      _check_ashrae55_compliance(
        {
          tdb: 24,
          tr: 24,
          v: 0.5,
          met: 1.2,
          clo: 0.5,
          airspeed_control: false,
        },
        warnings,
      );
      const v_limit = 50.49 - 4.4047 * 24 + 0.096425 * 24 * 24;
      expect(warnings).toMatchObject([
        { key: "v", value: 0.5, bound: { max: v_limit } },
      ]);
    });

    test("test_airspeed_control_cond3_warns", () => {
      const warnings: ModelWarning[] = [];
      _check_ashrae55_compliance(
        {
          tdb: 22,
          tr: 22,
          v: 0.3,
          met: 1.2,
          clo: 0.5,
          airspeed_control: false,
        },
        warnings,
      );
      expect(warnings).toMatchObject([
        { key: "v", value: 0.3, bound: { max: 0.2 } },
      ]);
    });

    test("test_airspeed_control_true_no_condition_warning", () => {
      const warnings: ModelWarning[] = [];
      _check_ashrae55_compliance(
        { tdb: 25, tr: 25, v: 1.0, met: 1.2, clo: 0.5, airspeed_control: true },
        warnings,
      );
      expect(warnings).toHaveLength(0);
    });
  });
  test.todo(
    "test_validate_type: no counterpart, as the input definition's parse makes upstream's type checks",
  );
  test.todo(
    "test_base_inputs_store_normalized_numpy_scalar: no counterpart, as JavaScript has no numpy scalars",
  );
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("_check_ashrae55_compliance (JS-only)", () => {
  const check = (kwargs: Parameters<typeof _check_ashrae55_compliance>[0]) => {
    const warnings: ModelWarning[] = [];
    const values = _check_ashrae55_compliance(kwargs, warnings);
    return { values, warnings };
  };

  // ashrae55.py:29-30, :36, :94-95, :101.
  test("ASHRAE_55_LIMITS holds upstream's limits, keyed as its arguments, frozen", () => {
    expect(ASHRAE_55_LIMITS).toEqual({
      tdb: { min: 10.0, max: 40.0 },
      tr: { min: 10.0, max: 40.0 },
      v: { min: 0.0, max: 2.0 },
      met: { min: 1.0, max: 4.0 },
      clo: { min: 0.0, max: 1.5 },
      v_limited: { min: 0.0, max: 0.2 },
    });
    expect(Object.isFrozen(ASHRAE_55_LIMITS.v_limited)).toBe(true);
  });

  test("returns the values in upstream's order, NaN where a limit broke", () => {
    expect(check({ tdb: 20, tr: 45, v: 0.1 }).values).toEqual([20, NaN, 0.1]);
    expect(
      check({ tdb: 20, tr: 20, v_limited: 0.3, met: 1.2, clo: 0.5 }).values,
    ).toEqual([20, 20, 1.2, 0.5, NaN]);
    expect(
      check({
        tdb: 20,
        tr: 20,
        v: 1.0,
        met: 1.2,
        clo: 0.5,
        airspeed_control: false,
      }).values,
    ).toEqual([20, 20, NaN, 1.2, 0.5]);
  });

  // _check_ashrae55_compliance(tdb=20.0, tr=20.0, v=2.5, met=0.9, clo=0.5,
  // airspeed_control=False, v_param_name="vr") warns 'vr' (0-2), 'vr' (cond1),
  // 'vr' (cond3) and 'met', in that order.
  test("rows come in upstream's order, the airspeed ones keyed v_param_name", () => {
    const { values, warnings } = check({
      tdb: 20,
      tr: 20,
      v: 2.5,
      met: 0.9,
      clo: 0.5,
      airspeed_control: false,
      v_param_name: "vr",
    });
    expect(warnings).toEqual([
      {
        kind: "range",
        key: "vr",
        role: "input",
        value: 2.5,
        unit: "m/s",
        bound: ASHRAE_55_LIMITS.v,
      },
      {
        kind: "range",
        key: "vr",
        role: "input",
        value: 2.5,
        unit: "m/s",
        bound: { max: 0.8 },
      },
      {
        kind: "range",
        key: "vr",
        role: "input",
        value: 2.5,
        unit: "m/s",
        bound: { max: 0.2 },
      },
      {
        kind: "range",
        key: "met",
        role: "input",
        value: 0.9,
        unit: "met",
        bound: ASHRAE_55_LIMITS.met,
      },
    ]);
    expect(warnings.every((row) => Object.isFrozen(row))).toBe(true);
    expect(values).toEqual([20, 20, NaN, NaN, 0.5]);
  });

  test("a row's fixed bound is the shared object, not a copy", () => {
    const { warnings } = check({ tdb: 45, tr: 20, v_limited: 0.3 });
    const bounds = warnings.map((row) => row.kind === "range" && row.bound);
    expect(bounds[0]).toBe(ASHRAE_55_LIMITS.tdb);
    expect(bounds[1]).toBe(ASHRAE_55_LIMITS.v_limited);
  });

  // _check_ashrae55_compliance(tdb=20.0, tr=20.0, v_limited=0.3, met=1.2,
  // clo=0.5) warns 'v_limited' only.
  test("checks v_limited, keyed as upstream names it", () => {
    expect(
      check({ tdb: 20, tr: 20, v_limited: 0.3, met: 1.2, clo: 0.5 }).warnings,
    ).toMatchObject([{ key: "v_limited", value: 0.3, unit: "m/s" }]);
  });

  // Upstream raises KeyError for met without clo, and for
  // airspeed_control=False without v (_internal/ashrae55.py:40-41, :95), so
  // the type rejects both calls.
  test("the type requires what upstream reads unguarded", () => {
    const typed = (kwargs: Parameters<typeof _check_ashrae55_compliance>[0]) =>
      kwargs;
    // @ts-expect-error clo goes with met.
    typed({ tdb: 20, tr: 20, met: 1.2 });
    // @ts-expect-error airspeed_control false needs v.
    typed({ tdb: 20, tr: 20, met: 1.2, clo: 0.5, airspeed_control: false });
    expect(typed({ tdb: 20, tr: 20 })).toEqual({ tdb: 20, tr: 20 });
  });

  test("the airspeed rules need low clo and met", () => {
    for (const [met, clo] of [
      [1.3, 0.5],
      [1.2, 0.7],
    ] as const)
      expect(
        check({ tdb: 22, tr: 22, v: 1.0, met, clo, airspeed_control: false })
          .warnings,
      ).toEqual([]);
  });
});

// What upstream's tests leave out: the row's other fields, and the unbounded
// side of upstream's (27.0, np.inf).
describe("_valid_range (JS-only)", () => {
  test("a row carries its kind, role and unit, frozen", () => {
    const warnings: ModelWarning[] = [];
    _valid_range(-1, { min: 0 }, "pa", "derived", "kPa", warnings);
    expect(warnings).toEqual([
      {
        kind: "range",
        key: "pa",
        role: "derived",
        value: -1,
        unit: "kPa",
        bound: { min: 0 },
      },
    ]);
    expect(Object.isFrozen(warnings[0])).toBe(true);
  });

  test("a missing side is unbounded, and the bounds are inclusive", () => {
    const warnings: ModelWarning[] = [];
    const valid = { min: 27 };
    expect(_valid_range(27, valid, "tdb", "input", "°C", warnings)).toBe(27);
    expect(_valid_range(1e300, valid, "tdb", "input", "°C", warnings)).toBe(
      1e300,
    );
    expect(warnings).toHaveLength(0);
    expect(
      _valid_range(26.999, valid, "tdb", "input", "°C", warnings),
    ).toBeNaN();
    expect(warnings).toHaveLength(1);
  });

  test("the row's bound is the object passed, not a copy", () => {
    const warnings: ModelWarning[] = [];
    const valid = Object.freeze({ max: 5 });
    _valid_range(6, valid, "pa (kPa)", "derived", "kPa", warnings);
    const [row] = warnings;
    expect(row?.kind === "range" && row.bound).toBe(valid);
  });
});

describe("_mapping (JS-only)", () => {
  // The example in _mapping's TSDoc. Upstream's docstring prints
  // ['low', 'medium', 'high'] (_internal/validation.py:206-207); pythermalcomfort
  // 4.6.2 with numpy 2.5.4 returns ['medium', 'medium', 'high'] in the parity
  // image (scripts/parity/Dockerfile, linux/amd64).
  test("the TSDoc example gives what upstream returns", () => {
    const bins = {
      edges: [15, 25, 35],
      labels: ["low", "medium", "high"],
      right: true,
    };
    expect([20, 25, 30].map((t) => _mapping(t, bins))).toEqual([
      "medium",
      "medium",
      "high",
    ]);
  });
});

// Upstream's dict (_internal/validation.py:172), its keys as edges and its
// values as labels.
describe("HEAT_INDEX_STRESS_CATEGORIES", () => {
  test("holds upstream's thresholds and categories, frozen", () => {
    expect(HEAT_INDEX_STRESS_CATEGORIES).toEqual({
      edges: [32.0, 41.0, 54.0, 1000.0],
      labels: ["caution", "extreme caution", "danger", "extreme danger"],
    });
    expect(Object.isFrozen(HEAT_INDEX_STRESS_CATEGORIES)).toBe(true);
    expect(Object.isFrozen(HEAT_INDEX_STRESS_CATEGORIES.edges)).toBe(true);
    expect(Object.isFrozen(HEAT_INDEX_STRESS_CATEGORIES.labels)).toBe(true);
  });
});

// BaseInputs' units field (classes_input.py:95, :114-121), defined once.
describe("BASE_INPUTS_UNITS (JS-only)", () => {
  test("holds upstream's default and message, frozen", () => {
    expect(BASE_INPUTS_UNITS).toEqual({
      kind: "choice",
      allowed: ["SI", "IP"],
      default: "SI",
      message: "Units must be either 'SI' or 'IP'",
    });
    expect(Object.isFrozen(BASE_INPUTS_UNITS)).toBe(true);
    expect(Object.isFrozen(BASE_INPUTS_UNITS.allowed)).toBe(true);
  });

  test("a model's INFO references it rather than a copy", () => {
    expect(CLO_TOUT_INFO.inputs.units).toBe(BASE_INPUTS_UNITS);
  });
});

// The string-option kind, on a definition holding upstream's units field.
describe("parseInputs, choice (JS-only)", () => {
  const info = { name: "f", inputs: { units: BASE_INPUTS_UNITS } } as const;
  const parse = (units: unknown) => () => parseInputs(info, { units });

  test("takes an allowed value in any case, and returns it as given", () => {
    expect(parse("IP")()).toEqual({ units: "IP" });
    expect(parse("ip")()).toEqual({ units: "ip" });
    expect(parse(undefined)()).toEqual({ units: "SI" });
  });

  // BaseInputs' message (classes_input.py:120), for a string outside the set
  // and, as upstream compares str(units), for any other value (deviation
  // _shared-24).
  test("throws upstream's message, RangeError for a string, TypeError otherwise", () => {
    for (const bad of ["XX", "", "S I"])
      expect(parse(bad)).toThrow(
        new RangeError("Units must be either 'SI' or 'IP'"),
      );
    for (const bad of [null, 5, true, ["SI"], {}])
      expect(parse(bad)).toThrow(
        new TypeError("Units must be either 'SI' or 'IP'"),
      );
  });

  // solar_gain's own posture check (models/solar_gain.py:207-212), which
  // lower-cases where BaseInputs upper-cases units.
  const posture = {
    name: "g",
    inputs: {
      posture: {
        kind: "choice",
        allowed: ["standing", "supine", "sitting"],
        default: "sitting",
        message: "Posture has to be either 'standing', 'supine' or 'sitting'.",
      },
    },
  } as const;
  const parse_posture = (value: unknown) => () =>
    parseInputs(posture, { posture: value });

  test("throws the entry's own message, in either case direction", () => {
    expect(parse_posture("Supine")()).toEqual({ posture: "Supine" });
    expect(parse_posture("SITTING")()).toEqual({ posture: "SITTING" });
    for (const bad of ["lying", "", "SI"])
      expect(parse_posture(bad)).toThrow(
        new RangeError(posture.inputs.posture.message),
      );
    expect(parse_posture(5)).toThrow(
      new TypeError(posture.inputs.posture.message),
    );
    expect(() => parseInputs(info, { units: "sitting" })).toThrow(
      new RangeError("Units must be either 'SI' or 'IP'"),
    );
  });
});

// A message that embeds the value given, as pmv_ppd_ashrae's own check on model does (models/pmv_ppd_ashrae.py:165-171).
describe("parseInputs, choice with a message of the value (JS-only)", () => {
  const info = {
    name: "f",
    inputs: {
      model: {
        kind: "choice",
        allowed: ["55-2023"],
        default: "55-2023",
        message: (model: string) =>
          `Model '${model.toLowerCase()}' is not supported.`,
      },
    },
  } as const;
  const parse = (model: unknown) => () => parseInputs(info, { model });

  test("throws the text for the value, RangeError for a string, TypeError otherwise", () => {
    expect(parse("55-2023")()).toEqual({ model: "55-2023" });
    expect(parse("RANDOM")).toThrow(
      new RangeError("Model 'random' is not supported."),
    );
    expect(parse(7730)).toThrow(
      new TypeError("Model '7730' is not supported."),
    );
    expect(parse(null)).toThrow(
      new TypeError("Model 'null' is not supported."),
    );
  });
});

// A choice_field (classes_input.py:23), which BaseInputs checks against its
// allowed and skips when None (classes_input.py:138-139, :155-159).
describe("parseInputs, choice_field (JS-only)", () => {
  const allowed = ["sitting", "standing", "standing, forced convection"];
  const info = {
    name: "f",
    inputs: {
      position: {
        kind: "choice",
        allowed,
        default: "standing",
        message: choiceFieldMessage("position", allowed),
        nullable: true,
      },
    },
  } as const;
  const parse = (position: unknown) => () => parseInputs(info, { position });

  // tests/test_choice_field.py:74 asserts the whole text.
  test("builds upstream's message, the list as Python's repr writes it", () => {
    expect(choiceFieldMessage("position", allowed)).toBe(
      "position must be one of ['sitting', 'standing', 'standing, forced convection']",
    );
  });

  test("passes null unchanged, and takes the default for undefined", () => {
    expect(parse(null)()).toEqual({ position: null });
    expect(parse(undefined)()).toEqual({ position: "standing" });
  });

  test("throws the message for any other value", () => {
    expect(parse("STANDING, Forced Convection")()).toEqual({
      position: "STANDING, Forced Convection",
    });
    expect(parse("lying")).toThrow(
      new RangeError(info.inputs.position.message),
    );
    expect(parse(5)).toThrow(new TypeError(info.inputs.position.message));
  });

  test("throws for null where the entry is not nullable", () => {
    expect(() =>
      parseInputs(
        { name: "g", inputs: { units: BASE_INPUTS_UNITS } },
        { units: null },
      ),
    ).toThrow(new TypeError("Units must be either 'SI' or 'IP'"));
  });
});

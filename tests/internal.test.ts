import { describe, expect, expectTypeOf, test } from "vitest";
import * as validation from "../src/_internal/validation.ts";
import {
  _as_flag,
  _mapping,
  _valid_range,
  HEAT_INDEX_RISK_CATEGORIES,
  HEAT_INDEX_STRESS_CATEGORIES,
} from "../src/_internal/validation.ts";
import type { ModelWarning } from "../src/_internal/modelInfo.ts";
import {
  ASHRAE_55_LIMITS,
  _check_ashrae55_compliance,
} from "../src/_internal/ashrae55.ts";
import {
  BASE_INPUTS_POSITION,
  BASE_INPUTS_UNITS,
  BASE_INPUTS_WORK_INTENSITY,
  checkWorkCapacityStandardsInputs,
  choiceFieldMessage,
  parseInputs,
} from "../src/_internal/define.ts";
import type { InputsOf } from "../src/_internal/modelInfo.ts";
import { floatRepr } from "../src/_internal/floatRepr.ts";
import { pythonRound, round } from "../src/_internal/round.ts";
import {
  CLO_TOUT_INFO,
  TWO_NODES_GAGGE_INFO,
  WORK_CAPACITY_DUNNE_INFO,
  WORK_CAPACITY_HOTHAPS_INFO,
} from "../src/models/index.ts";

// Mirrors pythermalcomfort v4.8.0 tests/test_internal.py, which tests
// _internal directly, so it imports the kernels' own file (seam S2). A
// UserWarning becomes a range row (deviation _shared-3), and a `match=` on its
// text becomes assertions on the row's key, value and bound.
// A call _check_ashrae55_compliance's type must accept or reject.
const typed = (kwargs: Parameters<typeof _check_ashrae55_compliance>[0]) =>
  kwargs;

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

    // Deviation _shared-39: the type rejects each call upstream raises for.
    test("test_airspeed_control_false_requires_v_met_clo", () => {
      // @ts-expect-error airspeed_control false requires v.
      typed({ tdb: 24, tr: 24, met: 1.2, clo: 0.5, airspeed_control: false });
      // @ts-expect-error airspeed_control false requires met.
      typed({ tdb: 24, tr: 24, v: 0.1, clo: 0.5, airspeed_control: false });
      // @ts-expect-error airspeed_control false requires clo.
      typed({ tdb: 24, tr: 24, v: 0.1, met: 1.2, airspeed_control: false });
    });
  });
  test.todo(
    "test_validate_type: no counterpart, as the input definition's parse makes upstream's type checks",
  );
  test.todo(
    "test_base_inputs_store_normalized_numpy_scalar: no counterpart, as JavaScript has no numpy scalars",
  );

  // Upstream's arrays, element-wise.
  test("test_as_flag", () => {
    expect([true, false].map((condition) => _as_flag(condition))).toEqual([
      1.0, 0.0,
    ]);
    expect(
      (
        [
          [true, true],
          [false, true],
          [true, false],
        ] as const
      ).map(([condition, valid]) => _as_flag(condition, valid)),
    ).toEqual([1.0, 0.0, NaN]);
    expect(typeof _as_flag(true)).toBe("number");
  });
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("_check_ashrae55_compliance (JS-only)", () => {
  const check = (kwargs: Parameters<typeof _check_ashrae55_compliance>[0]) => {
    const warnings: ModelWarning[] = [];
    const values = _check_ashrae55_compliance(kwargs, warnings);
    return { values, warnings };
  };

  // ashrae55.py:29-30, :36, :98-99, :105.
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

  // Upstream raises KeyError for met without clo (_internal/ashrae55.py:99),
  // and ValueError for airspeed_control=False without v (:39-43; measured on
  // 4.8.0), so the type rejects both calls.
  test("the type requires what upstream reads unguarded", () => {
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
  // ['low', 'medium', 'high'] (_internal/validation.py:234-235); pythermalcomfort
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

// Upstream's dict (_internal/validation.py:173), its keys as edges and its
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

// Upstream's _CategoryBins (_internal/validation.py:289-291): the 27.0 floor
// before HEAT_INDEX_STRESS_CATEGORIES, right-inclusive.
describe("HEAT_INDEX_RISK_CATEGORIES", () => {
  test("composes the no-risk floor with the shared categories, frozen", () => {
    expect(HEAT_INDEX_RISK_CATEGORIES).toEqual({
      edges: [27, 32, 41, 54, 1000],
      labels: [
        "no risk",
        "caution",
        "extreme caution",
        "danger",
        "extreme danger",
      ],
      right: true,
    });
    expect(Object.isFrozen(HEAT_INDEX_RISK_CATEGORIES.edges)).toBe(true);
    expect(Object.isFrozen(HEAT_INDEX_RISK_CATEGORIES.labels)).toBe(true);
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

  // solar_gain's own posture check (models/solar_gain.py:210-215), which
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

// A message that embeds the value given, as pmv_ppd_ashrae's own check on model does (models/pmv_ppd_ashrae.py:182-188).
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

// BaseInputs' position field (classes_input.py:71-73), defined once.
describe("BASE_INPUTS_POSITION (JS-only)", () => {
  test("holds upstream's allowed and message, with no default, frozen", () => {
    expect(BASE_INPUTS_POSITION).toEqual({
      kind: "choice",
      allowed: ["sitting", "standing", "standing, forced convection"],
      message:
        "position must be one of ['sitting', 'standing', 'standing, forced convection']",
      nullable: true,
    });
    expect(Object.isFrozen(BASE_INPUTS_POSITION)).toBe(true);
    expect(Object.isFrozen(BASE_INPUTS_POSITION.allowed)).toBe(true);
  });

  test("a model's INFO references it with the model's default", () => {
    expect(TWO_NODES_GAGGE_INFO.inputs.position).toEqual({
      ...BASE_INPUTS_POSITION,
      default: "standing",
    });
    expect(TWO_NODES_GAGGE_INFO.inputs.position.allowed).toBe(
      BASE_INPUTS_POSITION.allowed,
    );
  });
});

// BaseInputs' work_intensity field (classes_input.py:106), defined once.
describe("BASE_INPUTS_WORK_INTENSITY (JS-only)", () => {
  test("holds upstream's allowed and message, with no default, frozen", () => {
    expect(BASE_INPUTS_WORK_INTENSITY).toEqual({
      kind: "choice",
      allowed: ["heavy", "moderate", "light"],
      message: "work_intensity must be one of ['heavy', 'moderate', 'light']",
    });
    expect(Object.isFrozen(BASE_INPUTS_WORK_INTENSITY)).toBe(true);
    expect(Object.isFrozen(BASE_INPUTS_WORK_INTENSITY.allowed)).toBe(true);
  });

  test.each([
    ["work_capacity_dunne", WORK_CAPACITY_DUNNE_INFO],
    ["work_capacity_hothaps", WORK_CAPACITY_HOTHAPS_INFO],
  ])("%s's INFO references it with the model's default", (_, info) => {
    expect(info.inputs.work_intensity).toEqual({
      ...BASE_INPUTS_WORK_INTENSITY,
      default: "heavy",
    });
    expect(info.inputs.work_intensity.allowed).toBe(
      BASE_INPUTS_WORK_INTENSITY.allowed,
    );
  });
});

// WorkCapacityStandardsInputs' met check (classes_input.py:1095-1099), defined
// once (decision 257).
describe("checkWorkCapacityStandardsInputs (JS-only)", () => {
  test.each([0, -0, 117, 2500])("met %s passes", (met) => {
    expect(() => {
      checkWorkCapacityStandardsInputs(met);
    }).not.toThrow();
  });

  test.each([-10, -Number.MIN_VALUE, 2500.0001, 3000])(
    "met %s throws upstream's message as a RangeError",
    (met) => {
      expect(() => {
        checkWorkCapacityStandardsInputs(met);
      }).toThrow(new RangeError("Metabolic rate out of plausible range"));
    },
  );
});

// A choice_field (classes_input.py:23), which BaseInputs checks against its
// allowed and skips when None (classes_input.py:138-139, :155-159).
describe("parseInputs, choice_field (JS-only)", () => {
  const { allowed } = BASE_INPUTS_POSITION;
  const info = {
    name: "f",
    inputs: { position: { ...BASE_INPUTS_POSITION, default: "standing" } },
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

// A number whose default is upstream's False, as pmv_athb's clo is
// (models/pmv_athb.py:18, :98).
describe("parseInputs, numeric with a false default (JS-only)", () => {
  const info = {
    name: "f",
    inputs: { clo: { kind: "numeric", unit: "clo", default: false } },
  } as const;
  const parse = (clo: unknown) => () => parseInputs(info, { clo });

  test("takes false or a finite number, and false for undefined", () => {
    expect(parse(false)()).toEqual({ clo: false });
    expect(parse(undefined)()).toEqual({ clo: false });
    expect(parse(0)()).toEqual({ clo: 0 });
    expect(parse(0.5)()).toEqual({ clo: 0.5 });
  });

  test("throws for true, null and any other type, and for a non-finite number", () => {
    for (const bad of [true, null, "0.5", [0.5]])
      expect(parse(bad)).toThrow(new TypeError("clo must be a finite number."));
    expect(parse(NaN)).toThrow(new RangeError("clo must be a finite number."));
  });

  test("throws for false where the default is not false", () => {
    expect(() =>
      parseInputs(
        { name: "g", inputs: { clo: { kind: "numeric", unit: "clo" } } },
        { clo: false },
      ),
    ).toThrow(new TypeError("clo must be a finite number."));
  });
});

// An instance of a class, as sports_heat_stress_risk's sport is
// (classes_input.py:1262-1265).
describe("parseInputs, instance (JS-only)", () => {
  class Values {
    readonly clo: number;
    constructor(clo: number) {
      this.clo = clo;
    }
  }
  const info = {
    name: "f",
    inputs: {
      sport: { kind: "instance", of: Values, message: "sport must be Values." },
    },
  } as const;
  const parse = (sport: unknown) => () => parseInputs(info, { sport });

  test("returns an instance of its class as given", () => {
    const sport = new Values(0.5);
    expect(parse(sport)().sport).toBe(sport);
    expectTypeOf(parse(sport)().sport).toEqualTypeOf<Values>();
    expectTypeOf<InputsOf<typeof info>>().toEqualTypeOf<{ sport: Values }>();
  });

  test("throws its message as a TypeError for anything else", () => {
    for (const bad of [{ clo: 0.5 }, "RUNNING", 1, null, [new Values(0.5)]])
      expect(parse(bad)).toThrow(new TypeError("sport must be Values."));
    expect(parse(undefined)).toThrow(new TypeError("sport is required."));
  });
});

// Python's builtin round(x, n), measured on Python 3.12.15 in the parity image
// (decision 83).
describe("pythonRound (JS-only)", () => {
  test.each([
    [2.675, 2, 2.67],
    [29.95, 1, 29.9],
    [0.15, 1, 0.1],
    [0.25, 1, 0.2],
    [0.35, 1, 0.3],
    [-0.04, 1, -0],
    [2.5, 0, 2],
    [3.5, 0, 4],
    [-2.5, 0, -2],
    [34.44999999, 1, 34.4],
    [0, 1, 0],
    [-0, 1, -0],
    [1e21, 1, 1e21],
    [Infinity, 1, Infinity],
    [NaN, 1, NaN],
  ])("round(%s, %s) is %s", (x, ndigits, expected) => {
    expect(pythonRound(x, ndigits)).toBe(expected);
  });

  test("differs from numpy's round, the library's round", () => {
    expect([round(2.675, 2), round(29.95, 1), round(0.15, 1)]).toEqual([
      2.68, 30, 0.2,
    ]);
  });
});

// Python's repr() of a float, measured on Python 3.12.15 in the parity image
// (decision 135).
describe("floatRepr (JS-only)", () => {
  test.each([
    [23, "23.0"],
    [0, "0.0"],
    [-0, "-0.0"],
    [34.5, "34.5"],
    [-1.5, "-1.5"],
    [1e-5, "1e-05"],
    [1e-4, "0.0001"],
    [1e16, "1e+16"],
    [9999999999999998, "9999999999999998.0"],
    [1.5e-7, "1.5e-07"],
    [1e300, "1e+300"],
    [5e-324, "5e-324"],
    [0.1 + 0.2, "0.30000000000000004"],
    [Infinity, "inf"],
    [-Infinity, "-inf"],
    [NaN, "nan"],
  ])("repr(%s) is %s", (x, expected) => {
    expect(floatRepr(x)).toBe(expected);
  });
});

// A time series, two_nodes_gagge_sleep's tdb, which upstream reads with
// np.atleast_1d (models/two_nodes_gagge_sleep.py:115; decision 277).
describe("parseInputs, numeric series (JS-only)", () => {
  const info = {
    name: "f",
    inputs: { tdb: { kind: "numeric", unit: "°C", series: true } },
  } as const;
  const parse = (tdb: unknown) => () => parseInputs(info, { tdb });

  test("takes an array of numbers, and a number as an array of one, frozen", () => {
    const given = [18, 19.5, -2];
    const { tdb } = parse(given)();
    expect(tdb).toEqual([18, 19.5, -2]);
    expect(Object.isFrozen(tdb)).toBe(true);
    expect(tdb).not.toBe(given);
    expect(parse(18)()).toEqual({ tdb: [18] });
    expect(parse([])()).toEqual({ tdb: [] });
  });

  test("checks each element as a number", () => {
    for (const bad of [[18, "19"], [18, true], [18, null], [[18]], ["18"]])
      expect(parse(bad)).toThrow(new TypeError("tdb must be a finite number."));
    for (const bad of [[18, NaN], [Infinity]])
      expect(parse(bad)).toThrow(
        new RangeError("tdb must be a finite number."),
      );
    for (const bad of ["18", true, null, NaN])
      expect(parse(bad)).toThrow(/^tdb must be a finite number\.$/);
  });

  test("types the entry as a number or an array of them", () => {
    expectTypeOf<InputsOf<typeof info>>().toEqualTypeOf<{
      tdb: number | readonly number[];
    }>();
    expectTypeOf<InputsOf<typeof info, number>>().toEqualTypeOf<{
      tdb: number;
    }>();
    expectTypeOf(parse(18)()).toEqualTypeOf<{ tdb: readonly number[] }>();
  });
});

// An integer, BaseInputs' duration (classes_input.py:60), whose types are
// (int, np.ndarray) (decision 271).
describe("parseInputs, numeric integer (JS-only)", () => {
  const info = {
    name: "f",
    inputs: { duration: { kind: "numeric", unit: "min", integer: true } },
  } as const;
  const parse = (duration: unknown) => () => parseInputs(info, { duration });

  test("takes an integer, 0 and negatives included", () => {
    expect(parse(60)()).toEqual({ duration: 60 });
    expect(parse(60.0)()).toEqual({ duration: 60 });
    expect(parse(0)()).toEqual({ duration: 0 });
    expect(parse(-5)()).toEqual({ duration: -5 });
  });

  test("throws a TypeError for a finite number that is not an integer", () => {
    for (const bad of [60.2, 0.5, -1e-300])
      expect(parse(bad)).toThrow(new TypeError("duration must be an integer."));
  });

  test("checks the type and finiteness first", () => {
    expect(parse(true)).toThrow(
      new TypeError("duration must be a finite number."),
    );
    expect(parse(Infinity)).toThrow(
      new RangeError("duration must be a finite number."),
    );
  });
});

// A number whose default is upstream's None, as at's q is (models/at.py:14,
// :71-75).
describe("parseInputs, numeric with a null default (JS-only)", () => {
  const info = {
    name: "f",
    inputs: { q: { kind: "numeric", unit: "W/m²", default: null } },
  } as const;
  const parse = (q: unknown) => () => parseInputs(info, { q });

  test("takes null or a finite number, and null for undefined", () => {
    expect(parse(null)()).toEqual({ q: null });
    expect(parse(undefined)()).toEqual({ q: null });
    expect(parse(0)()).toEqual({ q: 0 });
    expect(parse(100)()).toEqual({ q: 100 });
  });

  test("throws for a boolean and any other type, and for a non-finite number", () => {
    for (const bad of [true, false, "100", [100]])
      expect(parse(bad)).toThrow(new TypeError("q must be a finite number."));
    expect(parse(NaN)).toThrow(new RangeError("q must be a finite number."));
  });

  test("throws for null where the default is not null", () => {
    expect(() =>
      parseInputs(
        { name: "g", inputs: { q: { kind: "numeric", unit: "W/m²" } } },
        { q: null },
      ),
    ).toThrow(new TypeError("q must be a finite number."));
  });
});

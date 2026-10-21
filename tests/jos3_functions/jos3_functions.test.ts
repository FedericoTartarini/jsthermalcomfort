// JS-only: 35 functions of jos3_functions against pythermalcomfort 4.6.2, on
// 418 random cases of upstream's own calls (`fn_up.py` in the ticket 25
// scratchpad, seeds 42 and 4325; the inputs and outputs are in
// jos3_functions_v4.6.2.json): every function but index_order,
// index_by_layer, valid_index_by_layer, to_array_body_parts and
// validate_body_parameters, which take no input to randomize or only
// validate, and which the mirrored tests in tests/models/jos3.test.ts call.
// The functions use numpy's evaluation order (ADR 0009), so every value is
// compared bit for bit. Upstream's own tests of these functions are mirrored
// in tests/models/jos3.test.ts, under test_jos3.
import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { jos3_functions } from "../../src/index.js";

type Case = { fn: string; args: unknown[]; out: unknown };
type Sparse = { shape: [number, number]; nonzero: [number, number, number][] };

const fixture: { cases: Case[] } = JSON.parse(
  readFileSync(
    new URL("./jos3_functions_v4.6.2.json", import.meta.url),
    "utf8",
  ),
);

const { construction: C, matrix: M, thermoregulation: T } = jos3_functions;

function dense(x: unknown): unknown {
  if (x !== null && typeof x === "object" && "shape" in x) {
    const { shape, nonzero } = x as Sparse;
    const a = Array.from({ length: shape[0] }, () =>
      new Array<number>(shape[1]).fill(0),
    );
    for (const [i, j, v] of nonzero) a[i][j] = v;
    return a;
  }
  return x;
}

// Each function's result, compared with upstream's as it is: a tuple
// upstream returns is an array here (wave 2 D8).
const run: Record<string, (a: any[]) => unknown> = {
  bsa_rate: (a) => C.bsa_rate(a[0], a[1], a[2]),
  local_bsa: (a) => C.local_bsa(a[0], a[1], a[2]),
  weight_rate: (a) => C.weight_rate(a[0]),
  bfb_rate: (a) => C.bfb_rate(a[0], a[1], a[2], a[3], a[4]),
  conductance: (a) => C.conductance(a[0], a[1], a[2], a[3]),
  capacity: (a) => C.capacity(a[0], a[1], a[2], a[3], a[4]),
  basal_met: (a) => T.basal_met(a[0], a[1], a[2], a[3], a[4]),
  local_mbase: (a) => T.local_mbase(a[0], a[1], a[2], a[3], a[4]),
  evaporation: (a) =>
    T.evaporation(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]),
  skin_blood_flow: (a) =>
    T.skin_blood_flow(a[0], a[1], a[2], a[3], a[4], a[5], a[6]),
  ava_blood_flow: (a) =>
    T.ava_blood_flow(a[0], a[1], a[2], a[3], a[4], a[5], a[6]),
  // The last argument is the PRE_SHIV the case starts from; the result is
  // q_shiv and PRE_SHIV after the call.
  shivering: (a) => {
    T.PRE_SHIV = a[11];
    const q = T.shivering(
      a[0],
      a[1],
      a[2],
      a[3],
      a[4],
      a[5],
      a[6],
      a[7],
      a[8],
      a[9],
      a[10],
    );
    return [q, T.PRE_SHIV];
  },
  nonshivering: (a) => T.nonshivering(a[0], a[1], a[2], a[3], a[4], a[5], a[6]),
  local_q_work: (a) => T.local_q_work(a[0], a[1]),
  sum_m: (a) => T.sum_m(a[0], a[1], a[2], a[3]),
  cr_ms_fat_blood_flow: (a) =>
    T.cr_ms_fat_blood_flow(a[0], a[1], a[2], a[3], a[4], a[5], a[6]),
  sum_bf: (a) => T.sum_bf(a[0], a[1], a[2], a[3], a[4], a[5]),
  vessel_blood_flow: (a) =>
    M.vessel_blood_flow(a[0], a[1], a[2], a[3], a[4], a[5]),
  local_arr: (a) => M.local_arr(a[0], a[1], a[2], a[3], a[4], a[5]),
  whole_body: (a) => M.whole_body(a[0], a[1], a[2], a[3]),
  conv_coef: (a) => T.conv_coef(a[0], a[1], a[2], a[3]),
  rad_coef: (a) => T.rad_coef(a[0]),
  fixed_hc: (a) => T.fixed_hc(a[0], a[1]),
  fixed_hr: (a) => T.fixed_hr(a[0]),
  operative_temp: (a) => T.operative_temp(a[0], a[1], a[2], a[3]),
  clo_area_factor: (a) => T.clo_area_factor(a[0]),
  dry_r: (a) => T.dry_r(a[0], a[1], a[2]),
  wet_r: (a) => T.wet_r(a[0], a[1], a[2], a[3]),
  error_signals: (a) => T.error_signals(a[0]),
  resp_heat_loss: (a) => T.resp_heat_loss(a[0], a[1], a[2]),
  tetens: (a) => T.tetens(a[0]),
  natural_convection: (a) => T.natural_convection(a[0], a[1], a[2]),
  forced_convection: (a) => T.forced_convection(a[0]),
  // upstream's JOS3BodyParts dataclass, as dataclasses.asdict gives it
  pass_values_to_jos3_body_parts: (a) =>
    C.pass_values_to_jos3_body_parts(a[0], a[1], a[2]),
  remove_body_name: (a) => M.remove_body_name(a[0]),
};

describe("jos3_functions against pythermalcomfort 4.6.2", () => {
  test("the fixture covers every function jos3_functions exports, but the five the mirrored tests call", () => {
    const elsewhere = [
      "index_order",
      "index_by_layer",
      "valid_index_by_layer",
      "to_array_body_parts",
      "validate_body_parameters",
    ];
    const exported = [C, M, T].flatMap((module) =>
      Object.entries(module)
        .filter(([, value]) => typeof value === "function")
        .map(([name]) => name),
    );
    expect(new Set(fixture.cases.map((c) => c.fn))).toEqual(
      new Set(Object.keys(run)),
    );
    expect(new Set([...Object.keys(run), ...elsewhere])).toEqual(
      new Set(exported),
    );
    expect(exported).toHaveLength(40);
  });

  test.each(fixture.cases.map((c, i) => [`${c.fn} #${i}`, c] as const))(
    "%s returns upstream's value bit for bit",
    (_name, c) => {
      expect(run[c.fn](c.args)).toEqual(dense(c.out));
    },
  );
});

// pythermalcomfort 4.6.2's sum_bf adds bf_core.sum(), bf_muscle.sum(),
// bf_fat.sum() and bf_skin.sum() in that order (thermoregulation.py:1547-1551).
// A string element in an object array raises "unsupported operand type(s) for
// +: 'float' and 'str'"; a string in place of an array raises AttributeError
// "'str' object has no attribute 'sum'", a TypeError here (ADR 0012)
// (`.scratch/v2-models/wave-2/batch1-followup/implementer/d25_up.py`, `.out`).
describe("sum_bf with a string, as pythermalcomfort 4.6.2 raises", () => {
  const core = [
    0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2000000000000002, 1.3, 1.4, 1.5, 1.6,
    1.7000000000000002, 1.8, 1.9000000000000001, 2, 2.1,
  ];
  const muscle = [
    0.2, 0.25, 0.30000000000000004, 0.35000000000000003, 0.4, 0.45, 0.5, 0.55,
    0.6000000000000001, 0.65, 0.7, 0.75, 0.8, 0.8500000000000001,
    0.9000000000000001, 0.95, 1,
  ];
  const fat = [
    0.05, 0.060000000000000005, 0.07, 0.08, 0.09, 0.1, 0.11,
    0.12000000000000001, 0.13, 0.14, 0.15000000000000002, 0.16,
    0.16999999999999998, 0.18, 0.19, 0.2, 0.21000000000000002,
  ];
  const skin = [
    0.3, 0.32, 0.33999999999999997, 0.36, 0.38, 0.4, 0.42, 0.44,
    0.45999999999999996, 0.48, 0.5, 0.52, 0.54, 0.56, 0.5800000000000001, 0.6,
    0.62,
  ];
  const with_x = [2.5, 2.5, 2.5, "x", ...new Array<number>(13).fill(2.5)];
  const call = (k: number, value: unknown) => {
    const arrays: unknown[] = [core, muscle, fat, skin];
    arrays[k] = value;
    const [a, b, c, d] = arrays as number[][];
    return () => T.sum_bf(a, b, c, d, 0.5, 0.7);
  };
  const names = ["bf_core", "bf_muscle", "bf_fat", "bf_skin"];

  test("numeric arrays return upstream's value", () => {
    expect(call(0, core)()).toBe(44.730000000000004);
  });

  test.each(names.map((name, k) => [name, k] as const))(
    '%s with "x" at index 3 throws upstream\'s TypeError for an object array',
    (_name, k) => {
      expect(call(k, with_x)).toThrow(
        new TypeError("unsupported operand type(s) for +: 'float' and 'str'"),
      );
      expect(call(k, with_x)).toThrow(TypeError);
    },
  );

  test.each(names.map((name, k) => [name, k] as const))(
    '%s given "x" in place of an array throws upstream\'s AttributeError as a TypeError',
    (_name, k) => {
      expect(call(k, "x")).toThrow(
        new TypeError("'str' object has no attribute 'sum'"),
      );
      expect(call(k, "x")).toThrow(TypeError);
    },
  );
});

// An object array adds its elements left to right from element 0, so a
// non-numeric element after a number raises "unsupported operand type(s) for
// +: 'float' and '<its type>'", and one at index 0 raises the message of
// itself plus element 1 (pythermalcomfort 4.6.2;
// `.scratch/v2-models/wave-2/batch1-followup/p1/p1_up.py`, `.out`).
describe("sum_bf with a non-numeric element, as pythermalcomfort 4.6.2 raises", () => {
  const base = new Array<number>(17).fill(2.5);
  const call = (k: number, index: number, element: unknown) => {
    const arrays: unknown[] = [base, base, base, base];
    const x: unknown[] = [...base];
    x[index] = element;
    arrays[k] = x;
    const [a, b, c, d] = arrays as number[][];
    return () => T.sum_bf(a, b, c, d, 0.5, 0.7);
  };

  test.each<[number, number, unknown, string]>([
    [0, 3, null, "NoneType"],
    [3, 16, null, "NoneType"],
    [0, 3, {}, "dict"],
    [3, 16, {}, "dict"],
    [0, 3, [1], "list"],
    [3, 16, [1], "list"],
  ])(
    "array %i, index %i, element %p after a number throws upstream's TypeError",
    (k, index, element, type) => {
      expect(call(k, index, element)).toThrow(
        new TypeError(
          `unsupported operand type(s) for +: 'float' and '${type}'`,
        ),
      );
      expect(call(k, index, element)).toThrow(TypeError);
    },
  );

  test.each<[number, unknown, string]>([
    [0, "x", 'can only concatenate str (not "float") to str'],
    [3, "x", 'can only concatenate str (not "float") to str'],
    [0, null, "unsupported operand type(s) for +: 'NoneType' and 'float'"],
    [0, {}, "unsupported operand type(s) for +: 'dict' and 'float'"],
    [0, [1], 'can only concatenate list (not "float") to list'],
  ])(
    "array %i, element %p at index 0 throws upstream's TypeError",
    (k, element, message) => {
      expect(call(k, 0, element)).toThrow(new TypeError(message));
      expect(call(k, 0, element)).toThrow(TypeError);
    },
  );

  test.each<[unknown, unknown, string]>([
    ["x", "y", 'can only concatenate str (not "float") to str'],
    [null, "y", "unsupported operand type(s) for +: 'NoneType' and 'str'"],
  ])(
    "elements %p and %p at index 0 and 1 throw upstream's TypeError",
    (first, second, message) => {
      const x: unknown[] = [...base];
      x[0] = first;
      x[1] = second;
      const run = () => T.sum_bf(x as number[], base, base, base, 0.5, 0.7);
      expect(run).toThrow(new TypeError(message));
      expect(run).toThrow(TypeError);
    },
  );

  test.each([
    [true, 170.9],
    [false, 169.9],
  ])("a boolean %p at index 0 counts as %p, as in Python", (element, co) => {
    const x: unknown[] = [...base];
    x[0] = element;
    expect(T.sum_bf(x as number[], base, base, base, 0.5, 0.7)).toBe(co);
  });
});

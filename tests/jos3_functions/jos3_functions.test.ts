// JS-only: every function of jos3_functions against pythermalcomfort 4.6.2,
// on 348 random cases of upstream's own calls (`fn_up.py` in the ticket 25
// scratchpad, seed 42; the inputs and outputs are in
// jos3_functions_v4.6.2.json). The functions use numpy's evaluation order
// (ADR 0009), so every value is compared bit for bit. Upstream's own tests
// of these functions are mirrored in tests/models/jos3.test.ts, under
// test_jos3.
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
// upstream returns is an array here (jos3 D8).
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
};

describe("jos3_functions against pythermalcomfort 4.6.2", () => {
  test("the fixture covers every function", () => {
    expect(new Set(fixture.cases.map((c) => c.fn))).toEqual(
      new Set(Object.keys(run)),
    );
  });

  test.each(fixture.cases.map((c, i) => [`${c.fn} #${i}`, c] as const))(
    "%s returns upstream's value bit for bit",
    (_name, c) => {
      expect(run[c.fn](c.args)).toEqual(dense(c.out));
    },
  );
});

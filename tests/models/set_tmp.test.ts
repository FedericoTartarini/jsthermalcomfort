import { describe, expect, test } from "vitest";
import { set_tmp, SET_TMP_INFO } from "../../src/models/index.ts";
import { set_tmp as from_root } from "../../src/index.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof set_tmp>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.setTmp,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_set.py.
// Upstream's arrays are called element-wise.
describe("test_set", () => {
  test.each(reference_table.data)("test_set_url: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = set_tmp({
      ...(inputs as unknown as Inputs),
      round_output: true,
      limit_inputs: false,
    });

    validateResult(result, outputs, tolerance, inputs);
  });

  test.each([
    [41, 20, 0.1, 1.1, 0.5],
    [20, 41, 0.1, 1.1, 0.5],
    [20, 20, 2.1, 1.1, 0.5],
    [20, 20, 0.1, 0.7, 0.5],
    [20, 20, 0.1, 1.1, 2.1],
    [39, 39, 0.1, 3.9, 1.9],
  ])(
    "test_set_npnan: tdb %s, tr %s, v %s, met %s, clo %s",
    (tdb, tr, v, met, clo) => {
      expect(set_tmp({ tdb, tr, v, rh: 50, met, clo }).set).toBe(null);
    },
  );

  test("test_set_continuous_at_critical_wettedness", () => {
    // np.round(np.arange(32.5, 34.0, 0.001), 3): 1,500 temperatures
    const t = Array.from({ length: 1500 }, (_, i) => (32500 + i) / 1000);
    const result = t.map(
      (tdb) =>
        set_tmp({
          tdb,
          tr: tdb,
          v: 0.1,
          rh: 70,
          met: 1.1,
          clo: 0.5,
          round_output: false,
          limit_inputs: false,
        }).set,
    );
    const diff = result
      .slice(1)
      .map((value, i) => (value ?? NaN) - (result[i] ?? NaN));
    const max_step = Math.max(...diff.map(Math.abs));
    expect(max_step).toBeLessThan(0.01);
    // monotonic, so cooling_effect has a single root
    expect(diff.every((step) => step > 0)).toBe(true);
  });
});

const valid = { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 };

describeModelContract(set_tmp, SET_TMP_INFO, valid, { ...valid, tdb: 50 });

const call = (inputs: unknown) =>
  set_tmp(inputs as Parameters<typeof set_tmp>[0]);
const out = { tdb: 50, tr: 5, v: 2.5, met: 5, clo: 2 };
const out_rows = (["tdb", "tr", "v", "met", "clo"] as const).map(
  (key): unknown =>
    expect.objectContaining({
      key,
      value: out[key],
      bound: SET_TMP_INFO.inputs[key].applicability,
    }),
);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("set_tmp (JS-only)", () => {
  // Decision 321; upstream's set is NaN here, measured on 4.8.0 in the parity image.
  test("a null set from two_nodes_gagge gives upstream's NaN set, as null", () => {
    const cold = { tdb: -234, tr: -234, v: 0.1, rh: 0, met: 1.2, clo: 0.5 };
    expect(set_tmp({ ...cold, limit_inputs: false }).set).toBe(null);
  });

  // models/set_tmp.py:86-87.
  test("the docstring's example gives its output", () => {
    expect(call(valid)).toEqual({ set: 24.3, warnings: [] });
  });

  test("round_output false returns the unrounded set", () => {
    expect(
      approx(
        call({ ...valid, round_output: false }).set,
        24.314907736364308,
        DEFAULT_TOLERANCE,
      ),
    ).toBe(true);
  });

  // models/two_nodes_gagge.py:133-146, :337-342: the SET path passes 1 as position, which computes as standing.
  test.each(["sitting", "standing"])(
    "calculate_ce takes the SET path, whatever the position, %s",
    (position) => {
      const { set } = call({
        ...valid,
        position,
        calculate_ce: true,
        round_output: false,
      });
      expect(approx(set, 24.662342565066787, DEFAULT_TOLERANCE)).toBe(true);
    },
  );

  // Deviation set_tmp-4: upstream returns a value on each bound.
  test.each([
    ["tdb", 10.0, 16.9],
    ["tdb", 40.0, 35.2],
    ["tr", 10.0, 16.8],
    ["tr", 40.0, 31.1],
    ["v", 0.0, 24.3],
    ["v", 2.0, 20.2],
    ["met", 1.0, 24.0],
    ["met", 4.0, 30.5],
    ["clo", 0.0, 19.8],
    ["clo", 1.5, 31.2],
  ])("%s %s, on a bound, gives %s and no row", (key, value, expected) => {
    expect(call({ ...valid, [key]: value })).toEqual({
      set: expected,
      warnings: [],
    });
  });

  // Deviation set_tmp-2.
  test("each bound broken gives a row, in upstream's order, and masks set with the gate on", () => {
    const result = call({ ...out, rh: 50 });
    expect(result.warnings).toEqual(out_rows);
    expect(result.set).toBe(null);
  });

  // Deviation set_tmp-3: upstream warns nothing with the gate off.
  test("each bound broken gives a row, and set its value, with the gate off", () => {
    const result = call({ ...out, rh: 50, limit_inputs: false });
    expect(result.warnings).toEqual(out_rows);
    expect(result.set).toBe(50.5);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(set_tmp);
  });
});

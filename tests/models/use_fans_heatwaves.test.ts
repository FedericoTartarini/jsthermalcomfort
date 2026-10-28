import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  use_fans_heatwaves,
  USE_FANS_HEATWAVES_INFO,
} from "../../src/models/index.ts";
import { use_fans_heatwaves as from_root } from "../../src/index.ts";
import { decode, read_data } from "../parity/harness.ts";
import { testDataUrls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof use_fans_heatwaves>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.use_fans_heatwaves,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_use_fans_heatwaves.py. Upstream's
// arrays are called element-wise.
describe("test_use_fans_heatwaves", () => {
  test.each(reference_table.data)(
    "test_use_fans_heatwaves: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = use_fans_heatwaves(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );
});

const valid = { tdb: 35, tr: 35, v: 1.0, rh: 50, met: 1.2, clo: 0.5 };

describeModelContract(use_fans_heatwaves, USE_FANS_HEATWAVES_INFO, valid, {
  ...valid,
  tdb: 60,
});

const call = (inputs: unknown) =>
  use_fans_heatwaves(inputs as Parameters<typeof use_fans_heatwaves>[0]);
const flags = [
  "heat_strain",
  "heat_strain_blood_flow",
  "heat_strain_w",
  "heat_strain_sweating",
] as const;
const position_message =
  "position must be one of ['sitting', 'standing', 'standing, forced convection']";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("use_fans_heatwaves (JS-only)", () => {
  // models/use_fans_heatwaves.py:91-92.
  test("the docstring's example gives its e_skin", () => {
    expect(call(valid).e_skin).toBe(63);
  });

  // Deviation use_fans_heatwaves-5: upstream gives 1.0, 1.0, 1.0 and 0.0.
  test("each maximum reached gives its flag", () => {
    const result = call({
      tdb: 45,
      tr: 45,
      v: 0.2,
      rh: 80,
      met: 1.8,
      clo: 0.9,
    });
    expect(flags.map((key) => result[key])).toEqual([true, true, true, false]);
    expect(result.m_bl).toBe(80);
  });

  // The kernel back-calculates an m_rsw of 99.99999999999999 at the cap.
  test("heat_strain_sweating compares the unrounded m_rsw, as upstream", () => {
    const result = call({
      tdb: 45,
      tr: 45,
      v: 0.5,
      rh: 30,
      met: 2.0,
      clo: 0.5,
      max_sweating: 100,
    });
    expect(result.m_rsw).toBe(100);
    expect(result.heat_strain_sweating).toBe(false);
  });

  // Deviation use_fans_heatwaves-5.
  test("the flags are upstream's over the parity data, read as booleans", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const { cases } = read_data(root, "use_fans_heatwaves");
    for (const { inputs, outputs } of cases) {
      const result = call(inputs);
      for (const key of flags) {
        const expected = decode(outputs[key] ?? null);
        if (typeof expected === "number" && !Number.isNaN(expected))
          expect(result[key]).toBe(expected === 1);
        else expect(result[key]).toEqual(expected);
      }
    }
  });

  // Deviation use_fans_heatwaves-4 (decision 224).
  test("limit_inputs off with round_output on throws numpy's TypeError", () => {
    expect(() => call({ ...valid, limit_inputs: false })).toThrow(
      new TypeError(
        "Cannot cast ufunc 'multiply' output from dtype('float64') to dtype('bool') with casting rule 'same_kind'",
      ),
    );
    const result = call({ ...valid, limit_inputs: false, round_output: false });
    expect(flags.map((key) => result[key])).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  // Deviation use_fans_heatwaves-2, deviation use_fans_heatwaves-3.
  test.each([true, false])(
    "each bound broken gives a row, with limit_inputs %s",
    (limit_inputs) => {
      const out = { tdb: 60, tr: 10, v: 5, rh: 120, met: 3, clo: 1.5 };
      const { inputs } = USE_FANS_HEATWAVES_INFO;
      const result = call({ ...out, limit_inputs, round_output: false });
      expect(result.warnings).toEqual(
        (["tdb", "tr", "v", "rh", "met", "clo"] as const).map((key): unknown =>
          expect.objectContaining({
            key,
            value: out[key],
            bound: inputs[key].applicability,
          }),
        ),
      );
      expect(Number.isNaN(result.e_skin)).toBe(limit_inputs);
      expect(Number.isNaN(result.heat_strain)).toBe(limit_inputs);
    },
  );

  // models/use_fans_heatwaves.py:183-185.
  test("an rh row leaves the outputs unmasked", () => {
    const changed = { ...valid, rh: 120, round_output: false };
    const limited = call(changed);
    const unlimited = call({ ...changed, limit_inputs: false });
    expect(limited.warnings).toEqual([
      expect.objectContaining({ key: "rh", value: 120 }),
    ]);
    expect({ ...limited, warnings: [] }).toEqual({
      ...unlimited,
      warnings: [],
    });
  });

  // classes_input.py:138-139: BaseInputs skips None, and the kernel computes
  // it as standing.
  test("null for position computes as standing", () => {
    expect(call({ ...valid, position: null })).toEqual(call(valid));
  });

  // Deviation use_fans_heatwaves-6, deviation use_fans_heatwaves-7.
  test("a position outside choice_field's throws its message", () => {
    expect(() => call({ ...valid, position: "lying" })).toThrow(
      new RangeError(position_message),
    );
    for (const position of [5, true, ["sitting"]])
      expect(() => call({ ...valid, position })).toThrow(
        new TypeError(position_message),
      );
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(use_fans_heatwaves);
  });
});

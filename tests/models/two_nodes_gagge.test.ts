import { describe, expect, test } from "vitest";
import {
  two_nodes_gagge,
  TWO_NODES_GAGGE_INFO,
} from "../../src/models/index.ts";
import { two_nodes_gagge as from_root } from "../../src/index.ts";
import { Postures } from "../../src/utilities/index.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract, isDeepFrozen } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof two_nodes_gagge>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.twoNodes,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_two_nodes_gagge.py. A
// `pytest.raises(ValueError, match="w_max")` becomes a throw whose message
// names w_max, of the class the library maps that case to.
describe("test_two_nodes_gagge", () => {
  test.each(reference_table.data)(
    "test_two_nodes: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      // The fixture's `w_max: False` is left out (deviation two_nodes_gagge-3).
      const result = two_nodes_gagge({
        ...inputs,
        w_max: inputs.w_max === false ? undefined : inputs.w_max,
      } as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  test.each([0.01, 0.06, 1.2, [0.5, 0.05], NaN, [0.5, NaN], true, [true, 0.5]])(
    "test_two_nodes_rejects_w_max_out_of_range[%s]",
    (w_max) => {
      expect(() =>
        two_nodes_gagge({
          tdb: 40,
          tr: 40,
          v: 0.1,
          rh: 50,
          met: 1,
          clo: 0.5,
          w_max,
        } as unknown as Inputs),
      ).toThrow(/w_max/);
    },
  );

  // Upstream's False case is the JS-only tests' (deviation two_nodes_gagge-3).
  test.each([0, 0.0601, 0.5, 1])(
    "test_two_nodes_accepts_w_max_in_range[%s]",
    (w_max) => {
      two_nodes_gagge({
        tdb: 40,
        tr: 40,
        v: 0.1,
        rh: 50,
        met: 2,
        clo: 0.5,
        w_max,
      });
    },
  );
});

const base = { tdb: 30, tr: 35, v: 0.1, rh: 50, met: 1.2, clo: 0.5 };
const position_message =
  "position must be one of ['sitting', 'standing', 'standing, forced convection']";
const call = (inputs: unknown) =>
  two_nodes_gagge(inputs as Parameters<typeof two_nodes_gagge>[0]);

// Mirrors the position cases of pythermalcomfort v4.8.0
// tests/test_choice_field.py through the model, whose inputs class receives
// position (models/two_nodes_gagge.py:115).
describe("test_choice_field", () => {
  const allowed = ["sitting", "standing", "standing, forced convection"];
  const set = (position: unknown) => call({ ...base, position }).set;

  // BaseInputs skips None, and the kernel computes it as standing.
  test("test_choice_fields_metadata_and_none[position]", () => {
    expect(TWO_NODES_GAGGE_INFO.inputs.position.allowed).toEqual(allowed);
    expect(set(null)).toBe(set("standing"));
    expect(set(undefined)).toBe(set("standing"));
  });

  // Kept as given, so "SITTING" computes as standing.
  test.each([
    ["scalar", allowed[0], 31.39],
    ["uppercase", "SITTING", 31.52],
    ["enum", Postures.sitting, 31.39],
  ])(
    "test_choice_fields_preserve_valid_values[position-%s]",
    (_, value, expected) => {
      expect(set(value)).toBe(expected);
    },
  );

  // Deviation two_nodes_gagge-6.
  test.each([["list"], ["array"]])(
    "test_choice_fields_preserve_valid_values[position-%s]",
    () => {
      expect(() => set(allowed)).toThrow(new TypeError(position_message));
    },
  );

  test.todo(
    "test_choice_fields_preserve_valid_values[position-series]: a pandas Series has no JavaScript counterpart",
  );

  test.each([
    ["scalar", "invalid", RangeError],
    ["list", [allowed[0], "invalid"], TypeError],
    ["array", [allowed[0], "invalid"], TypeError],
  ])(
    "test_choice_fields_reject_invalid_values[position-%s]",
    (_, value, error) => {
      expect(() => set(value)).toThrow(new error(position_message));
    },
  );
});

describeModelContract(two_nodes_gagge, TWO_NODES_GAGGE_INFO, base);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("two_nodes_gagge (JS-only)", () => {
  // Upstream computes w_max for False and None (deviation two_nodes_gagge-3).
  test("a w_max of false or null throws TypeError", () => {
    for (const w_max of [false, null])
      expect(() => call({ ...base, w_max })).toThrow(
        new TypeError("w_max must be a finite number."),
      );
  });

  // classes_input.py:740 (deviation two_nodes_gagge-4).
  test("a w_max out of (0.06, 1] other than 0 throws upstream's message, a RangeError", () => {
    for (const w_max of [0.06, 0.01, -0.5, 1.2, 1.0000000000000002])
      expect(() => call({ ...base, w_max })).toThrow(
        new RangeError(
          "w_max must be greater than 0.06 and at most 1 (False or 0 means the model computes it).",
        ),
      );
    expect(call({ ...base, w_max: -0 })).toHaveProperty("w_max", 0.71);
  });

  // Deviation two_nodes_gagge-5.
  test("a position that is not a string throws upstream's message, a TypeError", () => {
    for (const position of [5, true, {}])
      expect(() => call({ ...base, position })).toThrow(
        new TypeError(position_message),
      );
  });

  // Upstream returns SET(set=result) unrounded (models/two_nodes_gagge.py:133-146).
  test("calculate_ce returns the SET path's set, as upstream's SET, frozen", () => {
    for (const changed of [
      {},
      { position: "sitting" },
      { max_skin_blood_flow: 10, max_sweating: 1, w_max: 0.2 },
      { round_output: false },
    ]) {
      const result = call({ ...base, ...changed, calculate_ce: true });
      expect(result).toEqual({
        set: expect.toBeApprox(32.316713448080286, DEFAULT_TOLERANCE),
        warnings: [],
      });
      expect(isDeepFrozen(result)).toBe(true);
    }
  });

  // Upstream's set, et and pmv_set are nan at base with tdb and tr -235, rounded or not, measured on 4.8.0 in the parity image (models/two_nodes_gagge.py:464-510, :540-542).
  test("a tdb and tr of -235 give a null set, et and pmv_set", () => {
    for (const round_output of [true, false]) {
      const result = two_nodes_gagge({
        ...base,
        tdb: -235,
        tr: -235,
        round_output,
      });
      expect(result.set).toBe(null);
      expect(result.et).toBe(null);
      expect(result.pmv_set).toBe(null);
    }
  });

  // Deviation two_nodes_gagge-2.
  test("returns no warnings, as upstream emits none", () => {
    expect(call(base).warnings).toEqual([]);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(two_nodes_gagge);
  });
});

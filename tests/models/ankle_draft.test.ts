import { describe, expect, test } from "vitest";
import { ankle_draft } from "../../src/models/index.ts";
import { Units } from "../../src/utilities/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof ankle_draft>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.ankleDraft,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_ankle_draft.py. Upstream's
// arrays are called element-wise, and a UserWarning becomes a range row.
describe("test_ankle_draft", () => {
  test.each(reference_table.data)(
    "test_ankle_draft: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = ankle_draft(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  test("test_ankle_draft_invalid_input_range", () => {
    // Test for ValueError
    expect(() =>
      ankle_draft({
        tdb: 25,
        tr: 25,
        vr: 0.3,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        v_ankle: 7,
      }),
    ).toThrow(RangeError);
    // Test for ValueError
    for (const v_ankle of [0.1, 0.2, 0.3, 0.4])
      expect(() =>
        ankle_draft({
          tdb: 25,
          tr: 25,
          vr: 0.3,
          rh: 50,
          met: 1.2,
          clo: 0.5,
          v_ankle,
        }),
      ).toThrow(RangeError);
  });

  test("test_ankle_draft_outside_ashrae_range", () => {
    const r = ankle_draft({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
    });
    expect(r.ppd_ad).toBeNaN();

    for (const tdb of [50, 45])
      expect(
        ankle_draft({
          tdb,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.2,
          clo: 0.5,
          v_ankle: 0.1,
        }).ppd_ad,
      ).toBeNaN();
  });

  test("test_ankle_draft_list_inputs", () => {
    const results = [25, 26, 27].map((t) =>
      ankle_draft({
        tdb: t,
        tr: t,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        v_ankle: 0.1,
        units: Units.SI,
      }),
    );
    expect(results.map(({ ppd_ad }) => ppd_ad)).toHaveLength(3);
    expect(results.map(({ acceptability }) => acceptability)).toHaveLength(3);
  });

  test("test_ankle_draft_invalid_list_inputs", () => {
    expect(() =>
      ankle_draft({
        tdb: [25, "invalid", 27],
        tr: [25, 26, 27],
        vr: [0.1, 0.1, 0.1],
        rh: [50, 50, 50],
        met: [1.2, 1.2, 1.2],
        clo: [0.5, 0.5, 0.5],
        v_ankle: [0.1, 0.1, 0.1],
        units: Units.SI,
      } as unknown as Inputs),
    ).toThrow(TypeError);
  });

  // Upstream warns nothing with the gate off; the library returns the gate-off rows (decision 78).
  test("test_ankle_draft_limit_inputs_false_suppresses_warning_and_nan", () => {
    const result = ankle_draft({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      limit_inputs: false,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ key: "tdb", value: 50 }),
    ]);
    expect(result.ppd_ad).not.toBeNaN();
  });

  test("test_ankle_draft_limit_inputs_false_skips_valueerror", () => {
    // vr=0.5 normally raises ValueError; with limit_inputs=False it should not
    const result = ankle_draft({
      tdb: 25,
      tr: 25,
      vr: 0.5,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      limit_inputs: false,
    });
    expect(result.ppd_ad).not.toBeNaN();
  });

  test("test_ankle_draft_limit_inputs_true_still_warns_and_nans", () => {
    const result = ankle_draft({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ key: "tdb", value: 50 }),
    ]);
    expect(result.ppd_ad).toBeNaN();
  });
});

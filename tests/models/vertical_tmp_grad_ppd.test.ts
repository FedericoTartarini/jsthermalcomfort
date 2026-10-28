import { describe, expect, test } from "vitest";
import { vertical_tmp_grad_ppd } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof vertical_tmp_grad_ppd>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.verticalTmpGradPpd,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_vertical_tmp_grad_ppd.py.
// Upstream's arrays are called element-wise, and a UserWarning becomes a range row.
describe("test_vertical_tmp_grad_ppd", () => {
  test.each(reference_table.data)(
    "test_vertical_tmp_grad_ppd: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = vertical_tmp_grad_ppd(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  // Upstream calls np.isclose without asserting its result; this asserts it.
  test("test_vertical_tmp_grad_ppd: vr 0.3", () => {
    // Test for ValueError
    expect(
      vertical_tmp_grad_ppd({
        tdb: 25,
        tr: 25,
        vr: 0.3,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        vertical_tmp_grad: 7,
      }).ppd_vg,
    ).toBeNaN();
  });

  // Upstream warns nothing with the gate off; the library returns the gate-off rows (decision 78).
  test("test_vertical_tmp_grad_ppd_limit_inputs_false_suppresses_warning_and_nan", () => {
    const result = vertical_tmp_grad_ppd({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 7,
      limit_inputs: false,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ key: "tdb", value: 50 }),
    ]);
    expect(result.ppd_vg).not.toBeNaN();
  });

  test("test_vertical_tmp_grad_ppd_limit_inputs_true_still_warns_and_nans", () => {
    const result = vertical_tmp_grad_ppd({
      tdb: 50,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 7,
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({ key: "tdb", value: 50 }),
    ]);
    expect(result.ppd_vg).toBeNaN();
  });

  test("test_vertical_tmp_grad_ppd_is_never_negative", () => {
    // without the clamp these inputs give -4.9 % and -7.9 %
    for (const [t, vertical_tmp_grad, ppd_vg, acceptability] of [
      [24, 1, 0.0, true],
      [24, 0, 0.0, true],
      [25, 7, 12.6, false],
    ] as const) {
      const result = vertical_tmp_grad_ppd({
        tdb: t,
        tr: t,
        vr: 0.1,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        vertical_tmp_grad,
      });
      expect(approx(result.ppd_vg, ppd_vg, { rel: 1e-7, abs: 0 })).toBe(true);
      expect(result.acceptability).toBe(acceptability);
    }
  });
});

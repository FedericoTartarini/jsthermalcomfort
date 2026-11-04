import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  vertical_tmp_grad_ppd,
  VERTICAL_TMP_GRAD_PPD_INFO,
} from "../../src/models/index.ts";
import { vertical_tmp_grad_ppd as from_root } from "../../src/index.ts";
import {
  DEFAULT_TOLERANCE,
  read_data,
  upstream_returns,
} from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof vertical_tmp_grad_ppd>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.verticalTmpGradPpd,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_vertical_tmp_grad_ppd.py.
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

  // tests/test_vertical_tmp_grad_ppd.py:27-31 calls np.isclose without asserting its result; this asserts it.
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
    ).toBe(null);
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
    expect(result.ppd_vg).not.toBe(null);
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
    expect(result.ppd_vg).toBe(null);
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

  // Upstream's tdb = [25, np.nan], element-wise; deviation _shared-7.
  test("test_vertical_tmp_grad_ppd_acceptability_nan_where_ppd_undefined", () => {
    const inputs = {
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 7,
      limit_inputs: false,
    };
    expect(vertical_tmp_grad_ppd({ ...inputs, tdb: 25 }).acceptability).toBe(
      false,
    );
    expect(() => vertical_tmp_grad_ppd({ ...inputs, tdb: NaN })).toThrow(
      RangeError,
    );
  });
});

const valid = {
  tdb: 25,
  tr: 25,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  vertical_tmp_grad: 7,
};

describeModelContract(
  vertical_tmp_grad_ppd,
  VERTICAL_TMP_GRAD_PPD_INFO,
  valid,
  {
    ...valid,
    tdb: 50,
  },
);

const call = (inputs: unknown) =>
  vertical_tmp_grad_ppd(inputs as Parameters<typeof vertical_tmp_grad_ppd>[0]);
const notice = {
  kind: "notice",
  message: "Cooling effect could not be calculated. Returning 0.",
};
const out = { tdb: 50, tr: 5, vr: 2.5, met: 5, clo: 2 };
const parity_cases = () =>
  read_data(
    fileURLToPath(new URL("../..", import.meta.url)),
    "vertical_tmp_grad_ppd",
  ).cases.filter(upstream_returns);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image, and acceptability on 4.8.0.
describe("vertical_tmp_grad_ppd (JS-only)", () => {
  // Decision 321; upstream's ppd_vg and acceptability are NaN here, measured on 4.8.0 in the parity image.
  test("a null pmv from pmv_ppd_ashrae gives upstream's NaN ppd_vg, as null", () => {
    const result = vertical_tmp_grad_ppd({
      tdb: -240,
      tr: -240,
      vr: 0.1,
      rh: 0,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 1,
      limit_inputs: false,
    });
    expect([result.ppd_vg, result.acceptability]).toEqual([null, null]);
  });

  // models/vertical_tmp_grad_ppd.py:91-95.
  test("the docstring's example gives its outputs", () => {
    expect(call(valid)).toEqual({
      ppd_vg: 12.6,
      acceptability: false,
      warnings: [],
    });
  });

  test("round_output false returns the unrounded ppd_vg", () => {
    expect(
      approx(
        call({ ...valid, round_output: false }).ppd_vg,
        12.637059952602048,
        DEFAULT_TOLERANCE,
      ),
    ).toBe(true);
  });

  // models/vertical_tmp_grad_ppd.py:129-132: an unrounded 5.0287 % is not acceptable.
  test("acceptability is taken before ppd_vg is rounded", () => {
    const result = call({ ...valid, vertical_tmp_grad: 4.93 });
    expect(result.ppd_vg).toBe(5.0);
    expect(result.acceptability).toBe(false);
  });

  // Deviation vertical_tmp_grad_ppd-2.
  test.each([-0.1, 0.3])(
    "vr %s, outside 0-0.2 m/s, gives a v_limited row and masks both outputs with the gate on",
    (vr) => {
      const result = call({ ...valid, vr });
      expect(result.warnings).toEqual([
        expect.objectContaining({
          key: "v_limited",
          role: "input",
          value: vr,
          bound: VERTICAL_TMP_GRAD_PPD_INFO.inputs.vr.applicability,
        }),
      ]);
      expect(result.ppd_vg).toBe(null);
      expect(result.acceptability).toBe(null);
    },
  );

  // Deviation vertical_tmp_grad_ppd-2, deviation vertical_tmp_grad_ppd-3, deviation vertical_tmp_grad_ppd-4: upstream's gated call warns the notice twice, then each bound.
  test("each bound broken gives a row, in upstream's order, after the inner call's notice alone, with the gate off", () => {
    const result = call({
      ...out,
      rh: 50,
      vertical_tmp_grad: 7,
      limit_inputs: false,
    });
    expect(result.warnings).toEqual([
      notice,
      ...(["tdb", "tr", "met", "clo"] as const).map((key): unknown =>
        expect.objectContaining({
          key,
          value: out[key],
          bound: VERTICAL_TMP_GRAD_PPD_INFO.inputs[key].applicability,
        }),
      ),
      expect.objectContaining({
        key: "v_limited",
        value: 2.5,
        bound: VERTICAL_TMP_GRAD_PPD_INFO.inputs.vr.applicability,
      }),
    ]);
    expect(result.ppd_vg).toBe(60.0);
    expect(result.acceptability).toBe(false);
  });

  // Deviation vertical_tmp_grad_ppd-2.
  test("each bound broken gives a row and masks both outputs with the gate on", () => {
    const result = call({ ...out, vr: 0.1, rh: 50, vertical_tmp_grad: 7 });
    expect(result.warnings).toEqual(
      (["tdb", "tr", "met", "clo"] as const).map((key): unknown =>
        expect.objectContaining({
          key,
          value: out[key],
          bound: VERTICAL_TMP_GRAD_PPD_INFO.inputs[key].applicability,
        }),
      ),
    );
    expect(result.ppd_vg).toBe(null);
    expect(result.acceptability).toBe(null);
  });

  // Deviation vertical_tmp_grad_ppd-5.
  test("one notice wherever upstream warned it, none elsewhere, over the parity data", () => {
    for (const { inputs, warnings } of parity_cases()) {
      const warned = warnings.some(({ message }) => message === notice.message);
      const notices = call(inputs).warnings.filter(
        ({ kind }) => kind === "notice",
      );
      expect(notices).toEqual(warned ? [notice] : []);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(vertical_tmp_grad_ppd);
  });
});

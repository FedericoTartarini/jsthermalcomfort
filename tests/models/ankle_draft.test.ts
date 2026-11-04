import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { ankle_draft, ANKLE_DRAFT_INFO } from "../../src/models/index.ts";
import { Units } from "../../src/utilities/index.ts";
import { ankle_draft as from_root } from "../../src/index.ts";
import { read_data, upstream_returns } from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof ankle_draft>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.ankleDraft,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_ankle_draft.py. Upstream's
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
    expect(r.ppd_ad).toBe(null);

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
      ).toBe(null);
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
    expect(result.ppd_ad).not.toBe(null);
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
    expect(result.ppd_ad).not.toBe(null);
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
    expect(result.ppd_ad).toBe(null);
  });

  // Upstream's tdb = [25, np.nan], element-wise; deviation _shared-7.
  test("test_ankle_draft_acceptability_nan_where_ppd_undefined", () => {
    const inputs = {
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      limit_inputs: false,
    };
    expect(ankle_draft({ ...inputs, tdb: 25 }).acceptability).toBe(true);
    expect(() => ankle_draft({ ...inputs, tdb: NaN })).toThrow(RangeError);
  });
});

const valid = {
  tdb: 25,
  tr: 25,
  vr: 0.2,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  v_ankle: 0.3,
};

describeModelContract(ankle_draft, ANKLE_DRAFT_INFO, valid, {
  ...valid,
  tdb: 50,
});

const call = (inputs: unknown) =>
  ankle_draft(inputs as Parameters<typeof ankle_draft>[0]);
const v_limited_message =
  "This equation is only applicable for air speed lower than 0.2 m/s";
const notice = {
  kind: "notice",
  message: "Cooling effect could not be calculated. Returning 0.",
};
const parity_cases = () =>
  read_data(
    fileURLToPath(new URL("../..", import.meta.url)),
    "ankle_draft",
  ).cases.filter(upstream_returns);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image, and acceptability on 4.8.0.
describe("ankle_draft (JS-only)", () => {
  // Decision 321; upstream's ppd_ad and acceptability are NaN here, measured on 4.8.0 in the parity image.
  test("a null pmv from pmv_ppd_ashrae gives upstream's NaN ppd_ad, as null", () => {
    const result = call({
      tdb: -240,
      tr: -240,
      vr: 0.1,
      rh: 0,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      limit_inputs: false,
    });
    expect([result.ppd_ad, result.acceptability]).toEqual([null, null]);
  });

  // models/ankle_draft.py:90-94.
  test("the docstring's example gives its outputs", () => {
    expect(call(valid)).toEqual({
      ppd_ad: 18.5,
      acceptability: true,
      warnings: [],
    });
  });

  test("IP inputs are converted, vr before its 0.2 m/s check", () => {
    const ip = { ...valid, tdb: 77, tr: 77, v_ankle: 1.0, units: "IP" };
    expect(call({ ...ip, vr: 0.6 }).ppd_ad).toBe(17.7);
    expect(() => call({ ...ip, vr: 0.7 })).toThrow(
      new RangeError(v_limited_message),
    );
  });

  // Deviation ankle_draft-7.
  test.each([0.3, -0.1])(
    "vr %s, outside 0-0.2 m/s, throws upstream's message with the gate on",
    (vr) => {
      expect(() => call({ ...valid, vr })).toThrow(
        new RangeError(v_limited_message),
      );
    },
  );

  test("a ppd_ad above 20 % makes acceptability false", () => {
    const result = call({
      tdb: 20,
      tr: 20,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 0.5,
      v_ankle: 0.4,
    });
    expect(result.ppd_ad).toBe(74.4);
    expect(result.acceptability).toBe(false);
  });

  // Deviation ankle_draft-2, deviation ankle_draft-4: upstream's gated call warns the notice, then each bound.
  test("each bound broken gives a row, in upstream's order, with the gate off", () => {
    const out = { tdb: 50, tr: 5, vr: 2.5, met: 5, clo: 2 };
    const result = call({ ...out, rh: 50, v_ankle: 0.1, limit_inputs: false });
    expect(result.warnings).toEqual([
      notice,
      expect.objectContaining({
        key: "tdb",
        value: 50,
        bound: { min: 10, max: 40 },
      }),
      expect.objectContaining({
        key: "tr",
        value: 5,
        bound: { min: 10, max: 40 },
      }),
      expect.objectContaining({
        key: "vr",
        value: 2.5,
        bound: { min: 0, max: 2 },
      }),
      expect.objectContaining({
        key: "met",
        value: 5,
        bound: { min: 1, max: 4 },
      }),
      expect.objectContaining({
        key: "clo",
        value: 2,
        bound: { min: 0, max: 1.5 },
      }),
      expect.objectContaining({
        key: "v_limited",
        role: "input",
        value: 2.5,
        bound: ANKLE_DRAFT_INFO.inputs.vr.applicability,
      }),
    ]);
    expect(result.ppd_ad).toBe(0.0);
    expect(result.acceptability).toBe(true);
  });

  // Deviation ankle_draft-2.
  test("each bound broken gives a row and masks both outputs with the gate on", () => {
    const out = { tdb: 50, tr: 5, met: 5, clo: 2 };
    const result = call({ ...out, vr: 0.1, rh: 50, v_ankle: 0.1 });
    expect(result.warnings).toEqual(
      (["tdb", "tr", "met", "clo"] as const).map((key): unknown =>
        expect.objectContaining({
          key,
          value: out[key],
          bound: ANKLE_DRAFT_INFO.inputs[key].applicability,
        }),
      ),
    );
    expect(result.ppd_ad).toBe(null);
    expect(result.acceptability).toBe(null);
  });

  // Deviation ankle_draft-3: upstream warns the notice twice, then 'tdb' and 'v_limited'.
  test("the inner pmv_ppd_ashrae call gives its notice, not its range rows", () => {
    const result = call({
      tdb: 50,
      tr: 25,
      vr: 0.3,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.1,
      limit_inputs: false,
    });
    expect(result.warnings).toEqual([
      notice,
      expect.objectContaining({ key: "tdb", value: 50 }),
      expect.objectContaining({ key: "v_limited", value: 0.3 }),
    ]);
  });

  // Deviation ankle_draft-5.
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
    expect(from_root).toBe(ankle_draft);
  });
});

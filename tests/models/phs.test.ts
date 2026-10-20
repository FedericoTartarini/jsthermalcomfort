import { describe, expect, test } from "@jest/globals";
import { phs } from "../../src/models/index.js";
import { met_to_w_m2 } from "../../src/utilities/index.js";
import {
  PHS_INFO,
  PHS_LIMITS,
  type PhsParams,
  type PhsResult,
} from "../../src/models/phs.ts";
import type {
  ApplicabilityWarning,
  Bound,
} from "../../src/models/modelDocs.ts";
import { testDataUrls } from "./comftest.ts";
import {
  assertNonEmptyRows,
  loadTestData,
  validateResult,
} from "./testUtils.ts";

const { testData, tolerances } = await loadTestData(testDataUrls.phs);

// The fixture's list rows run one scalar case per element (ADR 0005).
const rows = assertNonEmptyRows(testData.data, "phs rows");

// Upstream's PHS fields, in its order (classes_return.py:389-399 at v4.6.2).
const FIELDS = [
  "t_re",
  "t_sk",
  "t_cr",
  "t_cr_eq",
  "t_sk_t_cr_wg",
  "d_lim_loss_50",
  "d_lim_loss_95",
  "d_lim_t_re",
  "sweat_loss_g",
  "sweat_rate_watt",
  "evap_load_wm2_min",
];

// Upstream's fields, without the library's `warnings` rows.
type PhsFields = Omit<PhsResult, "warnings">;

// A result's keys: upstream's fields, then `warnings`.
const KEYS = [...FIELDS, "warnings"];

// One `warnings` row, as upstream's UserWarning reports it under
// limit_inputs.
const row = (
  key: string,
  role: ApplicabilityWarning["role"],
  value: number,
  bound: Bound,
): ApplicabilityWarning => ({ key, role, value, bound });

// Unrounded outputs can differ from upstream's in the last bits, from
// Math.exp (see the note at the kernel); NaN and the key order are checked
// exactly, and so are the `warnings` rows.
function expectNear(
  result: PhsResult,
  expected: PhsFields,
  warnings: ApplicabilityWarning[] = [],
): void {
  expect(Object.keys(result)).toEqual(KEYS);
  expect(result.warnings).toEqual(warnings);
  for (const key of FIELDS as (keyof PhsFields)[]) {
    if (Number.isNaN(expected[key])) {
      expect(result[key]).toBeNaN();
    } else {
      expect(Math.abs(result[key] - expected[key])).toBeLessThanOrEqual(
        1e-12 * Math.abs(expected[key]),
      );
    }
  }
}

const MASKED: PhsFields = {
  t_re: NaN,
  t_sk: NaN,
  t_cr: NaN,
  t_cr_eq: NaN,
  t_sk_t_cr_wg: NaN,
  d_lim_loss_50: NaN,
  d_lim_loss_95: NaN,
  d_lim_t_re: NaN,
  sweat_loss_g: NaN,
  sweat_rate_watt: NaN,
  evap_load_wm2_min: NaN,
};

// Mirrors pythermalcomfort v4.6.2 tests/test_phs.py.
describe("test_phs", () => {
  // Upstream sets inputs["model"] = "7933-2004" on every row
  // (test_phs.py:22); the library calls the key `standard` (ADR 0003).
  test.each(rows)("test_phs: fixture case %#", (row) => {
    const result = phs({
      ...(row.inputs as unknown as PhsParams),
      standard: "7933-2004",
    });
    validateResult(result, row.outputs, tolerances, row.inputs);
  });

  const weight = 75;
  const height = 1.8;
  const a_dubois = 0.202 * weight ** 0.425 * height ** 0.725;

  // test_phs.py:34-192: each case's expected values and upstream's
  // tolerances (:188-192).
  const check2023 = (
    result: PhsResult,
    expected: {
      sweat_loss_g: number;
      t_cr: number;
      d_lim_loss_95: number;
      d_lim_t_re?: number;
    },
  ) => {
    expect(
      Math.abs(result.sweat_loss_g - expected.sweat_loss_g),
    ).toBeLessThanOrEqual(0.025 * expected.sweat_loss_g);
    expect(Math.abs(result.t_cr - expected.t_cr)).toBeLessThanOrEqual(0.3);
    expect(
      Math.abs(result.d_lim_loss_95 - expected.d_lim_loss_95),
    ).toBeLessThanOrEqual(10);
    if (expected.d_lim_t_re !== undefined) {
      expect(
        Math.abs(result.d_lim_t_re - expected.d_lim_t_re),
      ).toBeLessThanOrEqual(10);
    }
  };
  const common2023 = {
    posture: "standing",
    wme: 0,
    standard: "7933-2023",
    duration: 480,
    limit_inputs: false,
    round_output: false,
  } as const;

  test("test_2023_standard: case 1", () => {
    const result = phs({
      ...common2023,
      tdb: 40,
      tr: 40,
      rh: 35,
      v: 0.3,
      met: 300 / met_to_w_m2 / a_dubois,
      clo: 0.5,
      acclimatized: 100,
    });
    check2023(result, { sweat_loss_g: 6538, t_cr: 37.6, d_lim_loss_95: 280 });
  });

  test("test_2023_standard: case 2", () => {
    const result = phs({
      ...common2023,
      tdb: 35,
      tr: 35,
      rh: 60,
      v: 0.1,
      met: 300 / met_to_w_m2 / a_dubois,
      clo: 0.5,
      acclimatized: 0,
    });
    check2023(result, {
      sweat_loss_g: 6345,
      t_cr: 40.8,
      d_lim_loss_95: 250,
      d_lim_t_re: 62,
    });
  });

  // Upstream marks this case xfail(strict=True), "Known discrepancy t_cr and
  // d_lim_t_re" (test_phs.py:106-110): its code returns d_lim_t_re 181,
  // outside 149 ± 10, and meets the other three expectations. The mirror
  // asserts those three and the 181 upstream returns.
  test("test_2023_standard: high-radiant-temp", () => {
    const result = phs({
      ...common2023,
      tdb: 30,
      tr: 54.2,
      rh: 35,
      v: 0.1,
      met: 300 / met_to_w_m2 / a_dubois,
      clo: 0.8,
      a_p: 0.3,
      f_r: 0.85,
      acclimatized: 0,
    });
    check2023(result, { sweat_loss_g: 6419, t_cr: 38.7, d_lim_loss_95: 280 });
    expect(result.d_lim_t_re).toBe(181);
  });
  test.todo(
    "test_2023_standard: high-radiant-temp expects d_lim_t_re 149 ± 10, which upstream's code does not return (181; strict xfail, test_phs.py:106-110)",
  );

  test("test_2023_standard: case 4", () => {
    const result = phs({
      ...common2023,
      tdb: 30,
      tr: 30,
      rh: 45,
      v: 1.0,
      met: 450 / met_to_w_m2 / a_dubois,
      clo: 0.5,
      acclimatized: 0,
    });
    check2023(result, { sweat_loss_g: 4593, t_cr: 38.0, d_lim_loss_95: 400 });
  });

  const case5 = {
    ...common2023,
    tr: 74.6,
    rh: 30,
    v: 1.0,
    met: 250 / met_to_w_m2 / a_dubois,
    clo: 1,
    posture: "sitting",
    a_p: 0.2,
    f_r: 0.85,
    acclimatized: 100,
  } as const;

  test("test_2023_standard: case 5", () => {
    const result = phs({ ...case5, tdb: 35 });
    check2023(result, { sweat_loss_g: 5813, t_cr: 37.5, d_lim_loss_95: 310 });
  });

  // Upstream passes tdb [35, 35] and posture ["sitting", "sitting"]; each
  // element runs as one scalar call (ADR 0005).
  test.each([0, 1])("test_2023_standard: array-input, element %i", () => {
    const result = phs({ ...case5, tdb: 35 });
    check2023(result, { sweat_loss_g: 5813, t_cr: 37.5, d_lim_loss_95: 310 });
  });

  // Upstream's ValueError is an Error here (ADR 0012).
  const check = {
    tdb: 40,
    tr: 40,
    rh: 33.85,
    v: 0.3,
    met: 2.58,
    clo: 0.5,
    posture: "standing",
  } as const;

  test("test_value_acclimatized", () => {
    expect(() =>
      phs({ ...check, acclimatized: 101 } as unknown as PhsParams),
    ).toThrow(Error);
    expect(() =>
      phs({ ...check, acclimatized: -1 } as unknown as PhsParams),
    ).toThrow(Error);
  });

  // A weight outside (0, 1000] is a value outside a range: RangeError.
  test("test_value_weight", () => {
    expect(() => phs({ ...check, weight: 1001 })).toThrow(RangeError);
    expect(() => phs({ ...check, weight: 0 })).toThrow(RangeError);
  });

  test("test_value_drink", () => {
    expect(() => phs({ ...check, drink: 0.5 } as unknown as PhsParams)).toThrow(
      Error,
    );
    expect(() => phs({ ...check, drink: 2 } as unknown as PhsParams)).toThrow(
      Error,
    );
  });

  test.each(["7933-2004", "7933-2023"] as const)(
    "test_applicability_limit_is_on_tr_minus_tdb_not_tr[%s]",
    (standard) => {
      const result = phs({
        tdb: 40,
        tr: 10,
        rh: 50,
        v: 0.5,
        met: 2.0,
        clo: 0.5,
        posture: "standing",
        standard,
        round_output: false,
      });
      expect(result.t_cr).toBeNaN();
    },
  );

  test("test_applicability_limit_metabolic_rate_is_standard_specific", () => {
    const params = {
      tdb: 30,
      tr: 40,
      rh: 50,
      v: 0.5,
      met: 1.5,
      clo: 0.5,
      posture: "standing",
      round_output: false,
    } as const;
    expect(phs({ ...params, standard: "7933-2023" }).t_cr).not.toBeNaN();
    expect(phs({ ...params, standard: "7933-2004" }).t_cr).toBeNaN();
  });

  test("test_2023_forces_skin_temperature_to_equilibrium_on_minute_one", () => {
    const params = {
      tdb: 40,
      tr: 40,
      rh: 35,
      v: 0.3,
      met: 2.58,
      clo: 0.5,
      posture: "standing",
      wme: 0,
      duration: 1,
      limit_inputs: false,
      round_output: false,
      t_sk: 20.0,
    } as const;
    const result_2023 = phs({ ...params, standard: "7933-2023" });
    const result_2004 = phs({ ...params, standard: "7933-2004" });
    expect(result_2023.t_sk).toBeGreaterThan(30);
    expect(result_2004.t_sk).toBeLessThan(result_2023.t_sk);
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("phs beyond upstream's tests", () => {
  // The docstring example (models/phs.py:136-147).
  const base = {
    tdb: 40,
    tr: 40,
    rh: 33.85,
    v: 0.3,
    met: 2.5,
    clo: 0.5,
    posture: "standing",
  } as const;

  test("the docstring example gives t_re 37.5", () => {
    const result = phs({ ...base, wme: 0, duration: 480 });
    expect(result).toEqual({
      t_re: 37.5,
      t_sk: 35.3,
      t_cr: 37.4,
      t_cr_eq: 37.1,
      t_sk_t_cr_wg: 0.24,
      d_lim_loss_50: 313.0,
      d_lim_loss_95: 313.0,
      d_lim_t_re: 480.0,
      sweat_loss_g: 5841.9,
      sweat_rate_watt: 251.9,
      evap_load_wm2_min: 121938.3,
      warnings: [],
    });
    expect(Object.keys(result)).toEqual(KEYS);
  });

  test("round_output false returns the unrounded values", () => {
    expectNear(phs({ ...base, round_output: false }), {
      t_re: 37.50295224476024,
      t_sk: 35.26787053461345,
      t_cr: 37.44539615210981,
      t_cr_eq: 37.123349999999995,
      t_sk_t_cr_wg: 0.24191434631011702,
      d_lim_loss_50: 313.0,
      d_lim_loss_95: 313.0,
      d_lim_t_re: 480.0,
      sweat_loss_g: 5841.8819022134285,
      sweat_rate_watt: 251.92568355583998,
      evap_load_wm2_min: 121938.34454976018,
    });
  });

  // The docstring's list example (:149-160) as one scalar call per element;
  // its first element is the example above.
  test("the docstring's second list element gives t_re 42.5", () => {
    expect(
      phs({
        tdb: 45,
        tr: 45,
        v: 0.4,
        rh: 40,
        met: 2.6,
        clo: 0.6,
        posture: "standing",
        wme: 0,
        duration: 480,
      }),
    ).toEqual({
      t_re: 42.5,
      t_sk: 38.3,
      t_cr: 42.3,
      t_cr_eq: 37.1,
      t_sk_t_cr_wg: 0.1,
      d_lim_loss_50: 164.0,
      d_lim_loss_95: 164.0,
      d_lim_t_re: 40.0,
      sweat_loss_g: 10499.4,
      sweat_rate_watt: 388.4,
      evap_load_wm2_min: 219155.5,
      warnings: [],
    });
  });

  // The docstring's chaining example (:162-200).
  test("chaining two 60-minute runs gives t_re 37.8, then 38.5", () => {
    const params = {
      tdb: 40,
      tr: 40,
      v: 0.3,
      rh: 50,
      met: 2.5,
      clo: 0.5,
      posture: "standing",
      wme: 0,
      round_output: false,
      duration: 60,
    } as const;
    const first = phs(params);
    expectNear(first, {
      t_re: 37.843744854847046,
      t_sk: 35.6561866599421,
      t_cr: 37.82879534112379,
      t_cr_eq: 37.1225484954837,
      t_sk_t_cr_wg: 0.2074606328984821,
      d_lim_loss_50: 60.0,
      d_lim_loss_95: 60.0,
      d_lim_t_re: 60.0,
      sweat_loss_g: 1156.29228864535,
      sweat_rate_watt: 498.17824368515676,
      evap_load_wm2_min: 24135.436123699354,
    });
    const second = phs({
      ...params,
      t_sk: first.t_sk,
      t_cr: first.t_cr,
      t_re: first.t_re,
      t_cr_eq: first.t_cr_eq,
      t_sk_t_cr_wg: first.t_sk_t_cr_wg,
      sweat_rate_watt: first.sweat_rate_watt,
      evap_load_wm2_min: first.evap_load_wm2_min,
    });
    expectNear(second, {
      t_re: 38.52809746939635,
      t_sk: 36.03374344427493,
      t_cr: 38.483796752529656,
      t_cr_eq: 37.123348013268966,
      t_sk_t_cr_wg: 0.1485341671636324,
      d_lim_loss_50: 60.0,
      d_lim_loss_95: 60.0,
      d_lim_t_re: 12.0,
      sweat_loss_g: 2593.062788267178,
      sweat_rate_watt: 468.4040316779971,
      evap_load_wm2_min: 54125.32964678428,
    });
  });

  test("the docstring example under 7933-2004", () => {
    expect(phs({ ...base, standard: "7933-2004" })).toEqual({
      t_re: 37.5,
      t_sk: 35.3,
      t_cr: 37.4,
      t_cr_eq: 37.1,
      t_sk_t_cr_wg: 0.24,
      d_lim_loss_50: 453.0,
      d_lim_loss_95: 307.0,
      d_lim_t_re: 480.0,
      sweat_loss_g: 5978.8,
      sweat_rate_watt: 258.0,
      evap_load_wm2_min: 124797.2,
      warnings: [],
    });
  });

  // Every key off its default: drink 0 scales d_lim_loss_95 by 0.6 and copies
  // it into d_lim_loss_50 (:807-809).
  describe("crouching, walking at an angle, not acclimatized, not drinking", () => {
    const params = {
      tdb: 32,
      tr: 38,
      rh: 45,
      v: 0.4,
      met: 3.2,
      clo: 0.3,
      posture: "crouching",
      walk_sp: 1.2,
      theta: 45,
      drink: 0,
      acclimatized: 0,
      weight: 68,
      height: 1.72,
      i_mst: 0.4,
      a_p: 0.4,
      round_output: false,
    } as const;

    test("under 7933-2004", () => {
      expectNear(phs({ ...params, standard: "7933-2004" }), {
        t_re: 37.78233400917703,
        t_sk: 35.123800523346105,
        t_cr: 37.71946966300268,
        t_cr_eq: 37.26988799999994,
        t_sk_t_cr_wg: 0.2172477303297588,
        d_lim_loss_50: 244.2,
        d_lim_loss_95: 244.2,
        d_lim_t_re: 480.0,
        sweat_loss_g: 4034.124944436669,
        sweat_rate_watt: 182.08336851235492,
        evap_load_wm2_min: 90726.89703767041,
      });
    });

    test("under 7933-2023", () => {
      expectNear(phs({ ...params, standard: "7933-2023" }), {
        t_re: 37.7761764496804,
        t_sk: 35.11962648916165,
        t_cr: 37.71342909713648,
        t_cr_eq: 37.26988799999994,
        t_sk_t_cr_wg: 0.21779138125771624,
        d_lim_loss_50: 151.2,
        d_lim_loss_95: 151.2,
        d_lim_t_re: 480.0,
        sweat_loss_g: 3991.097701326066,
        sweat_rate_watt: 180.0473230499045,
        evap_load_wm2_min: 89759.22045122903,
      });
    });

    test("rounded, t_sk_t_cr_wg to 2 decimals and the rest to 1", () => {
      expect(
        phs({ ...params, standard: "7933-2023", round_output: true }),
      ).toEqual({
        t_re: 37.8,
        t_sk: 35.1,
        t_cr: 37.7,
        t_cr_eq: 37.3,
        t_sk_t_cr_wg: 0.22,
        d_lim_loss_50: 151.2,
        d_lim_loss_95: 151.2,
        d_lim_t_re: 480.0,
        sweat_loss_g: 3991.1,
        sweat_rate_watt: 180.0,
        evap_load_wm2_min: 89759.2,
        warnings: [],
      });
    });
  });

  // The audit's findings, each on an input it gave.
  describe("upstream's logic", () => {
    // 2023: the skin temperature is its equilibrium value on minute 1
    // (:716-720); 2004 keeps the exponential lag.
    test.each<[NonNullable<PhsParams["standard"]>, PhsFields]>([
      [
        "7933-2004",
        {
          t_re: 36.67004416128373,
          t_sk: 24.230834848700702,
          t_cr: 36.17099872577677,
          t_cr_eq: 36.83236452767074,
          t_sk_t_cr_wg: 0.3,
          d_lim_loss_50: 1.0,
          d_lim_loss_95: 1.0,
          d_lim_t_re: 1.0,
          sweat_loss_g: 1.8855607610258263,
          sweat_rate_watt: 29.738306863762652,
          evap_load_wm2_min: 39.35754977524625,
        },
      ],
      [
        "7933-2023",
        {
          t_re: 36.24298011463149,
          t_sk: 34.92444672386431,
          t_cr: 34.24921051584174,
          t_cr_eq: 36.83236452767074,
          t_sk_t_cr_wg: 0.3,
          d_lim_loss_50: 1.0,
          d_lim_loss_95: 1.0,
          d_lim_t_re: 1.0,
          sweat_loss_g: 1.1580346664648693,
          sweat_rate_watt: 14.543667063528849,
          evap_load_wm2_min: 24.17180499771098,
        },
      ],
    ])("minute one from t_sk 20 under %s", (standard, expected) => {
      expectNear(
        phs({
          tdb: 40,
          tr: 40,
          rh: 35,
          v: 0.3,
          met: 2.58,
          clo: 0.5,
          posture: "standing",
          duration: 1,
          limit_inputs: false,
          round_output: false,
          t_sk: 20.0,
          standard,
        }),
        expected,
      );
    });

    // 2023: hc_dyn is computed once, from tr + 0.1 (:664-671), and not
    // updated in the t_cl iteration (:724-732).
    test("the high-radiant-temp case's unrounded values", () => {
      expectNear(
        phs({
          tdb: 30,
          tr: 54.2,
          rh: 35,
          v: 0.1,
          met: 300 / met_to_w_m2 / (0.202 * 75 ** 0.425 * 1.8 ** 0.725),
          clo: 0.8,
          posture: "standing",
          wme: 0,
          a_p: 0.3,
          f_r: 0.85,
          standard: "7933-2023",
          limit_inputs: false,
          acclimatized: 0,
          round_output: false,
        }),
        {
          t_re: 38.49509866963637,
          t_sk: 35.95970595330643,
          t_cr: 38.42178736463986,
          t_cr_eq: 37.15731249860508,
          t_sk_t_cr_wg: 0.1541157337087236,
          d_lim_loss_50: 285.0,
          d_lim_loss_95: 285.0,
          d_lim_t_re: 181.0,
          sweat_loss_g: 6364.769988495677,
          sweat_rate_watt: 264.7879403706863,
          evap_load_wm2_min: 132852.65413241225,
        },
      );
    });

    // Any walk_sp but 0 counts as walking (:582), a negative one included.
    test.each<[NonNullable<PhsParams["standard"]>, PhsFields]>([
      [
        "7933-2004",
        {
          t_re: 41.233608159912606,
          t_sk: 36.945681257835126,
          t_cr: 41.11422997582404,
          t_cr_eq: 37.22801999999996,
          t_sk_t_cr_wg: 0.1,
          d_lim_loss_50: 341.0,
          d_lim_loss_95: 231.0,
          d_lim_t_re: 59.0,
          sweat_loss_g: 7968.8017928232875,
          sweat_rate_watt: 328.28062638632554,
          evap_load_wm2_min: 166333.81415907515,
        },
      ],
      [
        "7933-2023",
        {
          t_re: 41.339253617046374,
          t_sk: 37.00166284018019,
          t_cr: 41.21841843381126,
          t_cr_eq: 37.22801999999996,
          t_sk_t_cr_wg: 0.1,
          d_lim_loss_50: 168.0,
          d_lim_loss_95: 168.0,
          d_lim_t_re: 59.0,
          sweat_loss_g: 9641.45186047158,
          sweat_rate_watt: 330.8254665575546,
          evap_load_wm2_min: 201247.25193035204,
        },
      ],
    ])("walk_sp -0.5 under %s", (standard, expected) => {
      expectNear(
        phs({
          tdb: 35,
          tr: 35,
          rh: 40,
          v: 0.3,
          met: 3.0,
          clo: 0.5,
          posture: "standing",
          walk_sp: -0.5,
          standard,
          round_output: false,
        }),
        expected,
      );
    });

    // Only a t_re or t_cr_eq not given falls back to t_cr (:313-316).
    test("t_re 0 is used under 7933-2004", () => {
      expectNear(
        phs({
          ...base,
          t_re: 0,
          duration: 1,
          limit_inputs: false,
          round_output: false,
          standard: "7933-2004",
        }),
        {
          t_re: 8.19106506765881,
          t_sk: 28.70593774640198,
          t_cr: 37.51479280446465,
          t_cr_eq: 36.83077082087807,
          t_sk_t_cr_wg: 0.23570757101177575,
          d_lim_loss_50: 1.0,
          d_lim_loss_95: 1.0,
          d_lim_t_re: 1.0,
          sweat_loss_g: 1.8800056510522911,
          sweat_rate_watt: 29.738306863762652,
          evap_load_wm2_min: 39.241597257666584,
        },
      );
    });

    test("t_cr_eq 0 is used under 7933-2004", () => {
      expectNear(
        phs({
          ...base,
          t_cr_eq: 0,
          duration: 1,
          limit_inputs: false,
          round_output: false,
          standard: "7933-2004",
        }),
        {
          t_re: 37.32250760126919,
          t_sk: 34.32395381165071,
          t_cr: 39.10708420571137,
          t_cr_eq: 3.5327538371547624,
          t_sk_t_cr_wg: 0.1,
          d_lim_loss_50: 1.0,
          d_lim_loss_95: 1.0,
          d_lim_t_re: 1.0,
          sweat_loss_g: 0.45528828826252316,
          sweat_rate_watt: 0.0,
          evap_load_wm2_min: 9.503290393903928,
        },
      );
    });

    test("t_re 0 is used under 7933-2023", () => {
      expectNear(
        phs({
          ...base,
          t_re: 0,
          duration: 1,
          limit_inputs: false,
          round_output: false,
        }),
        {
          t_re: 8.381393184851886,
          t_sk: 15.07046808843662,
          t_cr: 38.37126933183349,
          t_cr_eq: 36.83077082087807,
          t_sk_t_cr_wg: 0.15859676300758663,
          d_lim_loss_50: 1.0,
          d_lim_loss_95: 1.0,
          d_lim_t_re: 1.0,
          sweat_loss_g: 2.7352354341578873,
          sweat_rate_watt: 47.58129098202024,
          evap_load_wm2_min: 57.092917381415454,
        },
      );
    });
  });

  describe("limit_inputs", () => {
    // tr is checked as tr - tdb (:432): a tr of 65 °C at tdb 40 °C computes.
    test.each<[NonNullable<PhsParams["standard"]>, PhsFields]>([
      [
        "7933-2004",
        {
          t_re: 43.4,
          t_sk: 39.7,
          t_cr: 43.3,
          t_cr_eq: 37.1,
          t_sk_t_cr_wg: 0.1,
          d_lim_loss_50: 374.0,
          d_lim_loss_95: 253.0,
          d_lim_t_re: 35.0,
          sweat_loss_g: 7262.5,
          sweat_rate_watt: 312.5,
          evap_load_wm2_min: 151590.2,
        },
      ],
      [
        "7933-2023",
        {
          t_re: 38.2,
          t_sk: 36.8,
          t_cr: 38.1,
          t_cr_eq: 37.1,
          t_sk_t_cr_wg: 0.18,
          d_lim_loss_50: 167.0,
          d_lim_loss_95: 167.0,
          d_lim_t_re: 240.0,
          sweat_loss_g: 11076.7,
          sweat_rate_watt: 470.9,
          evap_load_wm2_min: 231204.9,
        },
      ],
    ])("tr 65 at tdb 40 computes under %s", (standard, expected) => {
      expect(phs({ ...base, tr: 65, standard })).toEqual({
        ...expected,
        warnings: [],
      });
    });

    // met is checked in W/m2, 100 to 450 under 2004 and 56 to 250 under 2023
    // (:430, :435).
    test("met 4.0 (232.6 W/m2) computes under both editions", () => {
      const params = {
        tdb: 35,
        tr: 35,
        rh: 40,
        v: 0.3,
        met: 4.0,
        clo: 0.5,
        posture: "standing",
        round_output: false,
      } as const;
      expectNear(phs({ ...params, standard: "7933-2004" }), {
        t_re: 37.914842597339764,
        t_sk: 35.396447282756824,
        t_cr: 37.84946058799032,
        t_cr_eq: 37.43735999999998,
        t_sk_t_cr_wg: 0.20554854708087078,
        d_lim_loss_50: 355.0,
        d_lim_loss_95: 242.0,
        d_lim_t_re: 480.0,
        sweat_loss_g: 7715.575652365634,
        sweat_rate_watt: 331.56075799702955,
        evap_load_wm2_min: 161048.1926965064,
      });
      expectNear(phs({ ...params, standard: "7933-2023" }), {
        t_re: 37.91711929966467,
        t_sk: 35.39705831488978,
        t_cr: 37.851694032971054,
        t_cr_eq: 37.43735999999998,
        t_sk_t_cr_wg: 0.20534753703260492,
        d_lim_loss_50: 241.0,
        d_lim_loss_95: 241.0,
        d_lim_t_re: 480.0,
        sweat_loss_g: 7757.960375339029,
        sweat_rate_watt: 333.5585802420909,
        evap_load_wm2_min: 161932.89441422134,
      });
    });

    test.each(["7933-2004", "7933-2023"] as const)(
      "met 0.9 (52.3 W/m2) returns NaN under %s",
      (standard) => {
        expect(
          phs({
            tdb: 35,
            tr: 35,
            rh: 40,
            v: 0.3,
            met: 0.9,
            clo: 0.5,
            posture: "standing",
            standard,
            round_output: false,
          }),
        ).toEqual({
          ...MASKED,
          warnings: [
            row("met_w_m2", "derived", 52.335, PHS_LIMITS[standard].met_w_m2),
          ],
        });
      },
    );

    // p_a's lower bound is 0 under 2004 and 0.5 kPa under 2023 (:429, :434).
    test("p_a 0.12 kPa computes under 7933-2004 and returns NaN under 7933-2023", () => {
      const params = {
        tdb: 20,
        tr: 20,
        rh: 5,
        v: 0.3,
        met: 2.5,
        clo: 0.5,
        posture: "standing",
        round_output: false,
      } as const;
      expectNear(phs({ ...params, standard: "7933-2004" }), {
        t_re: 37.40181514728714,
        t_sk: 33.16871986085911,
        t_cr: 37.346180659488695,
        t_cr_eq: 37.123349999999995,
        t_sk_t_cr_wg: 0.25084374064601717,
        d_lim_loss_50: 480.0,
        d_lim_loss_95: 480.0,
        d_lim_t_re: 480.0,
        sweat_loss_g: 1312.9196297901226,
        sweat_rate_watt: 46.42417371328352,
        evap_load_wm2_min: 27404.738552286235,
      });
      expect(phs({ ...params, standard: "7933-2023" })).toEqual({
        ...MASKED,
        warnings: [
          row("pa", "derived", 116.85664013598608, PHS_LIMITS["7933-2023"].pa),
        ],
      });
    });

    // The bounds are inclusive (_internal/validation.py:47). Each pair is on
    // a bound and just outside it, under both editions; the value outside is
    // the one upstream's UserWarning reports.
    type Edge = [
      string,
      Partial<PhsParams>,
      Partial<PhsParams>,
      keyof (typeof PHS_LIMITS)["7933-2023"],
      ApplicabilityWarning["role"],
      number,
    ];
    const edges: Edge[] = [
      [
        "tdb 15",
        { tdb: 15, tr: 15, rh: 50 },
        { tdb: 14.999, tr: 15, rh: 50 },
        "tdb",
        "input",
        14.999,
      ],
      [
        "tdb 50",
        { tdb: 50, tr: 50, rh: 20 },
        { tdb: 50.001, tr: 50.001, rh: 20 },
        "tdb",
        "input",
        50.001,
      ],
      [
        "tr - tdb 0",
        { tdb: 35, tr: 35, rh: 40 },
        { tdb: 35, tr: 34.999, rh: 40 },
        "tr_minus_tdb",
        "derived",
        -0.0009999999999976694,
      ],
      [
        "tr - tdb 60",
        { tdb: 20, tr: 80, rh: 40 },
        { tdb: 20, tr: 80.001, rh: 40 },
        "tr_minus_tdb",
        "derived",
        60.001000000000005,
      ],
      [
        "v 3",
        { tdb: 35, tr: 35, rh: 40, v: 3 },
        { tdb: 35, tr: 35, rh: 40, v: 3.001 },
        "v",
        "input",
        3.001,
      ],
      [
        "clo 0.1",
        { tdb: 35, tr: 35, rh: 40, clo: 0.1 },
        { tdb: 35, tr: 35, rh: 40, clo: 0.099 },
        "clo",
        "input",
        0.099,
      ],
      [
        "clo 1",
        { tdb: 35, tr: 35, rh: 40, clo: 1 },
        { tdb: 35, tr: 35, rh: 40, clo: 1.001 },
        "clo",
        "input",
        1.001,
      ],
    ];
    test.each(
      edges.flatMap(([name, on, off, key, role, value]) =>
        (["7933-2004", "7933-2023"] as const).map(
          (standard) => [name, standard, on, off, key, role, value] as const,
        ),
      ),
    )(
      "%s under %s: on the bound computes, outside returns NaN with its row",
      (_, standard, on, off, key, role, value) => {
        const params = {
          v: 0.3,
          met: 2.5,
          clo: 0.5,
          posture: "standing",
          standard,
          round_output: false,
        } as const;
        const inside = phs({ ...params, ...on } as PhsParams);
        for (const field of FIELDS as (keyof PhsFields)[]) {
          expect(Number.isFinite(inside[field])).toBe(true);
        }
        expect(inside.warnings).toEqual([]);
        expect(phs({ ...params, ...off } as PhsParams)).toEqual({
          ...MASKED,
          warnings: [row(key, role, value, PHS_LIMITS[standard][key])],
        });
      },
    );

    // D3 (i) (.scratch/v2-models/wave-2/decisions.md): under limit_inputs
    // the gate is evaluated before the kernel, which does not end for clo 0.
    // Upstream computes, then masks, and returns NaN in every field.
    test.each(
      [0, -0].flatMap((clo) =>
        (["7933-2004", "7933-2023"] as const).map(
          (standard) => [clo, standard] as const,
        ),
      ),
    )("clo %p under %s returns NaN with its row", (clo, standard) => {
      expect(phs({ ...base, clo, standard, round_output: false })).toEqual({
        ...MASKED,
        warnings: [row("clo", "input", clo, PHS_LIMITS[standard].clo)],
      });
    });

    test("p_a above 4.5 kPa returns NaN", () => {
      expect(phs({ ...base, rh: 70, round_output: false })).toEqual({
        ...MASKED,
        warnings: [
          row("pa", "derived", 5160.393695145819, PHS_LIMITS["7933-2023"].pa),
        ],
      });
    });

    test("limit_inputs false computes outside the limits", () => {
      expectNear(
        phs({ ...base, tdb: 10, limit_inputs: false, round_output: false }),
        {
          t_re: 37.35904515068187,
          t_sk: 33.85166947133406,
          t_cr: 37.30422329281893,
          t_cr_eq: 37.123349999999995,
          t_sk_t_cr_wg: 0.25461990364629583,
          d_lim_loss_50: 480.0,
          d_lim_loss_95: 480.0,
          d_lim_t_re: 480.0,
          sweat_loss_g: 1522.502573434904,
          sweat_rate_watt: 57.35935254210887,
          evap_load_wm2_min: 31779.390012499305,
        },
        [
          row("tdb", "input", 10, PHS_LIMITS["7933-2023"].tdb),
          row("pa", "derived", 415.46118881403856, PHS_LIMITS["7933-2023"].pa),
        ],
      );
    });

    // Upstream reads limit_inputs with `if limit_inputs:` (:423) and does not
    // validate it. JavaScript's truth value differs from Python's on NaN, []
    // and {} (ADR 0001 as amended): upstream masks for NaN and computes for
    // [] and {}.
    test.each([
      { label: '"false"', value: "false", masked: true },
      { label: "0", value: 0, masked: false },
      { label: "null", value: null, masked: false },
      { label: '""', value: "", masked: false },
      { label: "NaN (Python masks)", value: NaN, masked: false },
      { label: "[] (Python computes)", value: [], masked: true },
    ])("limit_inputs $label", ({ value, masked }) => {
      const result = phs({
        ...base,
        tdb: 10,
        limit_inputs: value,
        round_output: false,
      } as unknown as PhsParams);
      expect(Number.isNaN(result.t_re)).toBe(masked);
    });
  });

  // Upstream reports each bound a call breaks with a UserWarning under
  // limit_inputs (models/phs.py:423-436); the library reports it as a
  // `warnings` row whatever limit_inputs is (ADR 0001 as amended), keyed and
  // in units as ADR 0011 as amended keys them: `tr - tdb` is
  // `tr_minus_tdb`, p_a is `pa` in Pa, and met in W/m2 is `met_w_m2`. Each
  // row carries the frozen bound of the call's edition. Every value is the
  // one upstream's UserWarning reports (p_a times 1000).
  describe("warnings rows", () => {
    const all_out = {
      tdb: 55,
      tr: 120,
      v: 3.5,
      rh: 60,
      met: 8,
      clo: 1.2,
      posture: "standing",
      round_output: false,
    } as const;
    const all_out_rows = (
      standard: NonNullable<PhsParams["standard"]>,
      pa: number,
    ) => {
      const limits = PHS_LIMITS[standard];
      return [
        row("tdb", "input", 55, limits.tdb),
        row("tr_minus_tdb", "derived", 65, limits.tr_minus_tdb),
        row("v", "input", 3.5, limits.v),
        row("pa", "derived", pa, limits.pa),
        row("met_w_m2", "derived", 465.2, limits.met_w_m2),
        row("clo", "input", 1.2, limits.clo),
      ];
    };

    test.each<[NonNullable<PhsParams["standard"]>, number]>([
      ["7933-2004", 9455.824165945343],
      ["7933-2023", 9442.96243288389],
    ])(
      "every bound broken under %s: six rows, in upstream's order, and NaN",
      (standard, pa) => {
        const result = phs({ ...all_out, standard });
        expect(result).toEqual({
          ...MASKED,
          warnings: all_out_rows(standard, pa),
        });
      },
    );

    test.each<[NonNullable<PhsParams["standard"]>, number, PhsFields]>([
      [
        "7933-2004",
        9455.824165945343,
        {
          t_re: 85.8084648881509,
          t_sk: 65.86856577658106,
          t_cr: 84.96351117389136,
          t_cr_eq: 38.27471999999996,
          t_sk_t_cr_wg: 0.1,
          d_lim_loss_50: 251.0,
          d_lim_loss_95: 171.0,
          d_lim_t_re: 8.0,
          sweat_loss_g: 10978.42479735153,
          sweat_rate_watt: 499.9999999999995,
          evap_load_wm2_min: 229154.05822323557,
        },
      ],
      [
        "7933-2023",
        9442.96243288389,
        {
          t_re: 82.3912498175909,
          t_sk: 64.12313329550734,
          t_cr: 81.59339827850872,
          t_cr_eq: 38.27471999999996,
          t_sk_t_cr_wg: 0.1,
          d_lim_loss_50: 171.0,
          d_lim_loss_95: 171.0,
          d_lim_t_re: 9.0,
          sweat_loss_g: 10980.457043688226,
          sweat_rate_watt: 499.9999999999995,
          evap_load_wm2_min: 229196.4775597032,
        },
      ],
    ])(
      "limit_inputs false under %s computes and still reports the six rows",
      (standard, pa, expected) => {
        expectNear(
          phs({ ...all_out, standard, limit_inputs: false }),
          expected,
          all_out_rows(standard, pa),
        );
      },
    );

    test("rounding leaves the rows' values unrounded", () => {
      const result = phs({
        ...all_out,
        standard: "7933-2023",
        limit_inputs: false,
        round_output: true,
      });
      expect(result).toEqual({
        t_re: 82.4,
        t_sk: 64.1,
        t_cr: 81.6,
        t_cr_eq: 38.3,
        t_sk_t_cr_wg: 0.1,
        d_lim_loss_50: 171.0,
        d_lim_loss_95: 171.0,
        d_lim_t_re: 9.0,
        sweat_loss_g: 10980.5,
        sweat_rate_watt: 500.0,
        evap_load_wm2_min: 229196.5,
        warnings: all_out_rows("7933-2023", 9442.96243288389),
      });
    });

    // pa's lower bound is 0 under 7933-2004 and 500 Pa under 7933-2023.
    test("pa 116.9 Pa: no row under 7933-2004, a row under 7933-2023", () => {
      const params = {
        tdb: 20,
        tr: 20,
        rh: 5,
        v: 0.3,
        met: 2.5,
        clo: 0.5,
        posture: "standing",
        round_output: false,
      } as const;
      expect(phs({ ...params, standard: "7933-2004" }).warnings).toEqual([]);
      expect(phs({ ...params, standard: "7933-2023" })).toEqual({
        ...MASKED,
        warnings: [
          row("pa", "derived", 116.85664013598608, PHS_LIMITS["7933-2023"].pa),
        ],
      });
    });

    // met_w_m2's range is 100 to 450 W/m2 under 7933-2004 and 56 to 250
    // under 7933-2023 (test_applicability_limit_metabolic_rate_is_standard_specific's
    // inputs).
    test("met 1.5 (87.225 W/m2): a row under 7933-2004, none under 7933-2023", () => {
      const params = {
        tdb: 30,
        tr: 40,
        rh: 50,
        v: 0.5,
        met: 1.5,
        clo: 0.5,
        posture: "standing",
        round_output: false,
      } as const;
      expect(phs({ ...params, standard: "7933-2004" })).toEqual({
        ...MASKED,
        warnings: [
          row("met_w_m2", "derived", 87.225, PHS_LIMITS["7933-2004"].met_w_m2),
        ],
      });
      expectNear(phs({ ...params, standard: "7933-2023" }), {
        t_re: 37.2046258316173,
        t_sk: 34.434423734280266,
        t_cr: 37.152737940816586,
        t_cr_eq: 36.914009999999976,
        t_sk_t_cr_wg: 0.268253585326507,
        d_lim_loss_50: 480.0,
        d_lim_loss_95: 480.0,
        d_lim_t_re: 480.0,
        sweat_loss_g: 2023.5727107736407,
        sweat_rate_watt: 84.47050075851328,
        evap_load_wm2_min: 42238.29076967766,
      });
    });
  });

  // ADR 0011 as amended (D1, D2): one frozen bound per edition for pa and
  // met_w_m2, and one shared frozen bound for tdb, tr_minus_tdb, v and clo.
  describe("PHS_LIMITS", () => {
    test("upstream's bounds per edition, pa in Pa (models/phs.py:429-436)", () => {
      expect(PHS_LIMITS).toEqual({
        "7933-2004": {
          tdb: { min: 15, max: 50 },
          tr_minus_tdb: { min: 0, max: 60 },
          v: { min: 0, max: 3 },
          pa: { min: 0, max: 4500 },
          met_w_m2: { min: 100, max: 450 },
          clo: { min: 0.1, max: 1 },
        },
        "7933-2023": {
          tdb: { min: 15, max: 50 },
          tr_minus_tdb: { min: 0, max: 60 },
          v: { min: 0, max: 3 },
          pa: { min: 500, max: 4500 },
          met_w_m2: { min: 56, max: 250 },
          clo: { min: 0.1, max: 1 },
        },
      });
    });

    test("the bounds both editions share are one object", () => {
      for (const key of ["tdb", "tr_minus_tdb", "v", "clo"] as const) {
        expect(PHS_LIMITS["7933-2004"][key]).toBe(PHS_LIMITS["7933-2023"][key]);
      }
    });

    test("is deep-frozen", () => {
      expect(Object.isFrozen(PHS_LIMITS)).toBe(true);
      for (const limits of Object.values(PHS_LIMITS)) {
        expect(Object.isFrozen(limits)).toBe(true);
        for (const bound of Object.values(limits)) {
          expect(Object.isFrozen(bound)).toBe(true);
        }
      }
    });

    test("PHS_INFO references the 7933-2023 bounds", () => {
      const limits = PHS_LIMITS["7933-2023"];
      expect(PHS_INFO.inputs.tdb.applicability).toBe(limits.tdb);
      expect(PHS_INFO.inputs.v.applicability).toBe(limits.v);
      expect(PHS_INFO.inputs.clo.applicability).toBe(limits.clo);
      expect(PHS_INFO.derived!.tr_minus_tdb.applicability).toBe(
        limits.tr_minus_tdb,
      );
      expect(PHS_INFO.derived!.pa.applicability).toBe(limits.pa);
      expect(PHS_INFO.derived!.met_w_m2.applicability).toBe(limits.met_w_m2);
    });
  });

  describe("other keys as upstream reads them", () => {
    // `int(acclimatized)` (:300) truncates before the check.
    test.each([
      [100.7, 100],
      [0.5, 0],
      [-0.5, 0],
    ])("acclimatized %p computes as %p", (value, as) => {
      const params = {
        ...base,
        round_output: false,
        standard: "7933-2004",
      } as const;
      expect(
        phs({ ...params, acclimatized: value } as unknown as PhsParams),
      ).toEqual(phs({ ...params, acclimatized: as as 0 | 100 }));
    });

    test("acclimatized 0.5 computes as 0 under 7933-2004", () => {
      expectNear(
        phs({
          ...base,
          acclimatized: 0.5,
          round_output: false,
          standard: "7933-2004",
        } as unknown as PhsParams),
        {
          t_re: 37.75159440704389,
          t_sk: 35.40205537210998,
          t_cr: 37.69019225493536,
          t_cr_eq: 37.123349999999995,
          t_sk_t_cr_wg: 0.21990445184490162,
          d_lim_loss_50: 465.0,
          d_lim_loss_95: 315.0,
          d_lim_t_re: 480.0,
          sweat_loss_g: 5813.508601759903,
          sweat_rate_watt: 249.99999999999974,
          evap_load_wm2_min: 121346.1050377966,
        },
      );
    });

    // range(1, duration + 1) runs the integer part of a fractional duration
    // (:692), and a d_lim not reached is the duration as given (:810-815).
    test("duration 2.7 runs two minutes and reports 2.7", () => {
      expectNear(
        phs({
          ...base,
          duration: 2.7,
          round_output: false,
          standard: "7933-2004",
        }),
        {
          t_re: 36.84199260468365,
          t_sk: 34.48723433982804,
          t_cr: 36.87998019444064,
          t_cr_eq: 36.858613410992234,
          t_sk_t_cr_wg: 0.292868323530044,
          d_lim_loss_50: 2.7,
          d_lim_loss_95: 2.7,
          d_lim_t_re: 2.7,
          sweat_loss_g: 3.123903413978448,
          sweat_rate_watt: 30.46851365488648,
          evap_load_wm2_min: 65.20563359720575,
        },
      );
    });

    test("duration -5 runs no minute", () => {
      expect(phs({ ...base, duration: -5, round_output: false })).toEqual({
        t_re: 36.8,
        t_sk: 34.1,
        t_cr: 36.8,
        t_cr_eq: 36.8,
        t_sk_t_cr_wg: 0.3,
        d_lim_loss_50: -5.0,
        d_lim_loss_95: -5.0,
        d_lim_t_re: -5.0,
        sweat_loss_g: 0.0,
        sweat_rate_watt: 0.0,
        evap_load_wm2_min: 0.0,
        warnings: [],
      });
    });

    test("weight 1000 kg computes", () => {
      expectNear(
        phs({
          ...base,
          weight: 1000,
          round_output: false,
          standard: "7933-2004",
        }),
        {
          t_re: 37.089051101041775,
          t_sk: 35.04571770584619,
          t_cr: 37.039359130121994,
          t_cr_eq: 37.123349999999995,
          t_sk_t_cr_wg: 0.27845767828902024,
          d_lim_loss_50: 480.0,
          d_lim_loss_95: 480.0,
          d_lim_t_re: 480.0,
          sweat_loss_g: 18257.844530703227,
          sweat_rate_watt: 269.18274244764854,
          evap_load_wm2_min: 126747.10926776587,
        },
      );
    });

    // Upstream compares drink with `in [0, 1]` (:304), so 1.0 and -0.0 pass.
    test.each([1.0, -0])("drink %p is accepted", (drink) => {
      expect(
        phs({ ...base, drink } as unknown as PhsParams).t_re,
      ).not.toBeNaN();
    });

    // t_sk_t_cr_wg, sweat_rate_watt and evap_load_wm2_min at their bounds
    // (:287-292).
    test.each([
      { t_sk_t_cr_wg: 0 },
      { t_sk_t_cr_wg: 1 },
      { sweat_rate_watt: 0 },
      { evap_load_wm2_min: 0 },
    ])("%p is accepted", (extra) => {
      expect(phs({ ...base, ...extra }).t_re).not.toBeNaN();
    });
  });

  describe("errors", () => {
    // Upstream's messages at its own raise sites (ADR 0012 as amended).
    test.each<[Record<string, unknown>, ErrorConstructor, string]>([
      [{ acclimatized: 99.9 }, Error, "Acclimatized should be 0 or 100"],
      [{ acclimatized: 50 }, Error, "Acclimatized should be 0 or 100"],
      [{ drink: 0.5 }, Error, "Drink should be 0 or 1"],
      [
        { weight: 1000.0001 },
        RangeError,
        "The weight of the person should be in kg and it cannot exceed 1000",
      ],
      [
        { weight: -1 },
        RangeError,
        "The weight of the person should be in kg and it cannot exceed 1000",
      ],
      [
        { t_sk_t_cr_wg: 1.0000001 },
        RangeError,
        "t_sk_t_cr_wg must be within [0, 1]",
      ],
      [
        { t_sk_t_cr_wg: -1e-12 },
        RangeError,
        "t_sk_t_cr_wg must be within [0, 1]",
      ],
      [{ sweat_rate_watt: -1e-12 }, RangeError, "sweat_rate_watt must be >= 0"],
      [
        { evap_load_wm2_min: -1e-12 },
        RangeError,
        "evap_load_wm2_min must be >= 0",
      ],
      [
        { standard: "7933-2023 " },
        Error,
        "Model '7933-2023 ' is not supported. Supported models are: 7933-2004 and 7933-2023.",
      ],
      [
        { standard: "7730-2025" },
        Error,
        "Model '7730-2025' is not supported. Supported models are: 7933-2004 and 7933-2023.",
      ],
    ])("%p throws a %p", (extra, cls, message) => {
      expect(() => phs({ ...base, ...extra } as unknown as PhsParams)).toThrow(
        cls,
      );
      expect(() => phs({ ...base, ...extra } as unknown as PhsParams)).toThrow(
        message,
      );
    });

    // Upstream's scalar kernel raises ZeroDivisionError("division by zero")
    // at a zero divisor (pythermalcomfort 4.6.2 with numba's prange made a
    // range, so the kernel's exception is not dropped); phs then returns
    // whatever np.empty_like held (models/phs.py:862-876). The library throws
    // the class the raise maps to (ADR 0012 as amended,
    // .scratch/v2-models/wave-2/decisions.md D3 (ii)).
    test.each<[string, Partial<PhsParams>]>([
      ["i_mst 0 (im_dyn, :654)", { i_mst: 0 }],
      ["height 0 (a_dubois, :560)", { height: 0 }],
      ["height 0 under 7933-2004", { height: 0, standard: "7933-2004" }],
      [
        "clo 0 with limit_inputs false (i_cl_dyn, :727)",
        { clo: 0, limit_inputs: false },
      ],
      [
        "clo 0 with limit_inputs false under 7933-2004",
        { clo: 0, limit_inputs: false, standard: "7933-2004" },
      ],
      [
        "clo -1 / 0.28 with limit_inputs false (fcl, :614)",
        { clo: -3.571428571428571, limit_inputs: false },
      ],
      [
        "clo -1 / 0.3 with limit_inputs false under 7933-2004",
        {
          clo: -3.3333333333333335,
          limit_inputs: false,
          standard: "7933-2004",
        },
      ],
      [
        "tr 1e17 with limit_inputs false (t_cl - tr, :726)",
        { tr: 1e17, limit_inputs: false },
      ],
    ])("%s throws RangeError('division by zero')", (_, extra) => {
      const call = () => phs({ ...base, duration: 30, ...extra } as PhsParams);
      expect(call).toThrow(RangeError);
      expect(call).toThrow(new RangeError("division by zero"));
    });

    // Upstream's t_cl and t_cr loops are `while True` (models/phs.py:724,
    // :779). The library caps each at 1000 iterations and throws upstream's
    // capped loops' message (ADR 0015). At weight 1e-9 kg under 7933-2004
    // upstream returns t_re 2373433.2 °C, a non-physical value; at height -1
    // neither side returns.
    test.each<[string, Partial<PhsParams>]>([
      ["weight 1e-9 under 7933-2004", { weight: 1e-9, standard: "7933-2004" }],
      ["height -1", { height: -1 }],
      ["height -1 under 7933-2004", { height: -1, standard: "7933-2004" }],
    ])("%s throws Error('Max iterations exceeded')", (_, extra) => {
      const call = () => phs({ ...base, duration: 30, ...extra } as PhsParams);
      expect(call).toThrow(new Error("Max iterations exceeded"));
    });

    // PHSInputs checks posture in any case (classes_input.py:180-183), and
    // _posture_to_code then compares the exact string (models/phs.py:500-510).
    test.each(["Standing", "STANDING", null])(
      "posture %p throws upstream's exact-match Error",
      (posture) => {
        expect(() => phs({ ...base, posture } as unknown as PhsParams)).toThrow(
          "Posture has to be either 'standing', 'sitting', or 'crouching'.",
        );
      },
    );

    test.each(["invalid", "", 1, true])(
      "posture %p throws upstream's choice Error",
      (posture) => {
        expect(() => phs({ ...base, posture } as unknown as PhsParams)).toThrow(
          "posture must be one of ['sitting', 'standing', 'crouching']",
        );
      },
    );

    // posture is a required argument upstream (models/phs.py:15-23), so a
    // call without it raises TypeError "phs() missing 1 required positional
    // argument: 'posture'" (pythermalcomfort 4.6.2).
    test.each([
      ["missing", (({ posture: _, ...rest }) => rest)(base)],
      ["undefined", { ...base, posture: undefined }],
    ])("posture %s throws a TypeError", (_, params) => {
      expect(() => phs(params as unknown as PhsParams)).toThrow(
        new TypeError('Parameter "posture" must be a string'),
      );
    });

    // ADR 0005 as amended: posture takes one string, where upstream broadcasts
    // the list.
    test("posture ['standing'] throws a TypeError", () => {
      expect(() =>
        phs({ ...base, posture: ["standing"] } as unknown as PhsParams),
      ).toThrow(TypeError);
    });

    // PHSInputs raises a TypeError for a non-boolean round_output
    // (classes_input.py:123-129).
    test.each([1, 0, "true", null])(
      "round_output %p throws a TypeError",
      (round_output) => {
        expect(() =>
          phs({ ...base, round_output } as unknown as PhsParams),
        ).toThrow(TypeError);
      },
    );

    // ADR 0003 and ADR 0008: upstream's `model` is `standard` here, and an
    // unknown key throws, where upstream's **kwargs ignores one.
    test.each(["model", "foo"])(
      "the key %p throws a TypeError naming it",
      (key) => {
        expect(() =>
          phs({ ...base, [key]: "7933-2004" } as unknown as PhsParams),
        ).toThrow(new TypeError(`phs got an unexpected key: '${key}'`));
      },
    );

    // ADR 0002: a positional call fails instead of running as defaults.
    test("a positional call throws a TypeError", () => {
      const call = phs as unknown as (...args: unknown[]) => unknown;
      expect(() => call(40, 40, 0.3, 33.85, 2.5, 0.5, "standing")).toThrow(
        TypeError,
      );
    });

    const numbers = [
      "tdb",
      "tr",
      "v",
      "rh",
      "met",
      "clo",
      "wme",
      "i_mst",
      "a_p",
      "drink",
      "weight",
      "height",
      "walk_sp",
      "theta",
      "acclimatized",
      "duration",
      "f_r",
      "t_sk",
      "t_cr",
      "t_re",
      "t_cr_eq",
      "t_sk_t_cr_wg",
      "sweat_rate_watt",
      "evap_load_wm2_min",
    ];

    test.each(numbers)("a string %s throws a TypeError", (key) => {
      expect(() =>
        phs({ ...base, [key]: "1" } as unknown as PhsParams),
      ).toThrow(TypeError);
    });

    // ADR 0001: a public model throws a TypeError for a non-finite number.
    test.each(
      numbers.flatMap((key) =>
        [NaN, Infinity, -Infinity].map((value) => [key, value] as const),
      ),
    )("%s %p throws a TypeError", (key, value) => {
      expect(() =>
        phs({ ...base, [key]: value } as unknown as PhsParams),
      ).toThrow(TypeError);
    });

    // ADR 0005 as amended: upstream reads True and False as 1 and 0, and an
    // explicit None t_re or t_cr_eq as t_cr.
    test.each(numbers)("a boolean %s throws a TypeError", (key) => {
      expect(() =>
        phs({ ...base, [key]: true } as unknown as PhsParams),
      ).toThrow(TypeError);
    });

    test.each(numbers)("a null %s throws a TypeError", (key) => {
      expect(() =>
        phs({ ...base, [key]: null } as unknown as PhsParams),
      ).toThrow(TypeError);
    });

    // ADR 0005: quantities are numbers; upstream broadcasts the list.
    test("an array throws a TypeError", () => {
      expect(() =>
        phs({ ...base, tdb: [40, 45] } as unknown as PhsParams),
      ).toThrow(TypeError);
    });
  });
});

import { describe, expect, test } from "vitest";
import { phs } from "../../src/models/index.ts";
import { met_to_w_m2 } from "../../src/utilities/met_to_w_m2.ts";
import { testDataUrls } from "./comftest.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof phs>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.phs,
);

const weight = 75;
const height = 1.8;
const a_dubois = 0.202 * weight ** 0.425 * height ** 0.725;

// Mirrors pythermalcomfort v4.7.0 tests/test_phs.py. A `pytest.raises(ValueError)`
// becomes a throw of the class the library maps that case to, a RangeError.
describe("test_phs", () => {
  test.each(reference_table.data)("test_phs: fixture case %#", (entry) => {
    const inputs = { ...entry.inputs, standard: "7933-2004" };
    const outputs = entry.outputs;
    const result = phs(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  const standard_2023: [
    string,
    Record<string, unknown>,
    Record<string, number>,
  ][] = [
    [
      "0",
      {
        tdb: 40,
        tr: 40,
        rh: 35,
        v: 0.3,
        met: 300 / met_to_w_m2 / a_dubois,
        clo: 0.5,
        posture: "standing",
        wme: 0,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 100,
        round_output: false,
      },
      { sweat_loss_g: 6538, t_cr: 37.6, d_lim_loss_95: 280 },
    ],
    [
      "1",
      {
        tdb: 35,
        tr: 35,
        rh: 60,
        v: 0.1,
        met: 300 / met_to_w_m2 / a_dubois,
        clo: 0.5,
        posture: "standing",
        wme: 0,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 0,
        round_output: false,
      },
      { sweat_loss_g: 6345, t_cr: 40.8, d_lim_loss_95: 250, d_lim_t_re: 62 },
    ],
    [
      "3",
      {
        tdb: 30,
        tr: 30,
        rh: 45,
        v: 1.0,
        met: 450 / met_to_w_m2 / a_dubois,
        clo: 0.5,
        posture: "standing",
        wme: 0,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 0,
        round_output: false,
      },
      { sweat_loss_g: 4593, t_cr: 38.0, d_lim_loss_95: 400 },
    ],
    [
      "4",
      {
        tdb: 35,
        tr: 74.6,
        rh: 30,
        v: 1.0,
        met: 250 / met_to_w_m2 / a_dubois,
        clo: 1,
        posture: "sitting",
        wme: 0,
        a_p: 0.2,
        f_r: 0.85,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 100,
        round_output: false,
      },
      { sweat_loss_g: 5813, t_cr: 37.5, d_lim_loss_95: 310 },
    ],
    // The array-input case, element by element.
    ...[0, 1].map(
      (i): [string, Record<string, unknown>, Record<string, number>] => [
        `array-input[${String(i)}]`,
        {
          tdb: [35, 35][i],
          tr: 74.6,
          rh: 30,
          v: 1.0,
          met: 250 / met_to_w_m2 / a_dubois,
          clo: 1,
          posture: ["sitting", "sitting"][i],
          wme: 0,
          a_p: 0.2,
          f_r: 0.85,
          standard: "7933-2023",
          duration: 480,
          limit_inputs: false,
          acclimatized: 100,
          round_output: false,
        },
        {
          sweat_loss_g: [5813, 5813][i] ?? NaN,
          t_cr: [37.5, 37.5][i] ?? NaN,
          d_lim_loss_95: [310, 310][i] ?? NaN,
        },
      ],
    ),
  ];

  function check_2023(
    inputs: Record<string, unknown>,
    expected: Record<string, number>,
  ) {
    const result = phs(inputs as unknown as Inputs);
    expect(
      approx(result.sweat_loss_g, expected.sweat_loss_g ?? NaN, {
        rel: 0.025,
        abs: 0,
      }),
    ).toBe(true);
    expect(approx(result.t_cr, expected.t_cr ?? NaN, { abs: 0.3 })).toBe(true);
    expect(
      approx(result.d_lim_loss_95, expected.d_lim_loss_95 ?? NaN, { abs: 10 }),
    ).toBe(true);
    if (expected.d_lim_t_re !== undefined) {
      expect(approx(result.d_lim_t_re, expected.d_lim_t_re, { abs: 10 })).toBe(
        true,
      );
    }
  }

  test.each(standard_2023)("test_2023_standard[%s]", (_, inputs, expected) => {
    check_2023(inputs, expected);
  });

  // pytest.mark.xfail(reason="Known discrepancy t_cr and d_lim_t_re", strict=True)
  test.fails("test_2023_standard[high-radiant-temp]", () => {
    check_2023(
      {
        tdb: 30,
        tr: 54.2,
        rh: 35,
        v: 0.1,
        met: 300 / met_to_w_m2 / a_dubois,
        clo: 0.8,
        posture: "standing",
        wme: 0,
        a_p: 0.3,
        f_r: 0.85,
        standard: "7933-2023",
        duration: 480,
        limit_inputs: false,
        acclimatized: 0,
        round_output: false,
      },
      { sweat_loss_g: 6419, t_cr: 38.7, d_lim_loss_95: 280, d_lim_t_re: 149 },
    );
  });

  const base = {
    tdb: 40,
    tr: 40,
    rh: 33.85,
    v: 0.3,
    met: 2.58,
    clo: 0.5,
    posture: "standing" as const,
  };

  test("test_value_acclimatized", () => {
    expect(() => phs({ ...base, acclimatized: 101 })).toThrow(RangeError);
    expect(() => phs({ ...base, acclimatized: -1 })).toThrow(RangeError);
  });

  test("test_value_weight", () => {
    expect(() => phs({ ...base, weight: 1001 })).toThrow(RangeError);
    expect(() => phs({ ...base, weight: 0 })).toThrow(RangeError);
  });

  test("test_value_drink", () => {
    expect(() => phs({ ...base, drink: 0.5 })).toThrow(RangeError);
    expect(() => phs({ ...base, drink: 2 })).toThrow(RangeError);
  });

  test.each(["7933-2004", "7933-2023"])(
    "test_applicability_limit_is_on_tr_minus_tdb_not_tr[%s]",
    (model) => {
      const result = phs({
        tdb: 40,
        tr: 10,
        rh: 50,
        v: 0.5,
        met: 2.0,
        clo: 0.5,
        posture: "standing",
        standard: model,
        round_output: false,
      } as unknown as Inputs);
      expect(result.t_cr).toBeNaN();
    },
  );

  test("test_applicability_limit_metabolic_rate_is_standard_specific", () => {
    const kwargs = {
      tdb: 30,
      tr: 40,
      rh: 50,
      v: 0.5,
      met: 1.5,
      clo: 0.5,
      posture: "standing" as const,
      round_output: false,
    };
    expect(phs({ standard: "7933-2023", ...kwargs }).t_cr).not.toBeNaN();
    expect(phs({ standard: "7933-2004", ...kwargs }).t_cr).toBeNaN();
  });

  test("test_2023_forces_skin_temperature_to_equilibrium_on_minute_one", () => {
    const kwargs = {
      tdb: 40,
      tr: 40,
      rh: 35,
      v: 0.3,
      met: 2.58,
      clo: 0.5,
      posture: "standing" as const,
      wme: 0,
      duration: 1,
      limit_inputs: false,
      round_output: false,
      t_sk: 20.0,
    };
    const result_2023 = phs({ standard: "7933-2023", ...kwargs });
    const result_2004 = phs({ standard: "7933-2004", ...kwargs });
    expect(result_2023.t_sk).toBeGreaterThan(30);
    expect(result_2004.t_sk).toBeLessThan(result_2023.t_sk);
  });
});

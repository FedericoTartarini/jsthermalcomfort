import { describe, expect, jest, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { JOS3, jos3_functions, pmv_ppd_iso } from "../../src/index.js";
import type { JOS3Output } from "../../src/models/jos3.ts";

const { construction, matrix, parameters, thermoregulation } = jos3_functions;
const {
  bfb_rate,
  capacity,
  conductance,
  local_bsa,
  validate_body_parameters,
  weight_rate,
} = construction;
const {
  IDICT,
  LAYER_NAMES,
  NUM_NODES,
  index_by_layer,
  index_order,
  local_arr,
  valid_index_by_layer,
  vessel_blood_flow,
} = matrix;
const { Default } = parameters;
const {
  ava_blood_flow,
  basal_met,
  clo_area_factor,
  conv_coef,
  dry_r,
  error_signals,
  evaporation,
  fixed_hc,
  fixed_hr,
  local_mbase,
  local_q_work,
  nonshivering,
  operative_temp,
  rad_coef,
  resp_heat_loss,
  shivering,
  skin_blood_flow,
  sum_bf,
  wet_r,
} = thermoregulation;

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
// What pythermalcomfort 4.6.2 returns for the calls below
// (gen_test_values.py in the ticket 25 scratchpad).
const up = load("./jos3_v4.6.2.json");

const BODY_NAMES = new JOS3().body_names;
const ones = (n: number, value = 1) => new Array<number>(n).fill(value);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const sum = (a: readonly number[]) => a.reduce((t, x) => t + x, 0);
// np.average(a, weights=w)
const average = (a: readonly number[], w: readonly number[]) =>
  sum(a.map((x, i) => x * w[i])) / sum(w);
// np.isclose's default tolerances: |a - b| <= 1e-8 + 1e-5 * |b|
const isclose = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-8 + 1e-5 * Math.abs(b);
const allclose = (
  a: number | readonly number[],
  b: number | readonly number[],
) => {
  const xs = typeof a === "number" ? [a] : a;
  const ys = typeof b === "number" ? xs.map(() => b) : b;
  expect(xs.length).toBe(ys.length);
  xs.forEach((x, i) => expect(isclose(x, ys[i])).toBe(true));
};
// The error a call throws, checked for its exact class and message: upstream's
// exception mapped as ADR 0012 maps it, with upstream's message.
const expect_throw = (
  f: () => unknown,
  cls: new (message?: string) => Error,
  message: string,
) => {
  let error: unknown = undefined;
  try {
    f();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).constructor).toBe(cls);
  expect((error as Error).message).toBe(message);
};
// pytest.approx(expected, rel)
const approx = (actual: number, expected: number, rel = 1e-6) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    Math.max(rel * Math.abs(expected), 1e-12),
  );

// Mirrors pythermalcomfort v4.6.2 tests/test_jos3.py.
describe("test_jos3", () => {
  test.each([
    [0.9, 29.599326],
    [0.85, 29.992688],
    [0.846, 30.024176],
    [0.8, 30.385882],
    [0.79, 30.464226],
    [0.6, 31.956085],
  ])(
    "test_neutral_temperature_for_low_metabolic_rates: met %p",
    (met, expected_to) => {
      // ISO comfort limits must not truncate JOS3's internal neutral search (#435).
      const model = new JOS3();
      const to = model._calculate_operative_temp_when_pmv_is_zero(
        0.1,
        50,
        met,
        0,
      );
      expect(Math.abs(to - expected_to)).toBeLessThanOrEqual(0.05);
      const residual = pmv_ppd_iso({
        tdb: to,
        tr: to,
        vr: 0.1,
        rh: 50,
        met,
        clo: 0,
        limit_inputs: false,
        round_output: false,
      }).pmv;
      expect(Math.abs(residual)).toBeLessThanOrEqual(0.01);
    },
  );

  test.each([69.5, 70, 80])(
    "test_low_metabolic_rate_set_points_are_finite: weight %p",
    (weight) => {
      const model = new JOS3({
        height: 1.6,
        weight,
        age: 80,
        sex: "female",
        bmr_equation: "japanese",
      });
      expect(model.cr_set_point.every(Number.isFinite)).toBe(true);
      expect(model.sk_set_point.every(Number.isFinite)).toBe(true);
    },
  );

  test("test_set_points_are_continuous_across_pmv_temperature_limit", () => {
    const params = {
      height: 1.6,
      age: 80,
      sex: "female",
      bmr_equation: "japanese",
    } as const;
    const lighter = new JOS3({ weight: 69.5, ...params });
    const heavier = new JOS3({ weight: 70, ...params });
    expect(
      Math.abs(heavier.cr_set_point[2] - lighter.cr_set_point[2]),
    ).toBeLessThan(0.1);
  });

  test("test_low_metabolic_rate_simulation_stays_finite", () => {
    const model = new JOS3({
      height: 1.6,
      weight: 80,
      age: 80,
      sex: "female",
      bmr_equation: "japanese",
    });
    model.to = 28;
    model.rh = 50;
    model.v = 0.1;
    model.clo = 0.5;
    model.par = 1.25;
    model.simulate(120, 60);
    const results = model.dict_results()!;
    for (const key of ["t_skin_mean", "t_core_chest", "t_skin_chest"]) {
      expect(results[key].every((x) => Number.isFinite(x))).toBe(true);
      expect(results[key]).toHaveLength(121);
    }
  });

  test("test_public_pmv_still_rejects_out_of_domain_neutral_conditions", () => {
    // pytest.warns(UserWarning) becomes the warnings rows (testUtils.ts).
    const result = pmv_ppd_iso({
      tdb: 30.5,
      tr: 30.5,
      vr: 0.1,
      rh: 50,
      met: 0.79,
      clo: 0,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.pmv).toBeNaN();
    expect(result.ppd).toBeNaN();
  });

  test("test_jos3_class", () => {
    // Test for the initialization of JOS3 class
    let model = new JOS3();
    expect(model).toBeInstanceOf(JOS3);

    // Test for the methods of JOS3 class
    model = new JOS3();
    model.simulate(60);

    // Test the reset_setpt method
    const result = model._reset_setpt();
    expect(result).toHaveProperty("t_core");
    expect(result).toHaveProperty("t_skin");
    // Check if the attributes of the JOS3 object have been updated as expected
    expect(model.to).not.toBeNull();
    expect(model.rh.every((x) => x === 50)).toBe(true);
    expect(model.v.every((x) => x === 0.1)).toBe(true);
    expect(model.clo.every((x) => x === 0)).toBe(true);
    expect(model.par).toBe(1.25);
    // Check if the new set-point temperatures for core and skin have been set
    expect(model.cr_set_point).toEqual(model.t_core);
    expect(model.sk_set_point).toEqual(model.t_skin);

    // Test: JOS3 class with sex="female"
    model = new JOS3({ sex: "female", bmr_equation: "japanese" });
    model.simulate(60);
    let dict_output = model.dict_results()!;
    expect(dict_output.t_skin_mean.some((x) => Number.isNaN(x))).toBe(false);

    // Test the simulate method with different parameters
    model = new JOS3({ height: 1.7, weight: 60, age: 30 });
    // Set the first phase
    model.to = 28; // Operative temperature [°C]
    model.rh = 40; // Relative humidity [%]
    model.v = 0.2; // Air velocity [m/s]
    model.par = 1.2; // Physical activity ratio [-]
    model.simulate(60); // Exposure time = 60 [min]
    // Set the next condition
    model.to = 20; // Change only operative temperature
    model.simulate(60); // Additional exposure time = 60 [min]
    dict_output = model.dict_results()!;
    // Results to compare: upstream's example csv, pinned in
    // jos3_example1_default_output.json.
    const df_t_skin_mean: number[] = load(
      "./jos3_example1_default_output.json",
    ).t_skin_mean;
    expect(typeof dict_output).toBe("object");
    allclose(dict_output.t_skin_mean as number[], df_t_skin_mean);

    // Call the _run method
    model._run(60000, true);
    expect(typeof model.dict_results()).toBe("object");

    // Test: Check property
    model = new JOS3();
    expect(Array.isArray(model.t_core)).toBe(true);

    // Test with value out of range: a ValueError for a range is a
    // RangeError (ADR 0012)
    expect(() => new JOS3({ weight: 1 })).toThrow(RangeError);
    expect(() => new JOS3({ age: 1 })).toThrow(RangeError);
    expect(() => new JOS3({ height: 0.1 })).toThrow(RangeError);
    expect(() => new JOS3({ fat: 91 })).toThrow(RangeError);
  });

  test("test_body_parameters", () => {
    validate_body_parameters(1.75, 70.0, 30, 15);
    expect(() => validate_body_parameters(0.1, 70.0, 30, 15)).toThrow(
      RangeError,
    );
    expect(() => validate_body_parameters(1.75, 210.0, 30, 15)).toThrow(
      RangeError,
    );
    expect(() => validate_body_parameters(1.75, 210.0, 101, 15)).toThrow(
      RangeError,
    );
    expect(() => validate_body_parameters(1.75, 210.0, 101, 91)).toThrow(
      RangeError,
    );
  });

  test("test_to17array", () => {
    const { to_array_body_parts } = construction;
    expect(to_array_body_parts(5)).toEqual(ones(17, 5));
    expect(to_array_body_parts(5.5)).toEqual(ones(17, 5.5));
    // A list and an ndarray are both an array here.
    expect(to_array_body_parts(range(17))).toEqual(range(17));
    const dict_input = Object.fromEntries(
      BODY_NAMES.map((name, i) => [name, i]),
    ) as Parameters<typeof to_array_body_parts>[0];
    expect(to_array_body_parts(dict_input)).toEqual(range(17));
    // A ValueError not about a range is an Error (ADR 0012).
    expect(() => to_array_body_parts(range(16))).toThrow(
      "The input list or ndarray is not of length 17",
    );
    expect(() =>
      to_array_body_parts("unsupported" as unknown as number),
    ).toThrow(Error);
  });

  test("test_bsa_rate", () => {
    const { bsa_rate } = construction;
    approx(bsa_rate(1.72, 74.43, "dubois"), 1.0, 1e-3);
    expect(typeof bsa_rate(1.8, 80, "dubois")).toBe("number");
    expect(() => bsa_rate(1.72, 74.43, "sushi")).toThrow(Error);
    expect(() =>
      bsa_rate("non-numeric" as unknown as number, 74.43, "dubois"),
    ).toThrow(TypeError);
    expect(() =>
      bsa_rate(1.72, "non-numeric" as unknown as number, "dubois"),
    ).toThrow(TypeError);
  });

  test("test_local_bsa", () => {
    expect(local_bsa(1.72, 74.43, "dubois")).toHaveLength(17);
    expect(local_bsa(1.8, 80, "dubois")).toHaveLength(17);
    expect(() => local_bsa(1.72, 74.43, "unknown")).toThrow(Error);
    expect(() =>
      local_bsa("non-numeric" as unknown as number, 74.43, "dubois"),
    ).toThrow(TypeError);
    expect(() =>
      local_bsa(1.72, "non-numeric" as unknown as number, "dubois"),
    ).toThrow(TypeError);
  });

  test("test_weight_rate", () => {
    approx(weight_rate(74.43), 1.0, 1e-3);
    expect(weight_rate(80.0)).toBe(80.0 / 74.43);
    expect(() => weight_rate("non-numeric" as unknown as number)).toThrow(
      TypeError,
    );
  });

  test("test_bfb_rate", () => {
    expect(typeof bfb_rate(1.72, 74.43, "dubois", 20, 2.59)).toBe("number");
    expect(typeof bfb_rate(1.8, 80, "dubois", 30, 2.7)).toBe("number");
    const result_young = bfb_rate(1.72, 74.43, "dubois", 40, 2.59);
    const result_old = bfb_rate(1.72, 74.43, "dubois", 60, 2.59);
    expect(result_old).toBeLessThan(result_young);
    expect(() => bfb_rate(1.72, 74.43, "unknown", 20, 2.59)).toThrow(Error);
    const bad = "non-numeric" as unknown as number;
    expect(() => bfb_rate(bad, 74.43, "dubois", 20, 2.59)).toThrow(TypeError);
    expect(() => bfb_rate(1.72, bad, "dubois", 20, 2.59)).toThrow(TypeError);
    expect(() => bfb_rate(1.72, 74.43, "dubois", bad, 2.59)).toThrow(TypeError);
    expect(() => bfb_rate(1.72, 74.43, "dubois", 20, bad)).toThrow(TypeError);
  });

  test("test_conductance", () => {
    expect(Array.isArray(conductance(1.72, 74.43, "dubois", 15.0))).toBe(true);
    expect(Array.isArray(conductance(1.8, 80, "dubois", 20.0))).toBe(true);
    const result_low_fat = conductance(1.72, 74.43, "dubois", 10.0);
    const result_high_fat = conductance(1.72, 74.43, "dubois", 30.0);
    expect(result_low_fat).not.toEqual(result_high_fat);
    const bad = "non-numeric" as unknown as number;
    expect(() => conductance(bad, 74.43, "dubois", 10.0)).toThrow(TypeError);
    expect(() => conductance(1.72, bad, "dubois", 10.0)).toThrow(TypeError);
    expect(() => conductance(1.72, 74.43, "dubois", bad)).toThrow(TypeError);
  });

  test("test_capacity", () => {
    expect(capacity(1.72, 74.43, "dubois", 20, 2.59)).toHaveLength(NUM_NODES);
    expect(capacity(1.8, 80, "takahira", 25, 3)).toHaveLength(NUM_NODES);
    expect(() => capacity(1.72, 74.43, "invalid_equation", 20, 2.59)).toThrow(
      Error,
    );
  });

  test("test_index_order", () => {
    const [index_dict, order_count] = index_order();
    expect(typeof index_dict).toBe("object");
    expect(Number.isInteger(order_count)).toBe(true);
    for (const key of BODY_NAMES) {
      expect(index_dict).toHaveProperty(key);
      for (const sub_key of LAYER_NAMES) {
        expect(index_dict[key]).toHaveProperty(sub_key);
      }
    }
    expect(index_dict.CB).toBe(0);
    const total_layers = BODY_NAMES.flatMap((bn) =>
      LAYER_NAMES.filter((ln) => index_dict[bn][ln] !== null),
    ).length;
    expect(total_layers + 1).toBe(order_count); // +1 because of the "CB" key
  });

  test("test_index_by_layer", () => {
    const n_nodes =
      BODY_NAMES.flatMap((bn) =>
        LAYER_NAMES.filter((ln) => IDICT[bn][ln] !== null),
      ).length + 1;
    for (const layer of LAYER_NAMES) {
      const indices = index_by_layer(layer);
      expect(Array.isArray(indices)).toBe(true);
      expect(indices).toHaveLength(
        BODY_NAMES.filter((bn) => IDICT[bn][layer] !== null).length,
      );
      for (const index of indices) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(n_nodes);
      }
    }
  });

  test("test_valid_index_by_layer", () => {
    for (const layer of LAYER_NAMES) {
      const indices = valid_index_by_layer(layer);
      expect(indices).toHaveLength(
        BODY_NAMES.filter((bn) => IDICT[bn][layer] !== null).length,
      );
      for (const index of indices) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(BODY_NAMES.length);
      }
    }
    // Upstream raises a KeyError, a TypeError here (ADR 0012 as amended).
    expect_throw(
      () => valid_index_by_layer("non_existent_layer" as "core"),
      TypeError,
      "'non_existent_layer'",
    );
  });

  // rng = np.random.default_rng(1337), drawn in upstream's order and pinned
  // in jos3_v4.6.2.json.
  const rng = up.rng_1337;

  test("test_local_arr", () => {
    const { bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot } =
      rng;
    const result = local_arr(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );
    expect(result).toHaveLength(NUM_NODES);
    result.forEach((row) => expect(row).toHaveLength(NUM_NODES));
    BODY_NAMES.forEach((bn, i) => {
      const index_of = IDICT[bn];
      const at = (a: number | null, b: number | null) =>
        result[a as number][b as number];
      expect(
        isclose(at(index_of.core, index_of.artery), 1.067 * bf_core[i]),
      ).toBe(true);
      expect(
        isclose(at(index_of.skin, index_of.artery), 1.067 * bf_skin[i]),
      ).toBe(true);
      expect(
        isclose(at(index_of.vein, index_of.core), 1.067 * bf_core[i]),
      ).toBe(true);
      expect(
        isclose(at(index_of.vein, index_of.skin), 1.067 * bf_skin[i]),
      ).toBe(true);
      if (index_of.muscle !== null) {
        expect(
          isclose(at(index_of.muscle, index_of.artery), 1.067 * bf_muscle[i]),
        ).toBe(true);
        expect(
          isclose(at(index_of.vein, index_of.muscle), 1.067 * bf_muscle[i]),
        ).toBe(true);
      }
      if (index_of.fat !== null) {
        expect(
          isclose(at(index_of.fat, index_of.artery), 1.067 * bf_fat[i]),
        ).toBe(true);
        expect(
          isclose(at(index_of.vein, index_of.fat), 1.067 * bf_fat[i]),
        ).toBe(true);
      }
      if (i === 7 || i === 10) {
        expect(
          isclose(at(index_of.sfvein, index_of.artery), 1.067 * bf_ava_hand),
        ).toBe(true);
      }
      if (i === 13 || i === 16) {
        expect(
          isclose(at(index_of.sfvein, index_of.artery), 1.067 * bf_ava_foot),
        ).toBe(true);
      }
    });
  });

  test("test_vessel_blood_flow", () => {
    const { bf_core, bf_muscle, bf_fat, bf_skin, bf_ava_hand, bf_ava_foot } =
      rng;
    const [bf_art, bf_vein] = vessel_blood_flow(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );
    expect(bf_art).toHaveLength(17);
    expect(bf_vein).toHaveLength(17);
    const xbf = bf_core.map(
      (x: number, i: number) => x + bf_muscle[i] + bf_fat[i] + bf_skin[i],
    );
    expect(isclose(bf_art[0], xbf[0])).toBe(true);
    expect(isclose(bf_vein[0], xbf[0])).toBe(true);
    expect(isclose(bf_art[1], xbf[1] + xbf[0])).toBe(true);
    expect(isclose(bf_vein[1], xbf[1] + xbf[0])).toBe(true);
    expect(isclose(bf_art[2], xbf[2])).toBe(true);
    expect(isclose(bf_vein[2], xbf[2])).toBe(true);
    expect(isclose(bf_art[3], xbf[3])).toBe(true);
    expect(isclose(bf_vein[3], xbf[3])).toBe(true);
  });

  test("test_conv_coef", () => {
    // Test case 1: Default values
    expect(conv_coef("standing", 0.1, 28.8, 34)).toEqual([
      4.48, 4.48, 2.97, 2.91, 2.85, 3.61, 3.55, 3.67, 3.61, 3.55, 3.67, 2.8,
      2.04, 2.04, 2.8, 2.04, 2.04,
    ]);
    // Test case 2: Sitting posture
    expect(conv_coef("sitting", 0.1, 28.8, 34.0)).toEqual([
      4.75, 4.75, 3.12, 2.48, 1.84, 3.76, 3.62, 2.06, 3.76, 3.62, 2.06, 2.98,
      2.98, 2.62, 2.98, 2.98, 2.62,
    ]);
    // Test case 3: Invalid posture
    expect(() => conv_coef("invalid" as "standing", 0.1, 28.8, 34.0)).toThrow(
      Error,
    );
    // Test case 4: Lying posture with different tdb and t_skin values
    const tdb = ones(17, 28.8);
    const t_skin = ones(17, 34.0);
    const hc_a = [
      1.105, 1.105, 1.211, 1.211, 1.211, 0.913, 2.081, 2.178, 0.913, 2.081,
      2.178, 0.945, 0.385, 0.2, 0.945, 0.385, 0.2,
    ];
    const hc_b = [
      0.345, 0.345, 0.046, 0.046, 0.046, 0.373, 0.85, 0.297, 0.373, 0.85, 0.297,
      0.447, 0.58, 0.966, 0.447, 0.58, 0.966,
    ];
    allclose(
      conv_coef("lying", 0.1, tdb, t_skin),
      hc_a.map((a, i) => a * Math.abs(tdb[i] - t_skin[i]) ** hc_b[i]),
    );
    // Test case 5: Forced convection (v > 0.2)
    const v = ones(17, 0.3);
    const f_a = [
      15.0, 15.0, 11.0, 17.0, 13.0, 17.0, 17.0, 20.0, 17.0, 17.0, 20.0, 14.0,
      15.8, 15.1, 14.0, 15.8, 15.1,
    ];
    const f_b = [
      0.62, 0.62, 0.67, 0.49, 0.6, 0.59, 0.61, 0.6, 0.59, 0.61, 0.6, 0.61, 0.74,
      0.62, 0.61, 0.74, 0.62,
    ];
    allclose(
      conv_coef("standing", v, 28.8, 34.0),
      f_a.map((a, i) => a * v[i] ** f_b[i]),
    );
  });

  test("test_rad_coef", () => {
    const standing = [
      4.89, 4.89, 4.32, 4.09, 4.32, 4.55, 4.43, 4.21, 4.55, 4.43, 4.21, 4.77,
      5.34, 6.14, 4.77, 5.34, 6.14,
    ];
    const sitting = [
      4.96, 4.96, 3.99, 4.64, 4.21, 4.96, 4.21, 4.74, 4.96, 4.21, 4.74, 4.1,
      4.74, 6.36, 4.1, 4.74, 6.36,
    ];
    const lying = [
      5.475, 5.475, 3.463, 3.463, 3.463, 4.249, 4.835, 4.119, 4.249, 4.835,
      4.119, 4.44, 5.547, 6.085, 4.44, 5.547, 6.085,
    ];
    const valid_postures = {
      standing,
      sitting,
      lying,
      sedentary: sitting,
      supine: lying,
    };
    for (const [posture, expected] of Object.entries(valid_postures)) {
      allclose(rad_coef(posture as "standing"), expected);
    }
    for (const posture of ["invalid", "running", "jumping"]) {
      expect(() => rad_coef(posture as "standing")).toThrow(Error);
    }
  });

  test("test_fixed_hc", () => {
    const hc = ones(17, 3);
    const v = ones(17, 0.1);
    const fixed_hc_values = fixed_hc(hc, v);
    expect(fixed_hc_values).toHaveLength(hc.length);
    const mean_hc = average(hc, Default.local_bsa);
    const mean_va = average(v, Default.local_bsa);
    const mean_hc_whole = Math.max(3, 8.600001 * mean_va ** 0.53);
    allclose(
      fixed_hc_values,
      hc.map((h) => (h * mean_hc_whole) / mean_hc),
    );
  });

  test("test_fixed_hr", () => {
    const hr = ones(17, 5);
    const fixed_hr_values = fixed_hr(hr);
    expect(fixed_hr_values).toHaveLength(hr.length);
    const mean_hr = average(hr, Default.local_bsa);
    allclose(
      fixed_hr_values,
      hr.map((h) => (h * 4.7) / mean_hr),
    );
  });

  test("test_operative_temp", () => {
    // Test with scalar inputs
    approx(operative_temp(25.0, 25.0, 3, 5), 25.0);
    // Test with array inputs
    let tdb: number | number[] = [20.0, 22.0, 24.0];
    let tr = [25.0, 27.0, 29.0];
    let hc: number | number[] = [0.5, 0.6, 0.7];
    let hr = [0.5, 0.4, 0.3];
    const expected = (t: number[], r: number[], c: number[], h: number[]) =>
      t.map((_, i) => (c[i] * t[i] + h[i] * r[i]) / (c[i] + h[i]));
    allclose(operative_temp(tdb, tr, hc, hr), expected(tdb, tr, hc, hr));
    // Test with mixed scalar and array inputs
    tdb = 20.0;
    tr = [25.0, 27.0, 29.0];
    hc = 0.5;
    hr = [0.5, 0.4, 0.3];
    allclose(
      operative_temp(tdb, tr, hc, hr),
      expected(ones(3, tdb), tr, ones(3, hc), hr),
    );
  });

  test("test_clo_area_factor", () => {
    approx(clo_area_factor(0.4), 1.08, 1e-3);
    approx(clo_area_factor(0.6), 1.11, 1e-3);
    approx(clo_area_factor(0), 1, 1e-3);
    clo_area_factor([0.4, 0.6, 0.2]).forEach((x, i) =>
      approx(x, [1.08, 1.11, 1.04][i], 1e-3),
    );
  });

  test("test_dry_r", () => {
    approx(dry_r(3, 5, 0.5), 0.191, 1e-3);
    dry_r([3, 3], [5, 5], [0.5, 0.5]).forEach((x) => approx(x, 0.191, 1e-3));
    // A ZeroDivisionError is a RangeError, as is a ValueError for a range
    // (ADR 0012).
    expect(() => dry_r(0, 0, 0)).toThrow(RangeError);
    expect(() => dry_r(-10.0, -5.0, 1.0)).toThrow(RangeError);
  });

  test("test_wet_r", () => {
    approx(wet_r(10.0, 0.5, 0.45, 16.5), 0.01594, 1e-3);
    const i_clo = [0.45, 0.45];
    wet_r([10.0, 10.0], [0.5, 0.5], i_clo, 16.5).forEach((x) =>
      approx(x, 0.01594, 1e-3),
    );
    expect(() => wet_r(0, 0, i_clo, 16.5)).toThrow(RangeError);
    expect(() => wet_r(-1, 0.5, i_clo, 16.5)).toThrow(RangeError);
  });

  test("test_error_signals", () => {
    let [wrms, clds] = error_signals();
    expect(wrms).toBe(0);
    expect(clds).toBe(0);
    [wrms, clds] = error_signals(2);
    expect(wrms).toBeGreaterThan(0);
    expect(clds).toBe(0);
    [wrms, clds] = error_signals(-2);
    expect(wrms).toBe(0);
    expect(clds).toBeGreaterThan(0);
    [wrms, clds] = error_signals([
      -2, 2, -3, 3, -1, 1, 0, -0.5, 0.5, -2, 2, -1, 1, -0.5, 0.5, -1, 1,
    ]);
    expect(wrms).toBeGreaterThan(0);
    expect(clds).toBeGreaterThan(0);
    // A broadcasting ValueError is an Error (ADR 0012).
    expect(() => error_signals([-2, 2, -3])).toThrow(Error);
  });

  test("test_evaporation", () => {
    let err_cr = [0.5];
    let err_sk = [
      0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6,
      1.7, 1.8,
    ];
    let t_skin = ones(17, 34.0);
    let tdb = ones(17, 25.0);
    let rh = ones(17, 50.0);
    const ret = ones(17, 0.01);
    let r = evaporation(
      err_cr,
      err_sk,
      t_skin,
      tdb,
      rh,
      ret,
      1.72,
      74.43,
      "dubois",
      20,
    );
    for (const a of r) {
      expect(Array.isArray(a)).toBe(true);
    }
    const [wet] = r;
    expect(wet.every((w) => w >= 0 && w <= 1)).toBe(true);

    // Test age effects
    err_cr = [0.5];
    err_sk = ones(17, 0.2);
    const young = evaporation(
      err_cr,
      err_sk,
      t_skin,
      tdb,
      rh,
      ret,
      1.72,
      74.43,
      "dubois",
      20,
    );
    const old = evaporation(
      err_cr,
      err_sk,
      t_skin,
      tdb,
      rh,
      ret,
      1.72,
      74.43,
      "dubois",
      65,
    );
    // e_sweat, the fourth value
    expect(old[3].every((e, i) => e <= young[3][i])).toBe(true);

    // Test with valid BSA equations
    for (const bsa_equation of ["dubois", "takahira", "fujimoto", "kurazumi"]) {
      r = evaporation(
        err_cr,
        err_sk,
        t_skin,
        tdb,
        rh,
        ret,
        1.72,
        74.43,
        bsa_equation,
        20,
      );
      for (const a of r) {
        expect(Array.isArray(a)).toBe(true);
      }
    }

    // Test with invalid BSA equation
    expect(() =>
      evaporation(
        err_cr,
        err_sk,
        t_skin,
        tdb,
        rh,
        ret,
        1.72,
        74.43,
        "sushi",
        20,
      ),
    ).toThrow(Error);

    // Test to ensure no errors occur when e_max is zero
    t_skin = ones(17, 34.0);
    tdb = ones(17, 34.0);
    rh = ones(17, 100);
    r = evaporation(
      err_cr,
      err_sk,
      t_skin,
      tdb,
      rh,
      ret,
      1.72,
      74.43,
      "dubois",
      20,
    );
    const [wet_1, , e_max] = r;
    expect(e_max.every((e) => e === 0.001)).toBe(true);
    wet_1.forEach((w) => approx(w, 1, 1e-3));
  });

  test("test_skin_blood_flow", () => {
    let err_cr = [0.5];
    let err_sk = [
      0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6,
      1.7, 1.8,
    ];
    let bf_skin = skin_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      2.59,
    );
    expect(bf_skin.every((x) => x >= 0)).toBe(true);

    // Test age effect
    err_cr = [0.5];
    err_sk = ones(17, 0.2);
    const young = skin_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      2.59,
    );
    const old = skin_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      65,
      2.59,
    );
    expect(old.every((x, i) => x <= young[i])).toBe(true);

    // Test valid BSA equation
    for (const bsa_equation of ["dubois", "takahira", "fujimoto", "kurazumi"]) {
      bf_skin = skin_blood_flow(
        err_cr,
        err_sk,
        1.72,
        74.43,
        bsa_equation,
        20,
        2.59,
      );
      expect(bf_skin.every((x) => x >= 0)).toBe(true);
    }

    // Test with invalid BSA equation
    expect(() =>
      skin_blood_flow(err_cr, err_sk, 1.72, 74.43, "sushi", 20, 2.59),
    ).toThrow(Error);
  });

  test("test_ava_blood_flow", () => {
    let err_cr = [0.5, 0.6, 0.7, 0.8, 0.9];
    let err_sk = [
      0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6,
      1.7, 1.8,
    ];
    let [bf_ava_hand, bf_ava_foot] = ava_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      2.59,
    );
    expect(typeof bf_ava_hand).toBe("number");
    expect(typeof bf_ava_foot).toBe("number");
    expect(bf_ava_hand).toBeGreaterThanOrEqual(0);
    expect(bf_ava_foot).toBeGreaterThanOrEqual(0);

    // Test age effect
    err_sk = ones(17, 0.2);
    const [young_hand, young_foot] = ava_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      2.59,
    );
    const [old_hand, old_foot] = ava_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      65,
      2.59,
    );
    expect(old_hand).toBeLessThanOrEqual(young_hand);
    expect(old_foot).toBeLessThanOrEqual(young_foot);

    // Test with input length mismatch: numpy's average raises a TypeError
    expect(() =>
      ava_blood_flow(
        [0.5, 0.6, 0.7],
        [0.2, 0.3],
        1.72,
        74.43,
        "dubois",
        20,
        2.59,
      ),
    ).toThrow(TypeError);

    // Test with zero signal
    err_cr = ones(5, 0);
    err_sk = ones(17, 0);
    [bf_ava_hand, bf_ava_foot] = ava_blood_flow(
      err_cr,
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      2.59,
    );
    approx(bf_ava_hand, 1.71258, 1e-3);
    approx(bf_ava_foot, 1.42223, 1e-3);
  });

  test("test_basal_met", () => {
    approx(basal_met(1.72, 74.43, 20, "male", "harris-benedict"), 87.95, 1e-3);
    approx(basal_met(1.8, 70, 25, "male", "harris-benedict"), 85.66, 1e-3);
    for (const valid_equation of [
      "harris-benedict",
      "harris-benedict_origin",
      "japanese",
      "ganpule",
    ] as const) {
      expect(typeof basal_met(1.72, 74.4, 20, "male", valid_equation)).toBe(
        "number",
      );
    }
    expect(() =>
      basal_met(1.72, 74.43, 20, "male", "sushi" as "japanese"),
    ).toThrow(Error);
  });

  test("test_local_mbase", () => {
    let [mbase_cr, mbase_ms, mbase_fat, mbase_sk] = local_mbase();
    for (const a of [mbase_cr, mbase_ms, mbase_fat, mbase_sk]) {
      expect(Array.isArray(a)).toBe(true);
    }
    [mbase_cr, mbase_ms, mbase_fat, mbase_sk] = local_mbase(
      1.8,
      70,
      25,
      "male",
      "harris-benedict",
    );
    expect(mbase_cr.every((x, i) => x > mbase_ms[i])).toBe(true);
    expect(mbase_cr.every((x, i) => x > mbase_fat[i])).toBe(true);
    expect(mbase_cr.every((x, i) => x > mbase_sk[i])).toBe(true);
  });

  test("test_local_q_work", () => {
    expect(local_q_work(100, 1.5).every((x) => x >= 0)).toBe(true);
    expect(local_q_work(100, 1.0).every((x) => x === 0)).toBe(true);
    // A ValueError for a value out of range is a RangeError (ADR 0012).
    expect(() => local_q_work(100, 0.8)).toThrow(RangeError);
  });

  test("test_shivering", () => {
    const call = (err_cr: number, err_sk: number, age = 20) =>
      shivering(
        ones(17, err_cr),
        ones(17, err_sk),
        ones(17, 36),
        ones(17, 32),
        1.72,
        74.43,
        "dubois",
        age,
        "male",
        1,
        null,
      );
    // Test with zero error signals
    expect(call(0, 0).every((q) => q === 0)).toBe(true);
    // Test with positive error signals
    expect(call(1, 1).every((q) => q === 0)).toBe(true);
    // Test positive shivering thermogenesis with negative error signals
    expect(call(-1, -2).every((q) => q > 0)).toBe(true);
    // Test with different age group
    const age_list = [25, 35, 45, 55, 65, 75, 85];
    const q_shiv_by_age = age_list.map((age) => call(-1, -2, age));
    for (let i = 0; i < age_list.length - 1; i++) {
      expect(
        q_shiv_by_age[i].every((q, k) => q > q_shiv_by_age[i + 1][k]),
      ).toBe(true);
    }
  });

  test("test_nonshivering", () => {
    const call = (err_sk: number, age = 20) =>
      nonshivering(ones(17, err_sk), 1.72, 74.43, "dubois", age, false, true);
    expect(call(0).every((q) => q === 0)).toBe(true);
    expect(call(1).every((q) => q === 0)).toBe(true);
    expect(call(-1).every((q) => q >= 0)).toBe(true);
    // Test age effect on BAT (brown adipose tissue) that affects NST limit
    const age_list = [25, 35, 45];
    const sums = age_list.map((age) =>
      sum(nonshivering(ones(17, -10), 1.72, 74.43, "dubois", age)),
    );
    for (let i = 0; i < age_list.length - 1; i++) {
      expect(sums[i]).toBeGreaterThan(sums[i + 1]);
    }
  });

  test("test_cold_acclimation_non_shivering", () => {
    const err_sk = ones(17, -10);
    const q_nst_no_acclimation = nonshivering(
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      false,
      true,
    );
    const q_nst_with_acclimation = nonshivering(
      err_sk,
      1.72,
      74.43,
      "dubois",
      20,
      true,
      true,
    );
    expect(q_nst_no_acclimation).not.toEqual(q_nst_with_acclimation);
  });

  test("test_sum_bf", () => {
    const bf_core = [1, 2, 3, 4];
    const bf_muscle = [1, 2, 3, 4];
    const bf_fat = [1, 2, 3, 4];
    const bf_skin = [1, 2, 3, 4];
    const co = sum_bf(bf_core, bf_muscle, bf_fat, bf_skin, 1.0, 1.0);
    expect(typeof co).toBe("number");
    expect(co).toBe(
      sum(bf_core) +
        sum(bf_muscle) +
        sum(bf_fat) +
        sum(bf_skin) +
        2 * 1.0 +
        2 * 1.0,
    );
    const copies = [bf_core, bf_muscle, bf_fat, bf_skin].map((a) => a.slice());
    sum_bf(bf_core, bf_muscle, bf_fat, bf_skin, 1.0, 1.0);
    expect([bf_core, bf_muscle, bf_fat, bf_skin]).toEqual(copies);
  });

  test("test_resp_heat_loss", () => {
    let [res_sh, res_lh] = resp_heat_loss(25.0, 1.0, 100.0);
    expect(typeof res_sh).toBe("number");
    expect(typeof res_lh).toBe("number");
    expect(res_sh).toBe(0.0014 * 100.0 * (34 - 25.0));
    expect(res_lh).toBe(0.0173 * 100.0 * (5.87 - 1.0));
    [res_sh] = resp_heat_loss(34.0, 1.0, 100.0);
    expect(res_sh).toBe(0.0);
  });

  const subset_model = () => {
    const model = new JOS3({ height: 1.7, weight: 60, age: 30 });
    model.to = 28;
    model.rh = 40;
    model.v = 0.1;
    model.par = 1.0;
    model.simulate(3);
    return model;
  };

  test("test_dict_results_returns_values_not_body_part_names", () => {
    const results = subset_model().dict_results()!;
    // The reported bug: the column held the string "head".
    expect(typeof results.t_skin_head.at(-1)).toBe("number");
    // "sex" is the only column that is legitimately a string.
    const string_columns = Object.entries(results)
      .filter(([, series]) => series.some((entry) => typeof entry === "string"))
      .map(([key]) => key);
    expect(string_columns).toEqual(["sex"]);
  });

  test("test_dict_results_subset_variables_align_with_results", () => {
    const model = subset_model();
    const flat = model.dict_results()!;
    const structured = model.results();
    expect(flat.t_muscle_head.at(-1)).toBe(structured.t_muscle.head.at(-1));
    expect(flat.t_muscle_pelvis.at(-1)).toBe(structured.t_muscle.pelvis.at(-1));
    expect(flat.t_fat_head.at(-1)).toBe(structured.t_fat.head.at(-1));
    expect(flat.t_fat_pelvis.at(-1)).toBe(structured.t_fat.pelvis.at(-1));
  });
});

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same calls (jos3_v4.6.2.json).
// The body temperatures come from mathjs's inv and product, where upstream
// uses LAPACK and BLAS (ADR 0014), so unrounded values agree to about 1e-12
// and are compared to 9 decimals; rounded outputs are compared exactly.
describe("jos3 beyond upstream's tests", () => {
  const near = (expected: number[]) =>
    expected.map((x) => expect.closeTo(x, 9));

  test("the default body's set points and state are upstream's", () => {
    const model = new JOS3();
    expect(model.cr_set_point).toEqual(near(up.default_set_points.cr));
    expect(model.sk_set_point).toEqual(near(up.default_set_points.sk));
    expect(model.t_body).toEqual(near(up.default_set_points.t_body));
    expect(model.bmr).toBe(up.default_set_points.bmr);
  });

  test("results() after three steps is upstream's JOS3Output series, every field rounded as upstream", () => {
    const model = new JOS3();
    model.simulate(3);
    expect(model.results()).toEqual(up.default_3_steps);
  });

  test("dict_results() has upstream's 579 columns, in upstream's order, with upstream's values", () => {
    const model = new JOS3();
    model.simulate(3);
    const results = model.dict_results()!;
    expect(Object.keys(results)).toEqual(up.default_3_steps_dict_keys);
    expect(Object.keys(results)).toHaveLength(579);
    expect(results).toEqual(up.default_3_steps_dict);
  });

  test("the getters after three steps are upstream's", () => {
    const model = new JOS3();
    model.simulate(3);
    const g = up.default_3_steps_getters;
    for (const key of ["tdb", "tr", "rh", "v", "clo", "bsa", "body_names"]) {
      expect(model[key as keyof JOS3]).toEqual(g[key]);
    }
    expect(model.posture).toBe(g.posture);
    expect(model.par).toBe(g.par);
    for (const key of [
      "to",
      "t_body",
      "r_t",
      "r_et",
      "w",
      "t_skin",
      "t_core",
      "t_artery",
      "t_vein",
      "t_superficial_vein",
      "t_muscle",
      "t_fat",
    ]) {
      expect(model[key as keyof JOS3]).toEqual(near(g[key]));
    }
    for (const key of ["w_mean", "t_skin_mean", "t_cb", "bmr"]) {
      expect(model[key as keyof JOS3]).toBeCloseTo(g[key], 9);
    }
  });

  test("t_superficial_vein holds its 12 limb values from head to left_thigh, and null for the last 5, as upstream (jos3 D4)", () => {
    const model = new JOS3();
    const step = model._history[0] as JOS3Output;
    const values = Object.values(step.t_superficial_vein);
    expect(values.slice(0, 12).every((x) => typeof x === "number")).toBe(true);
    expect(values.slice(12)).toEqual([null, null, null, null, null]);
    expect(step.t_muscle).toMatchObject({ neck: null, chest: null });
    expect(typeof step.t_muscle.pelvis).toBe("number");
  });

  test("a hot exposure sweats per segment, as upstream (audit L1)", () => {
    const model = new JOS3();
    model.to = 40;
    model.rh = 60;
    model.v = 0.1;
    model.clo = 0.3;
    model.par = 1.5;
    model.simulate(30);
    const r = model.results();
    expect(r.t_core.head).toEqual(up.hot_30.t_core_head);
    expect(r.t_skin_mean).toEqual(up.hot_30.t_skin_mean);
    expect(model._history.at(-1)!.e_sweat).toEqual(up.hot_30.e_sweat_last);
    expect(model._history.at(-1)!.w).toEqual(up.hot_30.w_last);
    expect(model.t_body).toEqual(near(up.hot_30.t_body));
  });

  test("evaporation distributes the sweat element by element (audit L1)", () => {
    const { err_sk, out } = up.evaporation_case_a;
    const r = evaporation(
      ones(17, 0.05),
      err_sk,
      ones(17, 34),
      ones(17, 28),
      ones(17, 50),
      ones(17, 0.02),
      1.72,
      74.43,
      "dubois",
      20,
    );
    expect(r).toEqual(out);
  });

  test.each(Object.entries(up.neutral_to) as [string, number][])(
    "the neutral search at met %s finds upstream's operative temperature (audit L2)",
    (met, expected) => {
      const model = new JOS3();
      expect(
        model._calculate_operative_temp_when_pmv_is_zero(
          0.1,
          50,
          Number(met),
          0,
        ),
      ).toBe(expected);
    },
  );

  test.each(["69.5", "70", "80"])(
    "a low-metabolism body (1.6 m, %s kg, 80 y, female, japanese) gets upstream's set points (audit L2)",
    (weight) => {
      const model = new JOS3({
        height: 1.6,
        weight: Number(weight),
        age: 80,
        sex: "female",
        bmr_equation: "japanese",
      });
      expect(model.cr_set_point).toEqual(
        near(up.low_met_set_points[weight].cr),
      );
      expect(model.sk_set_point).toEqual(
        near(up.low_met_set_points[weight].sk),
      );
      expect(model.bmr).toBe(up.low_met_set_points[weight].bmr);
    },
  );

  test("a body above the 68 W floor with a met below 0.85 gets upstream's set points (audit L2)", () => {
    const model = new JOS3({
      height: 2.0,
      weight: 100,
      age: 100,
      sex: "female",
      bmr_equation: "harris-benedict_origin",
    });
    expect(model.cr_set_point).toEqual(near(up.low_met_above_floor.cr));
    expect(model.bmr).toBe(up.low_met_above_floor.bmr);
  });

  test("the low-metabolism two-hour exposure matches upstream's columns", () => {
    const model = new JOS3({
      height: 1.6,
      weight: 80,
      age: 80,
      sex: "female",
      bmr_equation: "japanese",
    });
    model.to = 28;
    model.rh = 50;
    model.v = 0.1;
    model.clo = 0.5;
    model.par = 1.25;
    model.simulate(120, 60);
    const d = model.dict_results()!;
    for (const key of ["t_skin_mean", "t_core_chest", "t_skin_chest"]) {
      expect(d[key]).toEqual(up.low_met_120[key]);
    }
  });

  test("basal_met has upstream's 68 W floor (audit L3)", () => {
    expect(basal_met(1.0, 20, 100, "female", "harris-benedict")).toBe(
      up.basal_met_floor.small,
    );
    expect(basal_met(1.2, 25, 10, "male", "harris-benedict")).toBe(
      up.basal_met_floor.child,
    );
    expect(up.basal_met_floor.small).toBe(68);
  });

  test("a body under the floor gets upstream's set points and wettedness (audit L3, L4)", () => {
    const model = new JOS3({
      height: 1.0,
      weight: 20,
      age: 100,
      sex: "female",
    });
    expect(model.cr_set_point).toEqual(near(up.small_body.cr));
    model.to = 25;
    model.rh = 50;
    model.v = 0.1;
    model.clo = 0.5;
    model.simulate(20);
    expect(model.results().t_skin_mean).toEqual(up.small_body.t_skin_mean);
    expect(model.w_mean).toBeCloseTo(up.small_body.w_mean, 9);
  });

  test.each(["65", "30", "10"])(
    "the w getter passes the body to evaporation, as upstream, at age %s (audit L4)",
    (age) => {
      const model = new JOS3({ height: 1.75, weight: 80, age: Number(age) });
      model.to = 30;
      model.rh = 50;
      model.v = 0.1;
      model.clo = 0.5;
      model.par = 1.2;
      model.simulate(10);
      expect(model.w).toEqual(near(up.w_getter[age].w));
      expect(model.w_mean).toBeCloseTo(up.w_getter[age].w_mean, 9);
    },
  );

  test("the default first step is rounded as upstream rounds it (audit L5)", () => {
    const step = new JOS3()._history[0];
    expect(step.t_skin_mean).toBe(up.default_3_steps.t_skin_mean[0]);
    expect(step.cardiac_output).toBe(up.default_3_steps.cardiac_output[0]);
    expect(step.weight_loss_by_evap_and_res).toBe(
      up.default_3_steps.weight_loss_by_evap_and_res[0],
    );
    expect(step.r_t.head).toBe(up.default_3_steps.r_t.head[0]);
  });

  test.each(
    Object.entries(up.posture) as [
      string,
      { posture: string; printed: string },
    ][],
  )(
    "the posture setter, from sitting, given %s, does what upstream's does (audit L7)",
    (given, expected) => {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      try {
        const model = new JOS3();
        model.posture = "sitting";
        model.posture = JSON.parse(given);
        expect(model.posture).toBe(expected.posture);
        const printed = log.mock.calls.map((c) => `${c[0]}\n`).join("");
        expect(printed).toBe(expected.printed);
      } finally {
        log.mockRestore();
      }
    },
  );

  test.each(["Standing", "SITTING", "Supine"])(
    "rad_coef lowers %s, as upstream (audit L8)",
    (posture) => {
      expect(rad_coef(posture as "standing")).toEqual(
        up.rad_coef_case[posture],
      );
    },
  );

  test.each([
    ["empty", {}],
    ["none", null],
    ["off", { shivering_threshold: false, "limit_dshiv/dt": false }],
    ["limit", { shivering_threshold: false, "limit_dshiv/dt": true }],
  ] as [string, Parameters<typeof shivering>[10]][])(
    "shivering with %s options updates PRE_SHIV as upstream (audit L9)",
    (name, options) => {
      thermoregulation.PRE_SHIV = 0.7;
      try {
        const q = shivering(
          ones(17, -1),
          ones(17, -2),
          ones(17, 36),
          ones(17, 32),
          1.72,
          74.43,
          "dubois",
          20,
          "male",
          60,
          options,
        );
        expect(q).toEqual(up.pre_shiv[name].q);
        expect(thermoregulation.PRE_SHIV).toBe(up.pre_shiv[name].pre);
      } finally {
        thermoregulation.PRE_SHIV = 0;
      }
    },
  );

  test.each([
    [{ shivering_threshold: false }, "'limit_dshiv/dt'"],
    [{ "limit_dshiv/dt": true }, "'shivering_threshold'"],
  ])(
    "shivering throws a TypeError for options %j, which lack a key upstream reads (upstream KeyError %s)",
    (options, message) => {
      expect_throw(
        () =>
          shivering(
            ones(17, -1),
            ones(17, -2),
            ones(17, 36),
            ones(17, 32),
            1.72,
            74.43,
            "dubois",
            20,
            "male",
            60,
            options,
          ),
        TypeError,
        message,
      );
    },
  );

  test("simulation_time is upstream's elapsed timedelta in seconds", () => {
    let model = new JOS3();
    model.simulate(10, 0.1);
    expect(model.results().simulation_time).toEqual(up.sim_time_0_1);
    model = new JOS3();
    model.simulate(3, 1 / 3);
    expect(model.results().simulation_time).toEqual(up.sim_time_third);
  });

  // CPython's timedelta(0, dtime) (Modules/_datetimemodule.c, accum and
  // delta_new, at v3.12.12) splits dtime with modf, scales the fraction by
  // 1e6, splits it again and rounds the rest half to even against the
  // microseconds so far; a single round(dtime * 1e6) gives other values for
  // 600.0000005 and 123456789.0000005. Expected: pythermalcomfort 4.6.2's total_seconds() after 3 steps
  // (`.scratch/v2-models/wave-2/research/jos3/up_simtime.py`).
  test.each<[number, number[]]>([
    [600.0000005, [0.0, 600.000001, 1200.000002, 1800.000003]],
    [5e-7, [0.0, 0.0, 0.0, 0.0]],
    [1.5e-6, [0.0, 2e-6, 4e-6, 6e-6]],
    [2.5e-6, [0.0, 2e-6, 4e-6, 6e-6]],
    [-5e-7, [0.0, 0.0, 0.0, 0.0]],
    [-1.5e-6, [0.0, -2e-6, -4e-6, -6e-6]],
    [
      123456789.0000005,
      [0.0, 123456789.000001, 246913578.000002, 370370367.000003],
    ],
    [1140.5696404999999, [0.0, 1140.56964, 2281.13928, 3421.70892]],
    [541.3030675000001, [0.0, 541.303068, 1082.606136, 1623.909204]],
    [0.1, [0.0, 0.1, 0.2, 0.3]],
    [0.3333333333333333, [0.0, 0.333333, 0.666666, 0.999999]],
  ])(
    "simulation_time for dtime %p is upstream's timedelta conversion",
    (dtime, expected) => {
      const model = new JOS3();
      model.simulate(3, dtime);
      expect(model.results().simulation_time).toEqual(expected);
    },
  );

  // Above 2^53 microseconds (about 285 years) a double no longer holds every
  // whole microsecond; upstream's timedelta counts them in Python's integers
  // and total_seconds() divides them by 10**6, correctly rounded
  // (`.scratch/v2-models/wave-2/research/jos3/up_simtime_big.py`).
  test.each<[number, number, number[]]>([
    [2, 9007199254.740993, [0.0, 9007199254.740993, 18014398509.481987]],
    [1, 42603263734250.09, [0.0, 42603263734250.09]],
    [2, 14287480121307.64, [0.0, 14287480121307.64, 28574960242615.28]],
    [1, 56099087240450.445, [0.0, 56099087240450.445]],
  ])(
    "simulation_time after %i steps of dtime %p, above 2^53 microseconds, is upstream's",
    (times, dtime, expected) => {
      const model = new JOS3();
      model.simulate(times, dtime);
      expect(model.results().simulation_time).toEqual(expected);
    },
  );

  test("the clothing ensemble of upstream's docstring example sets clo as upstream", () => {
    const { local_clo_typical_ensembles, ALL_OUT_PARAMS } = parameters;
    const ens = local_clo_typical_ensembles[up.ensemble.name];
    expect(Object.values(ens.local_body_part)).toEqual(up.ensemble.clo);
    expect(ens.whole_body).toBe(up.ensemble.whole_body);
    expect(Object.keys(local_clo_typical_ensembles)).toHaveLength(
      up.ensemble.count,
    );
    expect(Object.keys(ALL_OUT_PARAMS)).toHaveLength(up.ensemble.out_params);
    expect(ALL_OUT_PARAMS.bf_core).toEqual(up.ensemble.bf_core);
    const model = new JOS3();
    model.clo = ens.local_body_part;
    expect(model.clo).toEqual(up.ensemble.clo);
  });

  test("upstream's docstring example returns upstream's series", () => {
    const { local_clo_typical_ensembles } = parameters;
    const model = new JOS3({
      height: 1.7,
      weight: 60,
      fat: 20,
      age: 30,
      sex: "male",
      bmr_equation: "japanese",
      bsa_equation: "fujimoto",
    });
    model.tdb = 28;
    model.tr = 30;
    model.rh = 40;
    model.v = [
      0.2, 0.4, 0.4, 0.1, 0.1, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.1, 0.1, 0.1, 0.1,
      0.1, 0.1,
    ];
    model.clo = local_clo_typical_ensembles[up.ensemble.name].local_body_part;
    model.par = 1.2;
    model.posture = "sitting";
    model.simulate(30, 60);
    model.to = 20;
    model.v = Object.fromEntries(
      BODY_NAMES.map((name, i) => [
        name,
        [
          0.2, 0.4, 0.4, 0.1, 0.1, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.1, 0.1, 0.1,
          0.1, 0.1, 0.1,
        ][i],
      ]),
    ) as Record<(typeof BODY_NAMES)[number], number>;
    model.simulate(60, 60);
    model.tdb = 30;
    model.tr = 35;
    model.simulate(30, 60);
    const r = model.results();
    expect(r.t_skin_mean).toEqual(up.docstring_example.t_skin_mean);
    expect(r.t_skin.head).toEqual(up.docstring_example.t_skin_head);
    expect(r.t_skin.pelvis).toEqual(up.docstring_example.t_skin_pelvis);
  });

  test("ex_output, cycle_time and name are gone (jos3 D1), and so are setpt_cr, setpt_sk and body_temp (jos3 D2)", () => {
    const model = new JOS3();
    expect(model._history[0]).not.toHaveProperty("cycle_time");
    expect(model._history[0]).not.toHaveProperty("name");
    expect(Object.keys(model._history[0])).toHaveLength(59);
    expect(model).not.toHaveProperty("setpt_cr");
    expect(model).not.toHaveProperty("setpt_sk");
    expect("body_temp" in model).toBe(false);
    expect(typeof model.results).toBe("function");
    expect(() => new JOS3({ ex_output: "all" } as never)).toThrow(TypeError);
  });

  describe("errors", () => {
    test("a key the params do not declare throws a TypeError naming it (ADR 0008)", () => {
      expect(() => new JOS3({ units: "SI" } as never)).toThrow(
        "JOS3 got an unexpected key: 'units'",
      );
    });

    test("a positional call throws a TypeError (ADR 0002)", () => {
      expect(
        () => new (JOS3 as unknown as new (h: number) => JOS3)(1.8),
      ).toThrow(TypeError);
    });

    test.each(["height", "weight", "fat", "age", "ci"])(
      "a non-finite, boolean, null or string %s throws a TypeError (ADR 0001, ADR 0005)",
      (key) => {
        for (const value of [NaN, Infinity, -Infinity, true, null, "1"]) {
          expect(() => new JOS3({ [key]: value } as never)).toThrow(TypeError);
        }
      },
    );

    test("an unknown bmr_equation or bsa_equation throws an Error, as upstream raises a ValueError", () => {
      expect(() => new JOS3({ bmr_equation: "sushi" } as never)).toThrow(
        "Invalid equation: 'sushi'. Must be one of ['harris-benedict', 'harris-benedict_origin', 'japanese', 'ganpule'].",
      );
      expect(() => new JOS3({ bsa_equation: "sushi" } as never)).toThrow(Error);
    });

    test("an out-of-range body throws upstream's messages", () => {
      expect(() => new JOS3({ weight: 1 })).toThrow(
        "Weight must be in the range [20.0, 200.0] kilograms.",
      );
      expect(() => new JOS3({ fat: 0.5 })).toThrow(
        "Body fat percentage must be in the range [1, 90] (1% to 90%).",
      );
    });

    test.each(["tdb", "tr", "to", "rh", "v", "clo", "t_skin"])(
      "the %s setter throws a TypeError for a non-finite number or a boolean (ADR 0001, ADR 0005)",
      (key) => {
        const model = new JOS3() as unknown as Record<string, unknown>;
        for (const value of [NaN, Infinity, true]) {
          expect(() => {
            model[key] = value;
          }).toThrow(TypeError);
        }
        const nan_part = new Array(17).fill(1);
        nan_part[3] = NaN;
        expect(() => {
          model[key] = nan_part;
        }).toThrow(TypeError);
      },
    );

    test("a setter throws upstream's Error for 16 values or an unsupported type", () => {
      const model = new JOS3() as unknown as Record<string, unknown>;
      expect(() => {
        model.tdb = new Array(16).fill(25);
      }).toThrow("The input list or ndarray is not of length 17");
      expect(() => {
        model.tdb = "25";
      }).toThrow(
        "Unsupported input type: <class 'str'>. Supported types: int, float, list, dict, ndarray",
      );
    });

    test("par below 1 throws a RangeError when the model runs, as upstream raises then", () => {
      const model = new JOS3();
      model.par = 0.8;
      expect_throw(
        () => model.simulate(1),
        RangeError,
        "par must be 1 or more",
      );
      expect(() => {
        model.par = NaN;
      }).toThrow(TypeError);
    });

    test("simulate throws a TypeError for a count that is not an integer, as Python's range raises", () => {
      const model = new JOS3();
      expect(() => model.simulate(2.5)).toThrow(TypeError);
      expect(() => model.simulate(1, NaN)).toThrow(TypeError);
    });

    // pythermalcomfort 4.6.2 raises a KeyError for each missing key at the
    // point it reads it
    // (`.scratch/v2-models/wave-2/research/jos3/up_errors.py`), a TypeError
    // here (ADR 0012 as amended); "shivering" is not read.
    test.each<[string, boolean, string | null]>([
      ["ava_zero", true, "'ava_zero'"],
      ["shivering_threshold", true, "'shivering_threshold'"],
      ["limit_dshiv/dt", true, "'limit_dshiv/dt'"],
      ["nonshivering_thermogenesis", true, "'nonshivering_thermogenesis'"],
      ["cold_acclimated", true, "'cold_acclimated'"],
      ["bat_positive", true, "'bat_positive'"],
      ["ava_zero", false, "'ava_zero'"],
      ["shivering_threshold", false, "'shivering_threshold'"],
      ["limit_dshiv/dt", false, "'limit_dshiv/dt'"],
      ["cold_acclimated", false, null],
      ["bat_positive", false, null],
      ["shivering", true, null],
      ["shivering", false, null],
    ])(
      "options without %s (nonshivering_thermogenesis %s): upstream's KeyError %s as a TypeError, or a run",
      (key, nst, message) => {
        const model = new JOS3();
        model.tdb = 10;
        const options = model.options as Record<string, unknown>;
        options.nonshivering_thermogenesis = nst;
        delete options[key];
        if (message === null) {
          model.simulate(1);
          expect(model.results().simulation_time).toEqual([0, 60]);
        } else {
          expect_throw(() => model.simulate(1), TypeError, message);
        }
      },
    );

    test("options emptied: the first key upstream reads, ava_zero, throws", () => {
      const model = new JOS3();
      for (const key of Object.keys(model.options)) {
        delete (model.options as Record<string, unknown>)[key];
      }
      expect_throw(() => model.simulate(1), TypeError, "'ava_zero'");
    });

    // Upstream raises a TypeError (numpy's UFuncTypeError for a string and
    // an int dtime) or, for [0.01] with an int dtime, numpy's ValueError
    // (`.scratch/v2-models/wave-2/research/jos3/up_errors.py`); wave 2 D7 (c)
    // throws a TypeError for every truthy value that is neither true nor a
    // number, with Python's message for a float dtime, which upstream gives
    // for dtime 60.5. An empty array or object is truthy in JavaScript
    // (ADR 0001 as amended); upstream reads [] and {} as false and returns.
    test.each([
      ["0.01", "can't multiply sequence by non-int of type 'float'"],
      [{ a: 1 }, "unsupported operand type(s) for *: 'dict' and 'float'"],
      [[0.01], "can't multiply sequence by non-int of type 'float'"],
      [[], "can't multiply sequence by non-int of type 'float'"],
      [{}, "unsupported operand type(s) for *: 'dict' and 'float'"],
    ])(
      'options["limit_dshiv/dt"] %j throws a TypeError (wave 2 D7 (c))',
      (value, message) => {
        const model = new JOS3();
        model.tdb = 10;
        (model.options as Record<string, unknown>)["limit_dshiv/dt"] = value;
        expect_throw(() => model.simulate(2, 60.5), TypeError, message);
      },
    );

    test.each([[NaN], [0], [0.01], [true], [false]])(
      'options["limit_dshiv/dt"] %p runs, as upstream returns',
      (value) => {
        const model = new JOS3();
        model.tdb = 10;
        (model.options as Record<string, unknown>)["limit_dshiv/dt"] = value;
        model.simulate(2);
        expect(model.results().simulation_time).toEqual([0, 60, 120]);
      },
    );

    // numpy's IndexError for an index past the end, a RangeError here
    // (ADR 0012 as amended), with numpy's message; an array longer than 85
    // fails numpy's broadcasting with a ValueError, an Error here
    // (`.scratch/v2-models/wave-2/research/jos3/up_errors.py`).
    type BodyGetter =
      | "t_skin"
      | "t_core"
      | "t_cb"
      | "t_artery"
      | "t_vein"
      | "t_superficial_vein"
      | "t_muscle"
      | "t_fat";
    test.each<[number, BodyGetter, string]>([
      [0, "t_skin", "index 6 is out of bounds for axis 0 with size 0"],
      [0, "t_core", "index 3 is out of bounds for axis 0 with size 0"],
      [0, "t_cb", "index 0 is out of bounds for axis 0 with size 0"],
      [0, "t_artery", "index 1 is out of bounds for axis 0 with size 0"],
      [0, "t_vein", "index 2 is out of bounds for axis 0 with size 0"],
      [
        0,
        "t_superficial_vein",
        "index 27 is out of bounds for axis 0 with size 0",
      ],
      [0, "t_muscle", "index 4 is out of bounds for axis 0 with size 0"],
      [0, "t_fat", "index 5 is out of bounds for axis 0 with size 0"],
      [1, "t_skin", "index 6 is out of bounds for axis 0 with size 1"],
      [1, "t_core", "index 3 is out of bounds for axis 0 with size 1"],
      [1, "t_artery", "index 1 is out of bounds for axis 0 with size 1"],
      [84, "t_skin", "index 84 is out of bounds for axis 0 with size 84"],
    ])(
      "t_body of %i values: the %s getter throws upstream's IndexError as a RangeError",
      (n, getter, message) => {
        const model = new JOS3();
        model.t_body = new Array<number>(n).fill(36);
        expect_throw(() => model[getter], RangeError, message);
      },
    );

    test.each<[number, new (message?: string) => Error, string]>([
      [0, RangeError, "index 3 is out of bounds for axis 0 with size 0"],
      [1, RangeError, "index 3 is out of bounds for axis 0 with size 1"],
      [84, RangeError, "index 84 is out of bounds for axis 0 with size 84"],
      [
        86,
        Error,
        "operands could not be broadcast together with shapes (86,) (85,) ",
      ],
    ])(
      "t_body of %i values: simulate throws upstream's exception as a %p",
      (n, cls, message) => {
        const model = new JOS3();
        model.t_body = new Array<number>(n).fill(36);
        expect_throw(() => model.simulate(1), cls, message);
      },
    );

    test("t_body of 1, 84 or 86 values: the getters upstream can index return", () => {
      const model = new JOS3();
      model.t_body = [36.5];
      expect(model.t_cb).toBe(36.5);
      model.t_body = new Array<number>(84).fill(36);
      expect(model.t_fat).toEqual([36, 36]);
      model.t_body = new Array<number>(86).fill(36);
      expect(model.t_skin).toHaveLength(17);
    });

    test("a setter given an object that lacks a body part throws upstream's KeyError as a TypeError", () => {
      const model = new JOS3();
      const parts = Object.fromEntries(
        BODY_NAMES.slice(0, 16).map((name) => [name, 25]),
      );
      expect_throw(
        () => {
          model.tdb = parts as never;
        },
        TypeError,
        "'right_foot'",
      );
    });

    // pythermalcomfort 4.6.2's AttributeError from inp.copy(), a TypeError
    // here (ADR 0012), with Python's type names
    // (`.scratch/v2-models/wave-2/research/jos3/up_tbody_msg.py`).
    test.each([
      ["x", "'str' object has no attribute 'copy'"],
      [5, "'int' object has no attribute 'copy'"],
      [5.5, "'float' object has no attribute 'copy'"],
      [null, "'NoneType' object has no attribute 'copy'"],
      [true, "'bool' object has no attribute 'copy'"],
      // upstream accepts a dict and raises when a getter indexes it
      [{}, "unhashable type: 'list'"],
    ])(
      "the t_body setter given %p throws upstream's message",
      (value, message) => {
        const model = new JOS3();
        expect_throw(
          () => {
            model.t_body = value as never;
          },
          TypeError,
          message,
        );
      },
    );

    test("_set_ex_q throws upstream's KeyError for a tissue that is not a layer as a TypeError", () => {
      const model = new JOS3();
      expect_throw(
        () => model._set_ex_q("bone" as "core", 1),
        TypeError,
        "'bone'",
      );
    });
  });
});

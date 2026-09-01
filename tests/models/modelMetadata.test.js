import { describe, expect, test } from "@jest/globals";
import { adaptive_ashrae } from "../../src/models/adaptive_ashrae";
import { adaptive_en } from "../../src/models/adaptive_en";
import { heat_index } from "../../src/models/heat_index";
import { humidex } from "../../src/models/humidex";
import { phs } from "../../src/models/phs";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae";
import { pmv_ppd_iso } from "../../src/models/pmv_ppd_iso";
import { utci } from "../../src/models/utci";
import { wc } from "../../src/models/wc";

function offsetById(offsets, id) {
  const offset = offsets.find((item) => item.id === id);
  expect(offset).toBeDefined();
  return offset;
}

describe("adaptive ASHRAE exported offsets and running-mean limits", () => {
  test("offsets match tmp_cmf_80/90 when cooling effect is zero", () => {
    const result = adaptive_ashrae(25, 25, 20, 0.1, "SI", false, true);
    const offset80 = offsetById(adaptive_ashrae.offsets, "80");
    const offset90 = offsetById(adaptive_ashrae.offsets, "90");
    expect(result.tmp_cmf).toBe(24);
    expect(result.tmp_cmf_80_low).toBeCloseTo(
      result.tmp_cmf + offset80.lower,
      10,
    );
    expect(result.tmp_cmf_80_up).toBeCloseTo(
      result.tmp_cmf + offset80.upper,
      10,
    );
    expect(result.tmp_cmf_90_low).toBeCloseTo(
      result.tmp_cmf + offset90.lower,
      10,
    );
    expect(result.tmp_cmf_90_up).toBeCloseTo(
      result.tmp_cmf + offset90.upper,
      10,
    );
    expect(result.tmp_cmf_80_low).toBeCloseTo(20.5, 10);
    expect(result.tmp_cmf_80_up).toBeCloseTo(27.5, 10);
  });

  test("t_running_mean outside exported limits yields NaN tmp_cmf", () => {
    const { min, max } = adaptive_ashrae.t_running_mean_limits;
    expect(min).toBe(10);
    expect(max).toBe(33.5);
    expect(adaptive_ashrae(25, 25, min - 1, 0.1).tmp_cmf).toBeNaN();
    expect(adaptive_ashrae(25, 25, max + 0.5, 0.1).tmp_cmf).toBeNaN();
  });
});

describe("adaptive EN exported offsets and running-mean limits", () => {
  test("offsets match tmp_cmf_cat_* when cooling effect is zero", () => {
    const result = adaptive_en(25, 25, 20, 0.1, "SI", false, true);
    const catI = offsetById(adaptive_en.offsets, "cat_i");
    const catII = offsetById(adaptive_en.offsets, "cat_ii");
    const catIII = offsetById(adaptive_en.offsets, "cat_iii");
    expect(result.tmp_cmf).toBeCloseTo(25.4, 10);
    expect(result.tmp_cmf_cat_i_low).toBeCloseTo(
      result.tmp_cmf + catI.lower,
      10,
    );
    expect(result.tmp_cmf_cat_i_up).toBeCloseTo(
      result.tmp_cmf + catI.upper,
      10,
    );
    expect(result.tmp_cmf_cat_ii_low).toBeCloseTo(
      result.tmp_cmf + catII.lower,
      10,
    );
    expect(result.tmp_cmf_cat_ii_up).toBeCloseTo(
      result.tmp_cmf + catII.upper,
      10,
    );
    expect(result.tmp_cmf_cat_iii_low).toBeCloseTo(
      result.tmp_cmf + catIII.lower,
      10,
    );
    expect(result.tmp_cmf_cat_iii_up).toBeCloseTo(
      result.tmp_cmf + catIII.upper,
      10,
    );
  });

  test("t_running_mean outside exported limits yields NaN tmp_cmf", () => {
    const { min, max } = adaptive_en.t_running_mean_limits;
    expect(adaptive_en.t_running_mean_limits).toEqual(
      adaptive_ashrae.t_running_mean_limits,
    );
    expect(adaptive_en(25, 25, min - 1, 0.1).tmp_cmf).toBeNaN();
    expect(adaptive_en(25, 25, max + 0.5, 0.1).tmp_cmf).toBeNaN();
  });
});

describe("PHS exported ISO limits", () => {
  test("rectal and water-loss fractions match the solver constants", () => {
    expect(phs.RECTAL_TEMPERATURE_LIMIT).toBe(38);
    expect(phs.WATER_LOSS_FRACTION_NO_DRINK).toBe(0.03);
    expect(phs.WATER_LOSS_FRACTION_DRINK).toBe(0.05);
    expect(phs.WATER_LOSS_FRACTION_2004_MEAN).toBe(0.075);
    expect(phs.WATER_LOSS_FRACTION_2004_95).toBe(0.05);
  });
});

describe("model label and description", () => {
  test.each([
    ["Heat Index", heat_index],
    ["Humidex", humidex],
    ["Universal Thermal Climate Index (UTCI)", utci],
    ["Wind chill index", wc],
    ["Predicted Heat Strain (PHS) Index", phs],
    ["Adaptive ASHRAE", adaptive_ashrae],
    ["Adaptive EN", adaptive_en],
    ["PMV/PPD (ASHRAE 55)", pmv_ppd_ashrae],
    ["PMV/PPD (ISO 7730)", pmv_ppd_iso],
  ])("%s.label matches @docname", (label, model) => {
    expect(model.label).toBe(label);
    expect(model.description.length).toBeGreaterThan(0);
  });
});

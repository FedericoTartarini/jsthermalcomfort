import { describe, expect, test } from "@jest/globals";
import { heat_index } from "../../src/models/heat_index";
import { humidex } from "../../src/models/humidex";
import { utci } from "../../src/models/utci";
import { pmv_ppd_ashrae } from "../../src/models/pmv_ppd_ashrae";
import { pmv_ppd_iso } from "../../src/models/pmv_ppd_iso";
import { classifyFromBins } from "../../src/models/classifierBins";

describe("classifier bins match mapping/tsv at closed endpoints", () => {
  test.each([
    [27, "no risk"],
    [32, "caution"],
    [41, "extreme caution"],
    [54, "danger"],
    [54.001, "extreme danger"],
  ])("heat_index.mapping(%p) uses bins", (hi, expected) => {
    expect(heat_index.mapping(hi)).toBe(expected);
    expect(classifyFromBins(hi, heat_index.mapping.bins)).toBe(expected);
  });

  test.each([
    [30, "Little or no discomfort"],
    [35, "Noticeable discomfort"],
    [55, "Heat stroke probable"],
  ])("humidex.mapping(%p)", (value, expected) => {
    expect(humidex.mapping(value)).toBe(expected);
  });

  test("utci.mapping is attached on the model function", () => {
    expect(utci.mapping(26)).toBe("no thermal stress");
    expect(utci.mapping.bins.edges).toEqual([
      -40, -27, -13, 0, 9, 26, 32, 38, 46, 1000,
    ]);
    expect(utci.mapping.bins.labels).toHaveLength(
      utci.mapping.bins.edges.length,
    );
  });

  test("ASHRAE TSV is right-closed at ±0.5", () => {
    expect(pmv_ppd_ashrae.tsv(-0.5)).toBe("Slightly Cool");
    expect(pmv_ppd_ashrae.tsv(0.5)).toBe("Neutral");
    expect(pmv_ppd_ashrae.tsv.bins.right).toBe(true);
    expect(pmv_ppd_ashrae.tsv.bins.edges).toContain(10);
    expect(pmv_ppd_ashrae.tsv.bins.labels).toHaveLength(
      pmv_ppd_ashrae.tsv.bins.edges.length,
    );
  });

  test("ISO TSV is left-closed at ±0.5", () => {
    expect(pmv_ppd_iso.tsv(-0.5)).toBe("Neutral");
    expect(pmv_ppd_iso.tsv(0.5)).toBe("Slightly Warm");
    expect(pmv_ppd_iso.tsv.bins.right).toBe(false);
    expect(pmv_ppd_iso.tsv.bins.edges).toContain(10);
    expect(pmv_ppd_iso.tsv.bins.labels).toHaveLength(
      pmv_ppd_iso.tsv.bins.edges.length,
    );
  });

  test("ASHRAE compliance.bounds is the open ±0.5 interval", () => {
    expect(pmv_ppd_ashrae.compliance.bounds).toEqual({
      min: -0.5,
      max: 0.5,
      open: true,
    });
    expect(pmv_ppd_ashrae.compliance(0)).toBe(true);
    expect(pmv_ppd_ashrae.compliance(-0.5)).toBe(false);
    expect(pmv_ppd_ashrae.compliance(0.5)).toBe(false);
  });
});

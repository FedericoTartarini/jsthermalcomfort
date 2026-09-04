import { describe, expect, test } from "@jest/globals";
import {
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_STRESS_CATEGORY_BINS,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
  classifyFromBins,
  heat_index_rothfusz,
  pmv_ppd_iso,
} from "../../src/index.js";
import { ISO_7730_LIMITS } from "../../src/utilities/utilities.js";

describe("Model Metadata Exports — enumeration test", () => {
  test("all expected metadata and constant exports are available from package root", () => {
    // Load all exports from the package root
    const importMap = {
      HEAT_INDEX_ROTHFUSZ_INFO,
      HEAT_INDEX_STRESS_CATEGORY_BINS,
      PMV_PPD_ISO_INFO,
      PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
      PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
      classifyFromBins,
    };

    // Expected exports list (in alphabetical order)
    const expectedExports = [
      "HEAT_INDEX_ROTHFUSZ_INFO",
      "HEAT_INDEX_STRESS_CATEGORY_BINS",
      "PMV_PPD_ISO_INFO",
      "PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE",
      "PMV_THERMAL_SENSATION_VOTE_BINS_ISO",
      "classifyFromBins",
    ];

    const actualExports = Object.keys(importMap).sort();

    expect(actualExports).toEqual(expectedExports);
    // Also verify that none are undefined
    expectedExports.forEach((name) => {
      expect(importMap[name]).toBeDefined();
    });
  });
});

describe("HEAT_INDEX_ROTHFUSZ_INFO structure", () => {
  test("has required top-level properties", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO).toHaveProperty("label");
    expect(HEAT_INDEX_ROTHFUSZ_INFO).toHaveProperty("description");
    expect(HEAT_INDEX_ROTHFUSZ_INFO).toHaveProperty("inputs");
    expect(HEAT_INDEX_ROTHFUSZ_INFO).toHaveProperty("outputs");
  });

  test("label is a string", () => {
    expect(typeof HEAT_INDEX_ROTHFUSZ_INFO.label).toBe("string");
    expect(HEAT_INDEX_ROTHFUSZ_INFO.label).toMatch(/Heat Index/);
  });

  test("description is a string", () => {
    expect(typeof HEAT_INDEX_ROTHFUSZ_INFO.description).toBe("string");
  });

  test("inputs contains tdb and rh", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs).toHaveProperty("tdb");
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs).toHaveProperty("rh");
  });

  test("tdb input has applicability minimum of 27 (SI unit)", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability).toBeDefined();
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability.min).toBe(27);
  });

  test("tdb input has unit °C", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.unit).toBe("°C");
  });

  test("rh input has unit %", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs.rh.unit).toBe("%");
  });

  test("outputs contains hi and stress_category", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs).toHaveProperty("hi");
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs).toHaveProperty("stress_category");
  });

  test("hi output has unit °C", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs.hi.unit).toBe("°C");
  });

  test("stress_category output is dimensionless with classifier", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.unit).toBeNull();
    expect(
      HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier,
    ).toBeDefined();
  });

  test("stress_category classifier references HEAT_INDEX_STRESS_CATEGORY_BINS", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier).toBe(
      HEAT_INDEX_STRESS_CATEGORY_BINS,
    );
  });
});

describe("PMV_PPD_ISO_INFO structure", () => {
  test("has required top-level properties", () => {
    expect(PMV_PPD_ISO_INFO).toHaveProperty("label");
    expect(PMV_PPD_ISO_INFO).toHaveProperty("description");
    expect(PMV_PPD_ISO_INFO).toHaveProperty("inputs");
    expect(PMV_PPD_ISO_INFO).toHaveProperty("outputs");
  });

  test("label is a string", () => {
    expect(typeof PMV_PPD_ISO_INFO.label).toBe("string");
    expect(PMV_PPD_ISO_INFO.label).toMatch(/PMV.*PPD.*ISO/);
  });

  test("description is a string", () => {
    expect(typeof PMV_PPD_ISO_INFO.description).toBe("string");
  });

  test("inputs contains all ISO variables", () => {
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("tdb");
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("tr");
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("vr");
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("met");
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("clo");
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("rh");
    expect(PMV_PPD_ISO_INFO.inputs).toHaveProperty("wme");
  });

  test("tdb has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability.min).toBe(
      ISO_7730_LIMITS.tdb.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability.max).toBe(
      ISO_7730_LIMITS.tdb.max,
    );
  });

  test("tr has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability.min).toBe(
      ISO_7730_LIMITS.tr.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability.max).toBe(
      ISO_7730_LIMITS.tr.max,
    );
  });

  test("vr has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability.min).toBe(
      ISO_7730_LIMITS.vr.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability.max).toBe(
      ISO_7730_LIMITS.vr.max,
    );
  });

  test("met has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability.min).toBe(
      ISO_7730_LIMITS.met.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability.max).toBe(
      ISO_7730_LIMITS.met.max,
    );
  });

  test("clo has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability.min).toBe(
      ISO_7730_LIMITS.clo.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability.max).toBe(
      ISO_7730_LIMITS.clo.max,
    );
  });

  test("wme has unit 'met' (not W/m²)", () => {
    expect(PMV_PPD_ISO_INFO.inputs.wme.unit).toBe("met");
  });

  test("outputs contains pmv, ppd, and tsv", () => {
    expect(PMV_PPD_ISO_INFO.outputs).toHaveProperty("pmv");
    expect(PMV_PPD_ISO_INFO.outputs).toHaveProperty("ppd");
    expect(PMV_PPD_ISO_INFO.outputs).toHaveProperty("tsv");
  });

  test("pmv output has applicability bounds [-2, 2]", () => {
    expect(PMV_PPD_ISO_INFO.outputs.pmv.applicability).toBeDefined();
    expect(PMV_PPD_ISO_INFO.outputs.pmv.applicability.min).toBe(-2);
    expect(PMV_PPD_ISO_INFO.outputs.pmv.applicability.max).toBe(2);
  });

  test("ppd output has unit %", () => {
    expect(PMV_PPD_ISO_INFO.outputs.ppd.unit).toBe("%");
  });

  test("tsv output is dimensionless with classifier", () => {
    expect(PMV_PPD_ISO_INFO.outputs.tsv.unit).toBeNull();
    expect(PMV_PPD_ISO_INFO.outputs.tsv.classifier).toBeDefined();
  });

  test("tsv classifier references PMV_THERMAL_SENSATION_VOTE_BINS_ISO", () => {
    expect(PMV_PPD_ISO_INFO.outputs.tsv.classifier).toBe(
      PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
    );
  });
});

describe("Deep freezing — objects are immutable", () => {
  test("HEAT_INDEX_ROTHFUSZ_INFO is frozen", () => {
    expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_INFO)).toBe(true);
  });

  test("HEAT_INDEX_ROTHFUSZ_INFO.inputs is frozen", () => {
    expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_INFO.inputs)).toBe(true);
  });

  test("HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb is frozen", () => {
    expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb)).toBe(true);
  });

  test("HEAT_INDEX_ROTHFUSZ_INFO.outputs is frozen", () => {
    expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_INFO.outputs)).toBe(true);
  });

  test("HEAT_INDEX_STRESS_CATEGORY_BINS nested in INFO is frozen", () => {
    const classifier =
      HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier;
    expect(Object.isFrozen(classifier)).toBe(true);
    expect(Object.isFrozen(classifier.edges)).toBe(true);
    expect(Object.isFrozen(classifier.labels)).toBe(true);
  });

  test("PMV_PPD_ISO_INFO is frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ISO_INFO)).toBe(true);
  });

  test("PMV_PPD_ISO_INFO.inputs is frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ISO_INFO.inputs)).toBe(true);
  });

  test("PMV_PPD_ISO_INFO.inputs.met is frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ISO_INFO.inputs.met)).toBe(true);
  });

  test("PMV_PPD_ISO_INFO.outputs is frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ISO_INFO.outputs)).toBe(true);
  });

  test("PMV_THERMAL_SENSATION_VOTE_BINS_ISO nested in INFO is frozen", () => {
    const classifier = PMV_PPD_ISO_INFO.outputs.tsv.classifier;
    expect(Object.isFrozen(classifier)).toBe(true);
    expect(Object.isFrozen(classifier.edges)).toBe(true);
    expect(Object.isFrozen(classifier.labels)).toBe(true);
  });
});

describe("Identity — bins exported separately are the same object as in INFO", () => {
  test("PMV_THERMAL_SENSATION_VOTE_BINS_ISO === PMV_PPD_ISO_INFO.outputs.tsv.classifier", () => {
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ISO).toBe(
      PMV_PPD_ISO_INFO.outputs.tsv.classifier,
    );
  });

  test("HEAT_INDEX_STRESS_CATEGORY_BINS === HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier", () => {
    expect(HEAT_INDEX_STRESS_CATEGORY_BINS).toBe(
      HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier,
    );
  });
});

describe("Enforcement — extracted constants match runtime validation", () => {
  test("ISO_MET_MIN 0.8 is the lower bound; met < 0.8 returns NaN, met >= 0.8 returns finite", () => {
    // Just below boundary (0.7) with limit_inputs=true should return NaN
    const resultBelow = pmv_ppd_iso(25, 30, 0.1, 50, 0.7, 0.5, 0, {
      limit_inputs: true,
    });
    expect(resultBelow.pmv).toBeNaN();

    // At the boundary (0.8) with limit_inputs=false should return finite PMV
    const resultAt = pmv_ppd_iso(25, 30, 0.1, 50, 0.8, 0.5, 0, {
      limit_inputs: false,
    });
    expect(Number.isFinite(resultAt.pmv)).toBe(true);
    expect(resultAt.pmv).toBeGreaterThanOrEqual(-2);
    expect(resultAt.pmv).toBeLessThanOrEqual(2);
  });

  test("ISO_CLO_MIN 0 and ISO_CLO_MAX 2 are enforced; outside range returns NaN with limit_inputs=true", () => {
    // Below lower boundary (-0.01) should return NaN
    const resultBelow = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, -0.01, 0, {
      limit_inputs: true,
    });
    expect(resultBelow.pmv).toBeNaN();

    // At lower boundary (0) with limit_inputs=false should return finite
    const resultAtMin = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, 0, 0, {
      limit_inputs: false,
    });
    expect(Number.isFinite(resultAtMin.pmv)).toBe(true);

    // At upper boundary (2) with limit_inputs=false should return finite
    const resultAtMax = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, 2, 0, {
      limit_inputs: false,
    });
    expect(Number.isFinite(resultAtMax.pmv)).toBe(true);

    // Above upper boundary (2.01) should return NaN
    const resultAbove = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, 2.01, 0, {
      limit_inputs: true,
    });
    expect(resultAbove.pmv).toBeNaN();
  });

  // NOTE on issue #195: A vapour pressure bound test cannot be written yet.
  // pythermalcomfort enforces vapour pressure in [0, 2700] Pa, but jsthermalcomfort
  // has no such check (see issue #195). When that is fixed, add a test here similar
  // to the met/clo tests above, checking both limit_inputs=true (NaN) and
  // limit_inputs=false (finite output) at the boundaries.
});

describe("Outputs staleness — heat_index output matches INFO", () => {
  test("heat_index_rothfusz output keys match HEAT_INDEX_ROTHFUSZ_INFO.outputs", () => {
    const result = heat_index_rothfusz(28, 60, { limit_inputs: false });
    const resultKeys = Object.keys(result).sort();
    const infoKeys = Object.keys(HEAT_INDEX_ROTHFUSZ_INFO.outputs).sort();
    expect(resultKeys).toEqual(infoKeys);
  });

  test("heat_index_rothfusz always returns hi and stress_category", () => {
    const result = heat_index_rothfusz(28, 60);
    expect(result).toHaveProperty("hi");
    expect(result).toHaveProperty("stress_category");
  });
});

describe("Outputs staleness — pmv_ppd_iso output matches INFO", () => {
  test("pmv_ppd_iso output keys match PMV_PPD_ISO_INFO.outputs", () => {
    const result = pmv_ppd_iso(22, 22, 0.1, 50, 1.0, 0.5, 0, {
      limit_inputs: false,
    });
    const resultKeys = Object.keys(result).sort();
    const infoKeys = Object.keys(PMV_PPD_ISO_INFO.outputs).sort();
    expect(resultKeys).toEqual(infoKeys);
  });

  test("pmv_ppd_iso always returns pmv, ppd, and tsv", () => {
    const result = pmv_ppd_iso(22, 22, 0.1, 50, 1.0, 0.5, 0);
    expect(result).toHaveProperty("pmv");
    expect(result).toHaveProperty("ppd");
    expect(result).toHaveProperty("tsv");
  });
});

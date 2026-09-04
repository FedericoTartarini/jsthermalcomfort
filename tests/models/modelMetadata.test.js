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
import {
  ISO_TDB_MIN,
  ISO_TDB_MAX,
  ISO_TR_MIN,
  ISO_TR_MAX,
  ISO_VR_MIN,
  ISO_VR_MAX,
  ISO_MET_MIN,
  ISO_MET_MAX,
  ISO_CLO_MIN,
  ISO_CLO_MAX,
} from "../../src/utilities/utilities.js";

describe("Model Metadata Exports", () => {
  test("HEAT_INDEX_ROTHFUSZ_INFO is exported from package root", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO).toBeDefined();
    expect(typeof HEAT_INDEX_ROTHFUSZ_INFO).toBe("object");
  });

  test("PMV_PPD_ISO_INFO is exported from package root", () => {
    expect(PMV_PPD_ISO_INFO).toBeDefined();
    expect(typeof PMV_PPD_ISO_INFO).toBe("object");
  });

  test("HEAT_INDEX_STRESS_CATEGORY_BINS is exported from package root", () => {
    expect(HEAT_INDEX_STRESS_CATEGORY_BINS).toBeDefined();
    expect(typeof HEAT_INDEX_STRESS_CATEGORY_BINS).toBe("object");
  });

  test("PMV_THERMAL_SENSATION_VOTE_BINS_ISO is exported from package root", () => {
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ISO).toBeDefined();
    expect(typeof PMV_THERMAL_SENSATION_VOTE_BINS_ISO).toBe("object");
  });

  test("PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE is exported from package root", () => {
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE).toBeDefined();
    expect(typeof PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE).toBe("object");
  });

  test("classifyFromBins function is exported from package root", () => {
    expect(classifyFromBins).toBeDefined();
    expect(typeof classifyFromBins).toBe("function");
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

  test("tdb input has applicability minimum of 27", () => {
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
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier).toBeDefined();
  });

  test("stress_category classifier references HEAT_INDEX_STRESS_CATEGORY_BINS", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier).toBe(
      HEAT_INDEX_STRESS_CATEGORY_BINS
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

  test("tdb has correct applicability bounds", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability.min).toBe(ISO_TDB_MIN);
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability.max).toBe(ISO_TDB_MAX);
  });

  test("tr has correct applicability bounds", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability.min).toBe(ISO_TR_MIN);
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability.max).toBe(ISO_TR_MAX);
  });

  test("vr has correct applicability bounds", () => {
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability.min).toBe(ISO_VR_MIN);
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability.max).toBe(ISO_VR_MAX);
  });

  test("met has correct applicability bounds", () => {
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability.min).toBe(ISO_MET_MIN);
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability.max).toBe(ISO_MET_MAX);
  });

  test("clo has correct applicability bounds", () => {
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability.min).toBe(ISO_CLO_MIN);
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability.max).toBe(ISO_CLO_MAX);
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
      PMV_THERMAL_SENSATION_VOTE_BINS_ISO
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

  test("HEAT_INDEX_STRESS_CATEGORY_BINS in INFO is the same frozen object referenced in outputs", () => {
    const classifier = HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier;
    expect(Object.isFrozen(classifier)).toBe(true);
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

  test("PMV_THERMAL_SENSATION_VOTE_BINS_ISO in INFO is frozen", () => {
    const classifier = PMV_PPD_ISO_INFO.outputs.tsv.classifier;
    expect(Object.isFrozen(classifier)).toBe(true);
  });
});

describe("Identity — bins exported separately are the same object as in INFO", () => {
  test("PMV_THERMAL_SENSATION_VOTE_BINS_ISO === PMV_PPD_ISO_INFO.outputs.tsv.classifier", () => {
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ISO).toBe(
      PMV_PPD_ISO_INFO.outputs.tsv.classifier
    );
  });

  test("HEAT_INDEX_STRESS_CATEGORY_BINS === HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier", () => {
    expect(HEAT_INDEX_STRESS_CATEGORY_BINS).toBe(
      HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier
    );
  });
});

describe("Enforcement — extracted constants match runtime validation", () => {
  test("ISO_MET_MIN 0.8 is the lower bound; met < 0.8 returns NaN", () => {
    // Just below boundary (0.7) - should return NaN due to met < 0.8
    const result1 = pmv_ppd_iso(25, 30, 0.1, 50, 0.7, 0.5, 0, {
      limit_inputs: true,
    });
    expect(result1.pmv).toBeNaN();

    // At the boundary (0.8) - should return valid result
    const result2 = pmv_ppd_iso(25, 30, 0.1, 50, 0.8, 0.5, 0, {
      limit_inputs: true,
    });
    expect(Number.isFinite(result2.pmv)).toBe(true);
  });

  test("ISO_CLO_MIN 0 and ISO_CLO_MAX 2 are enforced", () => {
    // Below lower boundary (-0.01) - should return NaN
    const result1 = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, -0.01, 0, {
      limit_inputs: true,
    });
    expect(result1.pmv).toBeNaN();

    // At lower boundary (0) - should return valid result
    const result2 = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, 0, 0, {
      limit_inputs: true,
    });
    expect(Number.isFinite(result2.pmv)).toBe(true);

    // At upper boundary (2) - should return valid result
    const result3 = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, 2, 0, {
      limit_inputs: true,
    });
    expect(Number.isFinite(result3.pmv)).toBe(true);

    // Above upper boundary (2.01) - should return NaN
    const result4 = pmv_ppd_iso(25, 30, 0.1, 50, 1.0, 2.01, 0, {
      limit_inputs: true,
    });
    expect(result4.pmv).toBeNaN();
  });
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
    const result = pmv_ppd_iso(22, 22, 0.1, 50, 1.0, 0.5, 0, "ISO", {
      limit_inputs: false,
    });
    const resultKeys = Object.keys(result).sort();
    const infoKeys = Object.keys(PMV_PPD_ISO_INFO.outputs).sort();
    expect(resultKeys).toEqual(infoKeys);
  });

  test("pmv_ppd_iso always returns pmv, ppd, and tsv", () => {
    const result = pmv_ppd_iso(22, 22, 0.1, 50, 1.0, 0.5, 0, "ISO");
    expect(result).toHaveProperty("pmv");
    expect(result).toHaveProperty("ppd");
    expect(result).toHaveProperty("tsv");
  });
});

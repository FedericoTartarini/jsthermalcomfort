import { describe, expect, test } from "@jest/globals";
import * as pkg from "../../src/index.js";
import {
  ADAPTIVE_ASHRAE_INFO,
  ADAPTIVE_EN_INFO,
  ANKLE_DRAFT_INFO,
  CLO_TOUT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  HEAT_INDEX_STRESS_CATEGORY_BINS,
  PMV_CATEGORY_BINS_ISO_7730_2025,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
  SOLAR_GAIN_INFO,
  UTCI_INFO,
  UTCI_STRESS_CATEGORY_BINS,
  adaptive_ashrae,
  adaptive_en,
  ankle_draft,
  clo_tout,
  heat_index_rothfusz,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
  solar_gain,
  utci,
} from "../../src/index.js";
import { ADAPTIVE_ASHRAE_LIMITS } from "../../src/models/adaptive_ashrae.ts";
import { ADAPTIVE_EN_LIMITS } from "../../src/models/adaptive_en.ts";
import { ASHRAE_55_V_LIMITED } from "../../src/_internal/ashrae55.ts";
import { SOLAR_GAIN_LIMITS } from "../../src/models/solar_gain.ts";
import { UTCI_LIMITS } from "../../src/models/utci.ts";
import {
  ASHRAE_55_LIMITS,
  ISO_7730_LIMITS,
  Standard,
} from "../../src/utilities/utilities.js";
import type { ModelInfo } from "../../src/models/modelDocs.ts";

// NOTE: A directory scan approach was attempted to make this test self-maintaining,
// but Jest's ESM configuration does not support CommonJS require() or synchronous
// dynamic imports in test files. Keep this hardcoded list instead. When a new model's
// _INFO or _BINS constants are added, this test will fail because the new constant
// is not in the list, catching the JOS3 failure mode: a model whose constants exist
// but are never added to src/models/index.js or src/index.js. The list must be
// manually updated whenever a new *_INFO or *_BINS export is published.
const expectedMetadataExports = [
  "ADAPTIVE_ASHRAE_INFO",
  "ADAPTIVE_EN_INFO",
  "ANKLE_DRAFT_INFO",
  "classifyFromBins",
  "CLO_TOUT_INFO",
  "HEAT_INDEX_ROTHFUSZ_INFO",
  "HEAT_INDEX_STRESS_CATEGORY_BINS",
  "PMV_CATEGORY_BINS_ISO_7730_2005",
  "PMV_CATEGORY_BINS_ISO_7730_2025",
  "PMV_COMPLIANCE_INTERVAL_ASHRAE",
  "PMV_PPD_ASHRAE_INFO",
  "PMV_PPD_ISO_INFO",
  "PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE",
  "PMV_THERMAL_SENSATION_VOTE_BINS_ISO",
  "SOLAR_GAIN_INFO",
  "UTCI_INFO",
  "UTCI_STRESS_CATEGORY_BINS",
];

describe("Model Metadata Exports — enumeration test", () => {
  test("all model metadata and classifier exports are available from package root", () => {
    const packageExports = Object.keys(pkg);

    // Every expected export must be present in the package root
    expectedMetadataExports.forEach((name) => {
      expect(packageExports).toContain(name);
      expect((pkg as Record<string, unknown>)[name]).toBeDefined();
    });
  });

  // Replaced by one export per ISO 7730 edition, so a consumer that read the
  // one set of bins for both fails to import instead of reading other bins.
  test("PMV_CATEGORY_BINS_ISO is gone from the package root", () => {
    expect(Object.keys(pkg)).not.toContain("PMV_CATEGORY_BINS_ISO");
  });
});

// Every exported model info, found by the naming convention rather than listed,
// so a sixth `_INFO` is covered by the name test on arrival.
const exportedInfos = Object.entries(pkg as Record<string, unknown>)
  .filter(([exportName]) => exportName.endsWith("_INFO"))
  .map(([exportName, info]) => ({ exportName, info: info as ModelInfo }));

describe("name — each model info names its model's export", () => {
  test("the naming convention finds every listed model info", () => {
    // Guards the filter itself: a convention that matched nothing would make
    // the tests below pass vacuously.
    expect(exportedInfos.map(({ exportName }) => exportName)).toEqual(
      expect.arrayContaining(
        expectedMetadataExports.filter((name) => name.endsWith("_INFO")),
      ),
    );
  });

  test.each(exportedInfos)(
    "$exportName.name is an exported function whose _INFO is this object",
    ({ exportName, info }) => {
      const exports = pkg as Record<string, unknown>;
      expect(typeof info.name).toBe("string");
      expect(typeof exports[info.name]).toBe("function");
      expect(`${info.name.toUpperCase()}_INFO`).toBe(exportName);
    },
  );
});

describe("HEAT_INDEX_ROTHFUSZ_INFO structure", () => {
  test("has required top-level properties", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.name).toBe("heat_index_rothfusz");
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
    expect(HEAT_INDEX_ROTHFUSZ_INFO.inputs.tdb.applicability!.min).toBe(27);
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
    expect(PMV_PPD_ISO_INFO.name).toBe("pmv_ppd_iso");
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
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability!.min).toBe(
      ISO_7730_LIMITS.tdb.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability!.max).toBe(
      ISO_7730_LIMITS.tdb.max,
    );
  });

  test("tr has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability!.min).toBe(
      ISO_7730_LIMITS.tr.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability!.max).toBe(
      ISO_7730_LIMITS.tr.max,
    );
  });

  test("vr has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability!.min).toBe(
      ISO_7730_LIMITS.vr.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability!.max).toBe(
      ISO_7730_LIMITS.vr.max,
    );
  });

  test("met has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability!.min).toBe(
      ISO_7730_LIMITS.met.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability!.max).toBe(
      ISO_7730_LIMITS.met.max,
    );
  });

  test("clo has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability!.min).toBe(
      ISO_7730_LIMITS.clo.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability!.max).toBe(
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
    expect(PMV_PPD_ISO_INFO.outputs.pmv.applicability!.min).toBe(-2);
    expect(PMV_PPD_ISO_INFO.outputs.pmv.applicability!.max).toBe(2);
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

describe("standards — the editions each model accepts", () => {
  const infos = Object.entries(pkg as Record<string, unknown>)
    .filter(([name]) => name.endsWith("_INFO"))
    .map(([, info]) => info as ModelInfo);

  test("every exported _INFO lists only Standard values", () => {
    expect(infos.length).toBeGreaterThan(0);
    const known: readonly string[] = Object.values(Standard);
    for (const info of infos) {
      for (const standard of info.standards) {
        expect(known).toContain(standard);
      }
    }
  });

  test("PMV_PPD_ISO_INFO.standards is the set pmv_ppd_iso's standard validation accepts", () => {
    // Probe the runtime rather than read its schema: a value belongs in the
    // metadata exactly when pmv_ppd_iso does not throw on it.
    const accepted = Object.values(Standard).filter((standard) => {
      try {
        pmv_ppd_iso({
          tdb: 25,
          tr: 25,
          vr: 0.1,
          rh: 50,
          met: 1.2,
          clo: 0.5,
          wme: 0,
          standard: standard as never,
        });
        return true;
      } catch {
        return false;
      }
    });
    expect([...PMV_PPD_ISO_INFO.standards].sort()).toEqual(accepted.sort());
  });

  test("PMV_PPD_ISO_INFO.standards puts pmv_ppd_iso's default first", () => {
    expect(PMV_PPD_ISO_INFO.standards[0]).toBe(Standard.iso_7730_2025);
  });

  test("HEAT_INDEX_ROTHFUSZ_INFO.standards is empty: the model has no standard", () => {
    expect(HEAT_INDEX_ROTHFUSZ_INFO.standards).toEqual([]);
  });

  test("standards arrays are frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ISO_INFO.standards)).toBe(true);
    expect(Object.isFrozen(HEAT_INDEX_ROTHFUSZ_INFO.standards)).toBe(true);
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
      HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier!;
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
    const classifier = PMV_PPD_ISO_INFO.outputs.tsv.classifier!;
    expect(Object.isFrozen(classifier)).toBe(true);
    expect(Object.isFrozen(classifier.edges)).toBe(true);
    expect(Object.isFrozen(classifier.labels)).toBe(true);
  });
});

describe("Identity — applicability bounds are shared, not copied", () => {
  // Same rule as the bins below: a bound in the metadata must BE the object the
  // runtime checks against, not a literal rebuilt from it. A copy compares
  // equal on the day it is written and can drift silently afterwards.
  test("PMV_PPD_ISO_INFO input bounds are the ISO_7730_LIMITS objects", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tdb.applicability).toBe(ISO_7730_LIMITS.tdb);
    expect(PMV_PPD_ISO_INFO.inputs.tr.applicability).toBe(ISO_7730_LIMITS.tr);
    expect(PMV_PPD_ISO_INFO.inputs.vr.applicability).toBe(ISO_7730_LIMITS.vr);
    expect(PMV_PPD_ISO_INFO.inputs.met.applicability).toBe(ISO_7730_LIMITS.met);
    expect(PMV_PPD_ISO_INFO.inputs.clo.applicability).toBe(ISO_7730_LIMITS.clo);
  });

  test("the derived pa bound is the ISO_7730_LIMITS object", () => {
    expect(PMV_PPD_ISO_INFO.derived!.pa.applicability).toBe(ISO_7730_LIMITS.pa);
    expect(ISO_7730_LIMITS.pa).toEqual({ min: 0, max: 2700 });
  });

  test("the PMV output gate in the metadata is the object the runtime gates on", () => {
    expect(PMV_PPD_ISO_INFO.outputs.pmv.applicability).toBe(
      ISO_7730_LIMITS.pmv,
    );
    expect(ISO_7730_LIMITS.pmv).toEqual({ min: -2, max: 2 });
  });

  test("every ISO_7730_LIMITS entry is frozen, not just the container", () => {
    expect(Object.isFrozen(ISO_7730_LIMITS)).toBe(true);
    for (const key of Object.keys(ISO_7730_LIMITS)) {
      expect(Object.isFrozen(ISO_7730_LIMITS[key])).toBe(true);
    }
  });
});

describe("Identity — bins exported separately are the same object as in INFO", () => {
  test("PMV_THERMAL_SENSATION_VOTE_BINS_ISO === PMV_PPD_ISO_INFO.outputs.tsv.classifier", () => {
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ISO).toBe(
      PMV_PPD_ISO_INFO.outputs.tsv.classifier,
    );
  });

  test("PMV_CATEGORY_BINS_ISO_7730_2025 === PMV_PPD_ISO_INFO.outputs.category.classifier", () => {
    expect(PMV_CATEGORY_BINS_ISO_7730_2025).toBe(
      PMV_PPD_ISO_INFO.outputs.category.classifier,
    );
  });

  test("HEAT_INDEX_STRESS_CATEGORY_BINS === HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier", () => {
    expect(HEAT_INDEX_STRESS_CATEGORY_BINS).toBe(
      HEAT_INDEX_ROTHFUSZ_INFO.outputs.stress_category.classifier,
    );
  });

  test("UTCI_STRESS_CATEGORY_BINS === UTCI_INFO.outputs.stress_category.classifier", () => {
    expect(UTCI_STRESS_CATEGORY_BINS).toBe(
      UTCI_INFO.outputs.stress_category.classifier,
    );
  });
});

describe("Enforcement — extracted constants match runtime validation", () => {
  test("ISO_MET_MIN 0.8 is enforced: below boundary returns NaN (limit=true), on boundary returns finite (limit=true), and just below returns finite (limit=false inside [-2,2])", () => {
    // Part 1: Just below boundary (0.7) with limit_inputs=true should return NaN
    const resultBelowLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 0.7,
      clo: 0.5,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: true,
    });
    expect(resultBelowLimit.pmv).toBeNaN();

    // Part 2: At the boundary (0.8) with limit_inputs=true should return finite
    // (proving 0.8 is accepted, bound is inclusive)
    const resultAtLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 0.8,
      clo: 0.5,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: true,
    });
    expect(Number.isFinite(resultAtLimit.pmv)).toBe(true);

    // Part 3: Just below boundary (0.7) with limit_inputs=false should return finite
    // AND inside [-2, 2] (proving the NaN at met=0.7 limit=true came from the met
    // bound, not the PMV output gate)
    const resultBelowNoLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 0.7,
      clo: 0.5,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: false,
    });
    expect(Number.isFinite(resultBelowNoLimit.pmv)).toBe(true);
    expect(resultBelowNoLimit.pmv).toBeGreaterThanOrEqual(-2);
    expect(resultBelowNoLimit.pmv).toBeLessThanOrEqual(2);
  });

  test("ISO_CLO_MIN 0 and ISO_CLO_MAX 2 are enforced: outside range returns NaN (limit=true), on boundary returns finite (limit=true), and outside returns finite (limit=false inside [-2,2])", () => {
    // Test lower boundary: 0 (inclusive, so -0.01 is outside)
    // Part 1: Just below boundary (-0.01) with limit_inputs=true should return NaN
    const resultBelowMinLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: -0.01,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: true,
    });
    expect(resultBelowMinLimit.pmv).toBeNaN();

    // Part 2: At lower boundary (0) with limit_inputs=true should return finite
    const resultAtMinLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 0,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: true,
    });
    expect(Number.isFinite(resultAtMinLimit.pmv)).toBe(true);

    // Part 3: Just below boundary (-0.01) with limit_inputs=false should return finite
    // AND inside [-2, 2] (proving NaN came from clo bound, not PMV output gate)
    const resultBelowMinNoLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: -0.01,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: false,
    });
    expect(Number.isFinite(resultBelowMinNoLimit.pmv)).toBe(true);
    expect(resultBelowMinNoLimit.pmv).toBeGreaterThanOrEqual(-2);
    expect(resultBelowMinNoLimit.pmv).toBeLessThanOrEqual(2);

    // Test upper boundary: 2 (inclusive, so 2.01 is outside)
    // Part 1: Just above boundary (2.01) with limit_inputs=true should return NaN
    const resultAboveMaxLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 2.01,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: true,
    });
    expect(resultAboveMaxLimit.pmv).toBeNaN();

    // Part 2: At upper boundary (2) with limit_inputs=true should return finite
    const resultAtMaxLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 2,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: true,
    });
    expect(Number.isFinite(resultAtMaxLimit.pmv)).toBe(true);

    // Part 3: Just above boundary (2.01) with limit_inputs=false should return finite
    // AND inside [-2, 2] (proving NaN came from clo bound, not PMV output gate)
    const resultAboveMaxNoLimit = pmv_ppd_iso({
      tdb: 25,
      tr: 30,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 2.01,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: false,
    });
    expect(Number.isFinite(resultAboveMaxNoLimit.pmv)).toBe(true);
    expect(resultAboveMaxNoLimit.pmv).toBeGreaterThanOrEqual(-2);
    expect(resultAboveMaxNoLimit.pmv).toBeLessThanOrEqual(2);
  });

  // NOTE on issue #195: A vapour pressure bound test cannot be written yet.
  // pythermalcomfort enforces vapour pressure in [0, 2700] Pa, but jsthermalcomfort
  // has no such check (see issue #195). When that is fixed, add a test here similar
  // to the met/clo tests above, using the three-part pattern:
  // (1) outside limit_inputs=true -> NaN, (2) on bound limit_inputs=true -> finite,
  // (3) outside limit_inputs=false -> finite AND inside [-2, 2].
});

describe("Outputs staleness — heat_index_rothfusz output matches INFO", () => {
  test("heat_index_rothfusz output keys match HEAT_INDEX_ROTHFUSZ_INFO.outputs", () => {
    const result = heat_index_rothfusz({
      tdb: 28,
      rh: 60,
      limit_inputs: false,
    });
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    const infoKeys = Object.keys(HEAT_INDEX_ROTHFUSZ_INFO.outputs).sort();
    expect(resultKeys).toEqual(infoKeys);
  });

  test("heat_index_rothfusz always returns hi and stress_category", () => {
    const result = heat_index_rothfusz({ tdb: 28, rh: 60 });
    expect(result).toHaveProperty("hi");
    expect(result).toHaveProperty("stress_category");
  });
});

describe("Outputs staleness — pmv_ppd_iso output matches INFO", () => {
  test("pmv_ppd_iso output keys match PMV_PPD_ISO_INFO.outputs", () => {
    const result = pmv_ppd_iso({
      tdb: 22,
      tr: 22,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 0.5,
      wme: 0,
      standard: Standard.iso_7730_2025,
      limit_inputs: false,
    });
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    const infoKeys = Object.keys(PMV_PPD_ISO_INFO.outputs).sort();
    expect(resultKeys).toEqual(infoKeys);
  });

  test("pmv_ppd_iso's warnings rows carry the bounds INFO references", () => {
    const { warnings } = pmv_ppd_iso({
      tdb: 35,
      tr: 45,
      vr: 0.1,
      rh: 30,
      met: 1.0,
      clo: 0.5,
      wme: 0,
    });
    const expected = [
      PMV_PPD_ISO_INFO.inputs.tdb.applicability,
      PMV_PPD_ISO_INFO.inputs.tr.applicability,
      PMV_PPD_ISO_INFO.outputs.pmv.applicability,
    ];
    expect(warnings).toHaveLength(expected.length);
    // Identity, not equality: the rows reference INFO's frozen bounds.
    warnings.forEach((w, i) => expect(w.bound).toBe(expected[i]));
  });

  test("pmv_ppd_iso always returns pmv, ppd, and tsv", () => {
    const result = pmv_ppd_iso({
      tdb: 22,
      tr: 22,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 0.5,
      wme: 0,
    });
    expect(result).toHaveProperty("pmv");
    expect(result).toHaveProperty("ppd");
    expect(result).toHaveProperty("tsv");
  });
});

describe("PMV_PPD_ASHRAE_INFO — the ASHRAE 55 wrapper's metadata", () => {
  test("labels the model and lists ASHRAE 55 as its only standard", () => {
    expect(PMV_PPD_ASHRAE_INFO.name).toBe("pmv_ppd_ashrae");
    expect(PMV_PPD_ASHRAE_INFO.label).toBe("PMV / PPD (ASHRAE 55)");
    expect(typeof PMV_PPD_ASHRAE_INFO.description).toBe("string");
    expect(PMV_PPD_ASHRAE_INFO.standards).toEqual([Standard.ashrae_55_2023]);
  });

  test("inputs are the physical quantities pmv_ppd_ashrae takes, with the ISO wrapper's units", () => {
    expect(Object.keys(PMV_PPD_ASHRAE_INFO.inputs).sort()).toEqual(
      [...Object.keys(PMV_PPD_ISO_INFO.inputs), "v"].sort(),
    );
    for (const key of Object.keys(PMV_PPD_ISO_INFO.inputs)) {
      expect(PMV_PPD_ASHRAE_INFO.inputs[key].unit).toBe(
        PMV_PPD_ISO_INFO.inputs[key].unit,
      );
    }
  });

  // ADR 0004: the average air speed's limits move with the call and arrive
  // as rows, so v has no applicability.
  test("v, the average air speed, is in m/s with no applicability", () => {
    expect(PMV_PPD_ASHRAE_INFO.inputs.v).toEqual({ unit: "m/s" });
  });

  test("input bounds are the ASHRAE_55_LIMITS objects, not copies", () => {
    expect(PMV_PPD_ASHRAE_INFO.inputs.tdb.applicability).toBe(
      ASHRAE_55_LIMITS.tdb,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.tr.applicability).toBe(
      ASHRAE_55_LIMITS.tr,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.vr.applicability).toBe(
      ASHRAE_55_LIMITS.vr,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.met.applicability).toBe(
      ASHRAE_55_LIMITS.met,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.clo.applicability).toBe(
      ASHRAE_55_LIMITS.clo,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.rh.applicability).toBeUndefined();
    expect(PMV_PPD_ASHRAE_INFO.inputs.wme.applicability).toBeUndefined();
  });

  test("pmv_ppd_ashrae's warnings rows carry the bounds INFO references", () => {
    const { warnings } = pmv_ppd_ashrae({
      tdb: 45,
      tr: 25,
      vr: 2.5,
      rh: 50,
      met: 1.2,
      clo: 1.6,
      wme: 0,
    });
    const expected = [
      PMV_PPD_ASHRAE_INFO.inputs.tdb.applicability,
      PMV_PPD_ASHRAE_INFO.inputs.vr.applicability,
      PMV_PPD_ASHRAE_INFO.inputs.clo.applicability,
    ];
    expect(warnings).toHaveLength(expected.length);
    warnings.forEach((w, i) => expect(w.bound).toBe(expected[i]));
  });

  test("pmv_ppd_ashrae output keys match PMV_PPD_ASHRAE_INFO.outputs", () => {
    const result = pmv_ppd_ashrae({
      tdb: 22,
      tr: 22,
      vr: 0.1,
      rh: 50,
      met: 1.0,
      clo: 0.5,
      wme: 0,
      limit_inputs: false,
    });
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    expect(resultKeys).toEqual(Object.keys(PMV_PPD_ASHRAE_INFO.outputs).sort());
  });

  test("tsv's classifier is the ASHRAE bins object, which is not the ISO one", () => {
    expect(PMV_PPD_ASHRAE_INFO.outputs.tsv.classifier).toBe(
      PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
    );
    // Same edges and labels, opposite edge convention (pythermalcomfort#382),
    // so the two constants are distinct objects and INFO must not share them.
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE).not.toBe(
      PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
    );
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE.right).toBe(true);
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ISO.right).toBe(false);
  });

  test("no derived row and no pmv gate: ASHRAE 55 bounds neither vapour pressure nor the PMV output", () => {
    expect(PMV_PPD_ASHRAE_INFO.derived).toBeUndefined();
    expect(PMV_PPD_ASHRAE_INFO.outputs.pmv.applicability).toBeUndefined();
    // 39 °C at 90 % rh is about 6300 Pa, far above ISO 7730's 2700 Pa
    // ceiling, and the resulting PMV is well outside ISO's [-2, 2] band. The
    // ASHRAE wrapper gates neither, so with every input inside
    // ASHRAE_55_LIMITS it still returns a finite PMV.
    const result = pmv_ppd_ashrae({
      tdb: 39,
      tr: 39,
      vr: 0.1,
      rh: 90,
      met: 1.2,
      clo: 0.5,
    });
    expect(Number.isFinite(result.pmv)).toBe(true);
    expect(result.pmv).toBeGreaterThan(2);
    expect(result.warnings).toEqual([]);
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ASHRAE_INFO)).toBe(true);
    expect(Object.isFrozen(PMV_PPD_ASHRAE_INFO.standards)).toBe(true);
    expect(Object.isFrozen(PMV_PPD_ASHRAE_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(PMV_PPD_ASHRAE_INFO.inputs.met)).toBe(true);
    expect(Object.isFrozen(PMV_PPD_ASHRAE_INFO.outputs)).toBe(true);
    const classifier = PMV_PPD_ASHRAE_INFO.outputs.tsv.classifier!;
    expect(Object.isFrozen(classifier)).toBe(true);
    expect(Object.isFrozen(classifier.edges)).toBe(true);
    expect(Object.isFrozen(classifier.labels)).toBe(true);
  });
});

describe("ADAPTIVE_ASHRAE_INFO — the adaptive model's metadata", () => {
  test("labels the model and lists ASHRAE 55 as its only standard", () => {
    expect(ADAPTIVE_ASHRAE_INFO.name).toBe("adaptive_ashrae");
    expect(ADAPTIVE_ASHRAE_INFO.label).toBe("Adaptive (ASHRAE 55)");
    expect(typeof ADAPTIVE_ASHRAE_INFO.description).toBe("string");
    expect(ADAPTIVE_ASHRAE_INFO.standards).toEqual([Standard.ashrae_55_2023]);
  });

  test("inputs are adaptive_ashrae's four positional quantities", () => {
    expect(Object.keys(ADAPTIVE_ASHRAE_INFO.inputs)).toEqual([
      "tdb",
      "tr",
      "t_running_mean",
      "v",
    ]);
    expect(ADAPTIVE_ASHRAE_INFO.inputs.tdb.unit).toBe("°C");
    expect(ADAPTIVE_ASHRAE_INFO.inputs.tr.unit).toBe("°C");
    expect(ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.unit).toBe("°C");
    expect(ADAPTIVE_ASHRAE_INFO.inputs.v.unit).toBe("m/s");
  });

  test("input bounds are the limits objects the gate reads, not copies", () => {
    expect(ADAPTIVE_ASHRAE_INFO.inputs.tdb.applicability).toBe(
      ASHRAE_55_LIMITS.tdb,
    );
    expect(ADAPTIVE_ASHRAE_INFO.inputs.tr.applicability).toBe(
      ASHRAE_55_LIMITS.tr,
    );
    // The function's input is `v`; `_ashrae_compliance` applies the same
    // limit to `v` and `vr`, and ASHRAE_55_LIMITS names the PMV input.
    expect(ADAPTIVE_ASHRAE_INFO.inputs.v.applicability).toBe(
      ASHRAE_55_LIMITS.vr,
    );
    expect(ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean.applicability).toBe(
      ADAPTIVE_ASHRAE_LIMITS.t_running_mean,
    );
    expect(ADAPTIVE_ASHRAE_LIMITS.t_running_mean).toEqual({
      min: 10,
      max: 33.5,
    });
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_LIMITS)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_LIMITS.t_running_mean)).toBe(true);
  });

  test("the t_running_mean bound is the one adaptive_ashrae gates on, inclusive at both ends", () => {
    const { min, max } = ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean
      .applicability as { min: number; max: number };
    const tmp_cmf = (trm: number) =>
      adaptive_ashrae({ tdb: 25, tr: 25, t_running_mean: trm, v: 0.1 }).tmp_cmf;
    expect(tmp_cmf(min - 0.01)).toBeNaN();
    expect(Number.isFinite(tmp_cmf(min))).toBe(true);
    expect(Number.isFinite(tmp_cmf(max))).toBe(true);
    expect(tmp_cmf(max + 0.01)).toBeNaN();
    // With limit_inputs off the same values compute, so the NaN above came
    // from the bound and not from the arithmetic.
    expect(
      Number.isFinite(
        adaptive_ashrae({
          tdb: 25,
          tr: 25,
          t_running_mean: min - 0.01,
          v: 0.1,
          units: "SI",
          limit_inputs: false,
        }).tmp_cmf,
      ),
    ).toBe(true);
  });

  test("the tdb, tr and v bounds are the ones adaptive_ashrae gates on", () => {
    const tmp_cmf = (tdb: number, tr: number, v: number) =>
      adaptive_ashrae({ tdb, tr, t_running_mean: 20, v }).tmp_cmf;
    const { tdb, tr, vr } = ASHRAE_55_LIMITS;
    expect(tmp_cmf(tdb.max + 0.01, 25, 0.1)).toBeNaN();
    expect(Number.isFinite(tmp_cmf(tdb.max, 25, 0.1))).toBe(true);
    expect(tmp_cmf(25, tr.min - 0.01, 0.1)).toBeNaN();
    expect(Number.isFinite(tmp_cmf(25, tr.min, 0.1))).toBe(true);
    expect(tmp_cmf(25, 25, vr.max + 0.01)).toBeNaN();
    expect(Number.isFinite(tmp_cmf(25, 25, vr.max))).toBe(true);
  });

  test("adaptive_ashrae output keys match ADAPTIVE_ASHRAE_INFO.outputs", () => {
    const result = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 20,
      v: 0.1,
    });
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    expect(resultKeys).toEqual(
      Object.keys(ADAPTIVE_ASHRAE_INFO.outputs).sort(),
    );
  });

  test("temperature outputs are in °C, boolean outputs are unitless and unclassified", () => {
    const result = adaptive_ashrae({
      tdb: 25,
      tr: 25,
      t_running_mean: 20,
      v: 0.1,
    }) as Record<string, unknown>;
    for (const [key, info] of Object.entries(ADAPTIVE_ASHRAE_INFO.outputs)) {
      if (typeof result[key] === "boolean") {
        expect(info.unit).toBeNull();
        expect(info.classifier).toBeUndefined();
      } else {
        expect(typeof result[key]).toBe("number");
        expect(info.unit).toBe("°C");
      }
    }
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_INFO)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_INFO.standards)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_INFO.inputs.t_running_mean)).toBe(
      true,
    );
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_INFO.outputs)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_ASHRAE_INFO.outputs.acceptability_80)).toBe(
      true,
    );
  });
});

describe("ADAPTIVE_EN_INFO — the EN 16798-1 adaptive model's metadata", () => {
  const base = { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 };

  // Upstream's Models enum has no EN 16798-1 member, so neither has Standard.
  test("labels the model and lists no standard", () => {
    expect(ADAPTIVE_EN_INFO.name).toBe("adaptive_en");
    expect(ADAPTIVE_EN_INFO.label).toBe("Adaptive (EN 16798-1)");
    expect(typeof ADAPTIVE_EN_INFO.description).toBe("string");
    expect(ADAPTIVE_EN_INFO.standards).toEqual([]);
  });

  test("inputs are adaptive_en's four quantities, with adaptive_ashrae's units", () => {
    expect(Object.keys(ADAPTIVE_EN_INFO.inputs)).toEqual([
      "tdb",
      "tr",
      "t_running_mean",
      "v",
    ]);
    // The same quantity has the same unit in every model (ADR 0011).
    for (const key of ["tdb", "tr", "t_running_mean", "v"]) {
      expect(ADAPTIVE_EN_INFO.inputs[key].unit).toBe(
        ADAPTIVE_ASHRAE_INFO.inputs[key].unit,
      );
    }
  });

  // Upstream bounds t_running_mean only (adaptive_en.py:122 at v4.6.2).
  test("t_running_mean's bound is the ADAPTIVE_EN_LIMITS object; tdb, tr and v have none", () => {
    expect(ADAPTIVE_EN_INFO.inputs.t_running_mean.applicability).toBe(
      ADAPTIVE_EN_LIMITS.t_running_mean,
    );
    expect(ADAPTIVE_EN_LIMITS.t_running_mean).not.toBe(
      ADAPTIVE_ASHRAE_LIMITS.t_running_mean,
    );
    for (const key of ["tdb", "tr", "v"]) {
      expect(ADAPTIVE_EN_INFO.inputs[key].applicability).toBeUndefined();
    }
    expect(ADAPTIVE_EN_INFO.derived).toBeUndefined();
  });

  test("adaptive_en's warnings row carries the bound INFO references, keyed as INFO keys it", () => {
    const { warnings } = adaptive_en({
      ...base,
      t_running_mean: 40,
      limit_inputs: false,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].key).toBe("t_running_mean");
    expect(warnings[0].bound).toBe(
      ADAPTIVE_EN_INFO.inputs.t_running_mean.applicability,
    );
  });

  test("the t_running_mean bound is the one adaptive_en gates on, inclusive at both ends", () => {
    const { min, max } = ADAPTIVE_EN_INFO.inputs.t_running_mean
      .applicability as { min: number; max: number };
    const tmp_cmf = (trm: number, limit_inputs = true) =>
      adaptive_en({ ...base, t_running_mean: trm, limit_inputs }).tmp_cmf;
    expect(tmp_cmf(min - 0.01)).toBeNaN();
    expect(Number.isFinite(tmp_cmf(min))).toBe(true);
    expect(Number.isFinite(tmp_cmf(max))).toBe(true);
    expect(tmp_cmf(max + 0.01)).toBeNaN();
    // With limit_inputs off the same values compute, so the NaN above came
    // from the bound and not from the arithmetic.
    expect(Number.isFinite(tmp_cmf(min - 0.01, false))).toBe(true);
    expect(Number.isFinite(tmp_cmf(max + 0.01, false))).toBe(true);
  });

  test("adaptive_en output keys match ADAPTIVE_EN_INFO.outputs", () => {
    const result = adaptive_en(base);
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    expect(resultKeys).toEqual(Object.keys(ADAPTIVE_EN_INFO.outputs).sort());
  });

  test("temperature outputs are in °C, boolean outputs are unitless and unclassified", () => {
    const result = adaptive_en(base) as Record<string, unknown>;
    for (const [key, info] of Object.entries(ADAPTIVE_EN_INFO.outputs)) {
      if (typeof result[key] === "boolean") {
        expect(info.unit).toBeNull();
        expect(info.classifier).toBeUndefined();
      } else {
        expect(typeof result[key]).toBe("number");
        expect(info.unit).toBe("°C");
      }
    }
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(ADAPTIVE_EN_INFO)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_EN_INFO.standards)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_EN_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_EN_INFO.inputs.t_running_mean)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_EN_INFO.inputs.v)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_EN_INFO.outputs)).toBe(true);
    expect(Object.isFrozen(ADAPTIVE_EN_INFO.outputs.acceptability_cat_i)).toBe(
      true,
    );
  });
});

describe("ANKLE_DRAFT_INFO — the ankle draft model's metadata", () => {
  const base = {
    tdb: 25,
    tr: 25,
    vr: 0.2,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    v_ankle: 0.3,
  };

  test("labels the model and lists ASHRAE 55 as its only standard", () => {
    expect(ANKLE_DRAFT_INFO.name).toBe("ankle_draft");
    expect(ANKLE_DRAFT_INFO.label).toBe("Ankle draft");
    expect(typeof ANKLE_DRAFT_INFO.description).toBe("string");
    expect(ANKLE_DRAFT_INFO.standards).toEqual([Standard.ashrae_55_2023]);
  });

  test("inputs are ankle_draft's seven quantities, in SI units", () => {
    expect(Object.keys(ANKLE_DRAFT_INFO.inputs)).toEqual([
      "tdb",
      "tr",
      "vr",
      "rh",
      "met",
      "clo",
      "v_ankle",
    ]);
    // The same quantity has the same unit as in the PMV wrapper (ADR 0011).
    for (const key of ["tdb", "tr", "vr", "rh", "met", "clo"]) {
      expect(ANKLE_DRAFT_INFO.inputs[key].unit).toBe(
        PMV_PPD_ASHRAE_INFO.inputs[key].unit,
      );
    }
    expect(ANKLE_DRAFT_INFO.inputs.v_ankle).toEqual({ unit: "m/s" });
  });

  test("input bounds are the ASHRAE_55_LIMITS objects, not copies", () => {
    for (const key of ["tdb", "tr", "met", "clo"] as const) {
      expect(ANKLE_DRAFT_INFO.inputs[key].applicability).toBe(
        ASHRAE_55_LIMITS[key],
      );
    }
    expect(ANKLE_DRAFT_INFO.inputs.rh.applicability).toBeUndefined();
  });

  // vr is checked twice, against 0 to 2 and 0 to 0.2 m/s; outside the
  // narrower range the model throws, so that is the range it computes in.
  test("vr's bound is ASHRAE_55_V_LIMITED, and there is no derived quantity", () => {
    expect(ANKLE_DRAFT_INFO.inputs.vr.applicability).toBe(ASHRAE_55_V_LIMITED);
    expect(ASHRAE_55_V_LIMITED).toEqual({ min: 0, max: 0.2 });
    expect(Object.isFrozen(ASHRAE_55_V_LIMITED)).toBe(true);
    expect(ANKLE_DRAFT_INFO.derived).toBeUndefined();
  });

  test("ankle_draft's warnings rows carry the bounds INFO references, keyed as INFO keys them", () => {
    const { warnings } = ankle_draft({
      tdb: 45,
      tr: 5,
      vr: 2.5,
      rh: 50,
      met: 0.5,
      clo: 1.6,
      v_ankle: 0.1,
      limit_inputs: false,
      // The cooling effect cannot be calculated here; its console message is
      // not what this test checks.
      suppress_warnings: true,
    });
    // vr's first row carries the wider range, which INFO does not publish:
    // any vr outside it is outside the published one too.
    const expected = [
      ["tdb", ANKLE_DRAFT_INFO.inputs.tdb.applicability],
      ["tr", ANKLE_DRAFT_INFO.inputs.tr.applicability],
      ["vr", ASHRAE_55_LIMITS.vr],
      ["met", ANKLE_DRAFT_INFO.inputs.met.applicability],
      ["clo", ANKLE_DRAFT_INFO.inputs.clo.applicability],
      ["vr", ANKLE_DRAFT_INFO.inputs.vr.applicability],
    ];
    expect(warnings).toHaveLength(expected.length);
    warnings.forEach((w, i) => {
      expect(w.key).toBe(expected[i][0]);
      expect(w.bound).toBe(expected[i][1]);
    });
  });

  test("the published bounds are the ones ankle_draft gates on, inclusive at both ends", () => {
    const ppd_ad = (input: Partial<typeof base>) =>
      ankle_draft({ ...base, ...input }).ppd_ad;
    for (const key of ["tdb", "tr", "met", "clo"] as const) {
      const { min, max } = ANKLE_DRAFT_INFO.inputs[key].applicability as {
        min: number;
        max: number;
      };
      expect(Number.isFinite(ppd_ad({ [key]: min }))).toBe(true);
      expect(ppd_ad({ [key]: min - 0.01 })).toBeNaN();
      expect(Number.isFinite(ppd_ad({ [key]: max }))).toBe(true);
      expect(ppd_ad({ [key]: max + 0.01 })).toBeNaN();
    }
    // vr outside its bound throws under limit_inputs, so its edges are a
    // number and a throw.
    const { min, max } = ANKLE_DRAFT_INFO.inputs.vr.applicability as {
      min: number;
      max: number;
    };
    expect(Number.isFinite(ppd_ad({ vr: min }))).toBe(true);
    expect(Number.isFinite(ppd_ad({ vr: max }))).toBe(true);
    expect(() => ppd_ad({ vr: min - 0.01 })).toThrow(RangeError);
    expect(() => ppd_ad({ vr: max + 0.01 })).toThrow(RangeError);
  });

  test("ankle_draft output keys match ANKLE_DRAFT_INFO.outputs", () => {
    const result = ankle_draft(base);
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    expect(resultKeys).toEqual(Object.keys(ANKLE_DRAFT_INFO.outputs).sort());
    expect(ANKLE_DRAFT_INFO.outputs.ppd_ad.unit).toBe("%");
    expect(typeof result.acceptability).toBe("boolean");
    expect(ANKLE_DRAFT_INFO.outputs.acceptability).toEqual({ unit: null });
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(ANKLE_DRAFT_INFO)).toBe(true);
    expect(Object.isFrozen(ANKLE_DRAFT_INFO.standards)).toBe(true);
    expect(Object.isFrozen(ANKLE_DRAFT_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(ANKLE_DRAFT_INFO.inputs.v_ankle)).toBe(true);
    expect(Object.isFrozen(ANKLE_DRAFT_INFO.inputs.vr)).toBe(true);
    expect(Object.isFrozen(ANKLE_DRAFT_INFO.outputs)).toBe(true);
    expect(Object.isFrozen(ANKLE_DRAFT_INFO.outputs.acceptability)).toBe(true);
  });
});

describe("UTCI_INFO — the UTCI model's metadata", () => {
  test("labels the model and lists no standard", () => {
    expect(UTCI_INFO.name).toBe("utci");
    expect(UTCI_INFO.label).toBe("UTCI");
    expect(typeof UTCI_INFO.description).toBe("string");
    expect(UTCI_INFO.standards).toEqual([]);
  });

  test("inputs are utci's four quantities", () => {
    expect(Object.keys(UTCI_INFO.inputs)).toEqual(["tdb", "tr", "v", "rh"]);
    expect(UTCI_INFO.inputs.tdb.unit).toBe("°C");
    expect(UTCI_INFO.inputs.tr.unit).toBe("°C");
    expect(UTCI_INFO.inputs.v.unit).toBe("m/s");
    expect(UTCI_INFO.inputs.rh.unit).toBe("%");
  });

  test("bounds are the UTCI_LIMITS objects the gate reads, not copies", () => {
    // `toBe`, not `toEqual`: a rebuilt literal would satisfy equality and
    // then be free to drift from what the runtime enforces.
    expect(UTCI_INFO.inputs.tdb.applicability).toBe(UTCI_LIMITS.tdb);
    expect(UTCI_INFO.inputs.v.applicability).toBe(UTCI_LIMITS.v);
    expect(UTCI_INFO.inputs.rh.applicability).toBe(UTCI_LIMITS.rh);
    expect(UTCI_INFO.derived!.tr_minus_tdb.applicability).toBe(
      UTCI_LIMITS.tr_minus_tdb,
    );
    expect(UTCI_INFO.derived!.pa.applicability).toBe(UTCI_LIMITS.pa);
    // Upstream checks pa in kPa, 0 to 5; the key pa is in Pa (ADR 0011).
    expect(UTCI_LIMITS).toEqual({
      tdb: { min: -50, max: 50 },
      v: { min: 0.5, max: 17 },
      tr_minus_tdb: { min: -30, max: 70 },
      pa: { min: 0, max: 5000 },
      rh: { min: 0, max: 100 },
    });
    // tr is bounded only through its difference from tdb.
    expect(UTCI_INFO.inputs.tr.applicability).toBeUndefined();
    expect(Object.keys(UTCI_INFO.derived!)).toEqual(["tr_minus_tdb", "pa"]);
    expect(UTCI_INFO.derived!.tr_minus_tdb.unit).toBe("°C");
    expect(UTCI_INFO.derived!.pa.unit).toBe("Pa");
  });

  test("every UTCI_LIMITS entry is frozen, not just the container", () => {
    expect(Object.isFrozen(UTCI_LIMITS)).toBe(true);
    for (const bound of Object.values(UTCI_LIMITS)) {
      expect(Object.isFrozen(bound)).toBe(true);
    }
  });

  test("the published bounds are the ones utci gates on, inclusive at both ends", () => {
    const value = (tdb: number, tr: number, v: number, rh = 50) =>
      utci({ tdb, tr, v, rh }).utci;
    const { tdb, v } = UTCI_INFO.inputs;
    const { min: tdbMin, max: tdbMax } = tdb.applicability as {
      min: number;
      max: number;
    };
    const { min: vMin, max: vMax } = v.applicability as {
      min: number;
      max: number;
    };
    const { min: diffMin, max: diffMax } = UTCI_INFO.derived!.tr_minus_tdb
      .applicability as { min: number; max: number };
    // Dry at the tdb maximum: 50 % RH at 50 °C is above the pa bound.
    expect(Number.isFinite(value(tdbMax, tdbMax, 1, 0))).toBe(true);
    expect(value(tdbMax + 0.01, tdbMax, 1, 0)).toBeNaN();
    expect(Number.isFinite(value(tdbMin, tdbMin, 1))).toBe(true);
    expect(value(tdbMin - 0.01, tdbMin, 1)).toBeNaN();
    expect(Number.isFinite(value(20, 20, vMin))).toBe(true);
    expect(value(20, 20, vMin - 0.01)).toBeNaN();
    expect(Number.isFinite(value(20, 20, vMax))).toBe(true);
    expect(value(20, 20, vMax + 0.01)).toBeNaN();
    expect(Number.isFinite(value(20, 20 + diffMax, 1))).toBe(true);
    expect(value(20, 20 + diffMax + 0.01, 1)).toBeNaN();
    expect(Number.isFinite(value(20, 20 + diffMin, 1))).toBe(true);
    expect(value(20, 20 + diffMin - 0.01, 1)).toBeNaN();
    const { min: rhMin, max: rhMax } = UTCI_INFO.inputs.rh.applicability as {
      min: number;
      max: number;
    };
    expect(Number.isFinite(value(20, 20, 1, rhMin))).toBe(true);
    expect(value(20, 20, 1, rhMin - 0.01)).toBeNaN();
    expect(Number.isFinite(value(20, 20, 1, rhMax))).toBe(true);
    expect(value(20, 20, 1, rhMax + 0.01)).toBeNaN();
    // Upstream's inclusive-edge inputs (tests/test_utci.py:65-77 at v4.6.2):
    // at 40 °C this rh gives exactly 5 kPa, so 5000 Pa, UTCI_INFO's pa max.
    expect(UTCI_INFO.derived!.pa.applicability!.max).toBe(5000);
    expect(Number.isFinite(value(40, 40, 1, 67.70206528209202))).toBe(true);
    expect(value(40, 40, 1, 67.70206528209202 + 1e-10)).toBeNaN();
  });

  test("stress_category is dimensionless and classified by UTCI_STRESS_CATEGORY_BINS", () => {
    expect(UTCI_INFO.outputs.utci.unit).toBe("°C");
    expect(UTCI_INFO.outputs.stress_category.unit).toBeNull();
    expect(UTCI_INFO.outputs.stress_category.classifier).toBe(
      UTCI_STRESS_CATEGORY_BINS,
    );
    expect(UTCI_STRESS_CATEGORY_BINS.right).toBe(true);
    expect(UTCI_STRESS_CATEGORY_BINS.edges).toEqual([
      -40, -27, -13, 0, 9, 26, 32, 38, 46, 1000,
    ]);
    expect(UTCI_STRESS_CATEGORY_BINS.labels).toHaveLength(
      UTCI_STRESS_CATEGORY_BINS.edges.length,
    );
  });

  test("utci output keys match UTCI_INFO.outputs", () => {
    const result = utci({ tdb: 25, tr: 25, v: 1, rh: 50 });
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    expect(resultKeys).toEqual(Object.keys(UTCI_INFO.outputs).sort());
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(UTCI_INFO)).toBe(true);
    expect(Object.isFrozen(UTCI_INFO.standards)).toBe(true);
    expect(Object.isFrozen(UTCI_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(UTCI_INFO.inputs.tdb)).toBe(true);
    expect(Object.isFrozen(UTCI_INFO.outputs)).toBe(true);
    expect(Object.isFrozen(UTCI_INFO.derived)).toBe(true);
    expect(Object.isFrozen(UTCI_INFO.derived!.tr_minus_tdb)).toBe(true);
    const classifier = UTCI_INFO.outputs.stress_category.classifier!;
    expect(Object.isFrozen(classifier)).toBe(true);
    expect(Object.isFrozen(classifier.edges)).toBe(true);
    expect(Object.isFrozen(classifier.labels)).toBe(true);
  });
});

describe("CLO_TOUT_INFO — the clothing prediction's metadata", () => {
  test("labels the function and lists no standard", () => {
    expect(CLO_TOUT_INFO.name).toBe("clo_tout");
    expect(typeof CLO_TOUT_INFO.label).toBe("string");
    expect(CLO_TOUT_INFO.description).toMatch(/Schiavon/);
    expect(CLO_TOUT_INFO.description).toMatch(/2013/);
    expect(CLO_TOUT_INFO.standards).toEqual([]);
  });

  test("tout is the one input, in °C, with no applicability", () => {
    expect(Object.keys(CLO_TOUT_INFO.inputs)).toEqual(["tout"]);
    expect(CLO_TOUT_INFO.inputs.tout.unit).toBe("°C");
    // Upstream bounds nothing: the formula saturates below -5 °C and at or
    // above 26 °C, so there is no gate to publish.
    expect(CLO_TOUT_INFO.inputs.tout.applicability).toBeUndefined();
    expect(CLO_TOUT_INFO.derived).toBeUndefined();
  });

  test("clo_tout is the one output, in clo", () => {
    expect(Object.keys(CLO_TOUT_INFO.outputs)).toEqual(["clo_tout"]);
    expect(CLO_TOUT_INFO.outputs.clo_tout.unit).toBe("clo");
    expect(CLO_TOUT_INFO.outputs.clo_tout.applicability).toBeUndefined();
  });

  test("clo_tout output keys match CLO_TOUT_INFO.outputs", () => {
    // No warnings field to filter out: there is no gate to report.
    expect(Object.keys(clo_tout({ tout: 20 })).sort()).toEqual(
      Object.keys(CLO_TOUT_INFO.outputs).sort(),
    );
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(CLO_TOUT_INFO)).toBe(true);
    expect(Object.isFrozen(CLO_TOUT_INFO.standards)).toBe(true);
    expect(Object.isFrozen(CLO_TOUT_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(CLO_TOUT_INFO.inputs.tout)).toBe(true);
    expect(Object.isFrozen(CLO_TOUT_INFO.outputs)).toBe(true);
    expect(Object.isFrozen(CLO_TOUT_INFO.outputs.clo_tout)).toBe(true);
  });
});

describe("SOLAR_GAIN_INFO — the solar gain's metadata", () => {
  test("labels the function and lists no standard", () => {
    expect(SOLAR_GAIN_INFO.name).toBe("solar_gain");
    expect(typeof SOLAR_GAIN_INFO.label).toBe("string");
    expect(SOLAR_GAIN_INFO.description).toMatch(
      /ASHRAE 55 Normative Appendix C/,
    );
    expect(SOLAR_GAIN_INFO.standards).toEqual([]);
  });

  test("inputs are the eight numeric parameters with their units; posture is not one", () => {
    expect(Object.keys(SOLAR_GAIN_INFO.inputs)).toEqual([
      "sol_altitude",
      "sharp",
      "sol_radiation_dir",
      "sol_transmittance",
      "f_svv",
      "f_bes",
      "asw",
      "floor_reflectance",
    ]);
    expect(SOLAR_GAIN_INFO.inputs).not.toHaveProperty("posture");
    expect(SOLAR_GAIN_INFO.inputs.sol_altitude.unit).toBe("°");
    expect(SOLAR_GAIN_INFO.inputs.sharp.unit).toBe("°");
    expect(SOLAR_GAIN_INFO.inputs.sol_radiation_dir.unit).toBe("W/m²");
    for (const key of [
      "sol_transmittance",
      "f_svv",
      "f_bes",
      "asw",
      "floor_reflectance",
    ]) {
      expect(SOLAR_GAIN_INFO.inputs[key].unit).toBeNull();
    }
    expect(SOLAR_GAIN_INFO.derived).toBeUndefined();
  });

  test("bounds are the SOLAR_GAIN_LIMITS objects the function reads, not copies", () => {
    // `toBe`, not `toEqual`: a rebuilt literal would satisfy equality and
    // then be free to drift from what the runtime reports.
    expect(SOLAR_GAIN_INFO.inputs.sol_altitude.applicability).toBe(
      SOLAR_GAIN_LIMITS.sol_altitude,
    );
    expect(SOLAR_GAIN_INFO.inputs.sharp.applicability).toBe(
      SOLAR_GAIN_LIMITS.sharp,
    );
    expect(SOLAR_GAIN_INFO.inputs.sol_radiation_dir.applicability).toBe(
      SOLAR_GAIN_LIMITS.sol_radiation_dir,
    );
    expect(SOLAR_GAIN_INFO.inputs.asw.applicability).toBe(
      SOLAR_GAIN_LIMITS.asw,
    );
    expect(SOLAR_GAIN_LIMITS).toEqual({
      sol_altitude: { min: 0, max: 90 },
      sharp: { min: 0, max: 180 },
      sol_radiation_dir: { min: 200, max: 1000 },
      asw: { min: 0.2, max: 0.9 },
    });
    // The fractions' 0 to 1 is definitional, and floor_reflectance is
    // ASHRAE 55's fixed 0.6.
    for (const key of [
      "sol_transmittance",
      "f_svv",
      "f_bes",
      "floor_reflectance",
    ]) {
      expect(SOLAR_GAIN_INFO.inputs[key].applicability).toBeUndefined();
    }
  });

  test("every SOLAR_GAIN_LIMITS entry is frozen, not just the container", () => {
    expect(Object.isFrozen(SOLAR_GAIN_LIMITS)).toBe(true);
    for (const bound of Object.values(SOLAR_GAIN_LIMITS)) {
      expect(Object.isFrozen(bound)).toBe(true);
    }
  });

  test("outputs are erf in W/m² and delta_mrt in °C", () => {
    expect(Object.keys(SOLAR_GAIN_INFO.outputs)).toEqual(["erf", "delta_mrt"]);
    expect(SOLAR_GAIN_INFO.outputs.erf.unit).toBe("W/m²");
    expect(SOLAR_GAIN_INFO.outputs.delta_mrt.unit).toBe("°C");
  });

  test("solar_gain output keys match SOLAR_GAIN_INFO.outputs", () => {
    const result = solar_gain({
      sol_altitude: 0,
      sharp: 120,
      sol_radiation_dir: 800,
      sol_transmittance: 0.5,
      f_svv: 0.5,
      f_bes: 0.5,
    });
    // `warnings` lists the bounds a call broke; it is not a quantity, so
    // INFO.outputs does not describe it (#199).
    const resultKeys = Object.keys(result)
      .filter((key) => key !== "warnings")
      .sort();
    expect(resultKeys).toEqual(Object.keys(SOLAR_GAIN_INFO.outputs).sort());
  });

  test("is deep-frozen", () => {
    expect(Object.isFrozen(SOLAR_GAIN_INFO)).toBe(true);
    expect(Object.isFrozen(SOLAR_GAIN_INFO.standards)).toBe(true);
    expect(Object.isFrozen(SOLAR_GAIN_INFO.inputs)).toBe(true);
    expect(Object.isFrozen(SOLAR_GAIN_INFO.inputs.sol_altitude)).toBe(true);
    expect(Object.isFrozen(SOLAR_GAIN_INFO.inputs.f_svv)).toBe(true);
    expect(Object.isFrozen(SOLAR_GAIN_INFO.outputs)).toBe(true);
    expect(Object.isFrozen(SOLAR_GAIN_INFO.outputs.erf)).toBe(true);
  });
});

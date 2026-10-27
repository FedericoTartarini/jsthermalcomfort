import { describe, expect, test } from "vitest";
import * as pkg from "../../src/index.ts";
import {
  ADAPTIVE_ASHRAE_INFO,
  CLO_TOUT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  PMV_CATEGORY_BINS_ISO_7730_2025,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
  adaptive_ashrae,
  clo_tout,
  pmv_ppd_ashrae,
  pmv_ppd_iso,
} from "../../src/index.ts";
import { ASHRAE_55_LIMITS } from "../../src/_internal/ashrae55.ts";
import { ISO_7730_LIMITS } from "../../src/utilities/utilities.js";
import { Standard } from "../../src/utilities/options.ts";
import type {
  LegacyModelInfo,
  ModelInfo,
} from "../../src/_internal/modelInfo.ts";
import { isDeepFrozen } from "./modelContract.ts";

// The list catches a constant missing from src/models/index.ts or
// src/index.ts, which a scan of the package cannot.
const expectedMetadataExports = [
  "ADAPTIVE_ASHRAE_INFO",
  "classifyFromBins",
  "CLO_TOUT_INFO",
  "HEAT_INDEX_ROTHFUSZ_INFO",
  "PMV_CATEGORY_BINS_ISO_7730_2005",
  "PMV_CATEGORY_BINS_ISO_7730_2025",
  "PMV_COMPLIANCE_INTERVAL_ASHRAE",
  "PMV_PPD_ASHRAE_INFO",
  "PMV_PPD_ISO_INFO",
  "PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE",
  "PMV_THERMAL_SENSATION_VOTE_BINS_ISO",
  "SOLAR_GAIN_INFO",
  "UTCI_INFO",
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
    expect(PMV_PPD_ISO_INFO.inputs.tdb!.applicability!.min).toBe(
      ISO_7730_LIMITS.tdb!.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tdb!.applicability!.max).toBe(
      ISO_7730_LIMITS.tdb!.max,
    );
  });

  test("tr has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tr!.applicability!.min).toBe(
      ISO_7730_LIMITS.tr!.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tr!.applicability!.max).toBe(
      ISO_7730_LIMITS.tr!.max,
    );
  });

  test("vr has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.vr!.applicability!.min).toBe(
      ISO_7730_LIMITS.vr!.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.vr!.applicability!.max).toBe(
      ISO_7730_LIMITS.vr!.max,
    );
  });

  test("met has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.met!.applicability!.min).toBe(
      ISO_7730_LIMITS.met!.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.met!.applicability!.max).toBe(
      ISO_7730_LIMITS.met!.max,
    );
  });

  test("clo has correct applicability bounds from ISO_7730_LIMITS", () => {
    expect(PMV_PPD_ISO_INFO.inputs.clo!.applicability!.min).toBe(
      ISO_7730_LIMITS.clo!.min,
    );
    expect(PMV_PPD_ISO_INFO.inputs.clo!.applicability!.max).toBe(
      ISO_7730_LIMITS.clo!.max,
    );
  });

  test("wme has unit 'met' (not W/m²)", () => {
    expect(PMV_PPD_ISO_INFO.inputs.wme!.unit).toBe("met");
  });

  test("outputs contains pmv, ppd, and tsv", () => {
    expect(PMV_PPD_ISO_INFO.outputs).toHaveProperty("pmv");
    expect(PMV_PPD_ISO_INFO.outputs).toHaveProperty("ppd");
    expect(PMV_PPD_ISO_INFO.outputs).toHaveProperty("tsv");
  });

  test("pmv output has applicability bounds [-2, 2]", () => {
    expect(PMV_PPD_ISO_INFO.outputs.pmv!.applicability).toBeDefined();
    expect(PMV_PPD_ISO_INFO.outputs.pmv!.applicability!.min).toBe(-2);
    expect(PMV_PPD_ISO_INFO.outputs.pmv!.applicability!.max).toBe(2);
  });

  test("ppd output has unit %", () => {
    expect(PMV_PPD_ISO_INFO.outputs.ppd!.unit).toBe("%");
  });

  test("tsv output is dimensionless with classifier", () => {
    expect(PMV_PPD_ISO_INFO.outputs.tsv!.unit).toBeNull();
    expect(PMV_PPD_ISO_INFO.outputs.tsv!.classifier).toBeDefined();
  });

  test("tsv classifier references PMV_THERMAL_SENSATION_VOTE_BINS_ISO", () => {
    expect(PMV_PPD_ISO_INFO.outputs.tsv!.classifier).toBe(
      PMV_THERMAL_SENSATION_VOTE_BINS_ISO,
    );
  });
});

describe("standards — what each model not yet migrated accepts", () => {
  const infos: readonly LegacyModelInfo[] = [
    PMV_PPD_ISO_INFO,
    PMV_PPD_ASHRAE_INFO,
  ];

  test("every _INFO not yet migrated lists only Standard values", () => {
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

  test("standards arrays are frozen", () => {
    expect(Object.isFrozen(PMV_PPD_ISO_INFO.standards)).toBe(true);
  });
});

describe("Deep freezing — objects are immutable", () => {
  test.each(
    expectedMetadataExports.filter((name) => /_INFO$|_BINS_/.test(name)),
  )("%s is frozen deeply", (name) => {
    expect(isDeepFrozen((pkg as Record<string, unknown>)[name])).toBe(true);
  });
});

describe("Identity — applicability bounds are shared, not copied", () => {
  // Same rule as the bins below: a bound in the metadata must BE the object the
  // runtime checks against, not a literal rebuilt from it. A copy compares
  // equal on the day it is written and can drift silently afterwards.
  test("PMV_PPD_ISO_INFO input bounds are the ISO_7730_LIMITS objects", () => {
    expect(PMV_PPD_ISO_INFO.inputs.tdb!.applicability).toBe(
      ISO_7730_LIMITS.tdb,
    );
    expect(PMV_PPD_ISO_INFO.inputs.tr!.applicability).toBe(ISO_7730_LIMITS.tr);
    expect(PMV_PPD_ISO_INFO.inputs.vr!.applicability).toBe(ISO_7730_LIMITS.vr);
    expect(PMV_PPD_ISO_INFO.inputs.met!.applicability).toBe(
      ISO_7730_LIMITS.met,
    );
    expect(PMV_PPD_ISO_INFO.inputs.clo!.applicability).toBe(
      ISO_7730_LIMITS.clo,
    );
  });

  test("the derived pa bound is the ISO_7730_LIMITS object", () => {
    expect(PMV_PPD_ISO_INFO.derived!.pa!.applicability).toBe(
      ISO_7730_LIMITS.pa,
    );
    expect(ISO_7730_LIMITS.pa).toEqual({ min: 0, max: 2700 });
  });

  test("the PMV output gate in the metadata is the object the runtime gates on", () => {
    expect(PMV_PPD_ISO_INFO.outputs.pmv!.applicability).toBe(
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
      PMV_PPD_ISO_INFO.outputs.tsv!.classifier,
    );
  });

  test("PMV_CATEGORY_BINS_ISO_7730_2025 === PMV_PPD_ISO_INFO.outputs.category.classifier", () => {
    expect(PMV_CATEGORY_BINS_ISO_7730_2025).toBe(
      PMV_PPD_ISO_INFO.outputs.category!.classifier,
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
});

// One call of each model whose INFO has the v2 form, its inputs carrying a
// kind, with inputs it accepts. A model migrated later fails the first test
// below until it has a call here.
const v2Calls: Record<string, object> = {
  adaptive_ashrae: { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 },
  clo_tout: { tout: 20 },
  heat_index_rothfusz: { tdb: 28, rh: 60 },
  solar_gain: {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  },
  utci: { tdb: 25, tr: 25, v: 1, rh: 50 },
};
const v2Infos = exportedInfos.filter(({ info }) =>
  Object.values(info.inputs).every((entry) => "kind" in entry),
);

describe("Outputs staleness — each v2 model's result matches its INFO.outputs", () => {
  test("every v2 model info has a call here", () => {
    expect(v2Infos.map(({ info }) => info.name).sort()).toEqual(
      Object.keys(v2Calls).sort(),
    );
  });

  // The result type is derived from INFO.outputs, so a field INFO lacks fails
  // to compile. A key removed from INFO while the body still returns it
  // compiles, and only this catches it. `warnings` lists the bounds a call
  // broke; it is not a quantity, so INFO.outputs does not describe it (#199).
  test.each(v2Infos)(
    "$exportName: the result's keys, less warnings, are INFO.outputs' keys in order",
    ({ info }) => {
      const model = (pkg as Record<string, unknown>)[info.name] as (
        inputs: object,
      ) => object;
      const resultKeys = Object.keys(model(v2Calls[info.name]!)).filter(
        (key) => key !== "warnings",
      );
      expect(resultKeys).toEqual(Object.keys(info.outputs));
    },
  );
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
      PMV_PPD_ISO_INFO.inputs.tdb!.applicability,
      PMV_PPD_ISO_INFO.inputs.tr!.applicability,
      PMV_PPD_ISO_INFO.outputs.pmv!.applicability,
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
      Object.keys(PMV_PPD_ISO_INFO.inputs).sort(),
    );
    for (const key of Object.keys(PMV_PPD_ASHRAE_INFO.inputs)) {
      expect(PMV_PPD_ASHRAE_INFO.inputs[key]!.unit).toBe(
        PMV_PPD_ISO_INFO.inputs[key]!.unit,
      );
    }
  });

  test("input bounds are the ASHRAE_55_LIMITS objects, not copies", () => {
    expect(PMV_PPD_ASHRAE_INFO.inputs.tdb!.applicability).toBe(
      ASHRAE_55_LIMITS.tdb,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.tr!.applicability).toBe(
      ASHRAE_55_LIMITS.tr,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.vr!.applicability).toBe(
      ASHRAE_55_LIMITS.v,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.met!.applicability).toBe(
      ASHRAE_55_LIMITS.met,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.clo!.applicability).toBe(
      ASHRAE_55_LIMITS.clo,
    );
    expect(PMV_PPD_ASHRAE_INFO.inputs.rh!.applicability).toBeUndefined();
    expect(PMV_PPD_ASHRAE_INFO.inputs.wme!.applicability).toBeUndefined();
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
      PMV_PPD_ASHRAE_INFO.inputs.tdb!.applicability,
      PMV_PPD_ASHRAE_INFO.inputs.vr!.applicability,
      PMV_PPD_ASHRAE_INFO.inputs.clo!.applicability,
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
    expect(PMV_PPD_ASHRAE_INFO.outputs.tsv!.classifier).toBe(
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
    expect(PMV_PPD_ASHRAE_INFO.outputs.pmv!.applicability).toBeUndefined();
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
});

import { describe, expect, test } from "vitest";
import * as pkg from "../../src/index.ts";
import {
  ADAPTIVE_ASHRAE_INFO,
  CLO_TOUT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  PMV_PPD_ASHRAE_INFO,
  PMV_PPD_ISO_INFO,
  PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE,
  adaptive_ashrae,
  clo_tout,
  pmv_ppd_ashrae,
} from "../../src/index.ts";
import { ASHRAE_55_LIMITS } from "../../src/_internal/ashrae55.ts";
import { Standard } from "../../src/utilities/options.ts";
import type { ModelInfo } from "../../src/_internal/modelInfo.ts";
import { isDeepFrozen } from "./modelContract.ts";
import { v2Infos } from "./testUtils.ts";

// The list catches a constant missing from src/models/index.ts or
// src/index.ts, which a scan of the package cannot.
const expectedMetadataExports = [
  "ADAPTIVE_ASHRAE_INFO",
  "classifyFromBins",
  "CLO_TOUT_INFO",
  "HEAT_INDEX_ROTHFUSZ_INFO",
  "PMV_CATEGORY_BINS_ISO_7730",
  "PMV_COMPLIANCE_INTERVAL_ASHRAE",
  "PMV_PPD_ASHRAE_INFO",
  "PMV_PPD_ISO_INFO",
  "PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE",
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

describe("standards — the standards each model takes", () => {
  test("every exported _INFO lists only Standard values", () => {
    const known: readonly string[] = Object.values(Standard);
    for (const { info } of exportedInfos) {
      for (const standard of info.standards) {
        expect(known).toContain(standard);
      }
    }
  });
});

describe("Deep freezing — objects are immutable", () => {
  test.each(
    expectedMetadataExports.filter((name) => /_INFO$|_BINS_/.test(name)),
  )("%s is frozen deeply", (name) => {
    expect(isDeepFrozen((pkg as Record<string, unknown>)[name])).toBe(true);
  });
});

// One call of each model whose INFO has the v2 form, its inputs carrying a
// kind, with inputs it accepts. A model migrated later fails the first test
// below until it has a call here.
const v2Calls: Record<string, object> = {
  adaptive_ashrae: { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 },
  clo_tout: { tout: 20 },
  heat_index_rothfusz: { tdb: 28, rh: 60 },
  pmv_ppd_iso: { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  solar_gain: {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  },
  two_nodes_gagge: { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  utci: { tdb: 25, tr: 25, v: 1, rh: 50 },
};

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

describe("PMV_PPD_ASHRAE_INFO — the ASHRAE 55 wrapper's metadata", () => {
  test("labels the model and lists ASHRAE 55 as its only standard", () => {
    expect(PMV_PPD_ASHRAE_INFO.name).toBe("pmv_ppd_ashrae");
    expect(PMV_PPD_ASHRAE_INFO.label).toBe("PMV / PPD (ASHRAE 55)");
    expect(typeof PMV_PPD_ASHRAE_INFO.description).toBe("string");
    expect(PMV_PPD_ASHRAE_INFO.standards).toEqual([Standard.ashrae_55_2023]);
  });

  test("inputs are the physical quantities pmv_ppd_ashrae takes, with the ISO model's units", () => {
    const iso: Readonly<Record<string, { kind: string; unit?: unknown }>> =
      PMV_PPD_ISO_INFO.inputs;
    const quantities = Object.keys(iso).filter(
      (key) => iso[key]!.kind === "numeric",
    );
    expect(Object.keys(PMV_PPD_ASHRAE_INFO.inputs).sort()).toEqual(
      quantities.sort(),
    );
    for (const key of quantities) {
      expect(PMV_PPD_ASHRAE_INFO.inputs[key]!.unit).toBe(iso[key]!.unit);
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
      PMV_PPD_ISO_INFO.outputs.tsv.classifier,
    );
    expect(PMV_THERMAL_SENSATION_VOTE_BINS_ASHRAE.right).toBe(true);
    expect(PMV_PPD_ISO_INFO.outputs.tsv.classifier.right).toBe(false);
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

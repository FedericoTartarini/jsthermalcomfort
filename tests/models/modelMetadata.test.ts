import { describe, expect, test } from "vitest";
import * as pkg from "../../src/index.ts";
import {
  ADAPTIVE_ASHRAE_INFO,
  CLO_TOUT_INFO,
  HEAT_INDEX_ROTHFUSZ_INFO,
  adaptive_ashrae,
  clo_tout,
} from "../../src/index.ts";
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
  "PHS_LIMITS_ISO_7933",
  "PMV_CATEGORY_BINS_ISO_7730",
  "PMV_PPD_ASHRAE_INFO",
  "PMV_PPD_ISO_INFO",
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
    expectedMetadataExports.filter((name) =>
      /_INFO$|_BINS_|_LIMITS_/.test(name),
    ),
  )("%s is frozen deeply", (name) => {
    expect(isDeepFrozen((pkg as Record<string, unknown>)[name])).toBe(true);
  });
});

// One call of each model whose INFO has the v2 form, its inputs carrying a
// kind, with inputs it accepts. A model migrated later fails the first test
// below until it has a call here.
const v2Calls: Record<string, object> = {
  adaptive_ashrae: { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 },
  ankle_draft: {
    tdb: 25,
    tr: 25,
    vr: 0.2,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    v_ankle: 0.3,
  },
  clo_tout: { tout: 20 },
  cooling_effect: { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 },
  heat_index_rothfusz: { tdb: 28, rh: 60 },
  phs: {
    tdb: 40,
    tr: 40,
    rh: 33.85,
    v: 0.3,
    met: 2.5,
    clo: 0.5,
    posture: "standing",
  },
  pmv_ppd_ashrae: { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 },
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
  use_fans_heatwaves: { tdb: 35, tr: 35, v: 1.0, rh: 50, met: 1.2, clo: 0.5 },
  utci: { tdb: 25, tr: 25, v: 1, rh: 50 },
  vertical_tmp_grad_ppd: {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    vertical_tmp_grad: 7,
  },
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

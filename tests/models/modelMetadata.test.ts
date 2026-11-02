import { describe, expect, test } from "vitest";
import * as pkg from "../../src/index.ts";
import { Standard } from "../../src/utilities/options.ts";
import type { ModelInfo } from "../../src/_internal/modelInfo.ts";
import { isDeepFrozen } from "./modelContract.ts";
import { v2_infos } from "./testUtils.ts";

// The list catches a constant missing from src/models/index.ts or
// src/index.ts, which a scan of the package cannot.
const expected_metadata_exports = [
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
    const package_exports = Object.keys(pkg);

    // Every expected export must be present in the package root
    expected_metadata_exports.forEach((name) => {
      expect(package_exports).toContain(name);
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
const exported_infos = Object.entries(pkg as Record<string, unknown>)
  .filter(([export_name]) => export_name.endsWith("_INFO"))
  .map(([export_name, info]) => ({ export_name, info: info as ModelInfo }));

describe("name — each model info names its model's export", () => {
  test("the naming convention finds every listed model info", () => {
    // Guards the filter itself: a convention that matched nothing would make
    // the tests below pass vacuously.
    expect(exported_infos.map(({ export_name }) => export_name)).toEqual(
      expect.arrayContaining(
        expected_metadata_exports.filter((name) => name.endsWith("_INFO")),
      ),
    );
  });

  test.each(exported_infos)(
    "$export_name.name is an exported function whose _INFO is this object",
    ({ export_name, info }) => {
      const exports = pkg as Record<string, unknown>;
      expect(typeof info.name).toBe("string");
      expect(typeof exports[info.name]).toBe("function");
      expect(`${info.name.toUpperCase()}_INFO`).toBe(export_name);
    },
  );
});

describe("standards — the standards each model takes", () => {
  test("every exported _INFO lists only Standard values", () => {
    const known: readonly string[] = Object.values(Standard);
    for (const { info } of exported_infos) {
      for (const standard of info.standards) {
        expect(known).toContain(standard);
      }
    }
  });
});

describe("Deep freezing — objects are immutable", () => {
  test.each(
    expected_metadata_exports.filter((name) =>
      /_INFO$|_BINS_|_LIMITS_/.test(name),
    ),
  )("%s is frozen deeply", (name) => {
    expect(isDeepFrozen((pkg as Record<string, unknown>)[name])).toBe(true);
  });
});

// One call of each model whose INFO has the v2 form, its inputs carrying a
// kind, with inputs it accepts. A model migrated later fails the first test
// below until it has a call here.
const v2_calls: Record<string, object> = {
  adaptive_ashrae: { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 },
  adaptive_en: { tdb: 25, tr: 25, t_running_mean: 20, v: 0.1 },
  ankle_draft: {
    tdb: 25,
    tr: 25,
    vr: 0.2,
    rh: 50,
    met: 1.2,
    clo: 0.5,
    v_ankle: 0.3,
  },
  at: { tdb: 25, rh: 30, v: 0.1 },
  clo_tout: { tout: 20 },
  cooling_effect: { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 },
  discomfort_index: { tdb: 25, rh: 50 },
  esi: { tdb: 30.2, rh: 42.2, sol_radiation_global: 766 },
  heat_index_lu: { tdb: 25, rh: 50 },
  heat_index_rothfusz: { tdb: 28, rh: 60 },
  heat_index_schoen: { tdb: 29, rh: 50 },
  humidex: { tdb: 25, rh: 50 },
  ireq: {
    tdb: -15,
    tr: -15,
    vr: 2,
    rh: 55,
    met: 3,
    clo: 2.8,
    p: 50,
    walk_sp: 1.1,
  },
  net: { tdb: 37, rh: 100, v: 0.1 },
  pet_steady: { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  phs: {
    tdb: 40,
    tr: 40,
    rh: 33.85,
    v: 0.3,
    met: 2.5,
    clo: 0.5,
    posture: "standing",
  },
  pmv_a: {
    tdb: 24,
    tr: 30,
    vr: 0.22,
    rh: 50,
    met: 1.4,
    clo: 0.5,
    a_coefficient: 0.293,
  },
  pmv_athb: {
    tdb: 25,
    tr: 25,
    vr: 0.1,
    rh: 50,
    met: 1.2,
    t_running_mean: 20,
  },
  pmv_e: {
    tdb: 24,
    tr: 30,
    vr: 0.22,
    rh: 50,
    met: 1.4,
    clo: 0.5,
    e_coefficient: 0.6,
  },
  pmv_ppd_ashrae: { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  pmv_ppd_iso: { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  ridge_regression_predict_t_re_t_sk: {
    sex: "male",
    age: 70,
    height: 1.8,
    weight: 75,
    tdb: 35,
    rh: 60,
    duration: 60,
  },
  set_tmp: { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  solar_gain: {
    sol_altitude: 0,
    sharp: 120,
    sol_radiation_dir: 800,
    sol_transmittance: 0.5,
    f_svv: 0.5,
    f_bes: 0.5,
  },
  sports_heat_stress_risk: {
    tdb: 35,
    tr: 35,
    rh: 40,
    vr: 2.0,
    sport: pkg.Sports.RUNNING,
  },
  thi: { tdb: 30, rh: 70 },
  two_nodes_gagge: { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 },
  two_nodes_gagge_ji: {
    tdb: 36.5,
    tr: 36.5,
    v: 0.25,
    met: 0.95,
    clo: 0.1,
    vapor_pressure: 12,
  },
  two_nodes_gagge_sleep: {
    tdb: 18,
    tr: 18,
    v: 0.05,
    rh: 50,
    clo: 1.4,
    thickness_quilt: 1.76,
  },
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
  wbgt: { twb: 25, tg: 32 },
  wci: { tdb: -5, v: 5.5 },
  wind_chill_temperature: { tdb: -5, v: 5.5 },
  work_capacity_dunne: { wbgt: 30 },
  work_capacity_hothaps: { wbgt: 30 },
  work_capacity_iso: { wbgt: 30, met: 300 },
  work_capacity_niosh: { wbgt: 30, met: 300 },
};

describe("Outputs staleness — each v2 model's result matches its INFO.outputs", () => {
  test("every v2 model info has a call here", () => {
    expect(v2_infos.map(({ info }) => info.name).sort()).toEqual(
      Object.keys(v2_calls).sort(),
    );
  });

  // The result type is derived from INFO.outputs, so a field INFO lacks fails
  // to compile. A key removed from INFO while the body still returns it
  // compiles, and only this catches it. `warnings` lists the bounds a call
  // broke; it is not a quantity, so INFO.outputs does not describe it (#199).
  test.each(v2_infos)(
    "$export_name: the result's keys, less warnings, are INFO.outputs' keys in order",
    ({ info }) => {
      const model = (pkg as Record<string, unknown>)[info.name] as (
        inputs: object,
      ) => object;
      const result_keys = Object.keys(model(v2_calls[info.name] ?? {})).filter(
        (key) => key !== "warnings",
      );
      expect(result_keys).toEqual(Object.keys(info.outputs));
    },
  );
});

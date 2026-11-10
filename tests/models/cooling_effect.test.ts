import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { cooling_effect, COOLING_EFFECT_INFO } from "../../src/models/index.ts";
import { cooling_effect as from_root } from "../../src/index.ts";
import { read_data, upstream_returns } from "../parity/harness.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract, isDeepFrozen } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof cooling_effect>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.coolingEffect,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_cooling_effect.py.
describe("test_cooling_effect", () => {
  test.each([0.05, 0.3, 1.0])(
    "test_cooling_effect_ip_is_a_temperature_difference[%s]",
    (vr) => {
      const si = cooling_effect({
        tdb: 30,
        tr: 30,
        vr,
        rh: 50,
        met: 1.2,
        clo: 0.5,
      }).ce;
      const ip = cooling_effect({
        tdb: 86,
        tr: 86,
        vr: vr * 3.281,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        units: "IP",
      }).ce;

      // Both public results are rounded to two decimals independently.
      expect(approx(ip, si * 1.8, { rel: 0, abs: 0.014 })).toBe(true);
    },
  );

  test("test_cooling_effect_ip_array_temperature_differences", () => {
    const tdb = [25.0, 30.0, 35.0];
    const si = tdb.map(
      (t) =>
        cooling_effect({ tdb: t, tr: t, vr: 1.0, rh: 50, met: 1.2, clo: 0.5 })
          .ce,
    );
    const ip = tdb.map(
      (t) =>
        cooling_effect({
          tdb: t * 1.8 + 32,
          tr: t * 1.8 + 32,
          vr: 3.281,
          rh: 50,
          met: 1.2,
          clo: 0.5,
          units: "IP",
        }).ce,
    );

    ip.forEach((value, i) => {
      expect(approx(value, (si[i] ?? NaN) * 1.8, { rel: 0, abs: 0.014 })).toBe(
        true,
      );
    });
  });

  test("test_cooling_effect_regression_values", () => {
    const cases = [
      [25, 25, 0.05, 50, 1.2, 0.5, 0.0], // vr <= 0.1 -> 0
      [25, 25, 0.1, 50, 1.2, 0.5, 0.0], // boundary
      [25, 25, 0.3, 50, 1.2, 0.5, 1.68],
      [35, 35, 1.5, 90, 2.5, 0.2, 5.11], // 5.14 before #489
      [15, 15, 0.5, 10, 1.0, 1.2, 2.61],
    ] as const;
    for (const [tdb, tr, vr, rh, met, clo, expected] of cases) {
      const { ce } = cooling_effect({ tdb, tr, vr, rh, met, clo });
      expect(approx(ce, expected, { rel: 1e-5, abs: 0.01 })).toBe(true);
    }
  });

  test.each(reference_table.data)(
    "test_cooling_effect: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = cooling_effect(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );
});

const still = { tdb: 25, tr: 25, vr: 0.3, rh: 50, met: 1.2, clo: 0.5 };
// At 45 °C and 90 % RH the still-air SET root is not bracketed.
const unbracketed = { tdb: 45, tr: 45, vr: 0.5, rh: 90, met: 1.2, clo: 0.5 };
const notice = {
  kind: "notice",
  message: "Cooling effect could not be calculated. Returning 0.",
};
const call = (inputs: unknown) => cooling_effect(inputs as Inputs);

describeModelContract(cooling_effect, COOLING_EFFECT_INFO, still);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("cooling_effect (JS-only)", () => {
  test("wme reaches the SET calculation", () => {
    expect(cooling_effect({ ...still, wme: 0.1 }).ce).toBe(1.47);
  });

  // classes_input.py:120 (deviation _shared-24).
  test("units other than SI or IP throws upstream's message", () => {
    const message = "Units must be either 'SI' or 'IP'";
    for (const units of ["XX", "", "metric"])
      expect(() => call({ ...still, units })).toThrow(new RangeError(message));
  });

  test("converts tdb, tr and vr from IP in any case, as upstream", () => {
    const ip = { tdb: 77, tr: 77, vr: 1.64, rh: 50, met: 1, clo: 0.6 };
    for (const units of ["IP", "ip", "Ip"])
      expect(call({ ...ip, units }).ce).toBe(3.9);
  });

  // models/cooling_effect.py:208-218 (deviation cooling_effect-2, deviation cooling_effect-3).
  test("an unbracketed root returns 0 with upstream's notice, once", () => {
    const result = cooling_effect(unbracketed);
    expect(result).toEqual({ ce: 0, warnings: [notice] });
    expect(isDeepFrozen(result)).toBe(true);
  });

  // Upstream returns before solving when vr <= 0.1 (models/cooling_effect.py:187-188).
  test("still air returns 0 without a notice", () => {
    for (const vr of [0, 0.05, 0.1])
      expect(cooling_effect({ ...still, vr })).toEqual({ ce: 0, warnings: [] });
  });

  test("a solved cooling effect returns no warnings", () => {
    expect(cooling_effect(still)).toEqual({ ce: 1.68, warnings: [] });
  });

  // Deviation cooling_effect-3: upstream warns twice where the library returns one row.
  test("gives one notice where upstream warns, over the parity data", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const cases = read_data(root, "cooling_effect").cases.filter(
      upstream_returns,
    );
    const counts = cases.map(({ inputs, warnings }) => [
      call(inputs).warnings.length,
      warnings.length === 0 ? 0 : 1,
    ]);
    expect(counts.filter(([, upstream]) => upstream === 1)).toHaveLength(120);
    for (const [library, upstream] of counts) expect(library).toBe(upstream);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(cooling_effect);
  });
});

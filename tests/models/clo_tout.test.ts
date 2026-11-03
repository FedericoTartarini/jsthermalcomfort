import { describe, expect, test } from "vitest";
import { clo_tout, CLO_TOUT_INFO } from "../../src/models/index.ts";
import { Standard, Units } from "../../src/utilities/index.ts";
import { clo_tout as clo_tout_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof clo_tout>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.cloTout,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_clo_tout.py.
describe("test_clo_tout", () => {
  test.each(reference_table.data)("test_clo_tout: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    // As upstream, `clo_tout(tout=..., units=inputs.get("units", "SI"))`.
    const result = clo_tout({
      tout: inputs.tout,
      units: inputs.units ?? "SI",
    } as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});

describeModelContract(clo_tout, CLO_TOUT_INFO, { tout: 20 });

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, measured on pythermalcomfort 4.6.2,
// and what only the library adds.
describe("clo_tout (JS-only)", () => {
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => clo_tout(inputs as Inputs);

  describe("values", () => {
    // Upstream's np.where chain (models/clo_tout.py:76-78): each breakpoint belongs
    // to the piece above it.
    test.each([
      [-5.0001, 1.0],
      [-5, 1.0],
      [4.9999, 0.64],
      [5, 0.64],
      [25, 0.47],
      [25.999, 0.46],
      [26, 0.46],
      [27, 0.46],
    ])("tout %s °C gives %s clo, as upstream", (tout, expected) => {
      expect(clo_tout({ tout }).clo_tout).toBe(expected);
    });

    test("converts tout from °F under IP, in any case, as upstream", () => {
      expect(clo_tout({ tout: 68, units: "IP" }).clo_tout).toBe(0.51);
      expect(clo_tout({ tout: 20, units: Units.IP }).clo_tout).toBe(1.0);
      expect(call({ tout: 20, units: "ip" })().clo_tout).toBe(1.0);
      expect(call({ tout: 20, units: "si" })().clo_tout).toBe(0.51);
    });
  });

  describe("errors", () => {
    // deviation _shared-24 (classes_input.py:120)
    test("units other than SI or IP throws upstream's message", () => {
      const message = "Units must be either 'SI' or 'IP'";
      for (const bad of ["XX", "", "metric"])
        expect(call({ tout: 20, units: bad })).toThrow(new RangeError(message));
      for (const bad of [null, 5, true, ["SI"]])
        expect(call({ tout: 20, units: bad })).toThrow(new TypeError(message));
    });
  });

  describe("result", () => {
    // deviation clo_tout-3
    test("has no warnings rows, whatever tout", () => {
      for (const tout of [-60, -5, 0, 5, 20, 26, 60])
        for (const units of ["SI", "IP"] as const)
          expect(clo_tout({ tout, units }).warnings).toEqual([]);
    });
  });

  // deviation _shared-4 (models/clo_tout.py:45)
  test("INFO.standards is ASHRAE 55-2023", () => {
    expect(CLO_TOUT_INFO.standards).toEqual([Standard.ashrae_55_2023]);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(clo_tout_from_root).toBe(clo_tout);
  });
});

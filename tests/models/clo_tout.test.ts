import { describe, expect, test } from "vitest";
import { clo_tout, CLO_TOUT_INFO } from "../../src/models/index.ts";
import { Units } from "../../src/utilities/index.ts";
import { clo_tout as clo_tout_from_root } from "../../src/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof clo_tout>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.cloTout,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_clo_tout.py.
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

// The per-model checks of the template (ADRs 0022-0024), through the public
// entry: what upstream's tests leave out, measured on pythermalcomfort 4.6.2,
// and what only the library adds.
describe("clo_tout (JS-only)", () => {
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => clo_tout(inputs as Inputs);

  describe("values", () => {
    // Upstream's np.where chain (models/clo_tout.py:75-77): each breakpoint belongs
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
    // Upstream reads True as 1, fails later on None and broadcasts an array
    // (deviation _shared-5, deviation _shared-6), and its message for another
    // type names Python's types (deviation _shared-10).
    test("tout that is not a number throws TypeError", () => {
      for (const bad of ["20", {}, () => 20, 20n, true, false, null, [20]])
        expect(call({ tout: bad })).toThrow(
          new TypeError("tout must be a finite number."),
        );
    });

    // Upstream returns 0.46 for NaN and +Infinity and 1 for -Infinity
    // (deviation _shared-7).
    test("tout that is not finite throws RangeError", () => {
      for (const bad of [NaN, Infinity, -Infinity])
        expect(call({ tout: bad })).toThrow(
          new RangeError("tout must be a finite number."),
        );
    });

    // BaseInputs' message (classes_input.py:120), for a string outside the
    // set and, as upstream compares str(units), any other value (deviation
    // _shared-24).
    test("units other than SI or IP throws upstream's message", () => {
      const message = "Units must be either 'SI' or 'IP'";
      for (const bad of ["XX", "", "metric"])
        expect(call({ tout: 20, units: bad })).toThrow(new RangeError(message));
      for (const bad of [null, 5, true, ["SI"]])
        expect(call({ tout: 20, units: bad })).toThrow(new TypeError(message));
    });

    // The library's messages, where Python's name its call binding (deviation
    // _shared-10).
    test("a missing tout throws TypeError", () => {
      for (const inputs of [{}, { units: "SI" }, { tout: undefined }])
        expect(call(inputs)).toThrow(new TypeError("tout is required."));
    });

    test("an unknown key throws TypeError, naming the first", () => {
      for (const key of ["foo", "t_out", "round_output", "limit_inputs"])
        expect(call({ tout: 20, [key]: 1 })).toThrow(
          new TypeError(`${key} is not an input of clo_tout().`),
        );
    });

    // tout and units were positional before v2 (ADR 0002).
    test("anything but an inputs object throws TypeError", () => {
      for (const bad of [20, null, undefined, [20, "SI"], "tout"])
        expect(call(bad)).toThrow(
          new TypeError("clo_tout() takes one inputs object."),
        );
    });

    // Upstream checks units first; the library checks in the definition's
    // order (deviation _shared-9).
    test("checks run in the definition's order", () => {
      expect(call({ tout: "x", units: "XX" })).toThrow(
        new TypeError("tout must be a finite number."),
      );
      expect(call({ tout: 20, units: "XX" })).toThrow(/^Units must be/);
    });

    test("undefined takes the default, as an omitted keyword does", () => {
      expect(clo_tout({ tout: 20, units: undefined })).toEqual(
        clo_tout({ tout: 20, units: "SI" }),
      );
    });
  });

  describe("result", () => {
    // As upstream's frozen dataclass (classes_return.py:227).
    test("is frozen, its warnings included", () => {
      const result = clo_tout({ tout: 20 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.warnings)).toBe(true);
      expect(() => {
        (result as { clo_tout: number }).clo_tout = 1;
      }).toThrow(TypeError);
    });

    test("has upstream's field, then warnings", () => {
      expect(Object.keys(clo_tout({ tout: 20 }))).toEqual([
        "clo_tout",
        "warnings",
      ]);
    });

    // Upstream checks no range and calls no warnings.warn (deviation
    // clo_tout-3).
    test("has no warnings rows, whatever tout", () => {
      for (const tout of [-60, -5, 0, 5, 20, 26, 60])
        for (const units of ["SI", "IP"] as const)
          expect(clo_tout({ tout, units }).warnings).toEqual([]);
    });
  });

  // deviation clo_tout-2
  describe("CLO_TOUT_INFO", () => {
    test("names the model, with no description or standards", () => {
      expect(CLO_TOUT_INFO.name).toBe("clo_tout");
      expect(CLO_TOUT_INFO.label).toBe("Clothing prediction");
      expect(CLO_TOUT_INFO).not.toHaveProperty("standards");
      expect(CLO_TOUT_INFO).not.toHaveProperty("description");
      expect(CLO_TOUT_INFO).not.toHaveProperty("derived");
    });

    // Upstream bounds nothing: the formula saturates below -5 °C and from
    // 26 °C, so there is no applicability to publish.
    test("lists every keyword argument, with upstream's defaults", () => {
      expect(CLO_TOUT_INFO.inputs).toEqual({
        tout: { kind: "numeric", unit: "°C" },
        units: {
          kind: "choice",
          allowed: ["SI", "IP"],
          default: "SI",
          message: "Units must be either 'SI' or 'IP'",
        },
      });
      expect(Object.keys(CLO_TOUT_INFO.inputs)).toEqual(["tout", "units"]);
    });

    test("clo_tout is the one output, in clo", () => {
      expect(CLO_TOUT_INFO.outputs).toEqual({ clo_tout: { unit: "clo" } });
    });

    test("is frozen deeply", () => {
      const { inputs, outputs } = CLO_TOUT_INFO;
      expect(Object.isFrozen(CLO_TOUT_INFO)).toBe(true);
      expect(Object.isFrozen(inputs.tout)).toBe(true);
      expect(Object.isFrozen(inputs.units.allowed)).toBe(true);
      expect(Object.isFrozen(outputs.clo_tout)).toBe(true);
    });
  });

  test("is exported from the package root as from its subpath", () => {
    expect(clo_tout_from_root).toBe(clo_tout);
  });
});

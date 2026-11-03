import { describe, expect, test } from "vitest";
import { pet_steady, PET_STEADY_INFO } from "../../src/models/index.ts";
import { pet_steady as pet_steady_from_root } from "../../src/index.ts";
import { Postures, Sex } from "../../src/utilities/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

const { testData: test_data, tolerances } = await loadTestData(
  test_data_urls.petSteady,
);

const PET_TEST_MATRIX = [
  // 'tdb', 'tr', 'rh', 'v', 'met', 'clo', 'exp'
  [20, 20, 50, 0.15, 1.37, 0.5, 18.85],
  [30, 30, 50, 0.15, 1.37, 0.5, 30.6],
  [20, 20, 50, 0.5, 1.37, 0.5, 17.16],
  [21, 21, 50, 0.1, 1.37, 0.9, 21.08],
  [20, 20, 50, 0.1, 1.37, 0.9, 19.92],
  [-5, 40, 2, 0.5, 1.37, 0.9, 7.82],
  [-5, -5, 50, 5.0, 1.37, 0.9, -13.38],
  [30, 60, 80, 1.0, 1.37, 0.9, 44.63],
  [30, 30, 80, 1.0, 1.37, 0.9, 32.21],
] as const;

// Mirrors pythermalcomfort v4.8.0 tests/test_pet_steady.py.
describe("test_pet_steady", () => {
  test.each(test_data.data)("test_pet_steady: fixture case %#", (row) => {
    const { inputs, outputs } = row;
    const result = pet_steady(
      inputs as unknown as Parameters<typeof pet_steady>[0],
    );

    validateResult(result, outputs, tolerances, inputs);
  });

  // Upstream fills arrays of the shapes (10, 10), 10 and (3, 3, 3) with each
  // row's values; the model takes scalars (deviation _shared-5), so each row
  // is one call, the same for every shape.
  test.each(PET_TEST_MATRIX)(
    "test_pet_array: tdb %d, tr %d, rh %d, v %d, met %d, clo %d",
    (tdb, tr, rh, v, met, clo, exp) => {
      const res = pet_steady({ tdb, tr, rh, v, met, clo }).pet;
      expect(res).toBe(exp);
    },
  );
});

const valid = { tdb: 25, tr: 25, v: 0.1, rh: 50, met: 1.2, clo: 0.5 };

// A call with inputs the type rejects, to test the runtime.
const call = (inputs: unknown) =>
  pet_steady(inputs as Parameters<typeof pet_steady>[0]);

describeModelContract(pet_steady, PET_STEADY_INFO, valid);

const SLOW =
  "The iteration is not making good progress, as measured by the \n improvement from the last ten iterations.";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("pet_steady (JS-only)", () => {
  test.each([
    [{}, 24.67],
    [{ tdb: 30, tr: 30, v: 0.2, rh: 60, met: 1.4, clo: 0.6 }, 31.46],
    [{ position: "standing" }, 24.69],
    [{ position: "standing, forced convection" }, 24.79],
    [{ sex: "female" }, 24.69],
    [{ p_atm: 900, age: 60, weight: 60, height: 1.6, wme: 0.1 }, 24.73],
    [{ tdb: -10, tr: -15, v: 8, rh: 80, met: 2.5, clo: 2.5 }, -10.3],
    [{ tdb: 45, tr: 70, v: 0.2, rh: 60, met: 2.5, clo: 0.5 }, 64.33],
    [{ v: 0 }, 26.18],
    [{ v: -0 }, 26.18],
  ])("%o gives upstream's pet", (inputs, pet) => {
    const result = call({ ...valid, ...inputs });
    expect(result.pet).toBe(pet);
    expect(result.warnings).toEqual([]);
  });

  // Register pet_steady's Notes: the check is case-insensitive, the kernel's
  // comparisons are not.
  test.each([["Standing"], ["STANDING, FORCED CONVECTION"], [null]])(
    "position %o computes as sitting",
    (position) => {
      expect(call({ ...valid, position }).pet).toBe(24.67);
    },
  );

  test.each([["Male"], ["FEMALE"], [null]])(
    "sex %o computes as female",
    (sex) => {
      expect(call({ ...valid, sex }).pet).toBe(24.69);
    },
  );

  // Deviations _shared-29 and _shared-81.
  test("Postures and Sex compute as their values", () => {
    expect(call({ ...valid, position: Postures.standing })).toEqual(
      call({ ...valid, position: "standing" }),
    );
    expect(call({ ...valid, sex: Sex.female })).toEqual(
      call({ ...valid, sex: "female" }),
    );
  });

  // Deviations pet_steady-12, pet_steady-13 and pet_steady-14.
  const POSITION =
    "position must be one of ['sitting', 'standing', 'standing, forced convection']";
  const SEX = "sex must be one of ['male', 'female']";
  test.each([
    ["position", "lying", RangeError, POSITION],
    ["position", 5, TypeError, POSITION],
    ["position", ["standing"], TypeError, POSITION],
    ["sex", "x", RangeError, SEX],
    ["sex", 5, TypeError, SEX],
    ["sex", ["female"], TypeError, SEX],
  ])("%s %o throws choice_field's message", (key, value, error, message) => {
    expect(() => call({ ...valid, [key]: value })).toThrow(new error(message));
  });

  // Deviations pet_steady-2 and pet_steady-3: one notice per fsolve call that
  // stops short of convergence, a parity case.
  test("a fsolve that stops short of convergence gives one notice", () => {
    const result = call({
      tdb: 48.0852896608632,
      tr: 49.7,
      v: 5.3,
      rh: 73.4,
      met: 1.7622307855403205,
      clo: 0.1330119712326311,
      position: "standing, forced convection",
      sex: "Male",
      weight: 94.0,
    });
    expect(result.pet).toBe(67.59);
    expect(result.warnings).toEqual([{ kind: "notice", message: SLOW }]);
  });

  // Deviation pet_steady-4 (models/pet_steady.py:284, :300, :344, :365).
  test.each([
    [{ clo: 0 }],
    [{ clo: -0.2 }],
    [{ weight: 0 }],
    [{ weight: -0 }],
    [{ height: 0 }],
    [{ p_atm: 0 }],
    [{ height: 0.2, clo: 1 }],
    [{ height: 0.2, clo: 0.4 }],
    [{ v: -1, weight: 0 }],
    [{ weight: -70, p_atm: 0 }],
  ])("%o throws float division by zero", (inputs) => {
    expect(() => call({ ...valid, ...inputs })).toThrow(
      new RangeError("float division by zero"),
    );
  });

  // Deviation pet_steady-4: the dividend is complex upstream.
  test.each([
    [{ weight: -70, clo: 0 }],
    [{ weight: -70, height: 0 }],
    [{ height: -1.8, clo: 0 }],
    [{ weight: -70, height: 0.2, clo: 0.4 }],
  ])("%o throws complex division by zero", (inputs) => {
    expect(() => call({ ...valid, ...inputs })).toThrow(
      new RangeError("complex division by zero"),
    );
  });

  // Deviations pet_steady-5 and pet_steady-6, in upstream's order.
  test.each([
    [{ v: -0.5 }, "v"],
    [{ v: -1, clo: 0 }, "v"],
    [{ v: -1, p_atm: 0 }, "v"],
    [{ weight: -70, v: -1 }, "v"],
    [{ p_atm: -1013.25 }, "p_atm"],
    [{ p_atm: -1, clo: 0 }, "p_atm"],
    [{ weight: -70 }, "weight"],
    [{ height: -1.8 }, "height"],
  ])("%o throws for a negative %s", (inputs, key) => {
    expect(() => call({ ...valid, ...inputs })).toThrow(
      new RangeError(`${key} must not be negative.`),
    );
  });

  test("is exported from the package root as from its subpath", () => {
    expect(pet_steady_from_root).toBe(pet_steady);
  });
});

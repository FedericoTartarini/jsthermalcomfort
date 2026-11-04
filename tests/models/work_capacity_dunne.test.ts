import { describe, expect, test } from "vitest";
import {
  work_capacity_dunne,
  WORK_CAPACITY_DUNNE_INFO,
} from "../../src/models/index.ts";
import { work_capacity_dunne as work_capacity_dunne_from_root } from "../../src/index.ts";
import { WorkIntensity } from "../../src/utilities/index.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  work_capacity_dunne(inputs as Parameters<typeof work_capacity_dunne>[0]);

// Mirrors pythermalcomfort v4.8.0 tests/test_work_capacity_dunne.py. Its
// pytest.approx is rel 1e-6 and its np.allclose rtol 1e-5 and atol 1e-8; its
// list call runs element-wise.
describe("test_work_capacity_dunne", () => {
  test("test_heavy_scalar_at_25", () => {
    // Upstream also asserts a WorkCapacity instance; a JS result is a plain
    // object.
    const wc = work_capacity_dunne({ wbgt: 25, work_intensity: "heavy" });
    expect(approx(wc.capacity, 100, { rel: 1e-6, abs: 0 })).toBe(true);
  });

  test("test_heavy_array_and_clipping", () => {
    const wbgt = [20, 25, 28, 30, 35];
    for (const t of wbgt) {
      const wc = work_capacity_dunne({ wbgt: t, work_intensity: "heavy" });
      const expected_base = Math.min(
        Math.max(100 - 25 * Math.max(0, t - 25) ** (2 / 3), 0),
        100,
      );
      expect(approx(wc.capacity, expected_base, { rel: 1e-5, abs: 1e-8 })).toBe(
        true,
      );
    }
  });

  test("test_moderate_and_light_intensity", () => {
    const wbgt = 30;
    const base = Math.min(Math.max(100 - 25 * 5 ** (2 / 3), 0), 100);
    const wc_med = work_capacity_dunne({ wbgt, work_intensity: "moderate" });
    const wc_light = work_capacity_dunne({ wbgt, work_intensity: "light" });
    expect(
      approx(wc_med.capacity, Math.min(Math.max(base * 2, 0), 100), {
        rel: 1e-6,
        abs: 0,
      }),
    ).toBe(true);
    expect(
      approx(wc_light.capacity, Math.min(Math.max(base * 4, 0), 100), {
        rel: 1e-6,
        abs: 0,
      }),
    ).toBe(true);
  });

  test("test_lower_bound_clipping", () => {
    const wc = work_capacity_dunne({ wbgt: 100, work_intensity: "heavy" });
    expect(approx(wc.capacity, 0, { rel: 1e-6, abs: 0 })).toBe(true);
  });

  test("test_upper_bound_clipping", () => {
    const wc = work_capacity_dunne({ wbgt: 20, work_intensity: "light" });
    expect(approx(wc.capacity, 100, { rel: 1e-6, abs: 0 })).toBe(true);
  });

  // Upstream's ValueError is a RangeError.
  test("test_invalid_intensity_raises", () => {
    expect(() => call({ wbgt: 25, work_intensity: "invalid" })).toThrow(
      RangeError,
    );
  });

  test("test_work_intensity_accepts_enum", () => {
    expect(
      work_capacity_dunne({
        wbgt: 30,
        work_intensity: WorkIntensity.MODERATE,
      }).capacity,
    ).toBe(
      work_capacity_dunne({ wbgt: 30, work_intensity: "moderate" }).capacity,
    );
  });
});

const work_intensity_message =
  "work_intensity must be one of ['heavy', 'moderate', 'light']";

// Mirrors the work_intensity cases of pythermalcomfort v4.8.0
// tests/test_choice_field.py through the model, whose inputs class receives
// work_intensity (models/work_capacity_dunne.py:52).
describe("test_choice_field", () => {
  const allowed = ["heavy", "moderate", "light"];
  const capacity = (work_intensity: unknown) =>
    call({ wbgt: 30, work_intensity }).capacity;

  // BaseInputs skips None, and the model's work_intensity.lower() then raises
  // (deviation work_capacity_dunne-4).
  test("test_choice_fields_metadata_and_none[work_intensity]", () => {
    expect(WORK_CAPACITY_DUNNE_INFO.inputs.work_intensity.allowed).toEqual(
      allowed,
    );
    expect(() => capacity(null)).toThrow(new TypeError(work_intensity_message));
  });

  // WorkIntensity.MODERATE is the string "moderate" (deviation _shared-77).
  test.each([
    ["scalar", allowed[0], 26.899556544678347],
    ["uppercase", "HEAVY", 26.899556544678347],
    ["enum", WorkIntensity.MODERATE, 53.799113089356695],
  ])(
    "test_choice_fields_preserve_valid_values[work_intensity-%s]",
    (_, value, expected) => {
      expect(approx(capacity(value), expected, DEFAULT_TOLERANCE)).toBe(true);
    },
  );

  // Deviation work_capacity_dunne-5.
  test.each([["list"], ["array"]])(
    "test_choice_fields_preserve_valid_values[work_intensity-%s]",
    () => {
      expect(() => capacity(allowed)).toThrow(
        new TypeError(work_intensity_message),
      );
    },
  );

  test.todo(
    "test_choice_fields_preserve_valid_values[work_intensity-series]: a pandas Series has no JavaScript counterpart",
  );

  test.each([
    ["scalar", "invalid", RangeError],
    ["list", [allowed[0], "invalid"], TypeError],
    ["array", [allowed[0], "invalid"], TypeError],
  ])(
    "test_choice_fields_reject_invalid_values[work_intensity-%s]",
    (_, value, error) => {
      expect(() => capacity(value)).toThrow(new error(work_intensity_message));
    },
  );

  // Deviation work_capacity_dunne-5.
  test("test_str_enum_members_validate_like_their_values", () => {
    const members = [WorkIntensity.MODERATE, WorkIntensity.LIGHT];
    expect(() => capacity(members)).toThrow(
      new TypeError(work_intensity_message),
    );
    expect(() => capacity([WorkIntensity.MODERATE, "invalid"])).toThrow(
      new TypeError(work_intensity_message),
    );
  });
});

describeModelContract(work_capacity_dunne, WORK_CAPACITY_DUNNE_INFO, {
  wbgt: 30,
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("work_capacity_dunne (JS-only)", () => {
  test.each([
    [20, "heavy", 100],
    [25.5, "heavy", 84.25098687631409],
    [28, "heavy", 47.997904423702394],
    [28, "moderate", 95.99580884740479],
    [28, "light", 100],
    [31.4, "heavy", 13.822612398724658],
    [31.4, "moderate", 27.645224797449316],
    [31.4, "light", 55.29044959489863],
    [35, "light", 0],
  ] as const)("wbgt %s, %s gives %s", (wbgt, work_intensity, expected) => {
    const { capacity } = work_capacity_dunne({ wbgt, work_intensity });
    expect(approx(capacity, expected, { rel: 1e-12, abs: 0 })).toBe(true);
  });

  // Deviation work_capacity_dunne-3.
  test.each([
    ["", RangeError],
    ["extreme", RangeError],
    [5, TypeError],
    [true, TypeError],
  ])("work_intensity %j throws upstream's message as a %O", (value, error) => {
    expect(() => call({ wbgt: 30, work_intensity: value })).toThrow(
      new error(work_intensity_message),
    );
  });

  // Deviation work_capacity_dunne-2.
  test("returns no rows", () => {
    for (const wbgt of [-50, 25, 30, 100]) {
      expect(work_capacity_dunne({ wbgt }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(work_capacity_dunne_from_root).toBe(work_capacity_dunne);
  });
});

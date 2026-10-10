import { describe, expect, test } from "@jest/globals";
import { work_capacity_dunne } from "../../src/models/work_capacity_dunne.js";
import library, {
  work_capacity_dunne as publicDunne,
} from "../../src/index.js";

// Mirror tests/test_work_capacity_dunne.py at Python development 0a33e27.
describe("work_capacity_dunne", () => {
  test("test_heavy_scalar_at_25", () => {
    expect(work_capacity_dunne(25, "heavy")).toEqual({ capacity: 100 });
  });
  test("test_heavy_array_and_clipping", () => {
    const wbgt = [20, 25, 28, 30, 35];
    // Per #141/#212/#215, JS batch calculations use scalar calls with map().
    const actual = wbgt.map((t) => work_capacity_dunne(t, "heavy").capacity);
    const expected = wbgt.map((t) =>
      Math.min(100, Math.max(0, 100 - 25 * Math.max(0, t - 25) ** (2 / 3))),
    );
    actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
  });
  test("test_moderate_and_light_intensity", () => {
    const base = Math.min(100, Math.max(0, 100 - 25 * 5 ** (2 / 3)));
    expect(work_capacity_dunne(30, "moderate").capacity).toBeCloseTo(
      Math.min(100, base * 2),
      10,
    );
    expect(work_capacity_dunne(30, "light").capacity).toBeCloseTo(
      Math.min(100, base * 4),
      10,
    );
  });
  test("test_lower_bound_clipping", () => {
    expect(work_capacity_dunne(100, "heavy").capacity).toBe(0);
  });
  test("test_upper_bound_clipping", () => {
    expect(work_capacity_dunne(20, "light").capacity).toBe(100);
  });
  test("test_invalid_intensity_raises", () => {
    expect(() => work_capacity_dunne(25, "invalid")).toThrow(RangeError);
  });
  test("test_work_intensity_accepts_enum", () => {
    // Python's str Enum is represented by string-valued constants in JS.
    const WorkIntensity = Object.freeze({ MODERATE: "moderate" });
    expect(work_capacity_dunne(30, WorkIntensity.MODERATE)).toEqual(
      work_capacity_dunne(30, "moderate"),
    );
  });
  test("default intensity and public exports", () => {
    expect(publicDunne).toBe(work_capacity_dunne);
    expect(library.models.work_capacity_dunne).toBe(work_capacity_dunne);
    expect(work_capacity_dunne(30)).toEqual(work_capacity_dunne(30, "heavy"));
  });
  test.each([
    [28, "heavy", 47.997904423702394],
    [28, "moderate", 95.99580884740479],
    [28, "light", 100],
    [30, "heavy", 26.899556544678347],
    [30, "moderate", 53.799113089356695],
    [30, "light", 100],
  ])("Python reference value (%s, %s)", (wbgt, intensity, expected) => {
    expect(work_capacity_dunne(wbgt, intensity).capacity).toBeCloseTo(
      expected,
      10,
    );
  });
  test.each(["heavy", "moderate", "light"])(
    "clipping boundaries (%s)",
    (intensity) => {
      expect(work_capacity_dunne(25 - 1e-6, intensity).capacity).toBe(100);
      expect(
        work_capacity_dunne(33 - 1e-6, intensity).capacity,
      ).toBeGreaterThan(0);
      expect(work_capacity_dunne(33 + 1e-6, intensity).capacity).toBe(0);
      expect(work_capacity_dunne(-10, intensity).capacity).toBe(100);
    },
  );
  test.each(["HEAVY", "Moderate", "LiGhT"])(
    "case-insensitive intensity (%s)",
    (intensity) => {
      expect(work_capacity_dunne(30, intensity)).toEqual(
        work_capacity_dunne(30, intensity.toLowerCase()),
      );
    },
  );
  test.each([
    { value: NaN },
    { value: Infinity },
    { value: -Infinity },
    { value: "30" },
    { value: null },
    { value: undefined },
    { value: true },
    { value: [] },
    { value: [30] },
    { value: [25, 30] },
    { value: [[30]] },
  ])("reject invalid WBGT ($value)", ({ value }) => {
    expect(() => work_capacity_dunne(value)).toThrow(TypeError);
  });
  test.each([null, 1, true, {}, ["heavy"]])(
    "reject non-string intensity (%j)",
    (value) => {
      expect(() => work_capacity_dunne(25, value)).toThrow(TypeError);
    },
  );
  test.each(["", " heavy ", "constructor", "toString", "__proto__"])(
    "reject unsupported intensity (%s)",
    (value) => {
      expect(() => work_capacity_dunne(25, value)).toThrow(RangeError);
    },
  );
});

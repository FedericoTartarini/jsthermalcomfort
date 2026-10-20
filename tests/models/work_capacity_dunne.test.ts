import { describe, expect, test } from "@jest/globals";
import { work_capacity_dunne } from "../../src/models/work_capacity_dunne.ts";
import type { WorkCapacityDunneParams } from "../../src/models/work_capacity_dunne.ts";
import { WorkIntensity } from "../../src/models/work_capacity.ts";

const INTENSITY_MESSAGE =
  "work_intensity must be one of ['heavy', 'moderate', 'light']";

// Mirrors pythermalcomfort v4.6.2 tests/test_work_capacity_dunne.py. Every
// expected value is what pythermalcomfort 4.6.2 returns for the same call,
// compared exactly where upstream compares with pytest.approx.
describe("test_work_capacity_dunne", () => {
  test("test_heavy_scalar_at_25", () => {
    expect(work_capacity_dunne({ wbgt: 25, work_intensity: "heavy" })).toEqual({
      capacity: 100,
    });
  });

  // Upstream passes wbgt as the list [20, 25, 28, 30, 35]; here one scalar
  // call per element (ADR 0005).
  test.each([
    [20, 100],
    [25, 100],
    [28, 47.997904423702394],
    [30, 26.899556544678347],
    [35, 0],
  ])("test_heavy_array_and_clipping: wbgt %p", (wbgt, capacity) => {
    expect(work_capacity_dunne({ wbgt, work_intensity: "heavy" })).toEqual({
      capacity,
    });
  });

  test("test_moderate_and_light_intensity", () => {
    expect(
      work_capacity_dunne({ wbgt: 30, work_intensity: "moderate" }).capacity,
    ).toBe(53.799113089356695);
    expect(
      work_capacity_dunne({ wbgt: 30, work_intensity: "light" }).capacity,
    ).toBe(100);
  });

  test("test_lower_bound_clipping", () => {
    expect(
      work_capacity_dunne({ wbgt: 100, work_intensity: "heavy" }).capacity,
    ).toBe(0);
  });

  test("test_upper_bound_clipping", () => {
    expect(
      work_capacity_dunne({ wbgt: 20, work_intensity: "light" }).capacity,
    ).toBe(100);
  });

  // Upstream's ValueError for a value not in its list is an Error here
  // (ADR 0012). Upstream's test matches no message.
  test("test_invalid_intensity_raises", () => {
    // Cast: deliberately passing a value outside the type.
    const params = {
      wbgt: 25,
      work_intensity: "invalid",
    } as unknown as WorkCapacityDunneParams;
    expect(() => work_capacity_dunne(params)).toThrow(Error);
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

// Upstream has no test for these. Every expected value is what
// pythermalcomfort 4.6.2 returns for the same call.
describe("work_capacity_dunne beyond upstream's tests", () => {
  test("WorkIntensity has upstream's members, frozen", () => {
    expect(WorkIntensity).toEqual({
      HEAVY: "heavy",
      MODERATE: "moderate",
      LIGHT: "light",
    });
    expect(Object.isFrozen(WorkIntensity)).toBe(true);
  });

  test("work_intensity defaults to heavy, also when passed as undefined", () => {
    expect(work_capacity_dunne({ wbgt: 30 })).toEqual({
      capacity: 26.899556544678347,
    });
    expect(
      work_capacity_dunne({ wbgt: 30, work_intensity: undefined }),
    ).toEqual({ capacity: 26.899556544678347 });
  });

  // Upstream lower-cases work_intensity before it checks and before it
  // computes (classes_input.py:180-183, work_capacity_dunne.py:55).
  test.each([
    ["HEAVY", 26.899556544678347],
    ["Moderate", 53.799113089356695],
    ["LiGhT", 100],
  ])("work_intensity %p computes in any case", (work_intensity, capacity) => {
    // Cast: the type lists upstream's lowercase spellings only.
    const params = {
      wbgt: 30,
      work_intensity,
    } as unknown as WorkCapacityDunneParams;
    expect(work_capacity_dunne(params)).toEqual({ capacity });
  });

  test.each<[number, WorkIntensity, number]>([
    [33, "heavy", 1.4210854715202004e-14],
    [33, "moderate", 2.842170943040401e-14],
    [33, "light", 5.684341886080802e-14],
    [32.999999, "heavy", 8.333333482823946e-6],
    [32.999999, "moderate", 1.666666696564789e-5],
    [32.999999, "light", 3.333333393129578e-5],
    [33.000001, "heavy", 0],
    [33.000001, "moderate", 0],
    [33.000001, "light", 0],
    [25.000000001, "heavy", 99.99997499999863],
    [25.000000001, "moderate", 100],
    [26, "heavy", 75],
    [26, "moderate", 100],
    [31.5, "heavy", 12.927252901467298],
    [31.5, "moderate", 25.854505802934597],
    [31.5, "light", 51.70901160586919],
    [29.3, "heavy", 33.89225969005017],
    [29.3, "moderate", 67.78451938010033],
    [29.3, "light", 100],
  ])(
    "wbgt %p, %p: capacity %p, unrounded as upstream",
    (wbgt, work_intensity, capacity) => {
      expect(work_capacity_dunne({ wbgt, work_intensity })).toEqual({
        capacity,
      });
    },
  );

  // Upstream checks str(value).lower() of each item against its list
  // (classes_input.py:170-184), so a padded or empty string, a number, a
  // boolean, an object or a list with an item outside it raises a ValueError
  // (ADR 0012: Error), with upstream's message.
  test.each([[" heavy "], [""], [1], [1.5], [true], [{ a: 1 }], [["extreme"]]])(
    "throws Error with upstream's message for work_intensity %p",
    (work_intensity) => {
      // Cast: deliberately passing a value outside the type.
      const params = {
        wbgt: 30,
        work_intensity,
      } as unknown as WorkCapacityDunneParams;
      expect(() => work_capacity_dunne(params)).toThrow(Error);
      expect(() => work_capacity_dunne(params)).toThrow(INTENSITY_MESSAGE);
    },
  );

  // Upstream's check skips None and passes a list of valid items, and then
  // `work_intensity.lower()` raises an AttributeError (work_capacity_dunne.py:55),
  // which a wrong type raises (ADR 0012: TypeError).
  test.each([[null], [["heavy"]], [[]]])(
    "throws TypeError for work_intensity %p",
    (work_intensity) => {
      // Cast: deliberately passing a value outside the type.
      const params = {
        wbgt: 30,
        work_intensity,
      } as unknown as WorkCapacityDunneParams;
      expect(() => work_capacity_dunne(params)).toThrow(TypeError);
    },
  );

  // ADR 0001: a non-finite number throws, where upstream returns NaN for NaN,
  // 0 for +Infinity and 100 for -Infinity.
  test.each([[NaN], [Infinity], [-Infinity]])(
    "throws TypeError for wbgt %p",
    (wbgt) => {
      expect(() => work_capacity_dunne({ wbgt })).toThrow(TypeError);
    },
  );

  // ADR 0005: wbgt is a number. Upstream returns 100 for True and False and
  // [26.899556544678347] for [30], raises a TypeError for "30" and None.
  test.each([[true], [false], [[30]], ["30"], [null]])(
    "throws TypeError for wbgt %p",
    (wbgt) => {
      // Cast: deliberately passing a value outside the type.
      const params = { wbgt } as unknown as WorkCapacityDunneParams;
      expect(() => work_capacity_dunne(params)).toThrow(TypeError);
    },
  );

  // wbgt and work_intensity are positional upstream; here one params object
  // (ADR 0002), so a call written positionally throws.
  test("throws TypeError if called positionally", () => {
    // @ts-expect-error the function takes one params object
    expect(() => work_capacity_dunne(30)).toThrow(TypeError);
    // @ts-expect-error the function takes one params object
    expect(() => work_capacity_dunne(30, "moderate")).toThrow(TypeError);
    // @ts-expect-error null is not a params object
    expect(() => work_capacity_dunne(null)).toThrow(TypeError);
    // @ts-expect-error the params object is required
    expect(() => work_capacity_dunne()).toThrow(TypeError);
  });

  // ADR 0008: an unknown key throws, as upstream raises a TypeError for an
  // unexpected keyword argument.
  test("throws TypeError naming an unknown key", () => {
    // Cast: deliberately passing a key upstream does not have.
    const params = {
      wbgt: 30,
      units: "SI",
    } as unknown as WorkCapacityDunneParams;
    expect(() => work_capacity_dunne(params)).toThrow(TypeError);
    expect(() => work_capacity_dunne(params)).toThrow(
      "unexpected key: 'units'",
    );
  });

  test("returns capacity only, with no warnings field", () => {
    expect(Object.keys(work_capacity_dunne({ wbgt: 28 }))).toEqual([
      "capacity",
    ]);
  });
});

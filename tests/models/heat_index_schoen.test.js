import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import packageDefault, { heat_index_schoen } from "../../src/index.js";
import models from "../../src/models/index.js";

const fixtures = JSON.parse(
  readFileSync(
    new URL("./schoen_python_fixtures.json", import.meta.url),
    "utf8",
  ),
);
const decode = (v) =>
  Array.isArray(v)
    ? v.map(decode)
    : ({ nan: NaN, inf: Infinity, "-inf": -Infinity }[v] ?? v);
function compare(actual, expected) {
  expected = decode(expected);
  if (Array.isArray(expected)) {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((v, i) => compare(actual[i], v));
  } else if (typeof expected === "number" && Number.isFinite(expected)) {
    expect(actual).toBeCloseTo(expected, 9);
  } else expect(actual).toEqual(expected);
}

describe("Python reference outputs", () => {
  test.each(fixtures.cases)("reference case %#", (c) => {
    const result = heat_index_schoen(
      decode(c.tdb),
      decode(c.rh),
      c.round_output,
    );
    compare(result.hi, c.hi);
    compare(result.stress_category, c.stress_category);
  });
});
test("test_scalar_rounding_default", () =>
  expect(heat_index_schoen(29, 50)).toEqual({
    hi: 30,
    stress_category: "caution",
  }));
test("test_scalar_no_rounding", () =>
  expect(heat_index_schoen(29, 50, false).hi).not.toBe(30));
test("test_no_risk_category_below_lower_bound", () =>
  expect(heat_index_schoen(10, 50).stress_category).toBe("no risk"));
test("test_list_input", () =>
  expect(heat_index_schoen([29, 35, 45, 55], [50, 60, 70, 80]).hi).toHaveLength(
    4,
  ));
test.each([
  [26.689952, 27, "caution"],
  [30.436055, 32, "extreme caution"],
  [35.979625, 41, "danger"],
  [41.740423, 54, "extreme danger"],
])("test_category_uses_unrounded_heat_index: %s", (t, boundary, category) => {
  const rounded = heat_index_schoen(t, 50),
    raw = heat_index_schoen(t, 50, false);
  expect(raw.hi).toBeGreaterThan(boundary);
  expect(raw.hi).toBeLessThan(boundary + 0.05);
  expect(rounded.hi).toBe(boundary);
  expect(rounded.stress_category).toBe(category);
  expect(raw.stress_category).toBe(category);
});
test.each([true, false])(
  "test_category_rounding_with_broadcast: %s",
  (rounding) => {
    expect(
      heat_index_schoen(
        [26.689952, 30.436055, 35.979625, 41.740423],
        50,
        rounding,
      ).stress_category,
    ).toEqual(["caution", "extreme caution", "danger", "extreme danger"]);
  },
);
test.each([
  ["29", 50, TypeError],
  [29, "50", TypeError],
  [29, -1, RangeError],
  [29, 101, RangeError],
])("test_invalid_inputs_raise_specific: %s, %s", (t, r, error) =>
  expect(() => heat_index_schoen(t, r)).toThrow(error),
);
test.each([
  [undefined, 50],
  [null, 50],
  [{}, 50],
  [29, [50, "60"]],
  [29, 50, null],
  [29, 50, 1],
])("reject invalid types %#", (...args) =>
  expect(() => heat_index_schoen(...args)).toThrow(TypeError),
);
test.each([
  [
    [20, 30],
    [40, 50, 60],
  ],
  [[[20], [30, 40]], 50],
  [29, [50, 101]],
])("reject invalid shapes or humidity %#", (t, r) =>
  expect(() => heat_index_schoen(t, r)).toThrow(RangeError),
);
test("public exports", () => {
  expect(models.heat_index_schoen).toBe(heat_index_schoen);
  expect(packageDefault.models.heat_index_schoen).toBe(heat_index_schoen);
});

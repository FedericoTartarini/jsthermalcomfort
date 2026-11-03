// A test file the mirrored-describe check reads (tests/check_mirrored.test.ts).
// Never run; only parsed.
import { describe, expect, test } from "vitest";

const rows = [1, 2];

// Mirrors pythermalcomfort v4.8.0 tests/test_first.py. A second line of the
// same comment.
describe("test_first", () => {
  test("a closing line inside a template literal", () => {
    expect(`
});`).toContain("});");
  });

  describe("Nested", () => {
    test.each(rows)("row %#", (row) => {
      expect(row).toBeGreaterThan(0);
    });
  });
});

// Mirrors the position cases of pythermalcomfort v4.8.0
// tests/test_choice_field.py.
describe("test_choice_field", () => {
  test("position", () => {
    expect(rows).toHaveLength(2);
  });
});

// What upstream's tests leave out.
describe("first (JS-only)", () => {
  test("rows", () => {
    expect(rows[0]).toBe(1);
  });
});

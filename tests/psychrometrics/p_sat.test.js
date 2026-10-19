import { expect, describe, it, test } from "@jest/globals";
import { p_sat } from "../../src/psychrometrics/p_sat";

// Mirrors test_p_sat in pythermalcomfort v4.6.2 tests/test_psychrometrics.py.
describe("test_psychrometrics", () => {
  test("test_p_sat", () => {
    expect(Math.abs(p_sat(25) - 3169.2)).toBeLessThanOrEqual(1e-1);
    expect(Math.abs(p_sat(50) - 12349.9)).toBeLessThanOrEqual(1e-1);
  });
});

// Expected values below are the unrounded ones pythermalcomfort v4.6.2's
// p_sat prints.
describe("p_sat (JS-only)", () => {
  it("should be a function", () => {
    expect(p_sat).toBeInstanceOf(Function);
  });

  it("returns upstream's unrounded value at 25 °C", () => {
    expect(p_sat(25)).toBe(3169.2164701436163);
  });

  it.each([
    { tdb: 0, expected: 611.212867451187 },
    { tdb: 1, expected: 657.0717179813817 },
    { tdb: -1, expected: 562.6715296089346 },
    { tdb: -273, expected: 0.0 },
  ])("returns $expected when tdb is $tdb", ({ tdb, expected }) => {
    expect(Math.abs(p_sat(tdb) - expected)).toBeLessThanOrEqual(1e-9);
  });
});

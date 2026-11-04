import { describe, expect, it } from "vitest";
import { f_svv } from "../../src/environment/index.ts";

const DEFAULT_TOLERANCE = 0.01;

describe("f_svv", () => {
  it.each([
    { width: 30, height: 10, distance: 3.3, expected: 0.27 },
    { width: 150, height: 10, distance: 3.3, expected: 0.31 },
    { width: 30, height: 6, distance: 3.3, expected: 0.2 },
    { width: 150, height: 6, distance: 3.3, expected: 0.23 },
    { width: 30, height: 10, distance: 6, expected: 0.17 },
    { width: 150, height: 10, distance: 6, expected: 0.21 },
    { width: 30, height: 6, distance: 6, expected: 0.11 },
    { width: 150, height: 6, distance: 6, expected: 0.14 },
    { width: 6, height: 9, distance: 3.3, expected: 0.14 },
    { width: 6, height: 6, distance: 3.3, expected: 0.11 },
    { width: 6, height: 6, distance: 6, expected: 0.04 },
    { width: 4, height: 4, distance: 3.3, expected: 0.06 },
    { width: 4, height: 4, distance: 6, expected: 0.02 },
  ])(
    "resturns $expected when width is $width, height is $height and distance is $distance",
    ({ width, height, distance, expected }) => {
      const result = f_svv(width, height, distance);

      expect(Math.abs(result - expected)).toBeLessThanOrEqual(
        DEFAULT_TOLERANCE,
      );
    },
  );

  // Deviation _shared-93, deviation _shared-94.
  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "30", [30]]) {
      expect(() => f_svv(bad, 10, 3.3)).toThrow(
        new TypeError("w must be a number."),
      );
      expect(() => f_svv(30, bad, 3.3)).toThrow(
        new TypeError("h must be a number."),
      );
      expect(() => f_svv(30, 10, bad)).toThrow(
        new TypeError("d must be a number."),
      );
    }
    expect(() => f_svv()).toThrow(new TypeError("w must be a number."));
    expect(() => f_svv(30)).toThrow(new TypeError("h must be a number."));
    expect(() => f_svv(30, 10)).toThrow(new TypeError("d must be a number."));
  });

  it("does not throw for NaN", () => {
    expect(() => f_svv(NaN, 10, 3.3)).not.toThrow();
    expect(() => f_svv(30, NaN, 3.3)).not.toThrow();
    expect(() => f_svv(30, 10, NaN)).not.toThrow();
  });
});

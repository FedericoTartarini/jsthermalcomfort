import { describe, expect, it } from "vitest";
import { v_relative } from "../../src/environment/index.ts";

describe("v_relative", () => {
  it.each([
    { v: 2.0, met: 1.0, expected: 2.0 },
    { v: -1.5, met: 1.5, expected: -1.5 + 0.3 * 0.5 },
  ])(
    "returns $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      const result = v_relative(v, met);
      // Tolerance is manually defined because v_relative is not in the shared reference data
      expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.0001);
    },
  );

  // JS-only: upstream rounds with `np.around(..., 3)`. Expected values are
  // pythermalcomfort 4.6.0's for the same inputs.
  it.each([
    { v: 0, met: 1.005, expected: 0.001 },
    { v: 0.1, met: 1.015, expected: 0.104 },
  ])(
    "rounds as numpy does: $expected when v is $v and met is $met",
    ({ v, met, expected }) => {
      expect(v_relative(v, met)).toBe(expected);
    },
  );

  // Deviation _shared-88, deviation _shared-89, deviation _shared-90, deviation _shared-91, deviation _shared-92.
  it("throws TypeError for an argument that is not a number, naming it", () => {
    for (const bad of [null, true, "0.1", [0.1]]) {
      expect(() => v_relative(bad, 1.2)).toThrow(
        new TypeError("v must be a number."),
      );
      expect(() => v_relative(0.1, bad)).toThrow(
        new TypeError("met must be a number."),
      );
    }
    expect(() => v_relative()).toThrow(new TypeError("v must be a number."));
    expect(() => v_relative(0.1)).toThrow(
      new TypeError("met must be a number."),
    );
  });

  it("does not throw for NaN", () => {
    expect(() => v_relative(NaN, 1.2)).not.toThrow();
    expect(() => v_relative(0.1, NaN)).not.toThrow();
  });
});

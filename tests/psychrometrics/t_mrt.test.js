import { expect, describe, it } from "vitest";
import { t_mrt } from "../../src/psychrometrics/index.ts";

describe("t_mrt", () => {
  it.each([
    {
      tg: 53.2,
      tdb: 30,
      v: 0.3,
      d: 0.1,
      emissivity: 0.95,
      standard: "ISO",
      expected: 74.8,
    },
    // Low-wind ISO case: natural convection dominates, so a bug in the
    // 1.4 coefficient of h_n surfaces here. The high-wind case above
    // sits in the forced-convection regime and is insensitive to it.
    {
      tg: 20,
      tdb: 10,
      v: 0.1,
      d: 0.05,
      emissivity: 0.95,
      standard: "ISO",
      expected: 29.3,
    },
    {
      tg: 25.42,
      tdb: 26.1,
      v: 0.1931,
      d: 0.1,
      emissivity: 0.95,
      standard: "Mixed Convection",
      expected: 24.2,
    },
  ])("test t_mrt", ({ tg, tdb, v, d, emissivity, standard, expected }) => {
    const result = t_mrt(tg, tdb, v, d, emissivity, standard);
    expect(result).toBe(expected);
  });

  // Deviation _shared-95, deviation _shared-96, deviation _shared-97, deviation _shared-98.
  it("throws TypeError for an argument of the wrong type, naming it", () => {
    for (const bad of [null, true, "20", [25]]) {
      expect(() => t_mrt(bad, 24, 0.1)).toThrow(
        new TypeError("tg must be a number."),
      );
      expect(() => t_mrt(25, bad, 0.1)).toThrow(
        new TypeError("tdb must be a number."),
      );
      expect(() => t_mrt(25, 24, bad)).toThrow(
        new TypeError("v must be a number."),
      );
      expect(() => t_mrt(25, 24, 0.1, bad)).toThrow(
        new TypeError("d must be a number."),
      );
      expect(() => t_mrt(25, 24, 0.1, 0.15, bad)).toThrow(
        new TypeError("emissivity must be a number."),
      );
    }
    for (const bad of [null, true, 5, ["ISO"]]) {
      expect(() => t_mrt(25, 24, 0.1, 0.15, 0.95, bad)).toThrow(
        new TypeError("standard must be a string."),
      );
    }
    expect(() => t_mrt()).toThrow(new TypeError("tg must be a number."));
    expect(() => t_mrt(25)).toThrow(new TypeError("tdb must be a number."));
    expect(() => t_mrt(25, 24)).toThrow(new TypeError("v must be a number."));
  });

  it("takes the defaults for an explicit undefined", () => {
    expect(t_mrt(25, 24, 0.1, undefined, undefined, undefined)).toBe(
      t_mrt(25, 24, 0.1),
    );
  });

  it("does not throw for NaN", () => {
    for (const standard of ["ISO", "Mixed Convection"]) {
      expect(() => t_mrt(NaN, 24, 0.1, 0.15, 0.95, standard)).not.toThrow();
      expect(() => t_mrt(25, NaN, 0.1, 0.15, 0.95, standard)).not.toThrow();
      expect(() => t_mrt(25, 24, NaN, 0.15, 0.95, standard)).not.toThrow();
      expect(() => t_mrt(25, 24, 0.1, NaN, 0.95, standard)).not.toThrow();
      expect(() => t_mrt(25, 24, 0.1, 0.15, NaN, standard)).not.toThrow();
    }
  });
});

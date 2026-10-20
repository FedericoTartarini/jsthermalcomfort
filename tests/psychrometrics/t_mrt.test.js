import { expect, describe, it } from "@jest/globals";
import { t_mrt } from "../../src/psychrometrics/t_mrt";

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

  // Upstream calls standard.lower() on what it is given
  // (pythermalcomfort/environment/mean_radiant_tmp.py:67 at v4.6.2), so
  // mean_radiant_tmp(tg=30, tdb=25, v=0.2, standard=None), 5, 1.5, True,
  // ["iso"] and {"a": 1} raise AttributeError in pythermalcomfort 4.6.2,
  // which ADR 0012 maps to a TypeError when a wrong type raises it.
  it.each([null, 5, 1.5, true, ["ISO"], { a: 1 }])(
    "throws TypeError if standard is %p, not a string",
    (standard) => {
      expect(() => t_mrt(30, 25, 0.2, 0.15, 0.95, standard)).toThrow(TypeError);
      expect(() => t_mrt(30, 25, 0.2, 0.15, 0.95, standard)).toThrow(
        'Parameter "standard" must be a string',
      );
    },
  );

  it("takes the default standard only when standard is undefined", () => {
    expect(t_mrt(30, 25, 0.2, 0.15, 0.95, undefined)).toBe(
      t_mrt(30, 25, 0.2, 0.15, 0.95, "Mixed Convection"),
    );
  });
});

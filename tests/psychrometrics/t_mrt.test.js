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
});

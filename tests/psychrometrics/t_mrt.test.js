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

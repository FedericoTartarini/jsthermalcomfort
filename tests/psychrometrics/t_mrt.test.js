import { expect, describe, it } from "@jest/globals";
import { t_mrt } from "../../src/psychrometrics/t_mrt";
import {deep_close_to_array} from "../test_utilities"

describe("t_mrt", () => {
  it.each([
    {
      tg: [53.2, 55],
      tdb: 30,
      v: 0.3,
      d: 0.1,
      emissivity: 0.95,
      standard: "ISO",
      expected: [74.8, 77.8],
    },
    {
      tg: [25.42, 26.42, 26.42, 26.42],
      tdb: 26.1,
      v: 0.1931,
      d: [0.1, 0.1, 0.5, 0.03],
      emissivity: 0.95,
      standard: "Mixed Convection",
      expected: [24.2, 27.0, NaN, NaN],
    },
  ])("test t_mrt", ({ tg, tdb, v, d, emissivity, standard, expected }) => {
    const result = t_mrt(tg, tdb, v, d, emissivity, standard);
    deep_close_to_array(result, expected, 0.2)
  });
});

import { expect, describe, it } from "@jest/globals";
import { humidex } from "../../src/models/humidex";

describe("humidex", () => {
  it.each([
    {
      tdb: 22,
      rh: 56,
      expected: {
        humidex: 24.7,
        discomfort: "Little or no discomfort",
      },
    },
    {
      tdb: 28,
      rh: 56,
      expected: {
        humidex: 34.2,
        discomfort: "Noticeable discomfort",
      },
    },
    {
      tdb: 30,
      rh: 56,
      expected: {
        humidex: 37.6,
        discomfort: "Evident discomfort",
      },
    },
    {
      tdb: 32,
      rh: 56,
      expected: {
        humidex: 41.2,
        discomfort: "Intense discomfort; avoid exertion",
      },
    },
    {
      tdb: 38,
      rh: 56,
      expected: {
        humidex: 53.0,
        discomfort: "Dangerous discomfort",
      },
    },
    {
      tdb: 40,
      rh: 56,
      expected: {
        humidex: 57.3,
        discomfort: "Heat stroke probable",
      },
    },
    {
      tdb: 40,
      rh: 56,
      round: false,
      expected: {
        humidex: 57.32156454581363,
        discomfort: "Heat stroke probable",
      },
    },
  ])(
    "returns $expected when tdb is $tdb and rh is $rh",
    ({ tdb, rh, round, expected }) => {
      const options = round !== undefined ? { round } : undefined;
      const result = humidex(tdb, rh, options);
      expect(result).toStrictEqual(expected);
    },
  );
});

import { expect, describe, it } from "@jest/globals";
import { at } from "../../src/models/at";

describe("at", () => {
  it.each([
    {
      tdb: 25,
      rh: 30,
      v: 0.1,
      expected: 24.1,
    },
    {
      tdb: 23,
      rh: 70,
      v: 1,
      expected: 24.8,
    },
    {
      tdb: 23,
      rh: 70,
      v: 1,
      q: 50,
      expected: 28.1,
    },
  ])(
    "returns $expected when tdb is $tdb, rh is $rh, v is $v and q is $q",
    ({ tdb, rh, v, q, expected }) => {
      const result = at(tdb, rh, v, q);
      expect(result).toBeCloseTo(expected);
    },
  );
});

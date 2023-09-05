import { expect, describe, it } from "@jest/globals";
import { net } from "../../src/models/net";

describe("net", () => {
  it.each([
    {
      tdb: 21,
      rh: 56,
      v: 4,
      expected: 13.7,
    },
    {
      tdb: -273,
      rh: 56,
      v: 4,
      expected: -327.4,
    },
    {
      tdb: 100,
      rh: 56,
      v: 4,
      expected: 105.4,
    },
    {
      tdb: 21,
      rh: 56,
      v: 4,
      round: false,
      expected: 13.713298025191364,
    },
  ])(
    "returns $expected when tdb is $tdb, rh is $rh, and v is $v",
    ({ tdb, rh, v, round, expected }) => {
      const options = round !== undefined ? { round } : undefined;
      const result = net(tdb, rh, v, options);
      expect(result).toBe(expected);
    },
  );
});

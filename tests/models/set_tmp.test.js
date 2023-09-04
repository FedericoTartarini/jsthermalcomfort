import { expect, describe, it } from "@jest/globals";
import { set_tmp } from "../../src/models/set_tmp";

describe("set_tmp", () => {
  it("should be a function", () => {
    expect(set_tmp).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: 25,
      tr: 25,
      v: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      expected: 25.0,
    },
    {
        tdb: 30,
        tr: 50,
        v: 0.5,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        expected: 36.8,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo and units is $units",
    ({ tdb, tr, v, rh, met, clo, expected }) => {
      const result = set_tmp(tdb, tr, v, rh, met, clo);

      expect(result).toBeCloseTo(expected, 1);
    },
  );

});
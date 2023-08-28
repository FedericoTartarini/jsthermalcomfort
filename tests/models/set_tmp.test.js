import { expect, describe, it } from "@jest/globals";
import { set_tmp } from "../../src/models/set_tmp";

describe("set_tmp", () => {
  it("should be a function", () => {
    expect(set_tmp).toBeInstanceOf(Function);
  });

  it.each([
    {
      tdb: 25,
      tr: 50,
      v: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      expected: 24.3,
    },
    {
        tdb: 50,
        tr: 50,
        v: 0.5,
        rh: 150,
        met: 1.2,
        clo: 0.5,
        expected: 44.3,
    },
    {
        tdb: 77,
        tr: 77,
        v: 0.328,
        rh: 50,
        met: 1.2,
        clo: 0.5,
        units:'IP',
        expected: 75.8,
    },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo and units is $units",
    ({ tdb, tr, v, rh, met, clo, units, expected }) => {
      const result = set_tmp(tdb, tr, v, rh, met, clo, units);

      expect(result).toBeCloseTo(expected, 1);
    },
  );

});
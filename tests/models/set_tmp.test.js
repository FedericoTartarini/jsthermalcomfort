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
    {
      tdbArray: [30, 50],
      trArray: [50,50],
      vArray: [0.5, 0.3],
      rhArray: [50, 60],
      metArray: [1.2, 1.5],
      cloArray: [0.5, 0.8],
      expected: [36.8, 46.7],
  },
  ])(
    "returns $expected when tdb is $tdb, tr is $tr, v is $v, rh is $rh, met is $met, clo is $clo and units is $units",
    ({ tdbArray, trArray, vArray, rhArray, metArray, cloArray, expected }) => {
      const result = set_tmp_array(tdbArray, trArray, vArray, rhArray, metArray, cloArray);

      expect(result).toBeCloseTo(expected, 1);
    },
  );

});
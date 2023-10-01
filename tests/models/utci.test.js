import { expect, describe, it } from "@jest/globals";
import { deep_close_to_array, deep_close_to_obj_arrays } from "../test_utilities";
import { utci, utci_array } from "../../src/models/utci.js";

describe("utci", () => {
  it.each([
    { tdb: 25, tr: 27, rh: 50, v: 1, expected: 25.2 },
    { tdb: 19, tr: 24, rh: 50, v: 1, expected: 20.0 },
    { tdb: 19, tr: 14, rh: 50, v: 1, expected: 16.8 },
    { tdb: 27, tr: 22, rh: 50, v: 1, expected: 25.5 },
    { tdb: 27, tr: 22, rh: 50, v: 10, expected: 20.0 },
    { tdb: 27, tr: 22, rh: 50, v: 16, expected: 15.8 },
    { tdb: 51, tr: 22, rh: 50, v: 16, expected: NaN },
    { tdb: 27, tr: 22, rh: 50, v: 0, expected: NaN },
  ])(
    "Returns $expected when tdb is $tdb, tr is $tr, rh is $rh, v is $v",
    ({ tdb, tr, rh, v, expected }) => {
      const result = utci(tdb, tr, v, rh);
      if (isNaN(expected)) {
        expect(result).toBeNaN();
      } else expect(result).toBe(expected);
    },
  );

  it.each([
    {
      tdb: 77,
      tr: 77,
      v: 3.28,
      rh: 50,
      units: "ip",
      return_stress_category: false,
      expected: 76.4,
    },
    {
      tdb: 30,
      tr: 27,
      v: 1,
      rh: 50,
      units: "si",
      return_stress_category: true,
      expected: { utci: 29.6, stress_category: "moderate heat stress" },
    },
    {
      tdb: 9,
      tr: 9,
      v: 1,
      rh: 50,
      units: "si",
      return_stress_category: true,
      expected: {
        utci: 8.7,
        stress_category: "slight cold stress",
      },
    },
  ])(
    "Returns $expected when tdb is $tdb, tr is $tr, rh is $rh, v is $v",
    ({ tdb, tr, v, rh, units, return_stress_category, expected }) => {
      const result = utci(tdb, tr, v, rh, units, return_stress_category);
      if (return_stress_category) {
        for (let [key, value] of Object.entries(result)) {
            expect(value).toBe(expected[key]);
          }
      } else expect(result).toBe(expected);
    },
  );
});

describe('utci_array', () => { 
    it.each([
        {tdb: [25, 19, 19, 27, 27, 27, 51, 27],
        tr: [27, 24, 14, 22, 22, 22, 22, 22],
        v: [1,1,1,1,10, 16, 16, 0],
        rh:[50, 50, 50, 50, 50, 50, 50, 50],
        expected: [25.2, 20.0, 16.8, 25.5, 20, 15.8, NaN, NaN]}
    ])(
        "Returns $expected when tdb is $tdb, tr is $tr, rh is $rh, v is $v",
        ({tdb, tr, v,rh, expected}) => {
            const result = utci_array(tdb, tr,v,rh)
            deep_close_to_array(result, expected, 0)
        }
    )

    it.each([{
        tdb: [25, 25],
        tr:[27, 25],
        v:[1, 1],
        rh:[50, 50],
        units: "si",
        expected: {
            utci: [25.2, 24.6],
            stress_category: ["no thermal stress", "no thermal stress"]
        }
    }])(
        "Returns $expected when tdb is $tdb, tr is $tr, rh is $rh, v is $v",
        ({tdb, tr, v,rh, units, expected}) => {
            const result = utci_array(tdb, tr,v,rh, units, true)
            deep_close_to_array(result.utci, expected.utci, 0)
            expect(result.stress_category.length).toBe(expected.stress_category.length)
            for(let i = 0; i < result.stress_category.length; i++) {
                expect(result.stress_category[i]).toBe(expected.stress_category[i])
            }
        }
    )
 })

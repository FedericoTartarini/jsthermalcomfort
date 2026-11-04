import { expect, describe, test } from "@jest/globals";
import { two_nodes_gagge_ji } from "../../src/models/two_nodes_gagge_ji.js";
import { p_sat_torr } from "../../src/psychrometrics/p_sat_torr.js";
import { body_surface_area } from "../../src/utilities/utilities.js";

describe("two_nodes_gagge_ji", () => {
  const weight = 80.1;
  const bsa = body_surface_area(weight, 1.8);
  const vaporPressure = (rh, tdb) => (rh * p_sat_torr(tdb)) / 100;

  const simulate = ({
    tdb,
    tr,
    v,
    met,
    clo,
    vapor_pressure,
    wme = 0,
    body_surface_area: area = bsa,
    p_atm = 101325,
    position = "sitting",
    ...kwargs
  }) =>
    two_nodes_gagge_ji(
      tdb,
      tr,
      v,
      met,
      clo,
      vapor_pressure,
      wme,
      area,
      p_atm,
      position,
      kwargs,
    );

  const expectSeriesClose = (actual, expected, digits = 10) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, index) => {
      expect(actual[index]).toBeCloseTo(value, digits);
    });
  };

  test("matches scalar time-series regression values", () => {
    const result = simulate({
      tdb: 36.5,
      tr: 36.5,
      v: 0.25,
      met: 0.95,
      clo: 0.1,
      vapor_pressure: vaporPressure(20, 36.5),
      length_time_simulation: 6,
      body_weight: weight,
    });

    expectSeriesClose(
      result.t_core,
      [
        36.516105213824275, 36.547685700888465, 36.576012449954796,
        36.60164288217578, 36.62502377928286, 36.64651422522319,
      ],
    );
    expectSeriesClose(
      result.t_skin,
      [
        36.774035566875106, 36.40807561844041, 36.11486504764158,
        35.87955212231442, 35.69038774391016, 35.53809246343035,
      ],
    );
  });

  describe("Ji et al. (2022) reference scenarios", () => {
    test.each([
      {
        tdb: 36.5,
        tr: 36.5,
        v: 0.25,
        met: 0.95,
        clo: 0.1,
        rh: 20,
        weight: 80.1,
        height: 1.8,
        expectedCore: 37.446339126254756,
        expectedSkin: 34.596469729370725,
        duration: 120,
      },
      {
        tdb: 36.5,
        tr: 36.5,
        v: 0.25,
        met: 0.96,
        clo: 0.1,
        rh: 60,
        weight: 80.1,
        height: 1.8,
        expectedCore: 37.512644583008566,
        expectedSkin: 34.85861523864417,
        duration: 120,
      },
      {
        tdb: 31,
        tr: 31,
        v: 0.2,
        met: 0.7,
        clo: 0.67,
        rh: 60,
        weight: 55.7,
        height: 1.525,
        expectedCore: 37.16672342773386,
        expectedSkin: 34.29506493710769,
        duration: 150,
      },
      {
        tdb: 27,
        tr: 27,
        v: 0.2,
        met: 0.7,
        clo: 0.67,
        rh: 60,
        weight: 55.7,
        height: 1.525,
        expectedCore: 36.69341582589469,
        expectedSkin: 33.64236786746656,
        duration: 150,
      },
    ])(
      "returns expected final temperatures for tdb=$tdb, met=$met, rh=$rh",
      ({
        tdb,
        tr,
        v,
        met,
        clo,
        rh,
        weight: bodyWeight,
        height,
        expectedCore,
        expectedSkin,
        duration,
      }) => {
        const result = simulate({
          tdb,
          tr,
          v,
          met,
          clo,
          vapor_pressure: vaporPressure(rh, tdb),
          body_surface_area: body_surface_area(bodyWeight, height),
          body_weight: bodyWeight,
          length_time_simulation: duration,
          acclimatized: true,
        });

        expect(result.t_core.at(-1)).toBeCloseTo(expectedCore, 2);
        expect(result.t_skin.at(-1)).toBeCloseTo(expectedSkin, 2);
      },
    );
  });

  test("throws when position is invalid", () => {
    expect(() =>
      simulate({
        tdb: 36.5,
        tr: 36.5,
        v: 0.25,
        met: 0.95,
        clo: 0.1,
        vapor_pressure: vaporPressure(20, 36.5),
        position: "lying",
      }),
    ).toThrow(/position/);
  });

  test("throws when tdb is not numeric", () => {
    expect(() =>
      simulate({
        tdb: "hot",
        tr: 36.5,
        v: 0.25,
        met: 0.95,
        clo: 0.1,
        vapor_pressure: vaporPressure(20, 36.5),
      }),
    ).toThrow(TypeError);
  });
});

import { describe, expect, jest, test } from "@jest/globals";
import { ankle_draft } from "../../src/models/ankle_draft.js";

// Offline regressions complement the shared reference table in ankle_draft.test.js.
// Applicability and broadcasting follow pythermalcomfort/models/ankle_draft.py.
const defaults = [25, 25, 0.1, 50, 1.2, 0.5, 0.3];

describe("ankle_draft regression coverage", () => {
  // Reference values generated with pythermalcomfort 4.6.0. These expose the
  // PMV initial-clothing-temperature discrepancy missed by the shared table.
  test.each([
    {
      inputs: [
        13.823365578464163, 19.24775049790401, 0, 89.89246365264746,
        1.6302296150192621, 0.37429460883438664, 0.15419043250767844,
      ],
      ppd_ad: 40.1,
    },
    {
      inputs: [
        30.593530547680498, 14.551810208528693, 0.2, 94.91256423580312,
        1.2555427251886901, 0.3722864328151742, 0.8371095519264427,
      ],
      ppd_ad: 55.1,
    },
  ])("matches Python for PMV-sensitive input [%#]", ({ inputs, ppd_ad }) => {
    expect(ankle_draft(...inputs)).toEqual({ ppd_ad, acceptability: false });
  });

  test("matches Python's numerical kernel when unchecked vr is NaN", () => {
    expect(ankle_draft(25, 25, NaN, 50, 1.2, 0.5, 0.3, "SI", false)).toEqual({
      ppd_ad: 14.3,
      acceptability: true,
    });
  });

  test("propagates the Python numerical result for unchecked negative clothing", () => {
    expect(ankle_draft(25, 25, 0.1, 50, 1.2, -0.1, 0.3, "SI", false)).toEqual({
      ppd_ad: NaN,
      acceptability: false,
    });
  });

  test("emits one range warning per supplied variable, not per broadcast cell", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      ankle_draft([[41], [45]], 25, 0.1, 50, 1.2, 0.5, [0.1, 0.2, 0.3]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("[41, 45]"));
    } finally {
      warn.mockRestore();
    }
  });

  test("matches the published Python example and public return keys", () => {
    expect(ankle_draft(25, 25, 0.2, 50, 1.2, 0.5, 0.3)).toEqual({
      ppd_ad: 18.5,
      acceptability: true,
    });
  });

  test("converts both air speeds and temperatures in IP", () => {
    const si = ankle_draft(...defaults);
    expect(ankle_draft(77, 77, 0.3281, 50, 1.2, 0.5, 0.9843, "IP")).toEqual(si);
    expect(ankle_draft(77, 77, 0.3281, 50, 1.2, 0.5, 0.9843, "ip")).toEqual(si);
    expect(ankle_draft(...defaults, "si")).toEqual(si);
  });

  test.each([
    [0, 9.99],
    [0, 40.01],
    [1, 9.99],
    [1, 40.01],
    [4, 0.99],
    [4, 4.01],
    [5, -0.01],
    [5, 1.51],
    [0, NaN],
  ])("masks both outputs outside applicability limits [%#]", (index, value) => {
    const args = [...defaults];
    args[index] = value;
    expect(ankle_draft(...args)).toEqual({ ppd_ad: NaN, acceptability: NaN });
  });

  test.each([
    [0, 10],
    [0, 40],
    [1, 10],
    [1, 40],
    [2, 0],
    [2, 0.2],
    [4, 1],
    [4, 4],
    [5, 0],
    [5, 1.5],
  ])("includes applicability boundary values [%#]", (index, value) => {
    const args = [...defaults];
    args[index] = value;
    expect(Number.isFinite(ankle_draft(...args).ppd_ad)).toBe(true);
  });

  test.each([-0.01, 0.20001, NaN, Infinity])(
    "rejects entirely invalid ankle-draft airspeed %s",
    (vr) => {
      expect(() => ankle_draft(25, 25, vr, 50, 1.2, 0.5, 0.3)).toThrow(
        RangeError,
      );
    },
  );

  test("limit_inputs=false disables both the range mask and airspeed exception", () => {
    expect(
      Number.isFinite(
        ankle_draft(41, 25, 0.1, 50, 1.2, 0.5, 0.3, "SI", false).ppd_ad,
      ),
    ).toBe(true);
    expect(
      Number.isFinite(
        ankle_draft(25, 25, 0.3, 50, 1.2, 0.5, 0.3, "SI", false).ppd_ad,
      ),
    ).toBe(true);
  });

  test("warns for masked input only when limit_inputs is enabled", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      ankle_draft(41, 25, 0.1, 50, 1.2, 0.5, 0.3);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("'tdb'"));
      warn.mockClear();
      ankle_draft(41, 25, 0.1, 50, 1.2, 0.5, 0.3, "SI", false);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test("broadcasts scalars and singleton arrays without dropping invalid elements", () => {
    expect(ankle_draft([25, 41], [25], 0.1, 50, 1.2, 0.5, 0.3)).toEqual({
      ppd_ad: [14.8, NaN],
      acceptability: [true, NaN],
    });
  });

  test("broadcasts a column of temperatures against a row of ankle speeds", () => {
    const result = ankle_draft([[25], [30]], 25, 0.1, 50, 1.2, 0.5, [0.1, 0.3]);
    for (const [i, tdb] of [25, 30].entries()) {
      for (const [j, speed] of [0.1, 0.3].entries()) {
        const scalar = ankle_draft(tdb, 25, 0.1, 50, 1.2, 0.5, speed);
        expect(result.ppd_ad[i][j]).toBe(scalar.ppd_ad);
        expect(result.acceptability[i][j]).toBe(scalar.acceptability);
      }
    }
  });

  test("mixed airspeeds use Python's aggregate exception and general range mask", () => {
    const result = ankle_draft(
      25,
      25,
      [0.1, 0.3, 2.01, NaN],
      50,
      1.2,
      0.5,
      0.3,
    );
    expect(result.ppd_ad[0]).toBe(14.8);
    expect(result.ppd_ad[1]).toBe(
      ankle_draft(25, 25, 0.3, 50, 1.2, 0.5, 0.3, "SI", false).ppd_ad,
    );
    expect(result.ppd_ad.slice(2)).toEqual([NaN, NaN]);
    expect(result.acceptability.slice(2)).toEqual([NaN, NaN]);
    expect(() => ankle_draft(25, 25, [0.3, 0.4], 50, 1.2, 0.5, 0.3)).toThrow(
      RangeError,
    );
  });

  test("matches Python empty input handling and preserves singleton arrays", () => {
    expect(() => ankle_draft([[], []], 25, 0.1, 50, 1.2, 0.5, 0.3)).toThrow(
      RangeError,
    );
    expect(ankle_draft([25], 25, 0.1, 50, 1.2, 0.5, 0.3)).toEqual({
      ppd_ad: [14.8],
      acceptability: [true],
    });
    expect(() => ankle_draft(25, 25, [], 50, 1.2, 0.5, 0.3)).toThrow(
      RangeError,
    );
    expect(() =>
      ankle_draft(25, 25, [], 50, 1.2, 0.5, 0.3, "SI", false),
    ).toThrow(RangeError);
    expect(ankle_draft(25, 25, 0.1, 50, 1.2, 0.5, [], "SI", false)).toEqual({
      ppd_ad: [],
      acceptability: [],
    });
  });

  test("propagates missing humidity without treating it as an applicability mask", () => {
    expect(ankle_draft(25, 25, 0.1, NaN, 1.2, 0.5, 0.3)).toEqual({
      ppd_ad: NaN,
      acceptability: false,
    });
  });

  test("accepts numeric boolean inputs", () => {
    expect(ankle_draft(25, 25, false, 50, true, false, false)).toEqual(
      ankle_draft(25, 25, 0, 50, 1, 0, 0),
    );
  });

  test.each([
    { tdb: [[25], [30, 35]] },
    { tdb: [25, "30"] },
    { tdb: null },
    { tdb: "25" },
  ])("rejects malformed temperature inputs [%#]", ({ tdb }) => {
    expect(() => ankle_draft(tdb, 25, 0.1, 50, 1.2, 0.5, 0.3)).toThrow();
  });

  test("determines acceptability from the rounded dissatisfaction percentage", () => {
    // Invert Liu's equation at PMV = 0.08 to straddle the 20% threshold.
    const speed = (ppd) =>
      (Math.log(ppd / (100 - ppd)) + 2.58 + 1.06 * 0.08) / 3.05;
    expect(ankle_draft(25, 25, 0.1, 50, 1.2, 0.5, speed(20.04))).toEqual({
      ppd_ad: 20,
      acceptability: true,
    });
    expect(ankle_draft(25, 25, 0.1, 50, 1.2, 0.5, speed(20.06))).toEqual({
      ppd_ad: 20.1,
      acceptability: false,
    });
  });

  test("rejects incompatible shapes", () => {
    expect(() =>
      ankle_draft([25, 30], [25, 30, 35], 0.1, 50, 1.2, 0.5, 0.3),
    ).toThrow(RangeError);
    expect(() => ankle_draft([], [25, 30], 0.1, 50, 1.2, 0.5, 0.3)).toThrow(
      RangeError,
    );
  });

  test.each([null, 1, {}, "invalid"])("rejects invalid units [%#]", (units) => {
    expect(() => ankle_draft(...defaults, units)).toThrow();
  });

  test.each([null, 1, "false"])(
    "rejects non-boolean limit_inputs [%#]",
    (limit) => {
      expect(() => ankle_draft(...defaults, "SI", limit)).toThrow(TypeError);
    },
  );
});

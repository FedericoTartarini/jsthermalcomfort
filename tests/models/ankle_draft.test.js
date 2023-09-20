import { expect, describe, it } from "@jest/globals";
import { ankle_draft } from "../../src/models/ankle_draft.js";

describe("adaptive_en", () => {
  it.each([
    {
      tdb: 25,
      tr: 25,
      vr: 0.2,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.3,
      units: "SI",
      expected: 18.5,
    },
    {
      tdb: 77,
      tr: 77,
      vr: 0.2 * 3.28,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 0.4 * 3.28,
      units: "IP",
      expected: 23.5,
    },
    {
      tdb: 25,
      tr: 25,
      vr: 0.3,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      v_ankle: 7,
      units: "SI",
      expected: "error",
    },
  ])(
    "returns expected value $expected or throw error",
    ({ tdb, tr, vr, rh, met, clo, v_ankle, units, expected }) => {
      if (expected === "error") {
        try {
          expect(
            ankle_draft(tdb, tr, vr, rh, met, clo, v_ankle, units),
          ).toThrow(
            "This equation is only applicable for air speed lower than 0.2 m/s",
          );
        } catch (error) {}
      } else {
        const result = ankle_draft(tdb, tr, vr, rh, met, clo, v_ankle, units)[
          "PPD_ad"
        ];
        expect(result).toBe(expected);
      }
    },
  );
});

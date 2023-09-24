import { expect, describe, it } from "@jest/globals";
import { vertical_tmp_grad_ppd } from "../../src/models/vertical_tmp_grad_ppd";

describe("vertical_tmp_grad_ppd", () => {
  it.each([
    {
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 7,
      units: undefined,
      expected: { PPD_vg: 12.6, Acceptability: false },
    },
    {
      tdb: 77,
      tr: 77,
      vr: 0.328,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 3.84,
      units: "IP",
      expected: { PPD_vg: 12.6, Acceptability: false },
    },
    {
      tdb: 30,
      tr: 20,
      vr: 0.15,
      rh: 60,
      met: 1.2,
      clo: 0.5,
      vertical_tmp_grad: 5,
      units: "SI",
      expected: { PPD_vg: 3.4, Acceptability: true },
    },
  ])(
    "returns",
    ({ tdb, tr, vr, rh, met, clo, vertical_tmp_grad, units, expected }) => {
      const result = vertical_tmp_grad_ppd(
        tdb,
        tr,
        vr,
        rh,
        met,
        clo,
        vertical_tmp_grad,
        units,
      );
      expect(result.PPD_vg).toBeCloseTo(expected.PPD_vg);
      expect(result.Acceptability).toBe(expected.Acceptability);
    },
  );
});

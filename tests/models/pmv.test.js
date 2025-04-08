import { describe } from "@jest/globals";
import { pmv } from "../../src/models/pmv.js";
import { validateResult } from "./testUtils.js";

describe("pmv", () => {
  test("Test case with default parameters", () => {
    const tolerances = {
      pmv: 0.1,
      ppd: 1,
    };

    const inputs = {
      tdb: 22,
      tr: 22,
      rh: 60,
      vr: 0.1,
      met: 1.2,
      clo: 0.5,
      standard: "ISO",
    };

    const outputs = {
      pmv: -0.8,
    };

    const { tdb, tr, vr, rh, met, clo, wme, standard } = inputs;
    const modelResult = { pmv: pmv(tdb, tr, vr, rh, met, clo, wme, standard) };

    validateResult(modelResult, outputs, tolerances, inputs);
  });
});

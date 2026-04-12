import { describe, expect, test } from "@jest/globals";
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

describe("pmv invalid input", () => {
  const valid = { tdb: 25, tr: 25, vr: 0.1, rh: 50, met: 1.2, clo: 0.5 };

  test.each([
    ["tdb", { ...valid, tdb: undefined }],
    ["tr", { ...valid, tr: "string" }],
    ["vr", { ...valid, vr: null }],
    ["rh", { ...valid, rh: NaN }],
    ["met", { ...valid, met: Infinity }],
    ["clo", { ...valid, clo: undefined }],
  ])("returns NaN result when %s is invalid", (_label, args) => {
    const result = pmv(args.tdb, args.tr, args.vr, args.rh, args.met, args.clo);
    expect(result).toBeNaN();
  });
});

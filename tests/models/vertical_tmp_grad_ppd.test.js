import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { vertical_tmp_grad_ppd } from "../../src/models/vertical_tmp_grad_ppd.js";
import { testDataUrls } from "./comftest.js";
import { loadTestData, validateResult } from "./testUtils.js";

const { testData, tolerances } = await loadTestData(
  testDataUrls.verticalTmpGradPpd,
  true,
);
afterEach(() => jest.restoreAllMocks());

// Reference: https://github.com/pythermalcomfort/pythermalcomfort/blob/720ccec59521e358991ba6fc3ef2db622e794681/tests/test_vertical_tmp_grad_ppd.py
// Mirror every Python tests/test_vertical_tmp_grad_ppd.py case, without filtering array rows.
test("test_vertical_tmp_grad_ppd", () => {
  for (const { inputs, outputs } of testData.data) {
    const {
      tdb,
      tr,
      vr,
      rh,
      met,
      clo,
      vertical_tmp_grad,
      round_output,
      limit_inputs,
    } = inputs;
    validateResult(
      vertical_tmp_grad_ppd(
        tdb,
        tr,
        vr,
        rh,
        met,
        clo,
        vertical_tmp_grad,
        round_output,
        limit_inputs,
      ),
      outputs,
      tolerances,
      inputs,
    );
  }
  jest.spyOn(console, "warn").mockImplementation(() => {});
  expect(vertical_tmp_grad_ppd(25, 25, 0.3, 50, 1.2, 0.5, 7).ppd_vg).toBeNaN();
});

test("test_vertical_tmp_grad_ppd_limit_inputs_false_suppresses_warning_and_nan", () => {
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  const result = vertical_tmp_grad_ppd(
    50,
    25,
    0.1,
    50,
    1.2,
    0.5,
    7,
    true,
    false,
  );
  expect(result.ppd_vg).not.toBeNaN();
  expect(warning).not.toHaveBeenCalled();
});

test("test_vertical_tmp_grad_ppd_limit_inputs_true_still_warns_and_nans", () => {
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  const result = vertical_tmp_grad_ppd(50, 25, 0.1, 50, 1.2, 0.5, 7);
  expect(result.ppd_vg).toBeNaN();
  expect(result.acceptability).toBeNaN();
  expect(warning).toHaveBeenCalled();
});

test("test_vertical_tmp_grad_ppd_is_never_negative", () => {
  expect(
    vertical_tmp_grad_ppd(
      [24, 24, 25],
      [24, 24, 25],
      0.1,
      50,
      1.2,
      0.5,
      [1, 0, 7],
    ),
  ).toEqual({ ppd_vg: [0, 0, 12.6], acceptability: [true, true, false] });
});

describe("vertical_tmp_grad_ppd API regressions", () => {
  const base = [25, 25, 0.1, 50, 1.2, 0.5, 7];
  test("round_output false preserves precision", () => {
    expect(vertical_tmp_grad_ppd(...base, false).ppd_vg).toBeCloseTo(
      12.637059952602048,
      10,
    );
  });
  test("acceptability is determined before rounding", () => {
    const result = vertical_tmp_grad_ppd(
      25,
      25,
      0.1,
      50,
      1.2,
      0.5,
      4.924791615363177,
    );
    expect(result.ppd_vg).toBe(5);
    expect(result.acceptability).toBe(false);
  });
  test.each([
    [0, 9.9],
    [1, 40.1],
    [2, -0.1],
    [2, 0.201],
    [4, 0.9],
    [4, 4.1],
    [5, -0.1],
    [5, 1.501],
  ])("masks out-of-range input %i=%f", (index, value) => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const args = [...base];
    args[index] = value;
    const result = vertical_tmp_grad_ppd(...args);
    expect(result.ppd_vg).toBeNaN();
    expect(result.acceptability).toBeNaN();
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
  ])("accepts inclusive applicability endpoint %i=%f", (index, value) => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    const args = [...base];
    args[index] = value;
    expect(vertical_tmp_grad_ppd(...args).ppd_vg).not.toBeNaN();
    expect(warning).not.toHaveBeenCalled();
  });
  test("broadcasts scalars/singletons and masks array elements independently", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = vertical_tmp_grad_ppd([25, 50], [25], 0.1, 50, 1.2, 0.5, 7);
    expect(result.ppd_vg[0]).toBe(12.6);
    expect(result.ppd_vg[1]).toBeNaN();
    expect(result.acceptability[0]).toBe(false);
    expect(result.acceptability[1]).toBeNaN();
    expect(vertical_tmp_grad_ppd([], 25, 0.1, 50, 1.2, 0.5, 7)).toEqual({
      ppd_vg: [],
      acceptability: [],
    });
  });
  test("rejects incompatible array lengths", () => {
    expect(() =>
      vertical_tmp_grad_ppd([24, 25], [24, 25, 26], 0.1, 50, 1.2, 0.5, 7),
    ).toThrow(RangeError);
  });
  test.each([0, 1, 2, 3, 4, 5, 6])(
    "validates required numeric argument %i",
    (index) => {
      for (const value of [undefined, null, "25", [25, "26"]]) {
        const args = [...base];
        args[index] = value;
        expect(() => vertical_tmp_grad_ppd(...args)).toThrow(TypeError);
      }
    },
  );
  test("requires Boolean switches and rejects the removed units argument", () => {
    expect(() => vertical_tmp_grad_ppd(...base, "IP")).toThrow(TypeError);
    expect(() => vertical_tmp_grad_ppd(...base, true, "false")).toThrow(
      TypeError,
    );
  });
});

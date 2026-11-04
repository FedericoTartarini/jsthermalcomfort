import { describe, expect, test } from "vitest";
import { at, AT_INFO } from "../../src/models/index.ts";
import { at as at_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof at>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.at,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_at.py. Its is_equal
// (tests/conftest.py:100-115) is np.isclose or np.allclose with the given atol
// and the default rtol, 1e-5, and its list call runs element-wise.
describe("test_at", () => {
  test.each(reference_table.data)("test_at: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = at(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });

  // tests/test_at.py:25 calls is_equal without asserting its result; this asserts it.
  test("test_at_list_input", () => {
    const tdb = [25, 25, 25];
    const rh = [30, 30, 30];
    const v = [0.1, 0.1, 0.1];

    tdb.forEach((t, i) => {
      const result = at({ tdb: t, rh: rh[i] ?? NaN, v: v[i] ?? NaN });
      expect(approx(result.at, 24.1, { rel: 1e-5, abs: 0.1 })).toBe(true);
    });
  });

  // tests/test_at.py:31 never asserts its 25.3; 4.7.0 returns 30.9 (decision 253, pythermalcomfort#527).
  test("test_at_q", () => {
    const result = at({ tdb: 25, rh: 30, v: 0.1, q: 100 });
    expect(approx(result.at, 30.9, { rel: 1e-5, abs: 0.1 })).toBe(true);
  });
});

describeModelContract(at, AT_INFO, { tdb: 25, rh: 30, v: 0.1 });

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("at (JS-only)", () => {
  // A call with inputs the type rejects, to test the runtime.
  const call = (inputs: unknown) => () => at(inputs as Inputs);

  test.each([
    [{ tdb: 25, rh: 30, v: 0.1 }, 24.06752430544218],
    [{ tdb: 25, rh: 30, v: 0.1, q: 100 }, 30.919355064136866],
    [{ tdb: 25, rh: 30, v: 0.1, q: 0 }, 23.988661994829936],
    [{ tdb: 23, rh: 70, v: 1 }, 24.79212083496429],
    [{ tdb: 23, rh: 70, v: 1, q: 50 }, 28.078054698689613],
    [{ tdb: -10, rh: 80, v: 5 }, -16.813856436526248],
    [{ tdb: 40, rh: 20, v: 0, q: 600 }, 82.88888816625432],
  ])("%o gives %s unrounded", (inputs, expected) => {
    const result = at({ ...inputs, round_output: false });
    expect(approx(result.at, expected, { rel: 1e-12, abs: 0 })).toBe(true);
  });

  // models/at.py:73, as upstream's numpy division gives it.
  test("a v of -10 divides by zero", () => {
    expect(at({ tdb: 25, rh: 30, v: -10, q: 100 }).at).toBe(Infinity);
    expect(at({ tdb: 25, rh: 30, v: -10, q: -100 }).at).toBe(-Infinity);
    expect(at({ tdb: 25, rh: 30, v: -10, q: 0 }).at).toBe(null);
  });

  // p_vap is 0, while psy_ta_rh's dew point takes log(0).
  test("rh 0 gives a finite at", () => {
    expect(at({ tdb: 25, rh: 0, v: 0.1 }).at).toBe(20.9);
  });

  // Deviation _shared-57, through psy_ta_rh's dew_point_tmp.
  test("an rh outside [0, 100] throws dew_point_tmp's message as a RangeError", () => {
    for (const rh of [-0.1, 100.1]) {
      expect(call({ tdb: 25, rh, v: 0.1 })).toThrow(
        new RangeError("Relative humidity must be between 0 and 100%."),
      );
    }
  });

  // Deviation at-2.
  test("returns no rows", () => {
    for (const inputs of [
      { tdb: -50, rh: 0, v: 0 },
      { tdb: 25, rh: 30, v: 0.1, q: 100 },
      { tdb: 60, rh: 100, v: 30, q: 1200 },
    ]) {
      expect(at(inputs).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(at_from_root).toBe(at);
  });
});

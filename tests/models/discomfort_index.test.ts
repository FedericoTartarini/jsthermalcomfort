import { describe, expect, test } from "vitest";
import {
  discomfort_index,
  DISCOMFORT_INDEX_INFO,
} from "../../src/models/index.ts";
import { discomfort_index as discomfort_index_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof discomfort_index>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.discomfortIndex,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_discomfort_index.py.
describe("test_discomfort_index", () => {
  test.each(reference_table.data)(
    "test_discomfort_index: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      const result = discomfort_index(inputs as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );
});

describeModelContract(discomfort_index, DISCOMFORT_INDEX_INFO, {
  tdb: 25,
  rh: 50,
});

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("discomfort_index (JS-only)", () => {
  test.each([
    [{ tdb: 25, rh: 50 }, 22.1, "Less than 50% feels discomfort"],
    [{ tdb: 30, rh: 60 }, 26.6, "More than 50% feels discomfort"],
    [{ tdb: 14.5, rh: 0 }, 14.5, "No discomfort"],
    [{ tdb: -40, rh: 30 }, -19.0, "No discomfort"],
    [{ tdb: 25, rh: 150 }, 27.9, "Most of the population feels discomfort"],
    [{ tdb: 25, rh: -10 }, 18.6, "No discomfort"],
  ])("%o gives %s, %s", (inputs, di, condition) => {
    const result = discomfort_index(inputs);
    expect(result.di).toBe(di);
    expect(result.discomfort_condition).toBe(condition);
  });

  // Deviation discomfort_index-1 (models/discomfort_index.py:80): rh 100 makes di equal tdb.
  test.each([
    [21, "Less than 50% feels discomfort"],
    [24, "More than 50% feels discomfort"],
    [27, "Most of the population feels discomfort"],
    [29, "Everyone feels severe stress"],
    [32, "State of medical emergency"],
  ])("a di on the %s edge takes the upper class", (tdb, condition) => {
    const result = discomfort_index({ tdb, rh: 100 });
    expect(result.di).toBe(tdb);
    expect(result.discomfort_condition).toBe(condition);
  });

  // Deviation discomfort_index-1 (_internal/validation.py:242-245).
  test("a di at or above 99 has a null category", () => {
    for (const tdb of [99, 120]) {
      const result = discomfort_index({ tdb, rh: 100 });
      expect(result.di).toBe(tdb);
      expect(result.discomfort_condition).toBe(null);
    }
  });

  // models/discomfort_index.py:83-84.
  test("the category is mapped from the unrounded di", () => {
    const result = discomfort_index({ tdb: 20.95, rh: 100 });
    expect(result.di).toBe(21.0);
    expect(result.discomfort_condition).toBe("No discomfort");
  });

  // Deviation discomfort_index-2.
  test("returns no rows", () => {
    for (const inputs of [
      { tdb: -40, rh: 0 },
      { tdb: 25, rh: 50 },
      { tdb: 120, rh: 100 },
    ]) {
      expect(discomfort_index(inputs).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(discomfort_index_from_root).toBe(discomfort_index);
  });
});

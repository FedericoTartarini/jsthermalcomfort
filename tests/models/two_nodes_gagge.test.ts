import { describe, expect, test } from "vitest";
import { two_nodes_gagge } from "../../src/models/index.ts";
import { testDataUrls } from "./comftest.ts";
import { loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof two_nodes_gagge>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  testDataUrls.twoNodes,
);

// Mirrors pythermalcomfort v4.7.0 tests/test_two_nodes_gagge.py. A
// `pytest.raises(ValueError, match="w_max")` becomes a throw whose message
// names w_max, of the class the library maps that case to.
describe("test_two_nodes_gagge", () => {
  test.each(reference_table.data)(
    "test_two_nodes: fixture case %#",
    (entry) => {
      const { inputs, outputs } = entry;
      // The fixture's `w_max: False` is left out (deviation two_nodes_gagge-3).
      const result = two_nodes_gagge({
        ...inputs,
        w_max: inputs.w_max === false ? undefined : inputs.w_max,
      } as unknown as Inputs);

      validateResult(result, outputs, tolerance, inputs);
    },
  );

  test.each([0.01, 0.06, 1.2, [0.5, 0.05], NaN, [0.5, NaN], true, [true, 0.5]])(
    "test_two_nodes_rejects_w_max_out_of_range[%s]",
    (w_max) => {
      expect(() =>
        two_nodes_gagge({
          tdb: 40,
          tr: 40,
          v: 0.1,
          rh: 50,
          met: 1,
          clo: 0.5,
          w_max,
        } as unknown as Inputs),
      ).toThrow(/w_max/);
    },
  );

  // Upstream's False case is the JS-only tests' (deviation two_nodes_gagge-3).
  test.each([0, 0.0601, 0.5, 1])(
    "test_two_nodes_accepts_w_max_in_range[%s]",
    (w_max) => {
      two_nodes_gagge({
        tdb: 40,
        tr: 40,
        v: 0.1,
        rh: 50,
        met: 2,
        clo: 0.5,
        w_max,
      });
    },
  );
});

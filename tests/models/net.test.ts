import { describe, expect, test } from "vitest";
import { net, NET_INFO } from "../../src/models/index.ts";
import { net as net_from_root } from "../../src/index.ts";
import { test_data_urls } from "./comftest.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx, loadTestData, validateResult } from "./testUtils.ts";

type Inputs = Parameters<typeof net>[0];

const { testData: reference_table, tolerances: tolerance } = await loadTestData(
  test_data_urls.net,
);

// Mirrors pythermalcomfort v4.8.0 tests/test_net.py.
describe("test_net", () => {
  test.each(reference_table.data)("test_net: fixture case %#", (entry) => {
    const { inputs, outputs } = entry;
    const result = net(inputs as unknown as Inputs);

    validateResult(result, outputs, tolerance, inputs);
  });
});

describeModelContract(net, NET_INFO, { tdb: 37, rh: 100, v: 0.1 });

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("net (JS-only)", () => {
  test.each([
    [37, 100, 0.1, 37.0, 37.0],
    [30, 60, 0.5, 26.389775345409905, 26.4],
    [-40, 0, 0, -13.089730517115798, -13.1],
    [60, 100, 30, 75.9338341293677, 75.9],
    [25, 50, 1e-12, 23.189814810907674, 23.2],
    [0, 50, 0.1, 3.5995711970502455, 3.6],
    [37, 0, 30, 26.270000000000003, 26.3],
    [60, 0, 1e300, 53.4235294117647, 53.4],
    [30, 50, -0.0, 26.708641975308645, 26.7],
    // Upstream checks no rh range (classes_input.py:482-496).
    [30, -10, 1, 20.50243254077619, 20.5],
    [30, 150, 1, 32.44930790278448, 32.4],
  ] as const)(
    "tdb %s, rh %s, v %s gives %s, rounded %s",
    (tdb, rh, v, expected, rounded) => {
      const result = net({ tdb, rh, v, round_output: false });
      expect(approx(result.net, expected, { rel: 1e-12, abs: 0 })).toBe(true);
      expect(net({ tdb, rh, v }).net).toBe(rounded);
    },
  );

  // Upstream checks no v range (classes_input.py:482-496).
  test("a negative v gives null", () => {
    expect(net({ tdb: 37, rh: 100, v: -1 }).net).toBe(null);
  });

  // Deviation net-2.
  test("returns no rows", () => {
    for (const [tdb, rh, v] of [
      [-40, 0, 0],
      [37, 100, 0.1],
      [60, 100, 30],
      [37, 100, -1],
    ] as const) {
      expect(net({ tdb, rh, v }).warnings).toEqual([]);
    }
  });

  test("is exported from the package root as from its subpath", () => {
    expect(net_from_root).toBe(net);
  });
});

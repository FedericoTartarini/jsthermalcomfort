import { describe, expect, test } from "vitest";
import { two_nodes_gagge_ji } from "../../src/models/index.ts";
import { p_sat_torr } from "../../src/psychrometrics/index.ts";
import { body_surface_area } from "../../src/utilities/index.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  two_nodes_gagge_ji(inputs as Parameters<typeof two_nodes_gagge_ji>[0]);

// np.testing.assert_allclose(actual, desired, rtol=1e-12, atol=1e-12).
const allclose = (actual: readonly number[], expected: readonly number[]) =>
  actual.length === expected.length &&
  actual.every((x, i) =>
    approx(x, expected[i] ?? NaN, { rel: 1e-12, abs: 1e-12 }),
  );

// Mirrors pythermalcomfort v4.7.0 tests/test_two_nodes_gagge_ji.py.
describe("test_two_nodes_gagge_ji", () => {
  test("test_two_nodes_gagge_ji_complete_time_series_regression", () => {
    const weight = 80.1;
    const bsa = body_surface_area(weight, 1.8);
    const common = {
      wme: 0,
      body_surface_area: bsa,
      p_atm: 101325,
      position: "sitting",
      acclimatized: true,
      body_weight: weight,
    };

    const scalar_result = call({
      tdb: 36.5,
      tr: 36.5,
      v: 0.25,
      met: 0.95,
      clo: 0.1,
      vapor_pressure: (20 * p_sat_torr(36.5)) / 100,
      length_time_simulation: 6,
      ...common,
    });
    expect(Array.isArray(scalar_result.t_core)).toBe(true);
    expect(Array.isArray(scalar_result.t_skin)).toBe(true);
    expect(scalar_result.t_core).toHaveLength(6);
    expect(scalar_result.t_skin).toHaveLength(6);
    expect(
      allclose(
        scalar_result.t_core,
        [
          36.516105213824275, 36.547685700888465, 36.576012449954796,
          36.60164288217578, 36.62502377928286, 36.64651422522319,
        ],
      ),
    ).toBe(true);
    expect(
      allclose(
        scalar_result.t_skin,
        [
          36.774035566875106, 36.40807561844041, 36.11486504764158,
          35.87955212231442, 35.69038774391016, 35.53809246343035,
        ],
      ),
    ).toBe(true);

    // Upstream's list call, run element-wise (deviation _shared-5).
    const array_result = (
      [
        [36.5, 36.5, 0.25, 0.95, 0.1, (20 * p_sat_torr(36.5)) / 100],
        [31.0, 31.5, 0.2, 0.7, 0.67, (60 * p_sat_torr(31.0)) / 100],
      ] as const
    ).map(([tdb, tr, v, met, clo, vapor_pressure]) =>
      call({
        tdb,
        tr,
        v,
        met,
        clo,
        vapor_pressure,
        length_time_simulation: 4,
        ...common,
      }),
    );
    expect(array_result.map((r) => r.t_core.length)).toEqual([4, 4]);
    expect(array_result.map((r) => r.t_skin.length)).toEqual([4, 4]);
    const t_core = [
      [
        36.516105213824275, 36.547685700888465, 36.576012449954796,
        36.60164288217578,
      ],
      [
        36.51006711047728, 36.534910362727736, 36.5569230515869,
        36.57647015573995,
      ],
    ];
    const t_skin = [
      [
        36.774035566875106, 36.40807561844041, 36.11486504764158,
        35.87955212231442,
      ],
      [
        36.67827501809432, 36.34939739292867, 36.064690097764036,
        35.81939854020882,
      ],
    ];
    for (const [i, result] of array_result.entries()) {
      expect(allclose(result.t_core, t_core[i] ?? [])).toBe(true);
      expect(allclose(result.t_skin, t_skin[i] ?? [])).toBe(true);
    }
  });

  // Upstream's broadcast call, run element-wise (deviation _shared-5).
  test("test_two_nodes_gagge_ji_multidimensional_broadcast_output", () => {
    const inputs = {
      v: 0.25,
      met: 0.95,
      clo: 0.1,
      vapor_pressure: (20 * p_sat_torr(36.5)) / 100,
      length_time_simulation: 4,
    };
    const pairs = [36.5, 31.0].flatMap((tdb) =>
      [36.5, 31.5].map((tr) => ({ tdb, tr })),
    );
    const result = pairs.map((pair) => call({ ...pair, ...inputs }));
    const expected = pairs.map(({ tdb, tr }) => call({ tdb, tr, ...inputs }));

    expect(result.map((r) => r.t_core.length)).toEqual([4, 4, 4, 4]);
    expect(result.map((r) => r.t_skin.length)).toEqual([4, 4, 4, 4]);
    for (const [i, r] of result.entries()) {
      expect(allclose(r.t_core, expected[i]?.t_core ?? [])).toBe(true);
      expect(allclose(r.t_skin, expected[i]?.t_skin ?? [])).toBe(true);
    }
  });

  // Scenarios based on Table 4 from the paper by Ji et al. (2022)
  test.each([
    // Scenario 1
    [
      36.5, 36.5, 0.25, 0.95, 0.1, 20, 80.1, 1.8, 37.446339126254756,
      34.596469729370725, 120,
    ],
    // Scenario 2
    [
      36.5, 36.5, 0.25, 0.96, 0.1, 60, 80.1, 1.8, 37.512644583008566,
      34.85861523864417, 120,
    ],
    // Scenario 3
    [
      31, 31, 0.2, 0.7, 0.67, 60, 55.7, 1.525, 37.16672342773386,
      34.29506493710769, 150,
    ],
    // Scenario 4
    [
      27, 27, 0.2, 0.7, 0.67, 60, 55.7, 1.525, 36.69341582589469,
      33.64236786746656, 150,
    ],
  ])(
    "test_two_nodes_gagge_ji_examples: tdb %s, tr %s, v %s, met %s",
    (
      tdb,
      tr,
      v,
      met,
      clo,
      rh,
      weight,
      height,
      expected_t_core,
      expected_t_skin,
      duration,
    ) => {
      // compute vapor pressure from relative humidity and saturation vapor pressure
      const vapor_pressure = (rh * p_sat_torr(tdb)) / 100;

      // compute body surface area
      const bsa = body_surface_area(weight, height);

      const result = call({
        tdb,
        tr,
        v,
        met,
        clo,
        vapor_pressure,
        wme: 0,
        body_surface_area: bsa,
        p_atm: 101325,
        position: "sitting",
        acclimatized: true,
        body_weight: weight,
        length_time_simulation: duration,
      });

      const t_core_last = result.t_core.at(-1) ?? NaN;
      const t_skin_last = result.t_skin.at(-1) ?? NaN;

      expect(approx(t_core_last, expected_t_core, { rel: 1e-3 })).toBe(true);
      expect(approx(t_skin_last, expected_t_skin, { rel: 1e-3 })).toBe(true);
    },
  );

  // Upstream's list of tdb, run element-wise (deviation _shared-5).
  test("test_two_nodes_gagge_ji_list_tdb", () => {
    const tdb_list = [36.5, 36.5];
    const tr = 36.5;
    const v = 0.25;
    const met = 0.95;
    const clo = 0.1;
    const rh = 20;
    const weight = 80.1;
    const height = 1.8;
    const sim_time = 120;

    const vapor_pressure = (rh * p_sat_torr(36.5)) / 100;
    const bsa = body_surface_area(weight, height);

    const result = tdb_list.map((tdb) =>
      call({
        tdb,
        tr,
        v,
        met,
        clo,
        vapor_pressure,
        wme: 0,
        body_surface_area: bsa,
        p_atm: 101325,
        position: "sitting",
        acclimatized: true,
        body_weight: weight,
        length_time_simulation: sim_time,
      }),
    );

    // expect two simulation results (one per tdb entry)
    expect(result).toHaveLength(2);

    // both simulations should yield the same final values as scenario 1
    const expected_t_core = 37.446;
    const expected_t_skin = 34.596;

    for (const { t_core, t_skin } of result) {
      expect(approx(t_core.at(-1) ?? NaN, expected_t_core, { rel: 1e-3 })).toBe(
        true,
      );
      expect(approx(t_skin.at(-1) ?? NaN, expected_t_skin, { rel: 1e-3 })).toBe(
        true,
      );
    }
  });

  const valid = {
    tdb: 36.5,
    tr: 36.5,
    v: 0.25,
    met: 0.95,
    clo: 0.1,
    vapor_pressure: (20 * p_sat_torr(36.5)) / 100,
    wme: 0,
    body_surface_area: body_surface_area(80.1, 1.8),
    p_atm: 101325,
    position: "sitting",
    acclimatized: true,
    body_weight: 80.1,
    length_time_simulation: 120,
  };

  test("test_invalid_position_raises_value_error", () => {
    expect(() => call({ ...valid, position: "lying" })).toThrow(RangeError);
  });

  // Deviation two_nodes_gagge_ji-3.
  test("test_unexpected_kwarg_raises_type_error", () => {
    expect(() => call({ ...valid, foo: "bar" })).toThrow(
      new TypeError("foo is not an input of two_nodes_gagge_ji()."),
    );
  });

  test("test_non_numeric_tdb_raises_type_error", () => {
    expect(() => call({ ...valid, tdb: "hot" })).toThrow(TypeError);
  });
});

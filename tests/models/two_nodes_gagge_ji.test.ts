import { describe, expect, test } from "vitest";
import {
  two_nodes_gagge_ji,
  TWO_NODES_GAGGE_JI_INFO,
} from "../../src/models/index.ts";
import { two_nodes_gagge_ji as ji_from_root } from "../../src/index.ts";
import { p_sat_torr } from "../../src/psychrometrics/index.ts";
import { body_surface_area, Postures } from "../../src/utilities/index.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  two_nodes_gagge_ji(inputs as Parameters<typeof two_nodes_gagge_ji>[0]);

// np.testing.assert_allclose(actual, desired, rtol=1e-12, atol=1e-12).
const allclose = (actual: readonly number[], expected: readonly number[]) =>
  actual.length === expected.length &&
  actual.every((x, i) =>
    approx(x, expected[i] ?? NaN, { rel: 1e-12, abs: 1e-12 }),
  );

// Mirrors pythermalcomfort v4.8.0 tests/test_two_nodes_gagge_ji.py.
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

const valid = {
  tdb: 36.5,
  tr: 36.5,
  v: 0.25,
  met: 0.95,
  clo: 0.1,
  vapor_pressure: 12,
};

describeModelContract(two_nodes_gagge_ji, TWO_NODES_GAGGE_JI_INFO, valid);

const position_message =
  "position must be one of ['sitting', 'standing', 'standing, forced convection']";

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("two_nodes_gagge_ji (JS-only)", () => {
  // Register two_nodes_gagge_ji's Notes measure how far the port's elements
  // can differ from upstream's.
  test.each([
    [
      { ...valid, length_time_simulation: 3 },
      [36.51754799367207, 36.55082508178895, 36.5805639819156],
      [36.772779332604365, 36.39648053820679, 36.09731205358304],
    ],
    [
      { ...valid, position: "standing", length_time_simulation: 3 },
      [36.51754799367207, 36.5508217753791, 36.58055620197674],
      [36.772281898766025, 36.3957920161236, 36.096873317317595],
    ],
    [
      {
        tdb: 10.0,
        tr: 12.0,
        v: 0.05,
        met: 1.0,
        clo: 0.0,
        vapor_pressure: 5.0,
        acclimatized: false,
        length_time_simulation: 2,
      },
      [36.51735367638636, 36.54484451065674],
      [35.97084496589676, 35.11082041240112],
    ],
    [
      { ...valid, vapor_pressure: 60.0, length_time_simulation: 2 },
      [36.520587515957786, 36.55751036651533],
      [36.772779332604365, 36.75692114599665],
    ],
  ])("%o gives upstream's series", (inputs, t_core, t_skin) => {
    const result = call(inputs);
    expect(result.t_core).toEqual(
      t_core.map((x) => expect.toBeApprox(x, DEFAULT_TOLERANCE)),
    );
    expect(result.t_skin).toEqual(
      t_skin.map((x) => expect.toBeApprox(x, DEFAULT_TOLERANCE)),
    );
    expect(result.warnings).toEqual([]);
  });

  // Register two_nodes_gagge_ji's Notes.
  test("length_time_simulation is rounded up, and at or below 0 gives empty series", () => {
    expect(call({ ...valid, length_time_simulation: 1.2 })).toEqual(
      call({ ...valid, length_time_simulation: 2 }),
    );
    for (const length_time_simulation of [0, -5]) {
      const result = call({ ...valid, length_time_simulation });
      expect(result.t_core).toEqual([]);
      expect(result.t_skin).toEqual([]);
    }
  });

  // Register two_nodes_gagge_ji's Notes: the check is case-insensitive, the
  // kernel's comparison is not.
  test.each([["SITTING"], ["standing, forced convection"], [null]])(
    "position %o computes as standing",
    (position) => {
      expect(call({ ...valid, position, length_time_simulation: 3 })).toEqual(
        call({ ...valid, position: "standing", length_time_simulation: 3 }),
      );
    },
  );

  // Deviation _shared-29.
  test("Postures.sitting computes as sitting", () => {
    expect(call({ ...valid, position: Postures.sitting })).toEqual(
      call({ ...valid, position: "sitting" }),
    );
  });

  // Deviations two_nodes_gagge_ji-6 and -7.
  test.each([
    ["lying", RangeError],
    [5, TypeError],
    [["sitting"], TypeError],
  ])("position %o throws choice_field's message", (position, error) => {
    expect(() => call({ ...valid, position })).toThrow(
      new error(position_message),
    );
  });

  // Deviation two_nodes_gagge_ji-3.
  test("several unknown keys throw the library's message for the first", () => {
    expect(() => call({ ...valid, foo: 1, bar: 2 })).toThrow(
      new TypeError("foo is not an input of two_nodes_gagge_ji()."),
    );
  });

  // Deviation two_nodes_gagge_ji-8.
  test.each([["tdb"], ["body_weight"], ["initial_skin_temp"]])(
    "a numeric string for %s throws the library's TypeError",
    (key) => {
      expect(() => call({ ...valid, [key]: "36.5" })).toThrow(
        new TypeError(`${key} must be a finite number.`),
      );
    },
  );

  // Deviation two_nodes_gagge_ji-4.
  test.each([[{ body_weight: 0 }], [{ p_atm: 0 }], [{ clo: -5 }]])(
    "%o throws numba's division by zero as a RangeError",
    (bad) => {
      expect(() => call({ ...valid, ...bad })).toThrow(
        new RangeError("division by zero"),
      );
    },
  );

  // Deviation two_nodes_gagge_ji-5.
  test.each([[{ tdb: 1e5 }], [{ met: 1e6 }], [{ initial_skin_temp: 1000 }]])(
    "%o throws Error at the loop cap",
    (bad) => {
      let thrown: unknown;
      try {
        call({ ...valid, ...bad, length_time_simulation: 3 });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).constructor).toBe(Error);
      expect((thrown as Error).message).toBe("Max iterations exceeded");
    },
  );

  test("the series are frozen arrays", () => {
    const { t_core, t_skin } = call(valid);
    expect(Array.isArray(t_core) && Object.isFrozen(t_core)).toBe(true);
    expect(Array.isArray(t_skin) && Object.isFrozen(t_skin)).toBe(true);
  });

  test("the root entry exports the same function", () => {
    expect(ji_from_root).toBe(two_nodes_gagge_ji);
  });
});

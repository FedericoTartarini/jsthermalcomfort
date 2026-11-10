import { describe, expect, test } from "vitest";
import {
  two_nodes_gagge_sleep,
  TWO_NODES_GAGGE_SLEEP_INFO,
} from "../../src/models/index.ts";
import { two_nodes_gagge_sleep as sleep_from_root } from "../../src/index.ts";
import { _two_nodes_gagge_sleep_optimized } from "../../src/models/two_nodes_gagge_sleep.ts";
import { round } from "../../src/_internal/round.ts";
import { DEFAULT_TOLERANCE } from "../parity/harness.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  two_nodes_gagge_sleep(inputs as Parameters<typeof two_nodes_gagge_sleep>[0]);

// An output upstream returns as an array, for a call of more than one minute.
const series = (
  value: number | null | readonly (number | null)[],
): readonly (number | null)[] => {
  if (typeof value === "number" || value === null)
    throw new TypeError("not a series");
  return value;
};

const fields = [
  "set",
  "t_core",
  "t_skin",
  "wet",
  "t_sens",
  "disc",
  "e_skin",
  "met_shivering",
  "alfa",
  "skin_blood_flow",
] as const;

// Mirrors pythermalcomfort v4.8.0 tests/test_two_nodes_gagge_sleep.py.
describe("test_two_nodes_gagge_sleep", () => {
  test("test_two_nodes_gagge_sleep_single_input", () => {
    const result = two_nodes_gagge_sleep({
      tdb: 18,
      tr: 18,
      v: 0.05,
      rh: 50,
      clo: 1.4,
      thickness_quilt: 1.76,
    });

    // expected outputs
    const expected = {
      set: 24.28,
      t_core: 37.03,
      t_skin: 33.67,
      wet: 0.27,
      t_sens: 1.12,
      disc: 1.47,
      e_skin: 28.75,
      met_shivering: 0.0,
      alfa: 0.13,
      skin_blood_flow: 7.11,
    };

    // compare each field with a reasonable tolerance
    for (const [field, exp] of Object.entries(expected))
      expect(
        approx(result[field as keyof typeof expected], exp, {
          rel: 0.005,
          abs: 0.01,
        }),
      ).toBe(true);
  });

  test("test_two_nodes_gagge_sleep_long_duration", () => {
    const duration = 481;
    const ta = Array<number>(duration).fill(18);
    const tr = Array<number>(duration).fill(18);
    const vel = Array<number>(duration).fill(0.05);
    const rh = Array<number>(duration).fill(50);
    const clo_a = Array<number>(duration).fill(1.4);
    const thickness1 = Array<number>(duration).fill(1.76);

    const result = two_nodes_gagge_sleep({
      tdb: ta,
      tr,
      v: vel,
      rh,
      clo: clo_a,
      thickness_quilt: thickness1,
    });

    // Assert return type and shape
    expect(series(result.set)).toHaveLength(duration);
    expect(series(result.t_core)).toHaveLength(duration);
    expect(series(result.t_skin)).toHaveLength(duration);

    const first_row_expected = [
      24.29, 37.03, 33.67, 0.27, 1.13, 1.48, 28.76, 0.0, 0.14, 7.11,
    ];
    const last_row_expected = [
      22.23, 36.23, 31.06, 0.06, -0.73, -0.73, 5.21, 0.0, 0.25, 2.98,
    ];

    // check first row
    for (const [i, field] of fields.entries())
      expect(
        approx(series(result[field])[0] ?? NaN, first_row_expected[i] ?? NaN, {
          rel: 0.005,
          abs: 0.01,
        }),
        `first ${field} mismatch`,
      ).toBe(true);

    // check last row
    for (const [i, field] of fields.entries())
      expect(
        approx(
          series(result[field])[duration - 1] ?? NaN,
          last_row_expected[i] ?? NaN,
          { rel: 0.005, abs: 0.01 },
        ),
        `last ${field} mismatch`,
      ).toBe(true);
  });

  test("test_two_nodes_gagge_sleep_numba_full_time_series_parity", () => {
    const result = two_nodes_gagge_sleep({
      tdb: [18, 19, 20],
      tr: [18, 18.5, 19],
      v: [0.05, 0.1, 0.15],
      rh: [50, 55, 60],
      clo: [1.4, 1.3, 1.2],
      thickness_quilt: [1.76, 1.6, 1.5],
    });

    const expected = {
      set: [24.285471240487254, 23.69753060178574, 23.55973896722113],
      t_core: [37.03223590335804, 37.026301386399254, 37.022232367376795],
      t_skin: [33.670550615860265, 33.56972917281989, 33.522385202322575],
      wet: [0.2709382101612528, 0.11868202497357694, 0.08468947408201234],
      t_sens: [1.1283814676194304, 0.2030740970076956, -0.00007100712419982713],
      disc: [1.479755896275013, 0.29422228310400694, 0.02764862771183254],
      e_skin: [28.76139367298244, 12.562622189484204, 9.061735937484093],
      met_shivering: [0, 0, 0],
      alfa: [0.13861663831083165, 0.14512664326204494, 0.14635629215748827],
      skin_blood_flow: [7.1093443630662945, 6.624666007608543, 6.5398921420592],
    };

    for (const [field, reference] of Object.entries(expected)) {
      const actual = series(result[field as keyof typeof expected]);
      expect(actual, `full time-series ${field} mismatch`).toHaveLength(
        reference.length,
      );
      for (const [i, x] of reference.entries())
        expect(
          approx(actual[i] ?? NaN, x, { rel: 1e-12, abs: 1e-12 }),
          `full time-series ${field} mismatch`,
        ).toBe(true);
    }

    // numba's compiled signatures have no counterpart: the kernel is a function.
    expect(_two_nodes_gagge_sleep_optimized).toBeTypeOf("function");
  });

  test("test_two_nodes_gagge_sleep_scalar_shape_is_preserved", () => {
    const result = two_nodes_gagge_sleep({
      tdb: 18,
      tr: 18,
      v: 0.05,
      rh: 50,
      clo: 1.4,
      thickness_quilt: 1.76,
    });

    for (const field of fields) expect(result[field]).toBeTypeOf("number");
  });

  test("test_length_mismatch_raises_value_error", () => {
    let thrown: unknown;
    try {
      call({
        tdb: [18, 18],
        tr: [18], // length mismatch
        v: [0.05, 0.05],
        rh: [50, 50],
        clo: [1.4, 1.4],
        thickness_quilt: [1.76, 1.76],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain("must have the same length");
    expect((thrown as Error).message).toContain("thickness_quilt");
  });

  test("test_empty_time_series_raises_value_error", () => {
    expect(() =>
      call({ tdb: [], tr: [], v: [], rh: [], clo: [], thickness_quilt: [] }),
    ).toThrow(/must not be empty/);
  });

  // Deviation two_nodes_gagge_sleep-3: the parse's message.
  test("test_unexpected_kwargs_raises_type_error", () => {
    expect(() =>
      call({
        tdb: 18,
        tr: 18,
        v: 0.05,
        rh: 50,
        clo: 1.4,
        thickness_quilt: 1.76,
        foo: 123,
      }),
    ).toThrow(new TypeError("foo is not an input of two_nodes_gagge_sleep()."));
  });

  test("test_invalid_kwarg_type_raises_type_error", () => {
    let thrown: unknown;
    try {
      call({
        tdb: "string",
        tr: 18,
        v: 0.05,
        rh: 50,
        clo: 1.4,
        thickness_quilt: 1.76,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    const msg = (thrown as Error).message;
    expect(msg).toContain("tdb");
  });

  test("test_tickness_quilt_negative", () => {
    expect(() =>
      call({
        tdb: 18,
        tr: 18,
        v: 0.05,
        rh: 50,
        clo: 1.4,
        thickness_quilt: -1.76,
      }),
    ).toThrow(RangeError);
  });

  const scalars = {
    tdb: 18,
    tr: 18,
    v: 0.05,
    rh: 50,
    clo: 1.4,
    thickness_quilt: 1.76,
  };

  test("test_non_integer_ltime_raises_type_error", () => {
    expect(() => call({ ...scalars, ltime: 1.5 })).toThrow(TypeError);
    expect(() => call({ ...scalars, ltime: 1.5 })).toThrow(/ltime/);
  });

  test("test_string_ltime_raises_type_error", () => {
    expect(() => call({ ...scalars, ltime: "1" })).toThrow(TypeError);
    expect(() => call({ ...scalars, ltime: "1" })).toThrow(/ltime/);
  });

  test("test_bool_ltime_raises_type_error", () => {
    for (const ltime of [true, false]) {
      expect(() => call({ ...scalars, ltime })).toThrow(TypeError);
      expect(() => call({ ...scalars, ltime })).toThrow(/ltime/);
    }
  });

  test("test_non_positive_ltime_raises_value_error", () => {
    for (const ltime of [0, -1]) {
      expect(() => call({ ...scalars, ltime })).toThrow(RangeError);
      expect(() => call({ ...scalars, ltime })).toThrow(/ltime/);
    }
  });

  test("test_two_nodes_gagge_sleep_continuous_at_critical_wettedness", () => {
    // np.round(np.arange(28.5, 30.0, 0.005), 3): numpy 2.5.4's arange equals
    // start + i * (the second value - start) on all 300 values (measured).
    const t = Array.from({ length: 300 }, (_, i) =>
      round(28.5 + i * (28.5 + 0.005 - 28.5), 3),
    );
    const result = t.map(
      (x) =>
        two_nodes_gagge_sleep({
          tdb: x,
          tr: x,
          v: 0.1,
          rh: 90,
          clo: 1.4,
          thickness_quilt: 1.76,
        }).set,
    );
    const diff = result.slice(1).map((x, i) => (x ?? NaN) - (result[i] ?? NaN));
    const max_step = Math.max(...diff.map(Math.abs));
    expect(max_step).toBeLessThan(0.05);
    expect(diff.every((d) => d > 0)).toBe(true); // monotonic
  });

  // Deviation two_nodes_gagge_sleep-3: the parse's message.
  test("test_temp_core_neutral_is_rejected", () => {
    expect(() =>
      call({
        tdb: 18,
        tr: 18,
        v: 0.05,
        rh: 50,
        clo: 1.4,
        thickness_quilt: 1.76,
        temp_core_neutral: 37,
      }),
    ).toThrow(
      new TypeError(
        "temp_core_neutral is not an input of two_nodes_gagge_sleep().",
      ),
    );
  });

  test("test_two_nodes_gagge_sleep_air_more_humid_than_skin", () => {
    const result = two_nodes_gagge_sleep({
      tdb: 38,
      tr: 38,
      v: 0.1,
      rh: 90,
      clo: 1.4,
      thickness_quilt: 1.76,
    });
    expect(result.wet).toBeGreaterThanOrEqual(0.06);
    expect(result.wet).toBeLessThanOrEqual(0.59 * 0.1 ** -0.08);
    expect(result.disc).toBe(6.0);
  });
});

const valid = {
  tdb: 18,
  tr: 18,
  v: 0.05,
  rh: 50,
  clo: 1.4,
  thickness_quilt: 1.76,
};

describeModelContract(two_nodes_gagge_sleep, TWO_NODES_GAGGE_SLEEP_INFO, valid);

const thrown = (inputs: unknown): Error => {
  try {
    call(inputs);
  } catch (error) {
    return error as Error;
  }
  throw new Error("no throw");
};

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image, the zero divisors and the loop cap on 4.8.0.
describe("two_nodes_gagge_sleep (JS-only)", () => {
  // Register two_nodes_gagge_sleep's Notes measure how far the port's
  // elements can differ from upstream's.
  test.each([
    [{}, "set", 24.285471240487254],
    [{}, "t_core", 37.03223590335804],
    [{ ltime: 3 }, "set", 23.711550520294498],
    [{ ltime: 3 }, "t_core", 37.042875780636834],
    [{ ltime: 2 }, "set", 23.636439397349513],
    [{ clo: 0 }, "set", -3.913418784528049],
    [{ rh: 0 }, "set", 22.991293736472308],
    [{ rh: 0 }, "t_core", 37.03166958731263],
    [{ height: 0 }, "set", 24.297798410110772],
    [{ skin_blood_flow: 0 }, "disc", 1.4912040181586583],
    [{ wme: 2 }, "set", 86.70377113439152],
    [{ tdb: -200 }, "set", -168.92477836981874],
  ] as const)("%o gives upstream's %s", (inputs, field, expected) => {
    const result = two_nodes_gagge_sleep({ ...valid, ...inputs });
    expect(approx(result[field], expected, DEFAULT_TOLERANCE)).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  // Decision 276: a number for one time step, from numbers, arrays of one or
  // both.
  test("one time step gives numbers, whatever mix of numbers and arrays of one", () => {
    const scalar = two_nodes_gagge_sleep(valid);
    expect(call({ ...valid, tdb: [18], tr: [18] })).toEqual(scalar);
    expect(
      call(Object.fromEntries(Object.entries(valid).map(([k, x]) => [k, [x]]))),
    ).toEqual(scalar);
  });

  test("the series are frozen arrays, the first minute equal to a scalar call's", () => {
    const result = call(
      Object.fromEntries(Object.entries(valid).map(([k, x]) => [k, [x, x]])),
    );
    for (const field of fields) {
      const values = series(result[field]);
      expect(Object.isFrozen(values)).toBe(true);
      expect(values[0]).toBe(two_nodes_gagge_sleep(valid)[field]);
    }
  });

  // Upstream's ten outputs are nan at valid with height -1 or weight -1, for one minute and each minute of two, measured on 4.8.0 in the parity image (models/two_nodes_gagge_sleep.py:334).
  test.each([{ height: -1 }, { weight: -1 }])(
    "%o gives null in every output, every minute",
    (bad) => {
      const scalar = call({ ...valid, ...bad });
      const twice = call({
        ...Object.fromEntries(
          Object.entries(valid).map(([k, x]) => [k, [x, x]]),
        ),
        ...bad,
      });
      for (const field of fields) {
        expect(scalar[field]).toBe(null);
        expect(series(twice[field])).toEqual([null, null]);
      }
    },
  );

  // Deviation two_nodes_gagge_sleep-8.
  test.each([
    [
      { ...valid, tr: [18, 19] },
      "Parameters tdb, tr, v, rh, clo and thickness_quilt must have the same length. Got lengths [1, 2, 1, 1, 1, 1]",
    ],
    [
      { tdb: [], tr: [], v: [], rh: [], clo: [], thickness_quilt: [] },
      "Time-series inputs must not be empty.",
    ],
  ])("%o throws upstream's message as an Error", (inputs, message) => {
    const error = thrown(inputs);
    expect(error.constructor).toBe(Error);
    expect(error.message).toBe(message);
  });

  // Deviation two_nodes_gagge_sleep-7.
  test.each([
    [{ ltime: 0 }, "ltime must be a positive integer, got 0"],
    [{ ltime: -1 }, "ltime must be a positive integer, got -1"],
    [
      { ltime: -1e21 },
      "ltime must be a positive integer, got -1000000000000000000000",
    ],
    [
      {
        thickness_quilt: [1.76, -1],
        tdb: [18, 18],
        tr: [18, 18],
        v: [0.05, 0.05],
        rh: [50, 50],
        clo: [1.4, 1.4],
      },
      "thickness_quilt must be greater than or equal to 0 cm.",
    ],
  ])("%o throws upstream's message as a RangeError", (inputs, message) => {
    expect(() => call({ ...valid, ...inputs })).toThrow(
      new RangeError(message),
    );
  });

  // Deviation two_nodes_gagge_sleep-6.
  test.each([
    [1.5, "ltime must be an integer."],
    ["1", "ltime must be a finite number."],
    [true, "ltime must be a finite number."],
  ])("ltime %o throws the library's TypeError", (ltime, message) => {
    expect(() => call({ ...valid, ltime })).toThrow(new TypeError(message));
  });

  // Deviation two_nodes_gagge_sleep-9.
  test.each([
    ["tdb", ["18"]],
    ["tdb", ["a"]],
    ["tdb", [[18]]],
    ["height", "171"],
  ])("%s %o throws the library's TypeError", (key, value) => {
    expect(() => call({ ...valid, [key]: value })).toThrow(
      new TypeError(`${key} must be a finite number.`),
    );
  });

  // models/two_nodes_gagge_sleep.py:445: the kernel sets met_shivering before
  // it reads it.
  test("the met_shivering input changes nothing", () => {
    expect(call({ ...valid, met_shivering: 100 })).toEqual(
      two_nodes_gagge_sleep(valid),
    );
  });

  // Deviation two_nodes_gagge_sleep-4.
  test.each([
    [{ tdb: 33.7 }],
    [{ p_atm: 0 }],
    [{ weight: 0 }],
    [{ alfa: 0 }],
    [{ alfa: 1 }],
    [{ tdb: -235 }],
    [
      {
        tdb: -5.197913646697998,
        tr: -6.830699443817139,
        v: 3.0107510089874268,
        rh: 29.146409034729004,
        clo: 22.275272407767105,
        thickness_quilt: 3.0191242694854736,
        p_atm: 0.008837205405705754,
      },
    ],
  ])("%o throws numba's division by zero as a RangeError", (bad) => {
    expect(() => call({ ...valid, ...bad })).toThrow(
      new RangeError("division by zero"),
    );
  });

  // Deviation two_nodes_gagge_sleep-5.
  test("a Newton loop that does not converge throws Error at the cap", () => {
    const error = thrown({
      tdb: 16033.507302819778,
      tr: 49.774322509765625,
      v: 4.899091720581055,
      rh: -0.03004482046964206,
      clo: 4.2970850467681885,
      thickness_quilt: 7.228963375091553,
      c_dil: 151.4079213142395,
      temp_skin_neutral: 32.31352490186691,
      e_skin: 0.9003673791885376,
      alfa: -2912.3817409558123,
    });
    expect(error.constructor).toBe(Error);
    expect(error.message).toBe("Max iterations exceeded");
  });

  test("the root entry exports the same function", () => {
    expect(sleep_from_root).toBe(two_nodes_gagge_sleep);
  });
});

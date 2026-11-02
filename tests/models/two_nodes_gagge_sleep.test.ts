import { describe, expect, test } from "vitest";
import { two_nodes_gagge_sleep } from "../../src/models/index.ts";
import { _two_nodes_gagge_sleep_optimized } from "../../src/models/two_nodes_gagge_sleep.ts";
import { round } from "../../src/_internal/round.ts";
import { approx } from "./testUtils.ts";

const call = (inputs: unknown) =>
  two_nodes_gagge_sleep(inputs as Parameters<typeof two_nodes_gagge_sleep>[0]);

// An output upstream returns as an array, for a call of more than one minute.
const series = (value: number | readonly number[]): readonly number[] => {
  if (typeof value === "number") throw new TypeError("not a series");
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

// Mirrors pythermalcomfort v4.7.0 tests/test_two_nodes_gagge_sleep.py.
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
    // np.round(np.arange(28.5, 30.0, 0.005), 3): numpy's arange fills
    // start + i * (the second value - start).
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
    const diff = result.slice(1).map((x, i) => x - (result[i] ?? NaN));
    const max_step = Math.max(...diff.map(Math.abs));
    expect(max_step).toBeLessThan(0.05);
    expect(diff.every((d) => d > 0)).toBe(true); // monotonic
  });
});

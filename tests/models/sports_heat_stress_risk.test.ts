import { describe, expect, test } from "vitest";
import {
  _SportsValues,
  phs,
  Sports,
  sports_heat_stress_risk,
  SPORTS_HEAT_STRESS_RISK_INFO,
} from "../../src/models/index.ts";
import { sports_heat_stress_risk as from_root } from "../../src/index.ts";
import {
  _calc_risk_single_value,
  _PHS_IDX_SWEAT_LOSS_G,
  _PHS_IDX_T_CR,
  _phs_scalar,
} from "../../src/models/sports_heat_stress_risk.ts";
import { brentq } from "../../src/_internal/brentq.ts";
import { pythonRound } from "../../src/_internal/round.ts";
import { describeModelContract } from "./modelContract.ts";
import { approx } from "./testUtils.ts";

type Inputs = Parameters<typeof sports_heat_stress_risk>[0];

const humidity_message = "Relative humidity (rh) must be between 0 and 100%.";
const air_speed_message = "Relative air speed (vr) must be non-negative.";

function expect_valid_risk(result: ReturnType<typeof sports_heat_stress_risk>) {
  expect(result.risk_level_interpolated).toBeGreaterThanOrEqual(1);
  expect(result.risk_level_interpolated).toBeLessThanOrEqual(4.9);
}

// Mirrors pythermalcomfort v4.8.0 tests/test_sports_heat_stress_risk.py.
describe("test_sports_heat_stress_risk", () => {
  test.each([
    // Moderate temperature
    [33, 20, 40, 2, Sports.MTB, 1.8],
    // High temperature
    [40, 20, 40, 2, Sports.MTB, 3.3],
    // Low temperature (low risk)
    [10, 20, 40, 2, Sports.MTB, 1.0],
    // Very high temperature (extreme risk)
    [60, 20, 40, 2, Sports.MTB, 4.9],
    // Different sport
    [35, 35, 50, 0.5, Sports.RUNNING, 2.1],
  ])(
    "test_sports_heat_stress_risk_scalar[%s-%s-%s-%s]",
    (tdb, tr, rh, vr, sport, expected_risk) => {
      const result = sports_heat_stress_risk({ tdb, tr, rh, vr, sport });

      expect(typeof result.t_medium).toBe("number");
      expect(typeof result.t_high).toBe("number");
      expect(typeof result.t_extreme).toBe("number");
      expect(typeof result.recommendation).toBe("string");

      expect(
        approx(result.risk_level_interpolated, expected_risk, {
          rel: 0.01,
          abs: 0,
        }),
      ).toBe(true);
    },
  );

  test("test_sports_heat_stress_risk_array_clamps_vr_to_sport_minimum", () => {
    const tdb = [30, 35, 40];
    const tr = [30, 35, 40];
    const rh = [40, 50, 60];
    const vr = [0.5, 2.0, 2.5];

    for (const i of [0, 1, 2]) {
      const inputs = {
        tdb: tdb[i] ?? NaN,
        tr: tr[i] ?? NaN,
        rh: rh[i] ?? NaN,
        sport: Sports.RUNNING,
      };
      const vr_effective = Math.max(vr[i] ?? NaN, Sports.RUNNING.vr);
      const result = sports_heat_stress_risk({ ...inputs, vr: vr[i] ?? NaN });
      const expected = sports_heat_stress_risk({ ...inputs, vr: vr_effective });

      for (const key of [
        "risk_level_interpolated",
        "t_medium",
        "t_high",
        "t_extreme",
      ] as const)
        expect(approx(result[key], expected[key], { rel: 1e-7, abs: 0 })).toBe(
          true,
        );
      expect(result.recommendation).toBe(expected.recommendation);
    }
  });

  test("test_sports_heat_stress_risk_array", () => {
    for (const t of [40, 40]) {
      const result = sports_heat_stress_risk({
        tdb: t,
        tr: 20,
        rh: 40,
        vr: 2,
        sport: Sports.MTB,
      });

      expect(
        approx(result.risk_level_interpolated, 3.3, { rel: 0.01, abs: 0.01 }),
      ).toBe(true);
      expect(typeof result.t_medium).toBe("number");
      expect(typeof result.t_high).toBe("number");
      expect(typeof result.t_extreme).toBe("number");
    }
  });

  test("test_sports_heat_stress_risk_numpy_array", () => {
    for (const [tdb, rh, vr, tr] of [
      [30, 40, 0.5, 30],
      [35, 50, 1.0, 35],
      [40, 60, 1.5, 40],
    ] as const) {
      const result = sports_heat_stress_risk({
        tdb,
        tr,
        rh,
        vr,
        sport: Sports.RUNNING,
      });

      expect(typeof result.risk_level_interpolated).toBe("number");
      expect(typeof result.recommendation).toBe("string");
      expect_valid_risk(result);
    }
  });

  test("test_sports_heat_stress_risk_different_sports", () => {
    const inputs = { tdb: 35, tr: 35, rh: 50, vr: 0.5 };
    const result_running = sports_heat_stress_risk({
      ...inputs,
      sport: Sports.RUNNING,
    });
    const result_walking = sports_heat_stress_risk({
      ...inputs,
      sport: Sports.WALKING,
    });

    expect_valid_risk(result_running);
    expect_valid_risk(result_walking);
  });

  test("test_sports_heat_stress_risk_invalid_inputs", () => {
    const inputs = { tdb: 30, tr: 30, vr: 0.5, sport: Sports.RUNNING };
    expect(() => sports_heat_stress_risk({ ...inputs, rh: 150 })).toThrow(
      new RangeError(humidity_message),
    );
    expect(() => sports_heat_stress_risk({ ...inputs, rh: -10 })).toThrow(
      new RangeError(humidity_message),
    );
    expect(() =>
      sports_heat_stress_risk({ ...inputs, rh: 50, vr: -1 }),
    ).toThrow(new RangeError(air_speed_message));
    expect(() =>
      sports_heat_stress_risk({
        ...inputs,
        rh: 50,
        sport: "invalid",
      } as unknown as Inputs),
    ).toThrow(
      new TypeError(
        "sport must be a _SportsValues instance from the Sports dataclass.",
      ),
    );
  });

  test.todo(
    "test_sports_heat_stress_risk_broadcasting_incompatibility: the model takes scalars (deviation _shared-5), so no inputs fail to broadcast",
  );

  test("test_sports_heat_stress_risk_broadcasting", () => {
    for (const [tdb, rh] of [
      [30, 40],
      [35, 50],
      [40, 60],
    ] as const) {
      const result = sports_heat_stress_risk({
        tdb,
        tr: 30,
        rh,
        vr: 0.5,
        sport: Sports.SOCCER,
      });
      expect(typeof result.risk_level_interpolated).toBe("number");
    }
  });

  test("test_sports_heat_stress_risk_dataclass_fields", () => {
    const result = sports_heat_stress_risk({
      tdb: 35,
      tr: 35,
      rh: 50,
      vr: 0.5,
      sport: Sports.TENNIS,
    });

    for (const key of [
      "risk_level_interpolated",
      "t_medium",
      "t_high",
      "t_extreme",
      "recommendation",
    ])
      expect(result).toHaveProperty(key);

    expect(result.t_medium).toBeLessThan(result.t_high);
    expect(result.t_high).toBeLessThan(result.t_extreme);

    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  test("test_sports_heat_stress_risk_recommendations", () => {
    const run = (tdb: number, tr: number, rh: number) =>
      sports_heat_stress_risk({ tdb, tr, rh, vr: 0.5, sport: Sports.RUNNING });

    // Test low risk (risk level 1.0-2.0)
    const result_low = run(20, 20, 50);
    expect(result_low.recommendation).toBe(
      "Increase hydration & modify clothing",
    );
    expect(result_low.risk_level_interpolated).toBeGreaterThanOrEqual(1.0);
    expect(result_low.risk_level_interpolated).toBeLessThan(2.0);

    // Test medium risk (risk level 2.0-3.0)
    const result_medium = run(35, 34, 30);
    expect(result_medium.risk_level_interpolated).toBeGreaterThanOrEqual(2.0);
    expect(result_medium.risk_level_interpolated).toBeLessThan(3.0);
    expect(result_medium.recommendation).toBe(
      "Increase frequency and/or duration of rest breaks",
    );

    // Test high risk (risk level 3.0-4.0)
    const result_high = run(40, 35, 30);
    expect(result_high.risk_level_interpolated).toBeGreaterThanOrEqual(3.0);
    expect(result_high.risk_level_interpolated).toBeLessThan(4.0);
    expect(result_high.recommendation).toBe("Apply active cooling strategies");

    // Test medium risk near high boundary (risk level 2.0-3.0)
    const result = run(38, 38, 40);
    expect(result.risk_level_interpolated).toBeGreaterThanOrEqual(2.0);
    expect(result.risk_level_interpolated).toBeLessThan(3.0);
    expect(result.recommendation).toBe(
      "Increase frequency and/or duration of rest breaks",
    );

    // Test extreme risk (risk level = 4.9 at the upper temperature anchor)
    const result_extreme = run(50, 50, 50);
    expect(result_extreme.recommendation).toContain("Consider suspending play");
    expect(
      approx(result_extreme.risk_level_interpolated, 4.9, {
        rel: 1e-3,
        abs: 0,
      }),
    ).toBe(true);
  });

  test("test_sports_heat_stress_risk_array_recommendations", () => {
    for (const t of [20, 35, 45]) {
      const result = sports_heat_stress_risk({
        tdb: t,
        tr: t,
        rh: 50,
        vr: 0.5,
        sport: Sports.SOCCER,
      });

      expect(typeof result.recommendation).toBe("string");
      expect(result.recommendation.length).toBeGreaterThan(0);
    }
  });

  test("test_sports_heat_stress_risk_threshold_capping", () => {
    // Test conditions that should trigger maximum threshold capping
    // Very high humidity and temperature should cap thresholds
    const result_high = sports_heat_stress_risk({
      tdb: 45,
      tr: 45,
      rh: 90,
      vr: 0.1,
      sport: Sports.RUNNING,
    });

    // Verify thresholds respect maximum bounds (from implementation)
    // max_t_low = 34.5, max_t_medium = 39, max_t_high = 43.5
    expect(result_high.t_medium).toBeLessThanOrEqual(34.5);
    expect(result_high.t_high).toBeLessThanOrEqual(39.0);
    expect(result_high.t_extreme).toBeLessThanOrEqual(43.5);

    // Test conditions that should trigger minimum threshold capping
    // Low humidity and low temperature should set minimum thresholds
    const result_low = sports_heat_stress_risk({
      tdb: 25,
      tr: 25,
      rh: 10,
      vr: 2.0,
      sport: Sports.WALKING,
    });

    // Verify thresholds respect minimum bounds (from implementation)
    // min_t_medium = 23, min_t_high = 25, min_t_extreme = 26
    expect(result_low.t_medium).toBeGreaterThanOrEqual(23.0);
    expect(result_low.t_high).toBeGreaterThanOrEqual(25.0);
    expect(result_low.t_extreme).toBeGreaterThanOrEqual(26.0);

    // Verify threshold ordering is always maintained
    for (const result of [result_high, result_low]) {
      expect(result.t_medium).toBeLessThan(result.t_high);
      expect(result.t_high).toBeLessThan(result.t_extreme);
    }
  });

  test("test_sports_heat_stress_risk_edge_temperature_ranges", () => {
    // Test very low temperature (should be low risk, risk_level = 1)
    const result_very_low = sports_heat_stress_risk({
      tdb: 15,
      tr: 15,
      rh: 50,
      vr: 0.5,
      sport: Sports.RUNNING,
    });
    expect(
      approx(result_very_low.risk_level_interpolated, 1.0, { abs: 0.01 }),
    ).toBe(true);

    // Test very high temperature (should be capped at the upper extreme risk level)
    const result_very_high = sports_heat_stress_risk({
      tdb: 50,
      tr: 50,
      rh: 50,
      vr: 0.5,
      sport: Sports.RUNNING,
    });
    expect(
      approx(result_very_high.risk_level_interpolated, 4.9, { abs: 0.01 }),
    ).toBe(true);
  });

  test("test_sports_heat_stress_risk_extreme_interpolation", () => {
    const run = (tdb: number) =>
      sports_heat_stress_risk({
        tdb,
        tr: 20,
        rh: 0,
        vr: 10,
        sport: Sports.FISHING,
      });

    const anchor_result = run(43.5);
    expect(approx(anchor_result.t_extreme, 43.5, { abs: 0.01 })).toBe(true);
    expect(
      approx(anchor_result.risk_level_interpolated, 4.0, { abs: 0.01 }),
    ).toBe(true);

    const mid_result = run(45.0);
    expect(approx(mid_result.t_extreme, 43.5, { abs: 0.01 })).toBe(true);
    expect(approx(mid_result.risk_level_interpolated, 4.2, { abs: 0.01 })).toBe(
      true,
    );

    const capped_result = run(50.0);
    expect(
      approx(capped_result.risk_level_interpolated, 4.9, { abs: 0.01 }),
    ).toBe(true);
  });

  test("test_sports_heat_stress_risk_extreme_interpolation_uses_lower_model_threshold", () => {
    const base_result = sports_heat_stress_risk({
      tdb: 45.0,
      tr: 45.0,
      rh: 100,
      vr: 0,
      sport: Sports.RUNNING,
    });
    const severe_result = sports_heat_stress_risk({
      tdb: 45.0,
      tr: 50.0,
      rh: 100,
      vr: 0,
      sport: Sports.RUNNING,
    });

    expect(severe_result.t_extreme).toBeLessThan(43.5);
    expect(severe_result.risk_level_interpolated).toBeGreaterThanOrEqual(4.0);
    expect(severe_result.risk_level_interpolated).toBeGreaterThanOrEqual(
      base_result.risk_level_interpolated,
    );
  });

  test("test_sports_croquet_values", () => {
    expect([Sports.CROQUET.clo, Sports.CROQUET.met, Sports.CROQUET.vr]).toEqual(
      [0.7, 4.5, 0.5],
    );
    expect(Sports.CROQUET.duration).toBe(90);
  });

  test("test_sports_heat_stress_risk_all_sports", () => {
    // Get all sport attributes from Sports dataclass
    const all_sports = [
      Sports.ABSEILING,
      Sports.ARCHERY,
      Sports.AUSTRALIAN_FOOTBALL,
      Sports.BASEBALL,
      Sports.BASKETBALL,
      Sports.BOWLS,
      Sports.CANOEING,
      Sports.CRICKET,
      Sports.CROQUET,
      Sports.CYCLING,
      Sports.EQUESTRIAN,
      Sports.FIELD_ATHLETICS,
      Sports.FIELD_HOCKEY,
      Sports.FISHING,
      Sports.GOLF,
      Sports.HORSEBACK,
      Sports.KAYAKING,
      Sports.RUNNING,
      Sports.MTB,
      Sports.NETBALL,
      Sports.OZTAG,
      Sports.PICKLEBALL,
      Sports.CLIMBING,
      Sports.ROWING,
      Sports.RUGBY_LEAGUE,
      Sports.RUGBY_UNION,
      Sports.SAILING,
      Sports.SHOOTING,
      Sports.SOCCER,
      Sports.SOFTBALL,
      Sports.TENNIS,
      Sports.TOUCH,
      Sports.VOLLEYBALL,
      Sports.WALKING,
    ];

    // Test moderate conditions with each sport
    for (const sport of all_sports) {
      const result = sports_heat_stress_risk({
        tdb: 32,
        tr: 32,
        rh: 50,
        vr: 0.5,
        sport,
      });

      // Verify all sports return valid results
      expect_valid_risk(result);
      expect(typeof result.recommendation).toBe("string");

      // Verify threshold ordering - convert to float for comparison
      expect(result.t_medium).toBeLessThan(result.t_high);
      expect(result.t_high).toBeLessThan(result.t_extreme);
    }
  });

  test.each([
    // Boundary: rh = 0% (minimum humidity)
    [30, 30, 0, 0.5, Sports.RUNNING],
    // Boundary: rh = 100% (maximum humidity)
    [30, 30, 100, 0.5, Sports.RUNNING],
    // Boundary: vr = 0 (no air movement)
    [30, 30, 50, 0, Sports.SOCCER],
    // Boundary: very low vr
    [30, 30, 50, 0.01, Sports.TENNIS],
    // Combination: high temp, high humidity, no wind
    [40, 40, 100, 0, Sports.RUNNING],
    // Combination: low temp, low humidity, high wind
    [20, 20, 0, 5.0, Sports.CYCLING],
  ])(
    "test_sports_heat_stress_risk_boundary_values[%s-%s-%s-%s]",
    (tdb, tr, rh, vr, sport) => {
      const result = sports_heat_stress_risk({ tdb, tr, rh, vr, sport });

      // Verify function handles boundary values correctly
      expect_valid_risk(result);
      expect(typeof result.recommendation).toBe("string");

      // Verify threshold ordering is maintained - convert to float for comparison
      expect(result.t_medium).toBeLessThan(result.t_high);
      expect(result.t_high).toBeLessThan(result.t_extreme);

      // Verify no NaN values
      for (const value of [
        result.risk_level_interpolated,
        result.t_medium,
        result.t_high,
        result.t_extreme,
      ])
        expect(value).not.toBeNaN();
    },
  );

  test("test_sports_heat_stress_risk_extreme_negative_wind_speed", () => {
    const inputs = { tdb: 30, tr: 30, rh: 50 };
    expect(() =>
      sports_heat_stress_risk({ ...inputs, vr: -10.5, sport: Sports.RUNNING }),
    ).toThrow(new RangeError(air_speed_message));
    expect(() =>
      sports_heat_stress_risk({ ...inputs, vr: -0.001, sport: Sports.SOCCER }),
    ).toThrow(new RangeError(air_speed_message));
  });

  test("test_sports_heat_stress_risk_very_large_wind_speed", () => {
    // Very high wind speed (hurricane force)
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 30,
        tr: 30,
        rh: 50,
        vr: 50.0,
        sport: Sports.CYCLING,
      }),
    );

    // Extreme wind speed
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 35,
        tr: 35,
        rh: 60,
        vr: 100.0,
        sport: Sports.SAILING,
      }),
    );
  });

  test("test_sports_heat_stress_risk_extreme_cold_temperatures", () => {
    // Arctic winter conditions
    const arctic = sports_heat_stress_risk({
      tdb: -40,
      tr: -40,
      rh: 50,
      vr: 5.0,
      sport: Sports.RUNNING,
    });
    // Should be low risk (1) for extreme cold
    expect(approx(arctic.risk_level_interpolated, 1.0, { abs: 0.01 })).toBe(
      true,
    );

    // Extreme sub-zero temperature
    const sub_zero = sports_heat_stress_risk({
      tdb: -20,
      tr: -20,
      rh: 30,
      vr: 1.0,
      sport: Sports.WALKING,
    });
    expect(approx(sub_zero.risk_level_interpolated, 1.0, { abs: 0.01 })).toBe(
      true,
    );
  });

  test("test_sports_heat_stress_risk_extreme_hot_temperatures", () => {
    // Death Valley extreme heat
    const death_valley = sports_heat_stress_risk({
      tdb: 70,
      tr: 70,
      rh: 10,
      vr: 0.5,
      sport: Sports.WALKING,
    });
    // Should be capped at the upper extreme risk level
    expect(
      approx(death_valley.risk_level_interpolated, 4.9, { abs: 0.01 }),
    ).toBe(true);

    // Industrial environment extreme heat
    const industrial = sports_heat_stress_risk({
      tdb: 80,
      tr: 80,
      rh: 50,
      vr: 0.1,
      sport: Sports.RUNNING,
    });
    expect(approx(industrial.risk_level_interpolated, 4.9, { abs: 0.01 })).toBe(
      true,
    );
  });

  test("test_sports_heat_stress_risk_zero_values", () => {
    // All zeros (except reasonable tdb)
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 0,
        tr: 0,
        rh: 0,
        vr: 0,
        sport: Sports.WALKING,
      }),
    );

    // Zero humidity and wind
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 25,
        tr: 25,
        rh: 0,
        vr: 0,
        sport: Sports.SOCCER,
      }),
    );
  });

  test("test_sports_heat_stress_risk_very_small_positive_values", () => {
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 0.001,
        tr: 0.001,
        rh: 0.001,
        vr: 0.001,
        sport: Sports.RUNNING,
      }),
    );

    // Very small but valid humidity
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 20,
        tr: 20,
        rh: 0.1,
        vr: 0.01,
        sport: Sports.TENNIS,
      }),
    );
  });

  test("test_sports_heat_stress_risk_float_precision_edge_cases", () => {
    // Temperature at exact boundary values (from model constants)
    expect(
      sports_heat_stress_risk({
        tdb: 21.0,
        tr: 21.0,
        rh: 50,
        vr: 0.5,
        sport: Sports.RUNNING,
      }),
    ).toHaveProperty("risk_level_interpolated");

    // Humidity at exact 100%
    expect(
      sports_heat_stress_risk({
        tdb: 30,
        tr: 30,
        rh: 100.0,
        vr: 0.5,
        sport: Sports.SOCCER,
      }),
    ).toHaveProperty("risk_level_interpolated");

    // Very high precision values
    expect(
      sports_heat_stress_risk({
        tdb: 33.123456789,
        tr: 33.987654321,
        rh: 55.5555555,
        vr: 1.11111111,
        sport: Sports.CYCLING,
      }),
    ).toHaveProperty("risk_level_interpolated");
  });

  test("test_sports_heat_stress_risk_large_array", () => {
    // Create large arrays
    const size = 100;
    const step = (45 - 10) / (size - 1);

    for (let i = 0; i < size; i++) {
      const t = 10 + i * step;
      const result = sports_heat_stress_risk({
        tdb: t,
        tr: t,
        rh: 50,
        vr: 0.5,
        sport: Sports.RUNNING,
      });

      // Verify all values are valid
      expect_valid_risk(result);
      expect(result.risk_level_interpolated).not.toBeNaN();
    }
  });

  test("test_sports_heat_stress_risk_mixed_extreme_conditions", () => {
    // High temp + high humidity + no wind (worst case)
    const worst = sports_heat_stress_risk({
      tdb: 45,
      tr: 50,
      rh: 100,
      vr: 0,
      sport: Sports.RUNNING,
    });
    expect(worst.risk_level_interpolated).toBeGreaterThanOrEqual(4.0);
    expect(worst.risk_level_interpolated).toBeLessThanOrEqual(4.9);

    // High temp + low humidity + high wind (best cooling case)
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 40,
        tr: 40,
        rh: 5,
        vr: 10.0,
        sport: Sports.CYCLING,
      }),
    );

    // Cold + high humidity + high wind (hypothermia risk, but not heat stress)
    const cold = sports_heat_stress_risk({
      tdb: -10,
      tr: -10,
      rh: 100,
      vr: 15.0,
      sport: Sports.RUNNING,
    });
    expect(approx(cold.risk_level_interpolated, 1.0, { abs: 0.01 })).toBe(true);
  });

  test("test_sports_heat_stress_risk_radiant_temperature_extremes", () => {
    // Very high radiant temperature (direct sunlight)
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 30,
        tr: 70,
        rh: 40,
        vr: 0.5,
        sport: Sports.TENNIS,
      }),
    );

    // Very low radiant temperature (shade)
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 35,
        tr: 20,
        rh: 50,
        vr: 0.5,
        sport: Sports.SOCCER,
      }),
    );

    // Extreme radiant heat (hot surfaces)
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 30,
        tr: 80,
        rh: 30,
        vr: 1.0,
        sport: Sports.RUNNING,
      }),
    );
  });

  test("test_sports_heat_stress_risk_negative_radiant_temperature", () => {
    // Cold radiant surfaces
    expect_valid_risk(
      sports_heat_stress_risk({
        tdb: 20,
        tr: -5,
        rh: 40,
        vr: 0.5,
        sport: Sports.WALKING,
      }),
    );

    // Very cold radiant surfaces
    const very_cold = sports_heat_stress_risk({
      tdb: 10,
      tr: -30,
      rh: 50,
      vr: 1.0,
      sport: Sports.RUNNING,
    });
    expect(approx(very_cold.risk_level_interpolated, 1.0, { abs: 0.01 })).toBe(
      true,
    );
  });

  // Deviation _shared-5.
  test("test_sports_heat_stress_risk_array_with_negative_wind_speeds", () => {
    for (const [tdb, rh, vr, sport] of [
      [35, 50, -1.0, Sports.RUNNING],
      [25, 40, -0.1, Sports.SOCCER],
      [30, 50, -0.2, Sports.SOCCER],
    ] as const)
      expect(() =>
        sports_heat_stress_risk({ tdb, tr: tdb, rh, vr, sport }),
      ).toThrow(new RangeError(air_speed_message));
  });

  // Deviation _shared-5.
  test("test_sports_heat_stress_risk_array_with_invalid_humidity", () => {
    for (const [tdb, rh, sport] of [
      [35, 101, Sports.TENNIS],
      [25, -5, Sports.RUNNING],
    ] as const)
      expect(() =>
        sports_heat_stress_risk({ tdb, tr: tdb, rh, vr: 0.5, sport }),
      ).toThrow(new RangeError(humidity_message));
  });

  test("test_sports_heat_stress_risk_single_element_array", () => {
    const inputs = { tdb: 30, tr: 30, rh: 50, vr: 0.5, sport: Sports.RUNNING };
    const result_array = sports_heat_stress_risk(inputs);
    const result_scalar = sports_heat_stress_risk(inputs);

    expect(
      approx(
        result_array.risk_level_interpolated,
        result_scalar.risk_level_interpolated,
        { rel: 1e-5, abs: 0 },
      ),
    ).toBe(true);
  });

  // Deviation _shared-7.
  test("test_sports_heat_stress_risk_inf_values", () => {
    for (const [tdb, sport] of [
      [Infinity, Sports.RUNNING],
      [-Infinity, Sports.WALKING],
    ] as const)
      expect(() =>
        sports_heat_stress_risk({ tdb, tr: 30, rh: 50, vr: 0.5, sport }),
      ).toThrow(RangeError);
  });

  test("test_sports_heat_stress_risk_stress_gradient", () => {
    const temps = [20, 25, 30, 35, 40, 45];
    const risks = temps.map(
      (temp) =>
        sports_heat_stress_risk({
          tdb: temp,
          tr: temp,
          rh: 50,
          vr: 0.5,
          sport: Sports.RUNNING,
        }).risk_level_interpolated,
    );

    // Risk should generally increase with temperature
    // (allowing for some flatness at the extremes where risk is capped at 1 or 4.9)
    for (let i = 1; i < risks.length; i++)
      expect(risks[i]).toBeGreaterThanOrEqual(risks[i - 1] ?? NaN);
  });

  function _public_phs(
    tdb: number,
    tr: number,
    vr: number,
    rh: number,
    sport: _SportsValues,
  ) {
    return phs({
      tdb,
      tr,
      v: vr,
      rh,
      met: sport.met,
      clo: sport.clo,
      posture: "standing",
      duration: sport.duration,
      round_output: false,
      limit_inputs: false,
      acclimatized: 100,
      i_mst: 0.4,
    });
  }

  const _REGRESSION_SPORTS = [
    Sports.RUNNING,
    Sports.MTB,
    Sports.SOCCER,
    Sports.GOLF,
    Sports.SAILING,
    Sports.FISHING,
  ];
  const _REGRESSION_CONDITIONS = [
    // (tdb, tr, rh, vr)
    [24, 24, 20, 0.5],
    [28, 35, 60, 1.0],
    [32, 50, 40, 2.0],
    [36, 36, 80, 0.3],
    [40, 60, 15, 3.0],
    [45, 45, 50, 1.5],
  ] as const;
  const _REGRESSION_CASES = _REGRESSION_CONDITIONS.flatMap((condition) =>
    _REGRESSION_SPORTS.map((sport) => [...condition, sport] as const),
  );

  test.each(_REGRESSION_CASES)(
    "test_phs_scalar_matches_public_phs[%s-%s-%s-%s]",
    (tdb, tr, rh, vr, sport) => {
      const expected = _public_phs(tdb, tr, vr, rh, sport);
      const result = _phs_scalar(tdb, tr, rh, vr, sport);

      expect(
        approx(result[_PHS_IDX_SWEAT_LOSS_G], expected.sweat_loss_g ?? NaN, {
          rel: 1e-9,
          abs: 0,
        }),
      ).toBe(true);
      expect(
        approx(result[_PHS_IDX_T_CR], expected.t_cr ?? NaN, {
          rel: 1e-9,
          abs: 0,
        }),
      ).toBe(true);
    },
  );

  test.each(_REGRESSION_CASES)(
    "test_risk_thresholds_match_public_phs_solver[%s-%s-%s-%s]",
    (tdb, tr, rh, vr, sport) => {
      function water_loss(x: number): number {
        const sl = _public_phs(x, tr, vr, rh, sport).sweat_loss_g ?? NaN;
        return (sl / sport.duration) * 45.0 - 850;
      }

      function core(x: number): number {
        return (_public_phs(x, tr, vr, rh, sport).t_cr ?? NaN) - 40;
      }

      function solve(func: (x: number) => number, fallback: number): number {
        for (const [lo, hi] of [
          [0, 36],
          [20, 50],
        ] as const) {
          try {
            return brentq(func, lo, hi);
          } catch (error) {
            if (!(error instanceof RangeError)) throw error;
            continue;
          }
        }
        return fallback;
      }

      const [, t_medium, , t_extreme] = _calc_risk_single_value(
        tdb,
        tr,
        rh,
        vr,
        sport,
        [],
      );

      const expected_medium = Math.min(
        Math.max(solve(water_loss, 34.5), 23),
        34.5,
      );
      const expected_extreme = Math.min(Math.max(solve(core, 43.5), 26), 43.5);

      expect(
        approx(t_medium, pythonRound(expected_medium, 1), { abs: 1e-9 }),
      ).toBe(true);
      expect(
        approx(t_extreme, pythonRound(expected_extreme, 1), { abs: 1e-9 }),
      ).toBe(true);
    },
  );
});

const running = { tdb: 35, tr: 35, rh: 40, vr: 2.0, sport: Sports.RUNNING };
const construct_sport =
  (...args: unknown[]) =>
  () =>
    new (_SportsValues as unknown as new (...a: unknown[]) => _SportsValues)(
      ...args,
    );

describeModelContract(
  sports_heat_stress_risk,
  SPORTS_HEAT_STRESS_RISK_INFO,
  running,
);

// What upstream's tests leave out, measured on pythermalcomfort 4.7.0 in the
// parity image.
describe("sports_heat_stress_risk (JS-only)", () => {
  // Deviation sports_heat_stress_risk-2.
  test.each([
    [
      { tdb: 23, tr: -20, rh: 0, vr: 0.1, sport: Sports.RUNNING },
      [
        "Solver did not find a solution for high-extreme threshold for tdb=23.0 and rh=0.0: all bracket ranges failed. Setting t_extreme to max threshold of 43.5°C.",
      ],
    ],
    [
      { tdb: 29.7, tr: 25.7, rh: 0, vr: 0.1, sport: Sports.FISHING },
      [
        "Solver did not find a solution for low-medium threshold for tdb=29.7 and rh=0.0: all bracket ranges failed. Setting t_medium to max threshold of 34.5°C.",
        "Solver did not find a solution for high-extreme threshold for tdb=29.7 and rh=0.0: all bracket ranges failed. Setting t_extreme to max threshold of 43.5°C.",
      ],
    ],
  ])("%o returns upstream's notices", (inputs, messages) => {
    const result = sports_heat_stress_risk(inputs);
    expect(result.warnings).toEqual(
      messages.map((message) => ({ kind: "notice", message })),
    );
    expect([result.t_medium, result.t_high, result.t_extreme]).toEqual([
      34.5, 39, 43.5,
    ]);
  });

  // Deviation sports_heat_stress_risk-14.
  test("a zero duration throws upstream's ZeroDivisionError message at or above 23 °C", () => {
    const sport = new _SportsValues(0.5, 5.0, 0.5, 0);
    expect(() =>
      sports_heat_stress_risk({ tdb: 30, tr: 30, rh: 50, vr: 0.5, sport }),
    ).toThrow(new RangeError("float division by zero"));
    expect(
      sports_heat_stress_risk({ tdb: 20, tr: 30, rh: 50, vr: 0.5, sport })
        .t_medium,
    ).toBe(23);
  });

  test("returns no rows where both thresholds solve", () => {
    expect(sports_heat_stress_risk(running).warnings).toEqual([]);
  });

  test("a sport a caller builds gives what the Sports entry with its values gives", () => {
    const own = new _SportsValues(0.37, 7.5, 2.0, 60);
    expect(sports_heat_stress_risk({ ...running, sport: own })).toEqual(
      sports_heat_stress_risk(running),
    );
  });

  test("sport that is not a _SportsValues throws upstream's message, a plain object of its fields included", () => {
    expect(() =>
      sports_heat_stress_risk({
        ...running,
        sport: { clo: 0.37, met: 7.5, vr: 2.0, duration: 60 },
      }),
    ).toThrow(
      new TypeError(
        "sport must be a _SportsValues instance from the Sports dataclass.",
      ),
    );
  });

  // Deviation sports_heat_stress_risk-5, deviation sports_heat_stress_risk-6.
  test("_SportsValues throws the library's TypeError for a value of another type, a boolean included", () => {
    for (const [args, message] of [
      [["0.5", 5, 0.5, 60], "clo must be a number."],
      [[true, 5, 0.5, 60], "clo must be a number."],
      [[0.5, null, 0.5, 60], "met must be a number."],
      [[0.5, 5, "0.5", 60], "vr must be a number."],
      [[0.5, 5, 0.5, 60.5], "duration must be an integer."],
      [[0.5, 5, 0.5, true], "duration must be an integer."],
    ] as const)
      expect(construct_sport(...args)).toThrow(new TypeError(message));
  });

  // Deviation sports_heat_stress_risk-7.
  test("_SportsValues throws upstream's messages as a RangeError for a value out of range", () => {
    for (const [args, message] of [
      [[0, 5, 0.5, 60], "clo must be a positive number > 0, got 0"],
      [[-1.0, 5, 0.5, 60], "clo must be a positive number > 0, got -1"],
      [[0.5, 0, 0.5, 60], "met must be a positive number > 0, got 0"],
      [[0.5, 5, -0.5, 60], "vr must be a positive number > 0, got -0.5"],
      [
        [0.5, 5, 0.5, -1],
        "duration must be a non-negative integer >= 0, got -1",
      ],
    ] as const)
      expect(construct_sport(...args)).toThrow(new RangeError(message));
  });

  // Deviation sports_heat_stress_risk-8.
  test("Sports and its entries are frozen, and a _SportsValues a caller builds is not", () => {
    expect(Object.isFrozen(Sports)).toBe(true);
    expect(Object.values(Sports).every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(new _SportsValues(0.5, 5, 0.5, 60))).toBe(false);
  });

  test("is exported from the package root as from its subpath", () => {
    expect(from_root).toBe(sports_heat_stress_risk);
  });
});

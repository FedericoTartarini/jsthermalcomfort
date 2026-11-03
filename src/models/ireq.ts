import { parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  ComputedOutputsOf,
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _valid_range } from "../_internal/validation.ts";
import { met_to_w_m2 } from "../utilities/met_to_w_m2.ts";
import { Standard } from "../utilities/options.ts";

export const IREQ_INFO = deepFreeze({
  name: "ireq",
  label: "Required Clothing Insulation (IREQ)",
  standards: [Standard.iso_11079_2007],
  inputs: {
    tdb: { kind: "numeric", unit: "°C", applicability: { max: 10.0 } },
    tr: { kind: "numeric", unit: "°C" },
    vr: {
      kind: "numeric",
      unit: "m/s",
      applicability: { min: 0.4, max: 18.0 },
    },
    rh: { kind: "numeric", unit: "%" },
    met: { kind: "numeric", unit: "met" },
    clo: { kind: "numeric", unit: "clo" },
    p: { kind: "numeric", unit: "l/(m² s)" },
    walk_sp: { kind: "numeric", unit: "m/s", applicability: { max: 1.2 } },
    wme: { kind: "numeric", unit: "met", default: 0 },
    limit_inputs: { kind: "bool", default: true },
    round_output: { kind: "bool", default: true },
  },
  outputs: {
    ireq_min: {
      kind: "numeric",
      nullable: true,
      unit: "clo",
      applicability: { min: 0 },
    },
    ireq_neutral: {
      kind: "numeric",
      nullable: true,
      unit: "clo",
      applicability: { min: 0 },
    },
    icl_min: {
      kind: "numeric",
      nullable: true,
      unit: "clo",
      applicability: { min: 0 },
    },
    icl_neutral: {
      kind: "numeric",
      nullable: true,
      unit: "clo",
      applicability: { min: 0 },
    },
    dle_min: { kind: "label_or_numeric", nullable: true, unit: "h" },
    dle_neutral: { kind: "label_or_numeric", nullable: true, unit: "h" },
  },
  derived: {
    met: { unit: "W/m²", applicability: { min: 58.0, max: 400.0 } },
  },
} as const satisfies ModelInfo);

/** @interface */
export type IREQInputs = InputsOf<typeof IREQ_INFO>;

/**
 * Dataclass to represent the IREQ calculation results.
 *
 * @interface
 */
export type IREQ = OutputsOf<typeof IREQ_INFO>;

/**
 * Calculate Required Clothing Insulation (IREQ) and exposure duration.
 *
 * The model estimates the clothing insulation required to maintain thermal
 * equilibrium in cold environments and the Duration Limited Exposure (DLE)
 * when available clothing insulation is insufficient, in accordance with
 * ISO 11079 [11079ISO2007](../../docs/references.md#11079iso2007).
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.vr - Relative air speed, [m/s].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.p - Air permeability of clothing, [l/(m2 s)].
 * @param inputs.walk_sp - Walking speed, [m/s].
 * @param inputs.wme - External work, [met]. Defaults to 0.
 * @param inputs.limit_inputs - When True, results outside the ISO 11079 applicability limits are set
 * to nan. Non-physical negative clothing insulation outputs are also set
 * to nan. Defaults to True.
 *
 * > [!NOTE]
 * > The ISO 11079 applicability limits used by this function are
 * > 58 <= met [W/m2] <= 400 after converting the input metabolic rate
 * > from met to W/m2, tdb <= 10 [°C], 0.4 <= vr [m/s] <= 18, and
 * > minimum_walking_speed <= walk_sp [m/s] <= 1.2, where
 * > minimum_walking_speed = min(0.0052 * (met [W/m2] - 58), 1.2).
 * @param inputs.round_output - When True, rounds numeric output values to one decimal place. Defaults
 * to True.
 *
 * @returns A dataclass containing ``ireq_min``, ``ireq_neutral``, ``icl_min``,
 * ``icl_neutral``, ``dle_min``, and ``dle_neutral``. See
 * {@link IREQ} for more details.
 *
 * - `ireq_min` - Minimal required clothing insulation, [clo].
 * - `ireq_neutral` - Neutral required clothing insulation, [clo].
 * - `icl_min` - Minimal intrinsic clothing insulation, [clo].
 * - `icl_neutral` - Neutral intrinsic clothing insulation, [clo].
 * - `dle_min` - Duration limited exposure for the minimal criterion, [h].
 * - `dle_neutral` - Duration limited exposure for the neutral criterion, [h].
 *
 * @throws `TypeError` If an input has an unsupported type, or if ``limit_inputs`` or
 * ``round_output`` are not booleans.
 * @throws `RangeError` If inputs contain non-finite
 * values, or fail physical validation. The physical validation rejects
 * ``met <= 0``, ``wme < 0``, ``p <= 0``, ``vr < 0``, ``walk_sp < 0``,
 * relative humidity outside 0 to 100 %, and ``clo < 0``.
 *
 * @example
 * ```ts
 * import { ireq } from "jsthermalcomfort/models";
 *
 * const result = ireq({
 *   tdb: -15.0,
 *   tr: -15.0,
 *   vr: 2.0,
 *   rh: 55.0,
 *   met: 175.0 / 58.15,
 *   clo: 2.8,
 *   p: 50.0,
 *   walk_sp: 1.1,
 * });
 * console.log(result.ireq_min); // 1.6
 * console.log(result.dle_min); // more than 8
 * ```
 *
 * @see ISO 11079:2007 [11079ISO2007](../../docs/references.md#11079iso2007).
 */
export function ireq(inputs: IREQInputs): IREQ {
  let {
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    p,
    walk_sp,
    wme,
    limit_inputs,
    round_output,
  } = parseInputs(IREQ_INFO, inputs);
  if (met <= 0) {
    throw new RangeError("Metabolic rate (met) must be greater than 0.");
  }
  if (wme < 0) {
    throw new RangeError("External work (wme) must be non-negative.");
  }
  if (p <= 0) {
    throw new RangeError("Air permeability (p) must be greater than 0.");
  }
  if (vr < 0) {
    throw new RangeError("Relative air speed (vr) must be non-negative.");
  }
  if (walk_sp < 0) {
    throw new RangeError("Walking speed (walk_sp) must be non-negative.");
  }
  if (rh < 0 || rh > 100) {
    throw new RangeError("Relative humidity (rh) must be between 0 and 100.");
  }
  if (clo < 0) {
    throw new RangeError("Clothing insulation (clo) must be non-negative.");
  }

  met = met * met_to_w_m2;
  wme = wme * met_to_w_m2;

  const warnings: ModelWarning[] = [];
  const valid_inputs = _valid_iso_11079_inputs(met, tdb, vr, walk_sp, warnings);

  const clo_m2c_w = clo * 0.155;
  const results = {} as {
    -readonly [K in keyof typeof IREQ_INFO.outputs]: ComputedOutputsOf<
      typeof IREQ_INFO
    >[K];
  };

  const calculation_criteria = [
    ["min", 33.34 - 0.0354 * met, 0.06],
    ["neutral", 35.7 - 0.0285 * met, 0.001 * met],
  ] as const;

  for (const [suffix, skin_temperature, wetness] of calculation_criteria) {
    const [ireq_final, icl_raw, dle] = _solve_single_criterion(
      tdb,
      tr,
      met,
      wme,
      vr,
      walk_sp,
      p,
      clo_m2c_w,
      rh,
      skin_temperature,
      wetness,
    );

    let ireq_out = ireq_final / 0.155;
    let icl_out = icl_raw / 0.155;

    const ireq_key = `ireq_${suffix}` as const;
    const icl_key = `icl_${suffix}` as const;
    const ireq_valid = _valid_range(
      ireq_out,
      IREQ_INFO.outputs[ireq_key].applicability,
      ireq_key,
      "output",
      IREQ_INFO.outputs[ireq_key].unit,
      warnings,
    );
    const icl_valid = _valid_range(
      icl_out,
      IREQ_INFO.outputs[icl_key].applicability,
      icl_key,
      "output",
      IREQ_INFO.outputs[icl_key].unit,
      warnings,
    );
    // Object.is, as a NaN output is not non-physical upstream (NaN < 0 is false).
    const non_physical =
      !Object.is(ireq_valid, ireq_out) || !Object.is(icl_valid, icl_out);

    if (round_output) {
      ireq_out = round(ireq_out, 1);
      icl_out = round(icl_out, 1);
    }

    const dle_out = _format_dle(dle, round_output);

    const masked = limit_inputs && (non_physical || !valid_inputs);
    results[ireq_key] = masked ? NaN : ireq_out;
    results[icl_key] = masked ? NaN : icl_out;
    results[`dle_${suffix}`] = masked ? NaN : dle_out;
  }

  return buildOutputs(
    IREQ_INFO,
    {
      ireq_min: results.ireq_min,
      ireq_neutral: results.ireq_neutral,
      icl_min: results.icl_min,
      icl_neutral: results.icl_neutral,
      dle_min: results.dle_min,
      dle_neutral: results.dle_neutral,
    },
    warnings,
  );
}

/**
 * Compute the ISO 11079 Annex A wind/permeability correction factor shared by the
 * total and resultant clothing insulation calculations.
 */
function _clothing_constant_part(
  p: number,
  vr: number,
  walk_sp: number,
): number {
  return (
    0.54 * Math.exp(-0.15 * vr - 0.22 * walk_sp) * p ** 0.075 -
    0.06 * Math.log(p) +
    0.5
  );
}

/**
 * Solve the ISO 11079 Annex A thermal balance for one physiological criterion
 * (minimal or neutral), returning IREQ, ICL, and DLE in m2.K/W and hours.
 *
 * This mirrors the array-vectorized version of the same solve, but works on plain
 * floats so it can be JIT-compiled with Numba: each element gets its own
 * early-converging loop instead of the whole array running the full iteration
 * budget.
 */
function _solve_single_criterion(
  tdb: number,
  tr: number,
  met: number,
  wme: number,
  vr: number,
  walk_sp: number,
  p: number,
  clo_m2c_w: number,
  rh: number,
  skin_temperature: number,
  wetness: number,
): [number, number, number] {
  const ar_adu = 0.77;
  const air_insulation = 0.092 * Math.exp(-0.15 * vr - 0.22 * walk_sp) - 0.0045;
  const constant_part = _clothing_constant_part(p, vr, walk_sp);

  const expired_air_temperature = 29.0 + 0.2 * tdb;
  // numba raises ZeroDivisionError at a zero divisor (deviation ireq-6).
  if (expired_air_temperature + 235.0 === 0) {
    throw new RangeError("division by zero");
  }
  const expired_air_vapor_pressure =
    0.1333 * Math.exp(18.6686 - 4030.183 / (expired_air_temperature + 235.0));
  if (tdb + 235.0 === 0) throw new RangeError("division by zero");
  const ambient_vapor_pressure =
    (rh / 100.0) * 0.1333 * Math.exp(18.6686 - 4030.183 / (tdb + 235.0));
  if (skin_temperature + 235.0 === 0) throw new RangeError("division by zero");
  const skin_saturated_pressure =
    0.1333 * Math.exp(18.6686 - 4030.183 / (skin_temperature + 235.0));
  const tr_k = 273.0 + tr;

  let ireq_clo = 0.5;
  let factor = 0.5;
  let balance = 1.0;
  let clothing_temperature = 0.0;
  let radiation_heat_loss = 0.0;
  let convective_heat_loss = 0.0;

  for (let _ = 0; _ < 150; _++) {
    if (Math.abs(balance) <= 0.01) {
      break;
    }

    const fcl = 1.0 + 1.197 * ireq_clo;
    const total_evaporative_resistance =
      (0.06 / 0.38) * (air_insulation + ireq_clo);
    if (total_evaporative_resistance === 0) {
      throw new RangeError("division by zero");
    }
    const evaporative_heat_loss =
      (wetness * (skin_saturated_pressure - ambient_vapor_pressure)) /
      total_evaporative_resistance;
    const respiratory_heat_loss =
      1.73e-2 * met * (expired_air_vapor_pressure - ambient_vapor_pressure) +
      1.4e-3 * met * (expired_air_temperature - tdb);

    clothing_temperature =
      skin_temperature -
      ireq_clo * (met - wme - evaporative_heat_loss - respiratory_heat_loss);
    const clothing_temperature_k = 273.0 + clothing_temperature;

    const delta_t = clothing_temperature - tr;
    let radiation_coefficient;
    if (Math.abs(delta_t) < 1e-4) {
      radiation_coefficient =
        5.67e-8 *
        0.95 *
        ar_adu *
        4 *
        ((273.0 + (clothing_temperature + tr) / 2.0) *
          ((273.0 + (clothing_temperature + tr) / 2.0) *
            (273.0 + (clothing_temperature + tr) / 2.0)));
    } else {
      radiation_coefficient =
        (5.67e-8 *
          0.95 *
          ar_adu *
          (clothing_temperature_k *
            clothing_temperature_k *
            (clothing_temperature_k * clothing_temperature_k) -
            tr_k * tr_k * (tr_k * tr_k))) /
        delta_t;
    }

    if (air_insulation === 0) throw new RangeError("division by zero");
    const convection_coefficient = 1.0 / air_insulation - radiation_coefficient;
    radiation_heat_loss =
      fcl * radiation_coefficient * (clothing_temperature - tr);
    convective_heat_loss =
      fcl * convection_coefficient * (clothing_temperature - tdb);

    balance =
      met -
      wme -
      evaporative_heat_loss -
      respiratory_heat_loss -
      radiation_heat_loss -
      convective_heat_loss;

    if (balance > 0) {
      ireq_clo -= factor;
      factor /= 2.0;
    } else {
      ireq_clo += factor;
    }
  }

  if (radiation_heat_loss + convective_heat_loss === 0) {
    throw new RangeError("division by zero");
  }
  const ireq_final =
    (skin_temperature - clothing_temperature) /
    (radiation_heat_loss + convective_heat_loss);

  let storage = -40.0;
  let storage_factor = 500.0;
  let resultant_clothing_insulation = clo_m2c_w;
  let storage_balance = 1.0;

  for (let _ = 0; _ < 150; _++) {
    if (Math.abs(storage_balance) <= 0.01) {
      break;
    }

    const fcl_storage = 1.0 + 1.197 * resultant_clothing_insulation;
    if (fcl_storage === 0) throw new RangeError("division by zero");
    resultant_clothing_insulation =
      (clo_m2c_w + 0.085 / fcl_storage) * constant_part -
      air_insulation / fcl_storage;

    const total_evaporative_resistance =
      (0.06 / 0.38) * (air_insulation + resultant_clothing_insulation);
    if (total_evaporative_resistance === 0) {
      throw new RangeError("division by zero");
    }
    const evaporative_heat_loss =
      (wetness * (skin_saturated_pressure - ambient_vapor_pressure)) /
      total_evaporative_resistance;
    const respiratory_heat_loss =
      1.73e-2 * met * (expired_air_vapor_pressure - ambient_vapor_pressure) +
      1.4e-3 * met * (expired_air_temperature - tdb);

    const clothing_temperature_storage =
      skin_temperature -
      resultant_clothing_insulation *
        (met - wme - evaporative_heat_loss - respiratory_heat_loss - storage);
    const clothing_temperature_k = 273.0 + clothing_temperature_storage;

    const delta_t = clothing_temperature_storage - tr;
    let radiation_coefficient_storage;
    if (Math.abs(delta_t) < 1e-4) {
      radiation_coefficient_storage =
        5.67e-8 *
        0.95 *
        ar_adu *
        4 *
        ((273.0 + (clothing_temperature_storage + tr) / 2.0) *
          ((273.0 + (clothing_temperature_storage + tr) / 2.0) *
            (273.0 + (clothing_temperature_storage + tr) / 2.0)));
    } else {
      radiation_coefficient_storage =
        (5.67e-8 *
          0.95 *
          ar_adu *
          (clothing_temperature_k *
            clothing_temperature_k *
            (clothing_temperature_k * clothing_temperature_k) -
            tr_k * tr_k * (tr_k * tr_k))) /
        delta_t;
    }

    if (air_insulation === 0) throw new RangeError("division by zero");
    const convection_coefficient_storage =
      1.0 / air_insulation - radiation_coefficient_storage;
    const radiation_heat_loss_storage =
      fcl_storage *
      radiation_coefficient_storage *
      (clothing_temperature_storage - tr);
    const convective_heat_loss_storage =
      fcl_storage *
      convection_coefficient_storage *
      (clothing_temperature_storage - tdb);

    storage_balance =
      met -
      wme -
      evaporative_heat_loss -
      respiratory_heat_loss -
      radiation_heat_loss_storage -
      convective_heat_loss_storage -
      storage;

    if (storage_balance > 0) {
      storage += storage_factor;
      storage_factor /= 2.0;
    } else {
      storage -= storage_factor;
    }
  }

  const dle = storage === 0.0 ? Infinity : -40.0 / storage;

  const fcl_final = 1.0 + 1.197 * ireq_final;
  if (fcl_final === 0) throw new RangeError("division by zero");
  if (constant_part === 0) throw new RangeError("division by zero");
  const icl_raw =
    (ireq_final + air_insulation / fcl_final) / constant_part -
    0.085 / fcl_final;

  return [ireq_final, icl_raw, dle];
}

/** Return a boolean mask of inputs within the ISO 11079 applicability limits. */
function _valid_iso_11079_inputs(
  met: number,
  tdb: number,
  vr: number,
  walk_sp: number,
  warnings: ModelWarning[],
): boolean {
  const minimum_walking_speed = Math.min(0.0052 * (met - 58.0), 1.2);

  const met_valid = _valid_range(
    met,
    IREQ_INFO.derived.met.applicability,
    "met",
    "derived",
    IREQ_INFO.derived.met.unit,
    warnings,
  );
  const tdb_valid = _valid_range(
    tdb,
    IREQ_INFO.inputs.tdb.applicability,
    "tdb",
    "input",
    IREQ_INFO.inputs.tdb.unit,
    warnings,
  );
  const vr_valid = _valid_range(
    vr,
    IREQ_INFO.inputs.vr.applicability,
    "vr",
    "input",
    IREQ_INFO.inputs.vr.unit,
    warnings,
  );
  // The lower bound depends on met, so the row's bound is built per call (deviation ireq-2).
  const walk_sp_valid = _valid_range(
    walk_sp,
    Object.freeze({
      min: minimum_walking_speed,
      max: IREQ_INFO.inputs.walk_sp.applicability.max,
    }),
    "walk_sp",
    "input",
    IREQ_INFO.inputs.walk_sp.unit,
    warnings,
  );

  return !(
    Number.isNaN(met_valid) ||
    Number.isNaN(tdb_valid) ||
    Number.isNaN(vr_valid) ||
    Number.isNaN(walk_sp_valid)
  );
}

/**
 * Convert raw Duration Limited Exposure hours to the ISO 11079 output format,
 * replacing values above the 8 h ceiling with "more than 8".
 */
function _format_dle(dle: number, round_output: boolean): string | number {
  const unlimited = dle > 8.0 || dle < 0;
  if (unlimited) {
    return "more than 8";
  }

  if (round_output) {
    return round(dle, 1);
  }
  return dle;
}

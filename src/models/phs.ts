import { choiceFieldMessage, parseInputs } from "../_internal/define.ts";
import { buildOutputs, deepFreeze } from "../_internal/modelInfo.ts";
import type {
  Bound,
  InputsOf,
  ModelInfo,
  ModelWarning,
  OutputsOf,
} from "../_internal/modelInfo.ts";
import { round } from "../_internal/round.ts";
import { _valid_range } from "../_internal/validation.ts";
import { p_sat } from "../psychrometrics/p_sat.ts";
import { met_to_w_m2 } from "../utilities/met_to_w_m2.ts";
import { Postures, Standard } from "../utilities/options.ts";

// Constants
const const_t_eq = Math.exp(-1 / 10);
const const_t_sk = Math.exp(-1 / 3);
const const_sw = Math.exp(-1 / 10);

const _MODEL_2004 = 0;
export const _MODEL_2023 = 1;
export const _POSTURE_STANDING = 0;
const _POSTURE_SITTING = 1;
const _POSTURE_CROUCHING = 2;

export const PHS_LIMITS_ISO_7933 = deepFreeze({
  [Standard.iso_7933_2023]: {
    p_a: { min: 0.5, max: 4.5 },
    met: { min: 56, max: 250 },
  },
  [Standard.iso_7933_2004]: {
    p_a: { min: 0, max: 4.5 },
    met: { min: 100, max: 450 },
  },
} as const satisfies Readonly<Record<string, Readonly<Record<string, Bound>>>>);

const PHS_DEFAULTS_ISO_7933 = deepFreeze({
  [Standard.iso_7933_2023]: { f_r: 0.42, t_re: 36.8, t_cr_eq: 36.8 },
  [Standard.iso_7933_2004]: { f_r: 0.97, t_re: null, t_cr_eq: null },
} as const);

const POSTURES = deepFreeze([
  Postures.sitting,
  Postures.standing,
  Postures.crouching,
] as const);

const STANDARDS = deepFreeze([
  Standard.iso_7933_2023,
  Standard.iso_7933_2004,
] as const);

export const PHS_INFO = deepFreeze({
  name: "phs",
  label: "Predicted Heat Strain (PHS)",
  standards: STANDARDS,
  inputs: {
    tdb: {
      kind: "numeric",
      unit: "°C",
      applicability: { min: 15.0, max: 50.0 },
    },
    tr: { kind: "numeric", unit: "°C" },
    v: { kind: "numeric", unit: "m/s", applicability: { min: 0.0, max: 3.0 } },
    rh: { kind: "numeric", unit: "%" },
    met: { kind: "numeric", unit: "met" },
    clo: {
      kind: "numeric",
      unit: "clo",
      applicability: { min: 0.1, max: 1.0 },
    },
    posture: {
      kind: "choice",
      allowed: POSTURES,
      message: choiceFieldMessage("posture", POSTURES),
      nullable: true,
    },
    wme: { kind: "numeric", unit: "met", default: 0 },
    round_output: { kind: "bool", default: true },
    standard: {
      kind: "choice",
      allowed: STANDARDS,
      default: Standard.iso_7933_2023,
      message: (model: string) =>
        `Model '${model}' is not supported. ` +
        `Supported models are: ${Standard.iso_7933_2004} and ${Standard.iso_7933_2023}.`,
    },
    limit_inputs: { kind: "bool", default: true },
    i_mst: { kind: "numeric", unit: null, default: 0.38 },
    a_p: { kind: "numeric", unit: null, default: 0.54 },
    drink: { kind: "numeric", unit: null, default: 1 },
    weight: { kind: "numeric", unit: "kg", default: 75 },
    height: { kind: "numeric", unit: "m", default: 1.8 },
    walk_sp: { kind: "numeric", unit: "m/s", default: 0 },
    theta: { kind: "numeric", unit: "°", default: 0 },
    acclimatized: { kind: "numeric", unit: null, default: 100 },
    duration: { kind: "numeric", unit: "min", default: 480 },
    f_r: {
      kind: "numeric",
      unit: null,
      default: PHS_DEFAULTS_ISO_7933[Standard.iso_7933_2023].f_r,
    },
    t_sk: { kind: "numeric", unit: "°C", default: 34.1 },
    t_cr: { kind: "numeric", unit: "°C", default: 36.8 },
    t_re: {
      kind: "numeric",
      unit: "°C",
      default: PHS_DEFAULTS_ISO_7933[Standard.iso_7933_2023].t_re,
    },
    t_cr_eq: {
      kind: "numeric",
      unit: "°C",
      default: PHS_DEFAULTS_ISO_7933[Standard.iso_7933_2023].t_cr_eq,
    },
    t_sk_t_cr_wg: { kind: "numeric", unit: null, default: 0.3 },
    sweat_rate_watt: { kind: "numeric", unit: "W/m²", default: 0 },
    evap_load_wm2_min: { kind: "numeric", unit: "W·min/m²", default: 0 },
  },
  outputs: {
    t_re: { kind: "numeric", nullable: true, unit: "°C" },
    t_sk: { kind: "numeric", nullable: true, unit: "°C" },
    t_cr: { kind: "numeric", nullable: true, unit: "°C" },
    t_cr_eq: { kind: "numeric", nullable: true, unit: "°C" },
    t_sk_t_cr_wg: { kind: "numeric", nullable: true, unit: null },
    d_lim_loss_50: { kind: "numeric", nullable: true, unit: "min" },
    d_lim_loss_95: { kind: "numeric", nullable: true, unit: "min" },
    d_lim_t_re: { kind: "numeric", nullable: true, unit: "min" },
    sweat_loss_g: { kind: "numeric", nullable: true, unit: "g" },
    sweat_rate_watt: { kind: "numeric", nullable: true, unit: "W/m²" },
    evap_load_wm2_min: { kind: "numeric", nullable: true, unit: "W·min/m²" },
  },
  derived: {
    "tr - tdb": { unit: "°C", applicability: { min: 0.0, max: 60.0 } },
    p_a: {
      unit: "kPa",
      applicability: PHS_LIMITS_ISO_7933[Standard.iso_7933_2023].p_a,
    },
    met: {
      unit: "W/m²",
      applicability: PHS_LIMITS_ISO_7933[Standard.iso_7933_2023].met,
    },
  },
} as const satisfies ModelInfo);

/** @interface */
export type PHSInputs = InputsOf<typeof PHS_INFO>;

/**
 * Dataclass to represent the Predicted Heat Strain (PHS).
 *
 * @interface
 */
export type PHS = OutputsOf<typeof PHS_INFO>;

/**
 * Calculate the Predicted Heat Strain (PHS).
 *
 * The PHS is calculated in compliance with the ISO 7933:2004 [7933ISO2004](../../docs/references.md#7933iso2004) or
 * 2023 Standard [7933ISO2023](../../docs/references.md#7933iso2023). The ISO 7933 provides a method for the analytical evaluation
 * and interpretation of the thermal stress experienced by a subject in a hot environment.
 * It describes a method for predicting the sweat rate and the internal core temperature that
 * the human body will develop in response to the working conditions.
 *
 * The PHS model can be used to predict the: heat by respiratory convection, heat flow
 * by respiratory evaporation, steady state mean skin temperature, instantaneous value
 * of skin temperature, heat accumulation associated with the metabolic rate, maximum
 * evaporative heat flow at the skin surface, predicted sweat rate, predicted evaporative
 * heat flow, and rectal temperature.
 *
 * @param inputs
 * @param inputs.tdb - Dry bulb air temperature, [°C].
 * @param inputs.tr - Mean radiant temperature, [°C].
 * @param inputs.v - Air speed, [m/s].
 * @param inputs.rh - Relative humidity, [%].
 * @param inputs.met - Metabolic rate, [met].
 * @param inputs.clo - Clothing insulation, [clo].
 * @param inputs.posture - a string value presenting posture of person "sitting", "standing", or "crouching"
 * @param inputs.wme - external work, [met] default 0
 * @param inputs.round_output - If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param inputs.standard - Select the model you want to use to calculate the PHS. The default option is
 * "7933-2023", and the other option is "7933-2004".
 * @param inputs.limit_inputs - If True, limits the input parameters to the standard's applicability limits. Defaults to True.
 *
 * > [!NOTE]
 * > By default, if the inputs are outside the standard applicability limits the
 * > function returns nan. If False returns values even if input values are
 * > outside the applicability limits of the model.
 * >
 * > The 7933 limits are 15 <= tdb [°C] <= 50, 0 <= (tr - tdb) [°C] <= 60,
 * > 0 <= v [m/s] <= 3, and 0.1 <= clo [clo] <= 1. The metabolic rate limit is
 * > standard-specific: 1.72 <= met [met] <= 7.73 (100-450 W/m2) in the 2004
 * > standard, and 0.97 <= met [met] <= 4.29 (56-250 W/m2) in the 2023 standard.
 * @param inputs.i_mst - Static moisture permeability index, [dimensionless]. Defaults to 0.38.
 * @param inputs.a_p - Fraction of the body surface covered by the reflective clothing, [dimensionless]. Defaults to 0.54.
 * @param inputs.drink - 1 if workers can drink freely, 0 otherwise. Defaults to 1.
 * @param inputs.weight - Body weight, [kg]. Defaults to 75.
 * @param inputs.height - Height, [m]. Defaults to 1.8.
 * @param inputs.walk_sp - Walking speed, [m/s]. Defaults to 0.
 * @param inputs.theta - Angle between walking direction and wind direction, [degrees]. Defaults to 0.
 * @param inputs.acclimatized - 100 if acclimatized subject, 0 otherwise. Defaults to 100.
 * @param inputs.duration - Duration of the work sequence, [minutes]. Defaults to 480.
 * @param inputs.f_r - Emissivity of the reflective clothing, [dimensionless]. Defaults to 0.97 in the 2004 standard and
 * 0.42 in the 2023 standard.
 * @param inputs.t_sk - Mean skin temperature when worker starts working, [°C]. Defaults to 34.1.
 * @param inputs.t_cr - Mean core temperature when worker starts working, [°C]. Defaults to 36.8.
 * @param inputs.t_re - Mean rectal temperature when worker starts working, [°C]. If None in the 2004 standard,
 * then t_re = t_cr, whereas in the 2023 standard t_re = 36.8 °C
 * @param inputs.t_cr_eq - Mean core temperature as a function of met when worker starts working, [°C]. If None in the 2004
 * standard, then t_cr_eq = t_cr, whereas in the 2023 standard t_cr_eq = 36.8 °C.
 * @param inputs.t_sk_t_cr_wg - Initial weighting fraction for skin/core temperature coupling, dimensionless.
 * @param inputs.sweat_rate_watt - Initial instantaneous regulatory sweat (evaporative) rate at the skin, per unit area,
 * [W·m⁻²]. This is an instantaneous rate (W/m²) used at each simulation time step.
 * @param inputs.evap_load_wm2_min - Initial accumulated evaporative load per unit area. Input value is expected as an
 * instantaneous rate in [W·m⁻²]; during the simulation the value is updated by adding
 * instantaneous rates each minute and therefore the accumulated quantity represents the
 * sum over minutes (units W·min·m⁻²). It is intended for carry over between consecutive
 * simulation segments.
 *
 * @returns A dataclass containing the Predicted Heat Strain. See {@link PHS} for more details.
 * To access the individual attributes, use the corresponding attribute of the returned `PHS` instance, e.g., `result.t_re`.
 *
 * - `t_re` - Rectal temperature, [°C].
 * - `t_sk` - Skin temperature, [°C].
 * - `t_cr` - Core temperature, [°C].
 * - `t_cr_eq` - Core temperature as a function of the metabolic rate, [°C].
 * - `t_sk_t_cr_wg` - Fraction of the body mass at the skin temperature.
 * - `d_lim_loss_50` - Maximum allowable exposure time limited by cumulative sweat mass loss
 *   for a mean worker (dehydration constraint), [minutes].
 * - `d_lim_loss_95` - Maximum allowable exposure time limited by cumulative sweat mass loss
 *   for 95% of the working population (dehydration constraint), [minutes].
 * - `d_lim_t_re` - Maximum allowable exposure time for heat storage, [minutes].
 * - `sweat_loss_g` - Cumulative evaporated sweat mass for the whole person over the simulated duration, [grams (g)].
 *   This is a total mass per person (not per unit area).
 * - `sweat_rate_watt` - Instantaneous evaporative heat flux due to regulatory sweating at the skin,
 *   per unit area, [W·m⁻²]. Used at each simulation time step.
 * - `evap_load_wm2_min` - Accumulated evaporative load per unit area over the simulated duration, [W·min·m⁻²].
 *   Computed as the running sum of the instantaneous evaporative heat flux (W·m⁻²)
 *   at each 1 minute step. Intended for chaining simulation segments.
 *
 * @example
 * ```ts
 * import { phs } from "jsthermalcomfort/models";
 *
 * let result = phs({
 *   tdb: 40,
 *   tr: 40,
 *   rh: 33.85,
 *   v: 0.3,
 *   met: 2.5,
 *   clo: 0.5,
 *   posture: "standing",
 *   wme: 0,
 *   duration: 480,
 * });
 * console.log(result.t_re); // 37.5
 *
 * const results = [
 *   { tdb: 40, tr: 40, v: 0.3, rh: 33.85, met: 2.5, clo: 0.5 },
 *   { tdb: 45, tr: 45, v: 0.4, rh: 40, met: 2.6, clo: 0.6 },
 * ].map((inputs) =>
 *   phs({ ...inputs, posture: "standing", wme: 0, duration: 480 }),
 * );
 * console.log(results.map(({ t_re }) => t_re)); // [37.5, 42.5]
 *
 * // example: pass previous results as initial values to chain simulations
 *
 * // first simulation
 * result = phs({
 *   tdb: 40,
 *   tr: 40,
 *   v: 0.3,
 *   rh: 50,
 *   met: 2.5,
 *   clo: 0.5,
 *   posture: "standing",
 *   wme: 0,
 *   round_output: false,
 *   duration: 60,
 * });
 * console.log(result.t_re); // 37.843744854847046
 * // second simulation - using previous results as initial values
 * // NOTE: when chaining runs, prefer round_output=False to avoid rounding drift.
 * result = phs({
 *   tdb: 40,
 *   tr: 40,
 *   v: 0.3,
 *   rh: 50,
 *   met: 2.5,
 *   clo: 0.5,
 *   posture: "standing",
 *   wme: 0,
 *   round_output: false,
 *   duration: 60,
 *   t_sk: result.t_sk,
 *   t_cr: result.t_cr,
 *   t_re: result.t_re,
 *   t_cr_eq: result.t_cr_eq,
 *   t_sk_t_cr_wg: result.t_sk_t_cr_wg,
 *   sweat_rate_watt: result.sweat_rate_watt,
 *   evap_load_wm2_min: result.evap_load_wm2_min,
 * });
 * console.log(result.t_re); // 38.52809746939635
 * ```
 */
export function phs(inputs: PHSInputs): PHS {
  let {
    tdb,
    tr,
    v,
    rh,
    met,
    clo,
    posture,
    wme,
    round_output,
    standard,
    limit_inputs,
    i_mst,
    a_p,
    drink,
    weight,
    height,
    walk_sp,
    theta,
    acclimatized,
    duration,
    t_sk,
    t_cr,
    t_sk_t_cr_wg,
    sweat_rate_watt,
    evap_load_wm2_min,
  } = parseInputs(PHS_INFO, inputs);

  // INFO gives 2023's defaults, so a key left out takes the edition given's (deviation phs-1).
  const default_kwargs =
    PHS_DEFAULTS_ISO_7933[standard as (typeof STANDARDS)[number]];
  const f_r = inputs.f_r ?? default_kwargs.f_r;
  let t_re: number | null = inputs.t_re ?? default_kwargs.t_re;
  let t_cr_eq: number | null = inputs.t_cr_eq ?? default_kwargs.t_cr_eq;

  met = met * met_to_w_m2;
  wme = wme * met_to_w_m2;

  // basic physical validation for carry-over state (supports scalar and array-like)
  if (sweat_rate_watt < 0) {
    throw new RangeError("sweat_rate_watt must be >= 0");
  }
  if (evap_load_wm2_min < 0) {
    throw new RangeError("evap_load_wm2_min must be >= 0");
  }
  if (t_sk_t_cr_wg < 0.0 || t_sk_t_cr_wg > 1.0) {
    throw new RangeError("t_sk_t_cr_wg must be within [0, 1]");
  }

  let p_a: number;
  if (standard === Standard.iso_7933_2023) {
    p_a = (0.6105 * Math.exp((17.27 * tdb) / (tdb + 237.3)) * rh) / 100;
  } else {
    // model == Models.iso_7933_2004.value:
    p_a = ((p_sat(tdb) / 1000) * rh) / 100;
  }

  acclimatized = Math.trunc(acclimatized);
  if (acclimatized !== 0 && acclimatized !== 100) {
    throw new RangeError("Acclimatized should be 0 or 100");
  }

  if (drink !== 0 && drink !== 1) {
    throw new RangeError("Drink should be 0 or 1");
  }

  if (weight <= 0 || weight > 1000) {
    throw new RangeError(
      "The weight of the person should be in kg and it cannot exceed 1000",
    );
  }

  // Use explicit None sentinel for missing t_re and t_cr_eq
  t_re ??= t_cr;
  t_cr_eq ??= t_cr;

  const posture_code = _posture_to_code(posture);
  const model_code =
    standard === Standard.iso_7933_2023 ? _MODEL_2023 : _MODEL_2004;

  const warnings: ModelWarning[] = [];
  // ISO 7933 Annex A, Table A.1 applicability limits. p_a lower bound is 0.5 in
  // the 2023 revision and 0 in the 2004 edition. The metabolic rate range is also
  // standard-specific: 100-450 W/m2 in the 2004 edition, 56-250 W/m2 in the 2023
  // edition. All other limits are identical, including the range on (tr - tdb),
  // not on tr alone.
  const limits = PHS_LIMITS_ISO_7933[standard as (typeof STANDARDS)[number]];
  const tdb_valid = _valid_range(
    tdb,
    PHS_INFO.inputs.tdb.applicability,
    "tdb",
    "input",
    PHS_INFO.inputs.tdb.unit,
    warnings,
  );
  const tr_valid = _valid_range(
    tr - tdb,
    PHS_INFO.derived["tr - tdb"].applicability,
    "tr - tdb",
    "derived",
    PHS_INFO.derived["tr - tdb"].unit,
    warnings,
  );
  const v_valid = _valid_range(
    v,
    PHS_INFO.inputs.v.applicability,
    "v",
    "input",
    PHS_INFO.inputs.v.unit,
    warnings,
  );
  const p_a_valid = _valid_range(
    p_a,
    limits.p_a,
    "p_a",
    "derived",
    PHS_INFO.derived.p_a.unit,
    warnings,
  );
  const met_valid = _valid_range(
    met,
    limits.met,
    "met",
    "derived",
    PHS_INFO.derived.met.unit,
    warnings,
  );
  const clo_valid = _valid_range(
    clo,
    PHS_INFO.inputs.clo.applicability,
    "clo",
    "input",
    PHS_INFO.inputs.clo.unit,
    warnings,
  );
  const all_valid = !(
    Number.isNaN(tdb_valid) ||
    Number.isNaN(tr_valid) ||
    Number.isNaN(v_valid) ||
    Number.isNaN(p_a_valid) ||
    Number.isNaN(met_valid) ||
    Number.isNaN(clo_valid)
  );
  // The ranges are checked before the kernel, which a masked call skips (deviation phs-5).
  if (limit_inputs && !all_valid) {
    return buildOutputs(
      PHS_INFO,
      {
        t_re: NaN,
        t_sk: NaN,
        t_cr: NaN,
        t_cr_eq: NaN,
        t_sk_t_cr_wg: NaN,
        d_lim_loss_50: NaN,
        d_lim_loss_95: NaN,
        d_lim_t_re: NaN,
        sweat_loss_g: NaN,
        sweat_rate_watt: NaN,
        evap_load_wm2_min: NaN,
      },
      warnings,
    );
  }

  let sw_tot_g, d_lim_loss_50, d_lim_loss_95, d_lim_t_re;
  [
    t_re,
    t_sk,
    t_cr,
    t_cr_eq,
    t_sk_t_cr_wg,
    sweat_rate_watt,
    evap_load_wm2_min,
    sw_tot_g,
    d_lim_loss_50,
    d_lim_loss_95,
    d_lim_t_re,
  ] = _phs_optimized_scalar(
    tdb,
    tr,
    v,
    p_a,
    met,
    clo,
    posture_code,
    drink,
    acclimatized,
    weight,
    wme,
    i_mst,
    a_p,
    height,
    walk_sp,
    theta,
    duration,
    f_r,
    t_sk,
    t_cr,
    t_re,
    t_cr_eq,
    t_sk_t_cr_wg,
    evap_load_wm2_min,
    sweat_rate_watt,
    model_code,
  );

  const output = {
    t_re: t_re,
    t_sk: t_sk,
    t_cr: t_cr,
    t_cr_eq: t_cr_eq,
    t_sk_t_cr_wg: t_sk_t_cr_wg,
    d_lim_loss_50: d_lim_loss_50,
    d_lim_loss_95: d_lim_loss_95,
    d_lim_t_re: d_lim_t_re,
    sweat_loss_g: sw_tot_g,
    sweat_rate_watt: sweat_rate_watt,
    evap_load_wm2_min: evap_load_wm2_min,
  };

  if (round_output) {
    for (const key of Object.keys(output) as (keyof typeof output)[]) {
      if (key !== "t_sk_t_cr_wg") {
        output[key] = round(output[key], 1);
      } else {
        output[key] = round(output[key], 2);
      }
    }
  }

  return buildOutputs(PHS_INFO, output, warnings);
}

/**
 * Map posture string(s) to integer code(s) for PHS calculations.
 *
 * Accepts either a scalar string or an array of strings representing posture.
 * Valid values are Postures.standing.value, Postures.sitting.value, and Postures.crouching.value.
 * Comparisons are vectorized using numpy for array inputs.
 *
 * @param posture - Scalar or array of posture strings. Valid values are
 * Postures.standing.value, Postures.sitting.value, Postures.crouching.value.
 * @returns If input is scalar, returns the corresponding integer code:
 * _POSTURE_STANDING, _POSTURE_SITTING, or _POSTURE_CROUCHING.
 * If input is array-like, returns a np.ndarray of dtype int64 with mapped codes.
 * @throws `RangeError` If any supplied posture is not one of the valid values.
 *
 * @remarks
 * - Scalar input returns an int code; array input returns a np.ndarray of codes.
 * - Comparisons are vectorized for array inputs using numpy.
 */
function _posture_to_code(posture: string | null): number {
  if (posture === Postures.standing) {
    return _POSTURE_STANDING;
  }
  if (posture === Postures.sitting) {
    return _POSTURE_SITTING;
  }
  if (posture === Postures.crouching) {
    return _POSTURE_CROUCHING;
  }
  const error_msg =
    "Posture has to be either 'standing', 'sitting', or 'crouching'.";
  throw new RangeError(error_msg);
}

export function _phs_optimized_scalar(
  tdb: number,
  tr: number,
  v: number,
  p_a: number,
  met: number,
  clo: number,
  posture_code: number,
  drink: number,
  acclimatized: number,
  weight: number,
  wme: number,
  i_mst: number,
  a_p: number,
  height: number,
  walk_sp: number,
  theta: number,
  duration: number,
  f_r: number,
  t_sk: number,
  t_cr: number,
  t_re: number,
  t_cr_eq: number,
  t_sk_t_cr_wg: number,
  evap_load_wm2_min: number,
  sweat_rate_watt: number,
  model_code: number,
): readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] {
  // DuBois body surface area [m2]
  const a_dubois = 0.202 * weight ** 0.425 * height ** 0.725;
  // numba raises ZeroDivisionError at a zero divisor (deviation phs-6).
  if (a_dubois === 0) throw new RangeError("division by zero");
  // specific heat of the body [J/kg/C/min]
  const sp_heat = (met_to_w_m2 * weight) / a_dubois;

  let d_lim_t_re = 0; // maximum allowable exposure time for heat storage [min]
  // maximum allowable exposure time for sweat rate grams, mean subject [min]
  let d_lim_loss_50 = 0;
  // maximum allowable exposure time for sweat rate grams, 95 % of the working population [min]
  let d_lim_loss_95 = 0;
  // set the sweat rate in grams to zero
  let sw_tot_g = 0;

  let d_max_50, d_max_95;
  if (model_code === _MODEL_2023) {
    // 2023 standard only has one d_max value
    d_max_50 = (drink === 0 ? 0.03 : 0.05) * weight * 1000;
    d_max_95 = (drink === 0 ? 0.03 : 0.05) * weight * 1000;
  } else {
    // model == Models.iso_7933_2004.value:
    // maximum sweat rate grams to protect a mean subject [g]
    d_max_50 = 0.075 * weight * 1000;
    // maximum sweat rate grams to protect 95 % of the working population [g]
    d_max_95 = 0.05 * weight * 1000;
  }

  // def_dir = 1 for unidirectional walking, def_dir = 0 for omni-directional walking
  const def_dir = theta !== 0 ? 1 : 0;
  const def_speed = walk_sp === 0 ? 0 : 1;

  // radiating area dubois
  let a_r_du;
  if (posture_code === _POSTURE_STANDING) {
    a_r_du = 0.77;
  } else if (posture_code === _POSTURE_SITTING) {
    a_r_du = 0.7;
  } else {
    // posture == Postures.crouching.value:
    a_r_du = 0.67;
  }

  // evaluation of the max sweat rate as a function of the metabolic rate
  let sw_max;
  if (model_code === _MODEL_2004) {
    sw_max = (met - 32) * a_dubois;
    sw_max = 400 < sw_max ? 400 : sw_max;
    sw_max = 250 > sw_max ? 250 : sw_max;
    if (acclimatized === 100) {
      sw_max = sw_max * 1.25;
    }
  } else {
    // model == Models.iso_7933_2023.value:
    sw_max = acclimatized === 0 ? 400 : 500;
  }

  // max skin wettedness
  const w_max = acclimatized === 0 ? 0.85 : 1;

  // static clothing insulation
  const i_cl_st = clo * 0.155;

  const fcl = model_code === _MODEL_2023 ? 1 + 0.28 * clo : 1 + 0.3 * clo;

  // Static boundary layer thermal insulation in quiet air
  const i_a_st = 0.111;

  // Total static insulation
  if (fcl === 0) throw new RangeError("division by zero");
  const i_tot_st = i_cl_st + i_a_st / fcl;
  let v_r;
  if (def_speed > 0) {
    if (def_dir === 1) {
      // Unidirectional walking
      v_r = Math.abs(v - walk_sp * Math.cos((3.14159 * theta) / 180));
    } else if (v < walk_sp) {
      v_r = walk_sp;
    } else {
      v_r = v;
    }
  } else {
    walk_sp = 0.0052 * (met - 58);
    walk_sp = 0.7 < walk_sp ? 0.7 : walk_sp;
    v_r = v;
  }

  // Dynamic clothing insulation - correction for wind (Var) and walking speed
  let v_ux = v_r;
  if (v_r > 3) {
    v_ux = 3;
  }
  let w_a_ux = walk_sp;
  if (walk_sp > 1.5) {
    w_a_ux = 1.5;
  }
  // correction for the dynamic total dry thermal insulation at or above 0.6 clo
  let corr_cl =
    1.044 *
    Math.exp((0.066 * v_ux - 0.398) * v_ux + (0.094 * w_a_ux - 0.378) * w_a_ux);
  corr_cl = 1 < corr_cl ? 1 : corr_cl;
  // correction for the dynamic total dry thermal insulation at 0 clo
  let corr_ia = Math.exp(
    (0.047 * v_r - 0.472) * v_r + (0.117 * w_a_ux - 0.342) * w_a_ux,
  );
  corr_ia = 1 < corr_ia ? 1 : corr_ia;
  let corr_tot = corr_cl;
  if (clo <= 0.6) {
    corr_tot = ((0.6 - clo) * corr_ia + clo * corr_cl) / 0.6;
  }
  // total dynamic clothing insulation
  const i_tot_dyn = i_tot_st * corr_tot;
  // dynamic boundary layer thermal insulation
  const i_a_dyn = corr_ia * i_a_st;
  const i_cl_dyn = i_tot_dyn - i_a_dyn / fcl;
  // correction for the dynamic permeability index
  const corr_e = (2.6 * corr_tot - 6.5) * corr_tot + 4.9;
  let im_dyn = i_mst * corr_e;
  im_dyn = 0.9 < im_dyn ? 0.9 : im_dyn;
  if (im_dyn === 0) throw new RangeError("division by zero");
  const r_t_dyn = i_tot_dyn / im_dyn / 16.7;
  const t_exp = 28.56 + 0.115 * tdb + 0.641 * p_a; // expired air temperature
  // respiratory convective heat flow [W/m2]
  const c_res = 0.001516 * met * (t_exp - tdb);
  // respiratory evaporative heat flow [W/m2]
  const e_res = 0.00127 * met * (59.34 + 0.53 * tdb - 11.63 * p_a);
  let z = 3.5 + 5.2 * v_r;
  if (v_r > 1) {
    z = 8.7 * v_r ** 0.6;
  }

  // dynamic convective heat transfer coefficient
  let hc_dyn;
  if (model_code === _MODEL_2004) {
    hc_dyn = 2.38 * Math.abs(t_sk - tdb) ** 0.25;
  } else {
    // model == Models.iso_7933_2023.value:
    const t_cl = tr + 0.1; // clothing surface temperature
    hc_dyn = 2.38 * Math.abs(t_cl - tdb) ** 0.25;
  }

  hc_dyn = z > hc_dyn ? z : hc_dyn;

  const aux_r = 5.67e-8 * a_r_du;

  let f_cl_r;
  if (model_code === _MODEL_2023) {
    f_cl_r = (1 - a_p) * 0.97 + a_p * (1 - f_r);
  } else {
    // model == Models.iso_7933_2004.value:
    f_cl_r = (1 - a_p) * 0.97 + a_p * f_r;
  }

  // Pre-calculate constants
  const t_cr_eq_m = 0.0036 * met + 36.6;
  const t_sk_eq_cl_base =
    12.165 +
    0.02017 * tdb +
    0.04361 * tr +
    0.19354 * p_a -
    0.25315 * v +
    0.005346 * met;
  const t_sk_eq_nu_base =
    7.191 + 0.064 * tdb + 0.061 * tr + 0.198 * p_a - 0.348 * v;

  for (let time = 1; time <= duration; time++) {
    const t_sk0 = t_sk;
    const t_re0 = t_re;
    const t_cr0 = t_cr;
    const t_cr_eq0 = t_cr_eq;
    const t_sk_t_cr_wg0 = t_sk_t_cr_wg;

    // Core temperature at this minute, by exponential averaging
    t_cr_eq = t_cr_eq0 * const_t_eq + t_cr_eq_m * (1 - const_t_eq);
    // Heat storage associated with this core temperature increase during the last minute
    const d_stored_eq = sp_heat * (t_cr_eq - t_cr_eq0) * (1 - t_sk_t_cr_wg0);
    // skin temperature prediction -- clothed model
    const t_sk_eq_cl = t_sk_eq_cl_base + 0.51274 * t_re;
    // nude model
    const t_sk_eq_nu = t_sk_eq_nu_base + 0.616 * t_re;
    let t_sk_eq;
    if (clo >= 0.6) {
      t_sk_eq = t_sk_eq_cl;
    } else if (clo <= 0.2) {
      t_sk_eq = t_sk_eq_nu;
    } else {
      t_sk_eq = t_sk_eq_nu + 2.5 * (t_sk_eq_cl - t_sk_eq_nu) * (clo - 0.2);
    }

    // skin temperature [C]
    t_sk = t_sk0 * const_t_sk + t_sk_eq * (1 - const_t_sk);
    if (time === 1 && model_code === _MODEL_2023) {
      // ISO 7933:2023 Annex E forces the skin temperature to its equilibrium
      // value on the first minute, removing the exponential lag for that step.
      // This special case is not present in the 2004 Annex E reference code.
      t_sk = t_sk_eq;
    }
    // Saturated water vapour pressure at the surface of the skin
    if (t_sk + 237.3 === 0) throw new RangeError("division by zero");
    const p_sk = 0.6105 * Math.exp((17.27 * t_sk) / (t_sk + 237.3));
    let t_cl = tr + 0.1; // clothing surface temperature
    let h_r;
    let iterations = 0;
    for (;;) {
      // radiative heat transfer coefficient
      if (t_cl - tr === 0) throw new RangeError("division by zero");
      h_r =
        (f_cl_r *
          aux_r *
          ((t_cl + 273) * (t_cl + 273) * ((t_cl + 273) * (t_cl + 273)) -
            (tr + 273) * (tr + 273) * ((tr + 273) * (tr + 273)))) /
        (t_cl - tr);
      if (i_cl_dyn === 0) throw new RangeError("division by zero");
      if (fcl * (hc_dyn + h_r) + 1 / i_cl_dyn === 0)
        throw new RangeError("division by zero");
      const t_cl_new =
        (fcl * (hc_dyn * tdb + h_r * tr) + t_sk / i_cl_dyn) /
        (fcl * (hc_dyn + h_r) + 1 / i_cl_dyn);
      if (Math.abs(t_cl - t_cl_new) <= 0.001) {
        break;
      }
      t_cl = (t_cl + t_cl_new) / 2;
      iterations += 1;
      if (iterations === 1000) throw new Error("Max iterations exceeded");
    }

    const convection = fcl * hc_dyn * (t_cl - tdb);
    const radiation = fcl * h_r * (t_cl - tr);
    // maximum evaporative heat flow at the skin surface [W/m2]
    if (r_t_dyn === 0) throw new RangeError("division by zero");
    let e_max = (p_sk - p_a) / r_t_dyn;
    if (e_max === 0) {
      // added this otherwise e_req / e_max cannot be calculated
      e_max = 0.001;
    }
    // required evaporative heat flow [W/m2]
    let e_req =
      met - d_stored_eq - wme - c_res - e_res - convection - radiation;
    // required skin wettedness
    const w_req = e_req / e_max;

    let sw_req;
    if (e_req <= 0) {
      e_req = 0;
      sw_req = 0; // required sweat rate [W/m2]
    } else if (e_max <= 0) {
      e_max = 0;
      sw_req = sw_max;
    } else if (w_req >= 1.7) {
      sw_req = sw_max;
    } else {
      let e_v_eff =
        w_req > 1 ? ((2 - w_req) * (2 - w_req)) / 2 : 1 - (w_req * w_req) / 2;

      e_v_eff = e_v_eff > 0.05 ? e_v_eff : 0.05;

      sw_req = e_req / e_v_eff;
      sw_req = sw_max < sw_req ? sw_max : sw_req;
    }
    sweat_rate_watt = sweat_rate_watt * const_sw + sw_req * (1 - const_sw);

    let e_p;
    if (sweat_rate_watt <= 0) {
      e_p = 0; // predicted evaporative heat flow [W/m2]
      sweat_rate_watt = 0;
    } else {
      // Use a small epsilon to avoid division by zero or tiny values
      // This ensures k remains numerically stable
      const EPSILON = 1e-6;
      const k = e_max / (EPSILON > sweat_rate_watt ? EPSILON : sweat_rate_watt);
      let wp = 1;
      if (k >= 0.5) {
        wp = -k + Math.sqrt(k * k + 2);
      }
      wp = w_max < wp ? w_max : wp;
      e_p = wp * e_max;
    }

    // body heat storage rate [W/m2]
    const d_storage = e_req - e_p + d_stored_eq;
    let t_cr_new = t_cr0;
    iterations = 0;
    for (;;) {
      t_sk_t_cr_wg = 0.3 - 0.09 * (t_cr_new - 36.8);
      t_sk_t_cr_wg = 0.3 < t_sk_t_cr_wg ? 0.3 : t_sk_t_cr_wg;
      t_sk_t_cr_wg = 0.1 > t_sk_t_cr_wg ? 0.1 : t_sk_t_cr_wg;
      if (sp_heat === 0) throw new RangeError("division by zero");
      t_cr =
        d_storage / sp_heat +
        (t_sk0 * t_sk_t_cr_wg0) / 2 -
        (t_sk * t_sk_t_cr_wg) / 2;
      t_cr = (t_cr + t_cr0 * (1 - t_sk_t_cr_wg0 / 2)) / (1 - t_sk_t_cr_wg / 2);
      if (Math.abs(t_cr - t_cr_new) <= 0.001) {
        break;
      }
      t_cr_new = (t_cr_new + t_cr) / 2;
      iterations += 1;
      if (iterations === 1000) throw new Error("Max iterations exceeded");
    }

    t_re = t_re0 + (2 * t_cr - 1.962 * t_re0 - 1.31) / 9;
    if (d_lim_t_re === 0 && t_re >= 38) {
      d_lim_t_re = time;
    }
    evap_load_wm2_min = evap_load_wm2_min + sweat_rate_watt + e_res;
    // sw_tot_g: convert accumulated evaporative load per unit area into total
    // evaporated sweat mass for the whole person (grams, g). This is a per-person
    // cumulative mass over the simulated duration (not per m²).
    sw_tot_g = (evap_load_wm2_min * 2.67 * a_dubois) / 1.8 / 60;
    if (d_lim_loss_50 === 0 && sw_tot_g >= d_max_50) {
      d_lim_loss_50 = time;
    }
    if (d_lim_loss_95 === 0 && sw_tot_g >= d_max_95) {
      d_lim_loss_95 = time;
    }
  }

  // in the standard the if statement is within the while loop, causing it to decay exponentially
  if (drink === 0) {
    d_lim_loss_95 = d_lim_loss_95 * 0.6;
    d_lim_loss_50 = d_lim_loss_95;
  }
  if (d_lim_loss_50 === 0) {
    d_lim_loss_50 = duration;
  }
  if (d_lim_loss_95 === 0) {
    d_lim_loss_95 = duration;
  }
  if (d_lim_t_re === 0) {
    d_lim_t_re = duration;
  }

  return [
    t_re,
    t_sk,
    t_cr,
    t_cr_eq,
    t_sk_t_cr_wg,
    sweat_rate_watt,
    evap_load_wm2_min,
    sw_tot_g,
    d_lim_loss_50,
    d_lim_loss_95,
    d_lim_t_re,
  ];
}

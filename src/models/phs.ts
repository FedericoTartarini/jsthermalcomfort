import { p_sat } from "../psychrometrics/p_sat.js";
import {
  met_to_w_m2,
  round,
  Standard,
  validateInputs,
} from "../utilities/utilities.js";
import { deepFreeze } from "./modelDocs.ts";
import type { ApplicabilityWarning, ModelInfo } from "./modelDocs.ts";
import { _check_params_object, _valid_range } from "../_internal/validation.ts";

// Renamed from PhsReturnType to <Model>Result, the name every converted
// model's result has. A type alias, as the JSDoc typedef it replaces emitted,
// so the result stays assignable to Record<string, unknown>.
//
// The fields and their text are upstream's PHS (pythermalcomfort/
// classes_return.py:354-399 at v4.6.2), in its field order (:389-399).
/**
 * @typedef {Object} PhsResult
 * @property {number} t_re - Rectal temperature, [°C].
 * @property {number} t_sk - Skin temperature, [°C].
 * @property {number} t_cr - Core temperature, [°C].
 * @property {number} t_cr_eq - Core temperature as a function of the metabolic rate, [°C].
 * @property {number} t_sk_t_cr_wg - Fraction of the body mass at the skin temperature.
 * @property {number} d_lim_loss_50 - Maximum allowable exposure time limited by cumulative sweat mass loss for a mean worker (dehydration constraint), [minutes].
 * @property {number} d_lim_loss_95 - Maximum allowable exposure time limited by cumulative sweat mass loss for 95% of the working population (dehydration constraint), [minutes].
 * @property {number} d_lim_t_re - Maximum allowable exposure time for heat storage, [minutes].
 * @property {number} sweat_loss_g - Cumulative evaporated sweat mass for the whole person over the simulated duration, [grams (g)]. This is a total mass per person (not per unit area).
 * @property {number} sweat_rate_watt - Instantaneous evaporative heat flux due to regulatory sweating at the skin, per unit area, [W·m⁻²]. Used at each simulation time step.
 * @property {number} evap_load_wm2_min - Accumulated evaporative load per unit area over the simulated duration, [W·min·m⁻²]. Computed as the running sum of the instantaneous evaporative heat flux (W·m⁻²) at each 1 minute step. Intended for chaining simulation segments.
 * @property { ApplicabilityWarning[] } warnings - Applicability bounds the call broke, whatever `limit_inputs` is; see `ApplicabilityWarning`.
 * @public
 */
export type PhsResult = {
  t_re: number;
  t_sk: number;
  t_cr: number;
  t_cr_eq: number;
  t_sk_t_cr_wg: number;
  d_lim_loss_50: number;
  d_lim_loss_95: number;
  d_lim_t_re: number;
  sweat_loss_g: number;
  sweat_rate_watt: number;
  evap_load_wm2_min: number;
  readonly warnings: ApplicabilityWarning[];
};

/**
 * The params of `phs`: upstream's keyword parameters and its `**kwargs`,
 * quantities and switches alike, with upstream's defaults (ADR 0002).
 * Upstream's `model` is `standard` (ADR 0003). Documented on the function's
 * `params`.
 */
export interface PhsParams {
  tdb: number;
  tr: number;
  v: number;
  rh: number;
  met: number;
  clo: number;
  // Upstream checks posture case-insensitively and then compares the exact
  // string, so only the lowercase spellings compute (models/phs.py:503-510).
  posture: "standing" | "sitting" | "crouching";
  wme?: number;
  round_output?: boolean;
  standard?: typeof Standard.iso_7933_2004 | typeof Standard.iso_7933_2023;
  i_mst?: number;
  a_p?: number;
  drink?: 0 | 1;
  weight?: number;
  height?: number;
  walk_sp?: number;
  theta?: number;
  acclimatized?: 0 | 100;
  duration?: number;
  f_r?: number;
  t_sk?: number;
  t_cr?: number;
  t_re?: number;
  t_cr_eq?: number;
  t_sk_t_cr_wg?: number;
  sweat_rate_watt?: number;
  limit_inputs?: boolean;
  evap_load_wm2_min?: number;
}

// The bounds both editions share (models/phs.py:431-436 at v4.6.2).
const _PHS_SHARED_LIMITS = {
  tdb: Object.freeze({ min: 15, max: 50 }),
  tr_minus_tdb: Object.freeze({ min: 0, max: 60 }),
  v: Object.freeze({ min: 0, max: 3 }),
  clo: Object.freeze({ min: 0.1, max: 1 }),
};

/**
 * Applicability limits of the PHS model, keyed by edition, inclusive at both
 * ends as upstream's `_valid_range` (`pythermalcomfort/models/phs.py:423-436`
 * at v4.6.2).
 *
 * Upstream checks `tr - tdb`, not `tr`: its bound is the `derived` key
 * `tr_minus_tdb`. It checks the vapour pressure in kPa, 0 to 4.5 under
 * 7933-2004 and 0.5 to 4.5 under 7933-2023 (:429, :434): here it is the key
 * `pa` in Pa, 0 to 4500 and 500 to 4500, as `pa` is in Pa elsewhere in the
 * library (ADR 0011). It checks the metabolic rate in W/m², 100 to 450 under
 * 7933-2004 and 56 to 250 under 7933-2023 (:257, :430, :435): the `derived`
 * key `met_w_m2`, upstream's own name for it (`tests/test_ireq.py:38`).
 * `tdb`, `tr_minus_tdb`, `v` and `clo` are one frozen object shared by both
 * editions. Frozen, referenced by identity from `PHS_INFO` and the
 * `warnings` rows, and read by the gate in `phs`. Exported for that identity
 * test, deliberately not added to `src/models/index.js`.
 */
export const PHS_LIMITS = Object.freeze({
  [Standard.iso_7933_2004]: Object.freeze({
    ..._PHS_SHARED_LIMITS,
    pa: Object.freeze({ min: 0, max: 4500 }),
    met_w_m2: Object.freeze({ min: 100, max: 450 }),
  }),
  [Standard.iso_7933_2023]: Object.freeze({
    ..._PHS_SHARED_LIMITS,
    pa: Object.freeze({ min: 500, max: 4500 }),
    met_w_m2: Object.freeze({ min: 56, max: 250 }),
  }),
});

/**
 * Model metadata for the Predicted Heat Strain model.
 *
 * Experimental — the shape of `ModelInfo` may change before release.
 *
 * The bounds are those of 7933-2023, the default and first edition
 * (`PHS_LIMITS["7933-2023"]`). Under 7933-2004 the `pa` bound is 0 to 4500 Pa
 * and the `met_w_m2` bound 100 to 450 W/m² (`PHS_LIMITS["7933-2004"]`), and a
 * call's `warnings` rows carry its own edition's bounds. `tr` carries no
 * bound of its own: its bound is on `tr - tdb`, the `derived` row
 * `tr_minus_tdb`. `met` is checked in W/m², the `derived` row `met_w_m2`.
 *
 * @public
 */
export const PHS_INFO: ModelInfo = deepFreeze({
  name: "phs",
  label: "Predicted Heat Strain (PHS)",
  description:
    "Predicted Heat Strain (ISO 7933): the sweat rate and the core temperature a worker develops in a hot environment, and the allowable exposure times.",
  standards: [Standard.iso_7933_2023, Standard.iso_7933_2004],
  inputs: {
    tdb: {
      unit: "°C",
      applicability: PHS_LIMITS[Standard.iso_7933_2023].tdb,
    },
    tr: { unit: "°C" },
    v: { unit: "m/s", applicability: PHS_LIMITS[Standard.iso_7933_2023].v },
    rh: { unit: "%" },
    met: { unit: "met" },
    clo: {
      unit: "clo",
      applicability: PHS_LIMITS[Standard.iso_7933_2023].clo,
    },
    wme: { unit: "met" },
  },
  // Upstream's units (classes_return.py:357-385 at v4.6.2), W/m² spelled as
  // the other models spell it.
  outputs: {
    t_re: { unit: "°C" },
    t_sk: { unit: "°C" },
    t_cr: { unit: "°C" },
    t_cr_eq: { unit: "°C" },
    t_sk_t_cr_wg: { unit: null },
    d_lim_loss_50: { unit: "min" },
    d_lim_loss_95: { unit: "min" },
    d_lim_t_re: { unit: "min" },
    sweat_loss_g: { unit: "g" },
    sweat_rate_watt: { unit: "W/m²" },
    evap_load_wm2_min: { unit: "W·min/m²" },
  },
  derived: {
    tr_minus_tdb: {
      unit: "°C",
      applicability: PHS_LIMITS[Standard.iso_7933_2023].tr_minus_tdb,
    },
    pa: { unit: "Pa", applicability: PHS_LIMITS[Standard.iso_7933_2023].pa },
    met_w_m2: {
      unit: "W/m²",
      applicability: PHS_LIMITS[Standard.iso_7933_2023].met_w_m2,
    },
  },
});

// A non-finite number throws a TypeError here (ADR 0001, reason three).
// Upstream returns a result for some of them: +inf wme, ±inf i_mst and
// height, -inf walk_sp, a non-finite theta, a NaN duration, and a NaN or +inf
// sweat_rate_watt or evap_load_wm2_min. It raises for a non-finite drink or
// acclimatized, ±inf weight or t_sk_t_cr_wg, and -inf sweat_rate_watt or
// evap_load_wm2_min. For every other non-finite quantity or initial state it
// did not return within 15 s in ticket 16's parity sweep, as its while loops
// do not converge (models/phs.py:724-732, :779-791). A boolean or null quantity throws a
// TypeError too, where upstream reads True and False as 1 and 0 and an
// explicit None t_re or t_cr_eq as t_cr: quantities are numbers (ADR 0005).
// round_output is validated, as upstream gives it to PHSInputs
// (models/phs.py:209-219), which checks it before the quantities
// (classes_input.py:123-129). limit_inputs is declared but not validated:
// upstream reads it with `if limit_inputs:` (:423), so it is read with
// JavaScript's truth value, which differs from Python's on three values
// (ADR 0001): NaN is true in Python and false here, and an empty array or
// object is false in Python and true here. standard, posture, drink,
// acclimatized, weight, t_sk_t_cr_wg, sweat_rate_watt and evap_load_wm2_min
// are checked in phs, at the sites and with the messages upstream has.
const _PHS_INPUTS_SCHEMA = {
  round_output: { type: "boolean" },
  tdb: { type: "number" },
  tr: { type: "number" },
  v: { type: "number" },
  rh: { type: "number" },
  met: { type: "number" },
  clo: { type: "number" },
  wme: { type: "number" },
};
// Upstream's **kwargs (:221-240), which no inputs class checks.
const _PHS_KWARGS_SCHEMA = {
  i_mst: { type: "number" },
  a_p: { type: "number" },
  drink: { type: "number" },
  weight: { type: "number" },
  height: { type: "number" },
  walk_sp: { type: "number" },
  theta: { type: "number" },
  acclimatized: { type: "number" },
  duration: { type: "number" },
  f_r: { type: "number" },
  t_sk: { type: "number" },
  t_cr: { type: "number" },
  t_re: { type: "number" },
  t_cr_eq: { type: "number" },
  t_sk_t_cr_wg: { type: "number" },
  sweat_rate_watt: { type: "number" },
  evap_load_wm2_min: { type: "number" },
};
const PHS_SCHEMA = {
  ..._PHS_INPUTS_SCHEMA,
  posture: {},
  standard: {},
  ..._PHS_KWARGS_SCHEMA,
  limit_inputs: {},
};

// Upstream's allowed posture values (pythermalcomfort/classes_input.py:74-76
// at v4.6.2), which PHSInputs compares lower-cased (:180-183).
const _POSTURES = ["sitting", "standing", "crouching"];

// ADR 0013. Upstream's docstring gives the limit_inputs ranges as strict
// ("15 < tdb [°C] < 50", models/phs.py:76-79); the code's bounds are
// inclusive (_valid_range, _internal/validation.py:47). It names the air
// speed vr (:77), where the code checks v (:433); it leaves out the vapour
// pressure limit (:429, :434); and it gives the metabolic rate limits in met
// as "1.7 < met [met] < 7.5 (100-450 W/m2)" and "0.96 < met [met] < 4.3
// (56-250 W/m2)" (:77-78), where the code checks met times 58.15 in W/m2
// (:257, :435), and 100, 450, 56 and 250 W/m2 are 1.7197, 7.7386, 0.9630
// and 4.2992 met: the limits are given in W/m2 here. It says t_re and t_cr_eq fall back "If False" (:107-111),
// where only a value not given falls back (:313-316): an explicit 0 is used.
// It describes evap_load_wm2_min's input as "an instantaneous rate in
// [W·m⁻²]" (:118-119), where the code adds each minute's rates to it
// (:796), so the input is the accumulated load in [W·min·m⁻²] that an earlier
// call returned, as the chaining example passes it (:198).
/**
 * Calculate the Predicted Heat Strain (PHS).
 *
 * The PHS is calculated in compliance with the ISO 7933:2004 {@link #ref_8|[8]}
 * or 2023 Standard. The ISO 7933 provides a method for the analytical evaluation
 * and interpretation of the thermal stress experienced by a subject in a hot
 * environment. It describes a method for predicting the sweat rate and the
 * internal core temperature that the human body will develop in response to
 * the working conditions.
 *
 * The PHS model can be used to predict the: heat by respiratory convection,
 * heat flow by respiratory evaporation, steady state mean skin temperature,
 * instantaneous value of skin temperature, heat accumulation associated with
 * the metabolic rate, maximum evaporative heat flow at the skin surface,
 * predicted sweat rate, predicted evaporative heat flow, and rectal
 * temperature.
 *
 * @public
 * @memberof models
 * @docname Predicted Heat Strain (PHS) Index
 *
 * @param {Object} params - the model's parameters, named as in pythermalcomfort.
 * @param {number} params.tdb - Dry bulb air temperature, [°C].
 * @param {number} params.tr - Mean radiant temperature, [°C].
 * @param {number} params.v - Air speed, [m/s].
 * @param {number} params.rh - Relative humidity, [%].
 * @param {number} params.met - Metabolic rate, [met].
 * @param {number} params.clo - Clothing insulation, [clo].
 * @param {"standing" | "sitting" | "crouching"} params.posture - a string value presenting posture of person "sitting", "standing", or "crouching"
 * @param {number} [params.wme=0] - external work, [met] default 0
 * @param {boolean} [params.round_output=true] - If True, rounds output value. If False, it does not round it. Defaults to True.
 * @param {"7933-2004" | "7933-2023"} [params.standard="7933-2023"] - Select the model you want to use to calculate the PHS. The default option is
 * "7933-2023", and the other option is "7933-2004". Upstream's `model` argument.
 * @param {boolean} [params.limit_inputs=true] - If True, limits the input parameters to the standard's applicability limits. Defaults to True.
 * By default, if the inputs are outside the standard applicability limits the function returns nan. If False returns values even if
 * input values are outside the applicability limits of the model. The 7933 limits are 15 <= tdb [°C] <= 50, 0 <= (tr - tdb) [°C] <= 60,
 * 0 <= v [m/s] <= 3, and 0.1 <= clo [clo] <= 1. The metabolic rate limit is standard-specific and checked in W/m2:
 * 100 <= met × 58.15 [W/m2] <= 450 in the 2004 standard, and 56 <= met × 58.15 [W/m2] <= 250 in the 2023 standard. The vapour
 * pressure limit is 0 <= pa [Pa] <= 4500 in the 2004 standard and 500 <= pa [Pa] <= 4500 in the 2023 standard. Each bound the
 * inputs break is reported in the result's `warnings`, whatever `limit_inputs` is (`PHS_LIMITS`).
 * @param {number} [params.i_mst=0.38] - Static moisture permeability index, [dimensionless]. Defaults to 0.38.
 * @param {number} [params.a_p=0.54] - Fraction of the body surface covered by the reflective clothing, [dimensionless]. Defaults to 0.54.
 * @param {0 | 1} [params.drink=1] - 1 if workers can drink freely, 0 otherwise. Defaults to 1.
 * @param {number} [params.weight=75] - Body weight, [kg]. Defaults to 75.
 * @param {number} [params.height=1.8] - Height, [m]. Defaults to 1.8.
 * @param {number} [params.walk_sp=0] - Walking speed, [m/s]. Defaults to 0.
 * @param {number} [params.theta=0] - Angle between walking direction and wind direction, [degrees]. Defaults to 0.
 * @param {0 | 100} [params.acclimatized=100] - 100 if acclimatized subject, 0 otherwise. Defaults to 100.
 * @param {number} [params.duration=480] - Duration of the work sequence, [minutes]. Defaults to 480.
 * @param {number} [params.f_r] - Emissivity of the reflective clothing, [dimensionless]. Defaults to 0.97 in the 2004 standard and
 * 0.42 in the 2023 standard.
 * @param {number} [params.t_sk=34.1] - Mean skin temperature when worker starts working, [°C]. Defaults to 34.1.
 * @param {number} [params.t_cr=36.8] - Mean core temperature when worker starts working, [°C]. Defaults to 36.8.
 * @param {number} [params.t_re] - Mean rectal temperature when worker starts working, [°C]. If not given, in the 2004 standard
 * t_re = t_cr, whereas in the 2023 standard t_re = 36.8 °C.
 * @param {number} [params.t_cr_eq] - Mean core temperature as a function of met when worker starts working, [°C]. If not given, in
 * the 2004 standard t_cr_eq = t_cr, whereas in the 2023 standard t_cr_eq = 36.8 °C.
 * @param {number} [params.t_sk_t_cr_wg=0.3] - Initial weighting fraction for skin/core temperature coupling, dimensionless.
 * @param {number} [params.sweat_rate_watt=0] - Initial instantaneous regulatory sweat (evaporative) rate at the skin, per unit area,
 * [W·m⁻²]. This is an instantaneous rate (W/m²) used at each simulation time step.
 * @param {number} [params.evap_load_wm2_min=0] - Initial accumulated evaporative load per unit area, [W·min·m⁻²]: the
 * `evap_load_wm2_min` an earlier call returned. During the simulation the value is updated by adding instantaneous rates
 * each minute and therefore the accumulated quantity represents the sum over minutes (units W·min·m⁻²). It is intended for
 * carry over between consecutive simulation segments.
 *
 * @returns {PhsResult} the Predicted Heat Strain.
 *
 * @example
 * const result = phs({ tdb: 40, tr: 40, rh: 33.85, v: 0.3, met: 2.5, clo: 0.5, posture: "standing", wme: 0, duration: 480 });
 * console.log(result.t_re); // 37.5
 *
 * @example
 * // example: pass previous results as initial values to chain simulations
 * // first simulation
 * const first = phs({ tdb: 40, tr: 40, v: 0.3, rh: 50, met: 2.5, clo: 0.5, posture: "standing", wme: 0, round_output: false, duration: 60 });
 * console.log(first.t_re); // 37.8
 * // second simulation - using previous results as initial values
 * // NOTE: when chaining runs, prefer round_output: false to avoid rounding drift.
 * const second = phs({
 *   tdb: 40, tr: 40, v: 0.3, rh: 50, met: 2.5, clo: 0.5, posture: "standing", wme: 0, round_output: false, duration: 60,
 *   t_sk: first.t_sk, t_cr: first.t_cr, t_re: first.t_re, t_cr_eq: first.t_cr_eq, t_sk_t_cr_wg: first.t_sk_t_cr_wg,
 *   sweat_rate_watt: first.sweat_rate_watt, evap_load_wm2_min: first.evap_load_wm2_min,
 * });
 * console.log(second.t_re); // 38.5
 */
export function phs(params: PhsParams): PhsResult {
  // Every argument was positional before v2 (ADR 0002); a call still written
  // that way fails here, naming the shape it should have. So does an unknown
  // key, such as upstream's `model` (ADR 0003, ADR 0008).
  _check_params_object(params, "phs", PHS_SCHEMA);
  const { tdb, tr, v, rh, met, clo, posture } = params;
  const {
    wme = 0,
    round_output = true,
    standard = Standard.iso_7933_2023,
  } = params;

  // As upstream checks model first (models/phs.py:202-207).
  if (
    standard !== Standard.iso_7933_2004 &&
    standard !== Standard.iso_7933_2023
  ) {
    throw new Error(
      `Model '${String(standard)}' is not supported. Supported models are: ${Standard.iso_7933_2004} and ${Standard.iso_7933_2023}.`,
    );
  }
  const is_2023 = standard === Standard.iso_7933_2023;

  // Destructuring defaults also apply to a default passed as undefined.
  // The 2023 overrides are upstream's (:242-249); t_re and t_cr_eq default to
  // t_cr in 2004 only when not given (:313-316), so an explicit 0 is used.
  const {
    i_mst = 0.38,
    a_p = 0.54,
    drink = 1,
    weight = 75,
    height = 1.8,
    walk_sp = 0,
    theta = 0,
    acclimatized = 100,
    duration = 480,
    f_r = is_2023 ? 0.42 : 0.97,
    t_sk = 34.1,
    t_cr = 36.8,
    t_sk_t_cr_wg = 0.3,
    sweat_rate_watt = 0,
    limit_inputs = true,
    evap_load_wm2_min = 0,
  } = params;
  const { t_re = is_2023 ? 36.8 : t_cr, t_cr_eq = is_2023 ? 36.8 : t_cr } =
    params;

  validateInputs(
    { round_output, tdb, tr, v, rh, met, clo, wme },
    _PHS_INPUTS_SCHEMA,
  );
  // ADR 0005 as amended: posture takes one string. Upstream broadcasts a list
  // (posture=["standing"] returns a length-1 array in 4.6.2).
  if (Array.isArray(posture)) {
    throw new TypeError("posture must be a string, got an array");
  }
  // PHSInputs skips a None posture (classes_input.py:138-139), which the exact
  // comparison below then rejects.
  if (posture !== null && !_POSTURES.includes(String(posture).toLowerCase())) {
    throw new Error(
      "posture must be one of ['sitting', 'standing', 'crouching']",
    );
  }
  validateInputs(
    {
      i_mst,
      a_p,
      drink,
      weight,
      height,
      walk_sp,
      theta,
      acclimatized,
      duration,
      f_r,
      t_sk,
      t_cr,
      t_re,
      t_cr_eq,
      t_sk_t_cr_wg,
      sweat_rate_watt,
      evap_load_wm2_min,
    },
    _PHS_KWARGS_SCHEMA,
  );

  // Upstream's own checks, in its order (:287-292, :300-310). A value outside
  // a range throws a RangeError, any other rejected value an Error (ADR 0012).
  if (sweat_rate_watt < 0) {
    throw new RangeError("sweat_rate_watt must be >= 0");
  }
  if (evap_load_wm2_min < 0) {
    throw new RangeError("evap_load_wm2_min must be >= 0");
  }
  if (t_sk_t_cr_wg < 0.0 || t_sk_t_cr_wg > 1.0) {
    throw new RangeError("t_sk_t_cr_wg must be within [0, 1]");
  }

  let p_a;
  if (is_2023) {
    // Upstream computes this with np.exp (:296). Math.exp's one-ulp
    // difference (see the kernel) can move p_a across a bound: at tdb 40 and
    // rh 61.04185428648752 it is 4.500000000000001 kPa here, which the gate
    // masks, and 4.5 upstream, which it does not.
    p_a = (0.6105 * Math.exp((17.27 * tdb) / (tdb + 237.3)) * rh) / 100;
  } else {
    p_a = ((p_sat(tdb) / 1000) * rh) / 100;
  }

  // Upstream truncates acclimatized to an integer before checking it
  // (`int(acclimatized)`, :300), so 100.7 computes as 100 and 0.5 as 0.
  const acclimatized_int = Math.trunc(acclimatized);
  if (acclimatized_int !== 0 && acclimatized_int !== 100) {
    throw new Error("Acclimatized should be 0 or 100");
  }
  if (drink !== 0 && drink !== 1) {
    throw new Error("Drink should be 0 or 1");
  }
  if (weight <= 0 || weight > 1000) {
    throw new RangeError(
      "The weight of the person should be in kg and it cannot exceed 1000",
    );
  }

  // _posture_to_code compares the exact string (:500-510).
  const posture_code = _POSTURE_CODES[posture as string];
  if (posture_code === undefined) {
    throw new Error(
      "Posture has to be either 'standing', 'sitting', or 'crouching'.",
    );
  }

  const met_w_m2 = met * met_to_w_m2;

  // The rows are the channel for upstream's UserWarning, which JavaScript has
  // no warnings filter for (ADR 0001). Upstream checks only under
  // limit_inputs, in this order (:431-436); the rows are built on every call,
  // so with the gate off they say what the numbers were computed despite.
  const limits = PHS_LIMITS[standard];
  const warnings: ApplicabilityWarning[] = [];
  _valid_range(warnings, "tdb", "input", tdb, limits.tdb);
  _valid_range(
    warnings,
    "tr_minus_tdb",
    "derived",
    tr - tdb,
    limits.tr_minus_tdb,
  );
  _valid_range(warnings, "v", "input", v, limits.v);
  // p_a is in kPa, as upstream computes it; the row and its bound are in Pa
  // (ADR 0011). Multiplying by 1000 flips the gate against upstream's kPa
  // comparison for none of the values within 2000 ulps of 0, 0.5 and 4.5 kPa
  // (.scratch/v2-models/wave-2/research/phs/d2_edges.py). p_a itself can
  // differ from upstream's in the last bit, from Math.exp (see p_a above).
  _valid_range(warnings, "pa", "derived", p_a * 1000, limits.pa);
  _valid_range(warnings, "met_w_m2", "derived", met_w_m2, limits.met_w_m2);
  _valid_range(warnings, "clo", "input", clo, limits.clo);

  // Upstream computes, then masks every field (:423-446). Here a masked
  // result is returned without computing it, as the mask replaces every field
  // the kernel returns. So for clo 0, where the kernel's t_cl loop does not
  // end, the library returns upstream's NaN
  // (.scratch/v2-models/wave-2/decisions.md, D3 (i)).
  if (limit_inputs && warnings.length > 0) {
    return {
      ...(Object.fromEntries(
        _PHS_FIELDS.map((key) => [key, NaN]),
      ) as PhsFields),
      warnings,
    };
  }

  const output: PhsFields = _phs_kernel({
    tdb,
    tr,
    v,
    p_a,
    met: met_w_m2,
    clo,
    posture_code,
    drink,
    acclimatized: acclimatized_int,
    weight,
    wme: wme * met_to_w_m2,
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
    is_2023,
  });

  if (round_output) {
    // np.around(x, 1), and 2 for t_sk_t_cr_wg (:448-453): round is half to
    // even.
    for (const key of Object.keys(output) as (keyof PhsFields)[]) {
      output[key] = round(output[key], key === "t_sk_t_cr_wg" ? 2 : 1);
    }
  }

  return { ...output, warnings };
}

// Upstream's PHS fields, without the library's warnings rows, in PHS's order
// (classes_return.py:389-399).
type PhsFields = Omit<PhsResult, "warnings">;
const _PHS_FIELDS: readonly (keyof PhsFields)[] = [
  "t_re",
  "t_sk",
  "t_cr",
  "t_cr_eq",
  "t_sk_t_cr_wg",
  "d_lim_loss_50",
  "d_lim_loss_95",
  "d_lim_t_re",
  "sweat_loss_g",
  "sweat_rate_watt",
  "evap_load_wm2_min",
];

// Upstream's posture codes (models/phs.py:465-467).
const _POSTURE_CODES: Record<string, number> = {
  standing: 0,
  sitting: 1,
  crouching: 2,
};

// math.exp at import time in upstream (models/phs.py:459-461).
const const_t_eq = Math.exp(-1 / 10);
const const_t_sk = Math.exp(-1 / 3);
const const_sw = Math.exp(-1 / 10);

interface _PhsKernelInputs {
  tdb: number;
  tr: number;
  v: number;
  p_a: number;
  met: number;
  clo: number;
  posture_code: number;
  drink: number;
  acclimatized: number;
  weight: number;
  wme: number;
  i_mst: number;
  a_p: number;
  height: number;
  walk_sp: number;
  theta: number;
  duration: number;
  f_r: number;
  t_sk: number;
  t_cr: number;
  t_re: number;
  t_cr_eq: number;
  t_sk_t_cr_wg: number;
  evap_load_wm2_min: number;
  sweat_rate_watt: number;
  is_2023: boolean;
}

// Upstream's _phs_optimized_scalar (models/phs.py:528-829 at v4.6.2), line for
// line; met and wme in W/m2. Under numba its integer powers are
// multiplications (ADR 0009): `(x + 273) ** 4` is (y*y)*(y*y) and `x**2` is
// x*x, and its five float powers call pow, so Math.pow here. Math.exp can
// return a result one ulp from the exp upstream calls for the same argument
// (ADR 0009): exp(2.4911648034619542) is 12.07533332197454 here and
// 12.075333321974538 in pythermalcomfort 4.6.2. The convergence tests in the
// minute loop carry such a difference into the unrounded outputs: at tdb 25,
// tr 24.999, v 1.5, rh 90, met 0.9, clo 1, sitting, 7933-2004, limit_inputs
// false, t_sk_t_cr_wg is 0.2884163497945449 here and 0.28841635205858474
// upstream.
function _phs_kernel(inputs: _PhsKernelInputs): PhsFields {
  const {
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
    theta,
    duration,
    f_r,
    is_2023,
  } = inputs;
  let {
    walk_sp,
    t_sk,
    t_cr,
    t_re,
    t_cr_eq,
    t_sk_t_cr_wg,
    evap_load_wm2_min,
    sweat_rate_watt,
  } = inputs;

  // DuBois body surface area [m2]
  const a_dubois = 0.202 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
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
  if (is_2023) {
    // 2023 standard only has one d_max value
    d_max_50 = (drink === 0 ? 0.03 : 0.05) * weight * 1000;
    d_max_95 = (drink === 0 ? 0.03 : 0.05) * weight * 1000;
  } else {
    // maximum sweat rate grams to protect a mean subject [g]
    d_max_50 = 0.075 * weight * 1000;
    // maximum sweat rate grams to protect 95 % of the working population [g]
    d_max_95 = 0.05 * weight * 1000;
  }

  // def_dir = 1 for unidirectional walking, def_dir = 0 for omni-directional walking
  const def_dir = theta !== 0 ? 1 : 0;
  // Any walk_sp but 0 counts as walking, a negative one included, as upstream
  // (:582; ADR 0004 as amended).
  const def_speed = walk_sp === 0 ? 0 : 1;

  // radiating area dubois
  let a_r_du;
  if (posture_code === _POSTURE_CODES.standing) {
    a_r_du = 0.77;
  } else if (posture_code === _POSTURE_CODES.sitting) {
    a_r_du = 0.7;
  } else {
    a_r_du = 0.67;
  }

  // evaluation of the max sweat rate as a function of the metabolic rate
  let sw_max;
  if (!is_2023) {
    sw_max = (met - 32) * a_dubois;
    sw_max = Math.min(sw_max, 400);
    sw_max = Math.max(sw_max, 250);
    if (acclimatized === 100) {
      sw_max = sw_max * 1.25;
    }
  } else {
    sw_max = acclimatized === 0 ? 400 : 500;
  }

  // max skin wettedness
  const w_max = acclimatized === 0 ? 0.85 : 1;

  // static clothing insulation
  const i_cl_st = clo * 0.155;

  const fcl = is_2023 ? 1 + 0.28 * clo : 1 + 0.3 * clo;

  // Static boundary layer thermal insulation in quiet air
  const i_a_st = 0.111;

  // Total static insulation
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
    walk_sp = Math.min(walk_sp, 0.7);
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
  corr_cl = Math.min(corr_cl, 1);
  // correction for the dynamic total dry thermal insulation at 0 clo
  let corr_ia = Math.exp(
    (0.047 * v_r - 0.472) * v_r + (0.117 * w_a_ux - 0.342) * w_a_ux,
  );
  corr_ia = Math.min(corr_ia, 1);
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
  im_dyn = Math.min(im_dyn, 0.9);
  const r_t_dyn = i_tot_dyn / im_dyn / 16.7;
  const t_exp = 28.56 + 0.115 * tdb + 0.641 * p_a; // expired air temperature
  // respiratory convective heat flow [W/m2]
  const c_res = 0.001516 * met * (t_exp - tdb);
  // respiratory evaporative heat flow [W/m2]
  const e_res = 0.00127 * met * (59.34 + 0.53 * tdb - 11.63 * p_a);
  let z = 3.5 + 5.2 * v_r;
  if (v_r > 1) {
    z = 8.7 * Math.pow(v_r, 0.6);
  }

  // dynamic convective heat transfer coefficient. In 2023 it is computed once,
  // from t_cl = tr + 0.1, and not updated in the t_cl iteration below, as
  // upstream (:664-671, :724-732; ADR 0004 as amended).
  let hc_dyn;
  if (!is_2023) {
    hc_dyn = 2.38 * Math.pow(Math.abs(t_sk - tdb), 0.25);
  } else {
    const t_cl = tr + 0.1; // clothing surface temperature
    hc_dyn = 2.38 * Math.pow(Math.abs(t_cl - tdb), 0.25);
  }

  hc_dyn = Math.max(hc_dyn, z);

  const aux_r = 5.67e-8 * a_r_du;

  let f_cl_r;
  if (is_2023) {
    f_cl_r = (1 - a_p) * 0.97 + a_p * (1 - f_r);
  } else {
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

  const tr_k = tr + 273;
  const tr_k4 = tr_k * tr_k * (tr_k * tr_k);

  // range(1, duration + 1) (:692): for a fractional duration the last minute
  // is the integer part of duration, as here.
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
    if (time === 1 && is_2023) {
      // ISO 7933:2023 Annex E forces the skin temperature to its equilibrium
      // value on the first minute, removing the exponential lag for that step
      // (upstream's comment, :716-720).
      t_sk = t_sk_eq;
    }
    // Saturated water vapour pressure at the surface of the skin
    const p_sk = 0.6105 * Math.exp((17.27 * t_sk) / (t_sk + 237.3));
    let t_cl = tr + 0.1; // clothing surface temperature
    let h_r;
    while (true) {
      // radiative heat transfer coefficient
      const t_cl_k = t_cl + 273;
      h_r =
        (f_cl_r * aux_r * (t_cl_k * t_cl_k * (t_cl_k * t_cl_k) - tr_k4)) /
        (t_cl - tr);
      const t_cl_new =
        (fcl * (hc_dyn * tdb + h_r * tr) + t_sk / i_cl_dyn) /
        (fcl * (hc_dyn + h_r) + 1 / i_cl_dyn);
      if (Math.abs(t_cl - t_cl_new) <= 0.001) {
        break;
      }
      t_cl = (t_cl + t_cl_new) / 2;
    }

    const convection = fcl * hc_dyn * (t_cl - tdb);
    const radiation = fcl * h_r * (t_cl - tr);
    // maximum evaporative heat flow at the skin surface [W/m2]
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

      e_v_eff = Math.max(0.05, e_v_eff);

      sw_req = e_req / e_v_eff;
      sw_req = Math.min(sw_req, sw_max);
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
      const k = e_max / Math.max(sweat_rate_watt, EPSILON);
      let wp = 1;
      if (k >= 0.5) {
        wp = -k + Math.sqrt(k * k + 2);
      }
      wp = Math.min(wp, w_max);
      e_p = wp * e_max;
    }

    // body heat storage rate [W/m2]
    const d_storage = e_req - e_p + d_stored_eq;
    let t_cr_new = t_cr0;
    while (true) {
      t_sk_t_cr_wg = 0.3 - 0.09 * (t_cr_new - 36.8);
      t_sk_t_cr_wg = Math.min(t_sk_t_cr_wg, 0.3);
      t_sk_t_cr_wg = Math.max(t_sk_t_cr_wg, 0.1);
      t_cr =
        d_storage / sp_heat +
        (t_sk0 * t_sk_t_cr_wg0) / 2 -
        (t_sk * t_sk_t_cr_wg) / 2;
      t_cr = (t_cr + t_cr0 * (1 - t_sk_t_cr_wg0 / 2)) / (1 - t_sk_t_cr_wg / 2);
      if (Math.abs(t_cr - t_cr_new) <= 0.001) {
        break;
      }
      t_cr_new = (t_cr_new + t_cr) / 2;
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

  return {
    t_re,
    t_sk,
    t_cr,
    t_cr_eq,
    t_sk_t_cr_wg,
    d_lim_loss_50,
    d_lim_loss_95,
    d_lim_t_re,
    sweat_loss_g: sw_tot_g,
    sweat_rate_watt,
    evap_load_wm2_min,
  };
}

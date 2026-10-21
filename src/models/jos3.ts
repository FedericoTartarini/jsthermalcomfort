import * as math from "mathjs";
import { Default } from "../jos3_functions/Default.ts";
import { validate_body_parameters } from "../jos3_functions/validate_body_parameters.ts";
import { to_array_body_parts } from "../jos3_functions/to_array_body_parts.ts";
import type { JOS3BodyPartsInput } from "../jos3_functions/to_array_body_parts.ts";
import { pass_values_to_jos3_body_parts } from "../jos3_functions/pass_values_to_jos3_body_parts.ts";
import { bsa_rate } from "../jos3_functions/bsa_rate.ts";
import { local_bsa } from "../jos3_functions/local_bsa.ts";
import { bfb_rate } from "../jos3_functions/bfb_rate.ts";
import { conductance } from "../jos3_functions/conductance.ts";
import { capacity } from "../jos3_functions/capacity.ts";
import {
  INDEX,
  NUM_NODES,
  VINDEX,
  local_arr,
  vessel_blood_flow,
  whole_body,
} from "../jos3_functions/matrix.ts";
import type { JOS3LayerName } from "../jos3_functions/matrix.ts";
import { BODY_NAMES } from "../jos3_functions/_body_parts.ts";
import type {
  JOS3BodyPartName,
  JOS3BodyParts,
} from "../jos3_functions/_body_parts.ts";
import {
  dict_get,
  ewa,
  full,
  key_error,
  np_average,
  np_sum,
  py_type_name,
  take,
} from "../_internal/numpy.ts";
import { fixed_hc } from "../jos3_functions/thermoregulation/fixed_hc.ts";
import { conv_coef } from "../jos3_functions/thermoregulation/conv_coef.ts";
import { fixed_hr } from "../jos3_functions/thermoregulation/fixed_hr.ts";
import { rad_coef } from "../jos3_functions/thermoregulation/rad_coef.ts";
import type { JOS3Posture } from "../jos3_functions/thermoregulation/_posture.ts";
import { operative_temp } from "../jos3_functions/thermoregulation/operative_temp.ts";
import { dry_r } from "../jos3_functions/thermoregulation/dry_r.ts";
import { wet_r } from "../jos3_functions/thermoregulation/wet_r.ts";
import { evaporation } from "../jos3_functions/thermoregulation/evaporation.ts";
import { skin_blood_flow } from "../jos3_functions/thermoregulation/skin_blood_flow.ts";
import { ava_blood_flow } from "../jos3_functions/thermoregulation/ava_blood_flow.ts";
import {
  set_pre_shiv,
  shivering,
} from "../jos3_functions/thermoregulation/shivering.ts";
import { nonshivering } from "../jos3_functions/thermoregulation/nonshivering.ts";
import { basal_met } from "../jos3_functions/thermoregulation/basal_met.ts";
import type { JOS3BmrEquation } from "../jos3_functions/thermoregulation/basal_met.ts";
import { local_mbase } from "../jos3_functions/thermoregulation/local_mbase.ts";
import { local_q_work } from "../jos3_functions/thermoregulation/local_q_work.ts";
import { sum_m } from "../jos3_functions/thermoregulation/sum_m.ts";
import { cr_ms_fat_blood_flow } from "../jos3_functions/thermoregulation/cr_ms_fat_blood_flow.ts";
import { resp_heat_loss } from "../jos3_functions/thermoregulation/resp_heat_loss.ts";
import { sum_bf } from "../jos3_functions/thermoregulation/sum_bf.ts";
import { antoine } from "../psychrometrics/antoine.ts";
import { pmv_ppd_iso } from "./pmv_ppd_iso.ts";
import {
  assertNumber,
  met_to_w_m2,
  round,
  Standard,
  validateInputs,
} from "../utilities/utilities.js";
import { _check_params_object } from "../_internal/validation.ts";

// Upstream's JOS3Output (pythermalcomfort/classes_return.py:849-1033 at
// v4.6.2): the 59 fields of one step, in upstream's order. A type alias, so
// a value stays assignable to Record<string, unknown>. simulation_time is a
// datetime.timedelta upstream; JavaScript has none, so it is the elapsed
// time in seconds, as before (ADR 0001's first reason), equal to upstream's
// total_seconds() (see timedelta_us). The previous output had cycle_time and name, which
// upstream dropped, and returned per-segment values as arrays, a subset of
// the fields unless ex_output was "all" (jos3 D1).
/**
 * One step of the JOS-3 model, upstream's `JOS3Output`. A per-segment field
 * is a `JOS3BodyParts`, rounded to 2 decimals (`r_t` and `r_et` to 3); a
 * part the quantity does not have holds `null`.
 *
 * @typedef {Object} JOS3Output
 * @property {number} simulation_time - The elapsed simulation time [sec].
 * @property {number} dt - The time step [sec].
 * @property {number} t_skin_mean - Mean skin temperature of the whole body [°C].
 * @property {JOS3BodyParts} t_skin - Skin temperatures by the local body segments [°C].
 * @property {JOS3BodyParts} t_core - Core temperatures by the local body segments [°C].
 * @property {number} w_mean - Mean skin wettedness of the whole body [-].
 * @property {JOS3BodyParts} w - Skin wettedness on local body segments [-].
 * @property {number} weight_loss_by_evap_and_res - Weight loss by evaporation and respiration [g/sec].
 * @property {number} cardiac_output - Cardiac output [L/h].
 * @property {number} q_thermogenesis_total - Total thermogenesis [W].
 * @property {number} q_res - Heat loss by respiration [W].
 * @property {JOS3BodyParts} q_skin2env - Total heat loss from the skin to the environment [W].
 * @property {number} height - Body height [m].
 * @property {number} weight - Body weight [kg].
 * @property {JOS3BodyParts} bsa - Body surface area [m2].
 * @property {number} fat - Body fat rate [%].
 * @property {string} sex - Sex.
 * @property {number} age - Age [years].
 * @property {JOS3BodyParts} t_core_set - Core set point temperature [°C].
 * @property {JOS3BodyParts} t_skin_set - Skin set point temperature [°C].
 * @property {number} t_cb - Central blood temperature [°C].
 * @property {JOS3BodyParts} t_artery - Arterial blood temperature [°C].
 * @property {JOS3BodyParts} t_vein - Venous blood temperature [°C].
 * @property {JOS3BodyParts} t_superficial_vein - Superficial venous blood temperature [°C]: the 12 limb values, from left_shoulder to right_foot, held from head to left_thigh, as upstream holds them.
 * @property {JOS3BodyParts} t_muscle - Muscle temperature [°C], head and pelvis.
 * @property {JOS3BodyParts} t_fat - Fat temperature [°C], head and pelvis.
 * @property {JOS3BodyParts} to - Operative temperature [°C].
 * @property {JOS3BodyParts} r_t - Total clothing heat resistance [(m2*K)/W].
 * @property {JOS3BodyParts} r_et - Total clothing evaporative heat resistance [(m2*kPa)/W].
 * @property {JOS3BodyParts} tdb - Dry bulb air temperature [°C].
 * @property {JOS3BodyParts} tr - Mean radiant temperature [°C].
 * @property {JOS3BodyParts} rh - Relative humidity [%].
 * @property {JOS3BodyParts} v - Air velocity [m/s].
 * @property {number} par - Physical activity ratio.
 * @property {JOS3BodyParts} clo - Clothing insulation [clo].
 * @property {JOS3BodyParts} e_skin - Evaporative heat loss from the skin [W].
 * @property {JOS3BodyParts} e_max - Maximum evaporative heat loss from the skin [W].
 * @property {JOS3BodyParts} e_sweat - Evaporative heat loss from the skin by only sweating [W].
 * @property {JOS3BodyParts} bf_core - Core blood flow rate [L/h].
 * @property {JOS3BodyParts} bf_muscle - Muscle blood flow rate [L/h], head and pelvis.
 * @property {JOS3BodyParts} bf_fat - Fat blood flow rate [L/h], head and pelvis.
 * @property {JOS3BodyParts} bf_skin - Skin blood flow rate [L/h].
 * @property {number} bf_ava_hand - AVA blood flow rate of one hand [L/h].
 * @property {number} bf_ava_foot - AVA blood flow rate of one foot [L/h].
 * @property {JOS3BodyParts} q_bmr_core - Core thermogenesis by basal metabolism [W].
 * @property {JOS3BodyParts} q_bmr_muscle - Muscle thermogenesis by basal metabolism [W], head and pelvis.
 * @property {JOS3BodyParts} q_bmr_fat - Fat thermogenesis by basal metabolism [W], head and pelvis.
 * @property {JOS3BodyParts} q_bmr_skin - Skin thermogenesis by basal metabolism [W].
 * @property {JOS3BodyParts} q_work - Thermogenesis by work [W].
 * @property {JOS3BodyParts} q_shiv - Thermogenesis by shivering [W].
 * @property {JOS3BodyParts} q_nst - Thermogenesis by non-shivering [W].
 * @property {JOS3BodyParts} q_thermogenesis_core - Core total thermogenesis [W].
 * @property {JOS3BodyParts} q_thermogenesis_muscle - Muscle total thermogenesis [W], head and pelvis.
 * @property {JOS3BodyParts} q_thermogenesis_fat - Fat total thermogenesis [W], head and pelvis.
 * @property {JOS3BodyParts} q_thermogenesis_skin - Skin total thermogenesis [W].
 * @property {JOS3BodyParts} q_skin2env_sensible - Sensible heat loss from the skin to the environment [W].
 * @property {JOS3BodyParts} q_skin2env_latent - Latent heat loss from the skin to the environment [W].
 * @property {number} q_res_sensible - Sensible heat loss by respiration [W].
 * @property {number} q_res_latent - Latent heat loss by respiration [W].
 * @public
 */
export type JOS3Output = {
  simulation_time: number;
  dt: number;
  t_skin_mean: number;
  t_skin: JOS3BodyParts;
  t_core: JOS3BodyParts;
  w_mean: number;
  w: JOS3BodyParts;
  weight_loss_by_evap_and_res: number;
  cardiac_output: number;
  q_thermogenesis_total: number;
  q_res: number;
  q_skin2env: JOS3BodyParts;
  height: number;
  weight: number;
  bsa: JOS3BodyParts;
  fat: number;
  sex: string;
  age: number;
  t_core_set: JOS3BodyParts;
  t_skin_set: JOS3BodyParts;
  t_cb: number;
  t_artery: JOS3BodyParts;
  t_vein: JOS3BodyParts;
  t_superficial_vein: JOS3BodyParts;
  t_muscle: JOS3BodyParts;
  t_fat: JOS3BodyParts;
  to: JOS3BodyParts;
  r_t: JOS3BodyParts;
  r_et: JOS3BodyParts;
  tdb: JOS3BodyParts;
  tr: JOS3BodyParts;
  rh: JOS3BodyParts;
  v: JOS3BodyParts;
  par: number;
  clo: JOS3BodyParts;
  e_skin: JOS3BodyParts;
  e_max: JOS3BodyParts;
  e_sweat: JOS3BodyParts;
  bf_core: JOS3BodyParts;
  bf_muscle: JOS3BodyParts;
  bf_fat: JOS3BodyParts;
  bf_skin: JOS3BodyParts;
  bf_ava_hand: number;
  bf_ava_foot: number;
  q_bmr_core: JOS3BodyParts;
  q_bmr_muscle: JOS3BodyParts;
  q_bmr_fat: JOS3BodyParts;
  q_bmr_skin: JOS3BodyParts;
  q_work: JOS3BodyParts;
  q_shiv: JOS3BodyParts;
  q_nst: JOS3BodyParts;
  q_thermogenesis_core: JOS3BodyParts;
  q_thermogenesis_muscle: JOS3BodyParts;
  q_thermogenesis_fat: JOS3BodyParts;
  q_thermogenesis_skin: JOS3BodyParts;
  q_skin2env_sensible: JOS3BodyParts;
  q_skin2env_latent: JOS3BodyParts;
  q_res_sensible: number;
  q_res_latent: number;
};

// Upstream's results() returns a JOS3Output whose every field holds the
// series (jos3.py:1158-1203 at v4.6.2): one dataclass for both. TypeScript
// needs a second type for the arrays.
/**
 * Every step of the JOS-3 model, upstream's `results()`: each field of
 * `JOS3Output` as the series of its values, one per recorded step, and each
 * per-segment field as a `JOS3BodyParts` of series.
 *
 * @typedef {Object} JOS3OutputSeries
 * @public
 */
export type JOS3OutputSeries = {
  [K in keyof JOS3Output]: JOS3Output[K] extends JOS3BodyParts
    ? JOS3BodyParts<(number | null)[]>
    : JOS3Output[K][];
};

/**
 * The params of the `JOS3` constructor: upstream's keyword parameters, with
 * upstream's defaults (ADR 0002). Documented on the constructor.
 */
export interface JOS3Params {
  height?: number;
  weight?: number;
  fat?: number;
  age?: number;
  sex?: "male" | "female";
  ci?: number;
  bmr_equation?: JOS3BmrEquation;
  bsa_equation?: "dubois" | "takahira" | "fujimoto" | "kurazumi";
}

/** The options `JOS3` passes to its thermoregulation, upstream's `options`. */
export type JOS3Options = {
  nonshivering_thermogenesis: boolean;
  cold_acclimated: boolean;
  shivering_threshold: boolean;
  "limit_dshiv/dt": boolean | number;
  bat_positive: boolean;
  ava_zero: boolean;
  shivering: boolean;
};

// A non-finite number throws a TypeError here (ADR 0001, reason three):
// upstream's validate_body_parameters raises a ValueError for a NaN height,
// weight, age or fat, and computes with a NaN ci. A boolean, which upstream
// reads as 0 or 1, and a null throw a TypeError too: quantities are numbers
// (ADR 0005). sex, bmr_equation and bsa_equation are declared and left to
// upstream's own checks: sex is not checked, and any value but "male"
// computes as female (basal_met, shivering); bmr_equation raises from
// basal_met and bsa_equation from body_surface_area, as upstream.
const JOS3_SCHEMA = {
  height: { type: "number" },
  weight: { type: "number" },
  fat: { type: "number" },
  age: { type: "number" },
  sex: {},
  ci: { type: "number" },
  bmr_equation: {},
  bsa_equation: {},
};

// C's round(): half away from zero.
const c_round = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

/**
 * The whole microseconds of CPython's `timedelta(0, seconds)` for a float
 * `seconds`, as `accum` and `delta_new` compute them
 * (`Modules/_datetimemodule.c:2430-2502, :2577-2601` at CPython v3.12.12):
 * `modf` splits off the integer seconds, whose microseconds Python's
 * integers hold exactly, as a BigInt does here; the fraction times 1e6 is
 * split again, and its fractional part is rounded with C's `round`, a tie
 * going to the even total. A single `round(dtime * 1e6)` gave 600.0 s per
 * step for a dtime of 600.0000005, where upstream gives 600.000001 s.
 *
 * @param {number} seconds - the time delta [s], finite
 * @returns {bigint} its whole microseconds
 */
function timedelta_us(seconds: number): bigint {
  const int_s = Math.trunc(seconds);
  let us = BigInt(int_s) * 1000000n;
  const frac = seconds - int_s; // modf: exact
  if (frac === 0) return us;
  const scaled = 1e6 * frac; // one rounding, as C's dnum *= fracpart
  const int_us = Math.trunc(scaled);
  us += BigInt(int_us);
  const leftover = scaled - int_us; // exact
  if (leftover === 0) return us;
  let whole = c_round(leftover);
  if (Math.abs(whole - leftover) === 0.5) {
    // exactly halfway: round half to even against the microseconds so far
    const odd = us % 2n === 0n ? 0 : 1;
    whole = 2 * c_round((leftover + odd) * 0.5) - odd;
  }
  return us + BigInt(whole);
}

const US_PER_DAY = 86400000000n;

/**
 * CPython's range checks on a timedelta of `us` microseconds, which raise an
 * OverflowError, a RangeError here (ADR 0012 as amended, wave 2 D24), with
 * CPython's message. The days are the floor quotient of the microseconds
 * (`microseconds_to_delta_ex`, `Modules/_datetimemodule.c:1925-1977` at
 * CPython v3.12.12); days outside a C int fail `_PyLong_AsInt` (`:1969`), and
 * days beyond 999,999,999 in magnitude fail `check_delta_day_range`
 * (`MAX_DELTA_DAYS`, `:71`; `:436-444`). The days of the sum of two
 * timedeltas (`delta_add`, `:2155-2168`) stay within a C int (the comments
 * at `:66-70` and `:2161-2162`). Python 3.12 gives these messages for the
 * cases in
 * `.scratch/v2-models/wave-2/research/jos3/up_overflow_d24.py`.
 *
 * @param {bigint} us - the microseconds
 * @throws {RangeError} If the days are outside ±999,999,999.
 */
function check_delta_range(us: bigint): void {
  let days = us / US_PER_DAY; // truncates toward zero
  if (us % US_PER_DAY < 0n) days -= 1n;
  if (days < -(2n ** 31n) || days > 2n ** 31n - 1n) {
    throw new RangeError("Python int too large to convert to C int");
  }
  if (days < -999999999n || days > 999999999n) {
    throw new RangeError(`days=${days}; must have magnitude <= 999999999`);
  }
}

/**
 * `timedelta.total_seconds()`: the microseconds divided by 10**6 as Python
 * divides two integers (`delta_total_seconds`, `_datetimemodule.c:2720-2733`
 * at v3.12.12), rounded to the nearest double, a tie to even (Python 3.12
 * matched the exact quotient so rounded on 250,000 integers from 2^53 to
 * 2^67 in magnitude,
 * `.scratch/v2-models/wave-2/research/jos3/int_div_check.py`). Up to 2^53
 * microseconds both operands are doubles and `/` is that division; above,
 * the quotient is taken in BigInt with at least 55 bits and a sticky bit for
 * the remainder, so that `Number`'s rounding of it (to nearest, ties to
 * even) is the rounding of the exact quotient, for every count of
 * microseconds a timedelta can hold (below 2^67).
 *
 * @param {bigint} us - the microseconds
 * @returns {number} the seconds
 */
function total_seconds(us: bigint): number {
  const n = us < 0n ? -us : us;
  let s: number;
  if (n <= 2n ** 53n) {
    s = Number(n) / 1e6;
  } else {
    const k = 75 - n.toString(2).length; // 10**6 has 20 bits
    const scaled = n << BigInt(k);
    let q = scaled / 1000000n;
    if (scaled % 1000000n !== 0n) q |= 1n;
    s = Number(q) * 2 ** -k;
  }
  return us < 0n ? -s : s;
}

/**
 * `to_array_body_parts`, then ADR 0001's and ADR 0005's checks, which every
 * value a setter takes passes: a finite number. In pythermalcomfort 4.6.2 a
 * NaN or an infinity computes (NaN results), a boolean fills a boolean array
 * on which the next step raises a numpy UFuncTypeError, and None raises the
 * setter's ValueError; here each throws a TypeError at the setter, None
 * because a null quantity throws a TypeError whatever upstream does with
 * None (ADR 0005 as amended). A string or an array of another length raises upstream's
 * ValueError, an Error (ADR 0012), from `to_array_body_parts`.
 */
function to_17_finite(inp: JOS3BodyPartsInput, name: string): number[] {
  if (typeof inp === "boolean" || inp === null) {
    throw new TypeError(`Parameter "${name}" must be a valid finite number`);
  }
  const values = to_array_body_parts(inp);
  for (const value of values) assertNumber(value, name);
  return values;
}

// The JSDoc said the output "can be converted to a csv file using to_csv";
// the library has no to_csv, which writes files (jos3 D3), and the output is
// read with results() (jos3 D1, D2) or dict_results().
/**
 * JOS-3 model simulates human thermal physiology including skin
 * temperature, core temperature, sweating rate, etc. for the whole body and
 * 17 local body parts.
 *
 * This model was developed at Shin-ichi Tanabe Laboratory, Waseda University
 * and was derived from 65 Multi-Node model (https://doi.org/10.1016/S0378-7788(02)00014-2)
 * and JOS-2 model (https://doi.org/10.1016/j.buildenv.2013.04.013).
 *
 * To use this model, create an instance of the JOS3 class with optional body parameters
 * such as body height, weight, age, sex, etc.
 *
 * Environmental conditions such as air temperature, mean radiant temperature, air velocity, etc.
 * can be set using the setter methods. (ex. X.tdb, X.tr X.v)
 * If you want to set the different conditions in each body part, set them
 * as a 17 lengths of list, dictionary, or numpy array format.
 *
 * List or numpy array format input must be 17 lengths and means the order of "head", "neck", "chest",
 * "back", "pelvis", "left_shoulder", "left_arm", "left_hand", "right_shoulder", "right_arm",
 * "right_hand", "left_thigh", "left_leg", "left_foot", "right_thigh", "right_leg" and "right_foot".
 *
 * The model output includes local and mean skin temperature, local core temperature,
 * local and mean skin wettedness, and heat loss from the skin etc.
 * The model output can be accessed using "results()" or "dict_results()".
 * Each output parameter also can be accessed using getter methods.
 * (ex. X.t_skin, X.t_skin_mean, X.t_core)
 *
 * If you use this package, please cite us as follows and mention the version of pythermalcomfort used:
 * Y. Takahashi, A. Nomoto, S. Yoda, R. Hisayama, M. Ogata, Y. Ozeki, S. Tanabe,
 * Thermoregulation Model JOS-3 with New Open Source Code, Energy & Buildings (2020),
 * doi: https://doi.org/10.1016/j.enbuild.2020.110575
 *
 * Note: To maintain consistency in variable names for jsthermalcomfort and pythermalcomfort,
 * some variable names differ from those used in the original paper.
 *
 * @public
 * @memberof models
 * @docname JOS3
 *
 * @param {Object} [params] - the body parameters, named as in pythermalcomfort.
 * @param {number} [params.height=1.72] - body height, in [m]. In [0.5, 3.0].
 * @param {number} [params.weight=74.43] - body weight, in [kg]. In [20, 200].
 * @param {number} [params.fat=15] - fat percentage, in [%]. In [1, 90].
 * @param {number} [params.age=20] - age, in [years]. In [5, 100].
 * @param {"male" | "female"} [params.sex="male"] - sex.
 * @param {number} [params.ci=2.59] - Cardiac index, in [L/min/m2].
 * @param {"harris-benedict" | "harris-benedict_origin" | "japanese" | "ganpule"} [params.bmr_equation="harris-benedict"] - The equation used
 * to calculate basal metabolic rate (BMR).
 * @param {"dubois" | "fujimoto" | "kurazumi" | "takahira"} [params.bsa_equation="dubois"] - The equation used to calculate body
 * surface area (bsa).
 *
 * @throws {RangeError} For a height, weight, age or fat out of its range, with upstream's message.
 * @throws {TypeError} For a value that is not a finite number, and for a key the params do not declare.
 * @throws {Error} For an unknown bmr_equation or bsa_equation.
 *
 * @example
 * // Upstream's example (pythermalcomfort/models/jos3.py:248-370 at v4.6.2),
 * // without its pandas plot.
 * import { JOS3, jos3_functions } from "jsthermalcomfort";
 * const { local_clo_typical_ensembles } = jos3_functions.parameters;
 *
 * const model = new JOS3({ height: 1.7, weight: 60, fat: 20, age: 30, sex: "male", bmr_equation: "japanese", bsa_equation: "fujimoto" });
 * // Environmental parameters can be a number, 17 numbers, or an object keyed by body part.
 * model.tdb = 28; // Air temperature [°C]
 * model.tr = 30; // Mean radiant temperature [°C]
 * model.rh = 40; // Relative humidity [%]
 * // Air velocity [m/s]: head, neck, chest, back, pelvis, left shoulder, left arm, left hand,
 * // right shoulder, right arm, right hand, left thigh, left leg, left foot, right thigh, right leg, right foot
 * model.v = [0.2, 0.4, 0.4, 0.1, 0.1, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
 * model.clo = local_clo_typical_ensembles["briefs, socks, undershirt, work jacket, work pants, safety shoes"].local_body_part;
 * model.par = 1.2; // Physical activity ratio [-], assuming a sitting position
 * model.posture = "sitting"; // 0 = "standing", 1 = "sitting", 2 = "lying"
 * model.simulate(30, 60); // 30 steps of 60 s: 30 min
 * // Set the next condition: only the parameters that change
 * model.to = 20; // Operative temperature [°C]
 * model.v = { head: 0.2, neck: 0.4, chest: 0.4, back: 0.1, pelvis: 0.1, left_shoulder: 0.4, left_arm: 0.4, left_hand: 0.4, right_shoulder: 0.4, right_arm: 0.4, right_hand: 0.4, left_thigh: 0.1, left_leg: 0.1, left_foot: 0.1, right_thigh: 0.1, right_leg: 0.1, right_foot: 0.1 }; // a desk fan
 * model.simulate(60, 60); // 60 more min
 * model.tdb = 30; // Air temperature [°C]
 * model.tr = 35; // Mean radiant temperature [°C]
 * model.simulate(30, 60); // 30 more min
 *
 * const results = model.results();
 * console.log(results.t_skin_mean); // the mean skin temperature at every step
 * console.log(results.t_skin.head); // the skin temperature of the head at every step
 */
export class JOS3 {
  // Upstream's public attributes (jos3.py:476-512 at v4.6.2), renamed from
  // setpt_cr and setpt_sk with no alias (ADR 0010).
  /** Core set-point temperatures of the 17 body parts [°C]. */
  cr_set_point: number[];
  /** Skin set-point temperatures of the 17 body parts [°C]. */
  sk_set_point: number[];
  /** Extra heat gain of each node [W]. */
  ex_q: number[];
  /** The model name, "JOS3". */
  model_name: string;
  /** The thermoregulation options. */
  options: JOS3Options;
  /** A convective heat transfer coefficient that replaces the computed one when set [W/(m2*K)]. */
  _hc: number[] | null;
  /** A radiative heat transfer coefficient that replaces the computed one when set [W/(m2*K)]. */
  _hr: number[] | null;

  _height: number;
  _weight: number;
  _fat: number;
  _sex: string;
  _age: number;
  _ci: number;
  _bmr_equation: JOS3BmrEquation;
  _bsa_equation: string;
  _bsa_rate: number;
  _bsa: number[];
  _bfb_rate: number;
  _cdt: number[][];
  _cap: number[];
  _t_body: number[];
  _tdb: number[];
  _tr: number[];
  _rh: number[];
  _v: number[];
  _clo: number[];
  _iclo: number[];
  _par: number;
  _posture: JOS3Posture;
  // Upstream's elapsed time is a datetime.timedelta (jos3.py:500), whole
  // microseconds in Python's integers; it is kept here as a BigInt count of
  // microseconds (timedelta_us), simulation_time its total_seconds().
  _time_us: bigint;
  _history: JOS3Output[];

  // jos3 D1: ex_output is gone, as upstream has none (jos3.py:372-382). The
  // bsa_equation type said "kruazumi"; the formula is "kurazumi"
  // (utilities.py:66 at v4.6.2).
  // ADR 0002: one params object keyed like upstream's keyword arguments. Its
  // @param lines are on the class's JSDoc: documentation.js does not nest the
  // params.* lines of a constructor's.
  /**
   * Initialize a new instance of JOS3 class, which is designed to model
   * and simulate various physiological parameters related to human
   * thermoregulation.
   *
   * This class uses mathematical models to calculate and predict
   * body temperature, basal metabolic rate, body surface area, and
   * other related parameters. Its parameters are documented on the class.
   */
  constructor(params?: JOS3Params) {
    // JOS3() takes every default, as upstream's does.
    if (params === undefined) params = {};
    _check_params_object(params, "JOS3", JOS3_SCHEMA);
    // Destructuring defaults also apply to a default passed as undefined.
    const {
      height = Default.height,
      weight = Default.weight,
      fat = Default.body_fat,
      age = Default.age,
      sex = Default.sex,
      ci = Default.cardiac_index,
      bmr_equation = Default.bmr_equation as JOS3BmrEquation,
      bsa_equation = Default.bsa_equation,
    } = params;
    validateInputs({ height, weight, fat, age, ci }, JOS3_SCHEMA);

    // validate body parameters
    validate_body_parameters(height, weight, age, fat);

    // Initialize basic attributes
    this._height = height;
    this._weight = weight;
    this._fat = fat;
    this._sex = sex;
    this._age = age;
    this._ci = ci;
    this._bmr_equation = bmr_equation;
    this._bsa_equation = bsa_equation;

    // Calculate body surface area (bsa) rate
    this._bsa_rate = bsa_rate(height, weight, bsa_equation);

    // Calculate local body surface area
    this._bsa = local_bsa(height, weight, bsa_equation);

    // Calculate basal blood flow (BFB) rate [-]
    this._bfb_rate = bfb_rate(height, weight, bsa_equation, age, ci);

    // Calculate thermal conductance (CDT) [W/K]
    this._cdt = conductance(height, weight, bsa_equation, fat);

    // Calculate thermal capacity [J/K]
    this._cap = capacity(height, weight, bsa_equation, age, ci);

    // Set initial core and skin temperature set points [°C]
    this.cr_set_point = full(Default.num_body_parts, Default.core_temperature);
    this.sk_set_point = full(Default.num_body_parts, Default.skin_temperature);

    // Initialize body temperature [°C]
    this._t_body = full(NUM_NODES, Default.other_body_temperature);

    // Initialize environmental conditions and other factors
    // (Default values of input conditions)
    this._tdb = full(Default.num_body_parts, Default.dry_bulb_air_temperature);
    this._tr = full(Default.num_body_parts, Default.mean_radiant_temperature);
    this._rh = full(Default.num_body_parts, Default.relative_humidity);
    this._v = full(Default.num_body_parts, Default.air_speed);
    this._clo = full(Default.num_body_parts, Default.clothing_insulation);
    this._iclo = full(
      Default.num_body_parts,
      Default.clothing_vapor_permeation_efficiency,
    );
    this._par = Default.physical_activity_ratio;
    this._posture = Default.posture as JOS3Posture;
    this._hc = null; // Convective heat transfer coefficient
    this._hr = null; // Radiative heat transfer coefficient
    this.ex_q = full(NUM_NODES, 0); // External heat gain
    this._time_us = 0n; // Elapsed time
    this.model_name = "JOS3"; // Model name
    this.options = {
      nonshivering_thermogenesis: true,
      cold_acclimated: false,
      shivering_threshold: false,
      "limit_dshiv/dt": false,
      bat_positive: false,
      ava_zero: false,
      shivering: false,
    };

    // Set shivering threshold = 0
    set_pre_shiv(0);

    // Initialize history to store model parameters
    this._history = [];

    // Reset set-point temperature and save the last model parameters
    const dict_results = this._reset_setpt();
    this._history.push(dict_results);
  }

  // Upstream calls pmv_ppd_iso with ISO 7730-2025 and limit_inputs=False, and
  // retries with a larger step when the PMV is NaN (jos3.py:528-612 at
  // v4.6.2, upstream #435), so a body whose neutral temperature is above
  // ISO 7730's 30 °C limit gets set points. This used the legacy pmv, whose
  // limit_inputs masked the PMV to NaN there, and failed. The PMV is rounded
  // to 2 decimals, as upstream's round_output defaults to True.
  /**
   * Calculate operative temperature [°C] when PMV=0, with NaN handling and
   * retry logic. The search is not restricted to ISO 7730's comfort
   * applicability limits, which can exclude low metabolic rates.
   *
   * @private
   *
   * @param {number} v - Air velocity [m/s].
   * @param {number} rh - Relative humidity [%].
   * @param {number} met - Metabolic rate [met].
   * @param {number} clo - Clothing insulation [clo].
   *
   * @returns {number} Operative temperature [°C].
   */
  _calculate_operative_temp_when_pmv_is_zero(
    v: number,
    rh: number,
    met: number,
    clo: number,
  ): number {
    // Default parameters
    const initial_to = 28;
    const tolerance = 0.001;
    const max_iterations = 100;
    let adjustment_factor = 3;
    const retry_adjustment_factor = adjustment_factor * 200;
    const retry_attempts = 100;

    const pmv_at = (to: number) =>
      pmv_ppd_iso({
        tdb: to,
        tr: to,
        vr: v,
        rh,
        met,
        clo,
        standard: Standard.iso_7730_2025,
        limit_inputs: false,
      }).pmv;

    let to = initial_to;

    // Main loop for finding PMV=0
    for (let i = 0; i < max_iterations; i++) {
      let pmv_value = pmv_at(to);

      // Check for NaN and handle retries
      if (Number.isNaN(pmv_value)) {
        for (let retry = 0; retry < retry_attempts; retry++) {
          adjustment_factor = retry_adjustment_factor;
          to = initial_to; // Reset to initial temperature for retry
          pmv_value = pmv_at(to);

          if (Math.abs(pmv_value) < tolerance) {
            return to;
          }

          // Adjust the temperature during retry
          to = to - pmv_value / adjustment_factor;
        }
        // If retries fail, log a warning and stop the loop
        return to;
      }

      // Check if the PMV is within tolerance
      if (Math.abs(pmv_value) < tolerance) {
        return to;
      }

      // Adjust the operative temperature using the adjustment factor
      to = to - pmv_value / adjustment_factor;
    }
    return to;
  }

  // Upstream's _reset_setpt takes no parameter (jos3.py:615); this one took
  // par.
  /**
   * Reset set-point temperatures under steady state conditions, for a nude
   * person in a reference environment, of 50% RH, 0.1 m/s air velocity, and
   * par=1.25.
   *
   * Set-point temperatures are hypothetical core or skin temperatures in a thermally neutral state
   * when at rest (similar to room set-point temperature for air conditioning).
   * This function is used during initialization to calculate the set-point temperatures as a reference for thermoregulation.
   * Be careful, input parameters (tdb, tr, rh, v, clo, par) and body temperatures are also reset.
   *
   * @private
   *
   * @returns {JOS3Output} The last step of the steady-state calculation.
   */
  _reset_setpt(): JOS3Output {
    // Set operative temperature under PMV=0 environment
    const par = 1.25; // Physical activity ratio
    const met = (this.bmr * par) / met_to_w_m2; // [met]
    const rh = 50;
    const v = 0.1;
    const clo = 0;
    this.to = this._calculate_operative_temp_when_pmv_is_zero(v, rh, met, clo);
    this.rh = rh;
    this.v = v;
    this.clo = clo;
    this.par = par; // Physical activity ratio

    // Steady-calculation
    this.options.ava_zero = true;
    let dict_out!: JOS3Output;
    for (let i = 0; i < 10; i++) {
      dict_out = this._run(60000, true);
    }

    // Set new set-point temperatures for core and skin
    this.cr_set_point = this.t_core;
    this.sk_set_point = this.t_skin;
    this.options.ava_zero = false;

    return dict_out;
  }

  /**
   * Run the JOS-3 model simulation for a number of steps, recording each
   * step's output.
   *
   * @param {number} times - Number of loops of the simulation, an integer.
   * @param {number} [dtime=60] - Time delta in seconds for each simulation step.
   * @param {boolean} [output=true] - If true, records the parameters at each simulation step.
   *
   * @throws {TypeError} If times is not an integer, as Python's range raises
   * (a boolean too, which range reads as 0 or 1: ADR 0005), or dtime is not
   * a finite number (ADR 0001); if `options` lacks a key the step reads, as
   * upstream raises a KeyError (ADR 0012 as amended), or its
   * `limit_dshiv/dt` is truthy and neither true nor a number.
   * @throws {RangeError} If t_body has fewer than NUM_NODES values, as numpy
   * raises an IndexError (ADR 0012 as amended); if dtime, or the elapsed time
   * after adding it, is outside Python's timedelta range (from -999,999,999
   * days to 999,999,999 days 23:59:59.999999), as Python's timedelta raises
   * an OverflowError (ADR 0012 as amended), before that step runs.
   * @throws {Error} If t_body has more than NUM_NODES values, as numpy's
   * broadcasting raises a ValueError.
   */
  simulate(times: number, dtime: number = 60, output: boolean = true): void {
    // wave 2 D7 (a): a whole number such as 2.0 runs, where Python's range
    // raises a TypeError for the float 2.0 ("'float' object cannot be
    // interpreted as an integer"): a JavaScript number has no int/float
    // distinction (ADR 0001's first reason, as amended).
    if (typeof times !== "number" || !Number.isInteger(times)) {
      throw new TypeError(
        `'${py_type_name(times)}' object cannot be interpreted as an integer`,
      );
    }
    assertNumber(dtime, "dtime");
    // Loop through the simulation for the given number of times
    for (let i = 0; i < times; i++) {
      // Increment the elapsed time by the time delta, timedelta(0, dtime).
      // Each timedelta upstream builds, dtime's and then the sum, is range
      // checked before the step runs, so a RangeError leaves the elapsed time
      // and the recorded steps as they were, as upstream's OverflowError
      // does (wave 2 D24).
      const step_us = timedelta_us(dtime);
      check_delta_range(step_us);
      const time_us = this._time_us + step_us;
      check_delta_range(time_us);
      this._time_us = time_us;

      // Execute the simulation step
      const dict_data = this._run(dtime, false, output);

      // If output is True, append the results to the history. output is read
      // for JavaScript's truth value (ADR 0001 as amended): NaN is true in
      // Python and false here, and an empty array or object false in Python
      // and true here.
      if (output) {
        this._history.push(dict_data);
      }
    }
  }

  /**
   * Run a single cycle of the JOS-3 model simulation
   * (`pythermalcomfort/models/jos3.py:715-1156` at v4.6.2).
   *
   * This method calculates various thermoregulation parameters using the input data,
   * such as convective and radiative heat transfer coefficients, operative temperature,
   * heat resistance, and blood flow rates. It also computes thermogenesis by shivering
   * and non-shivering, basal thermogenesis, and thermogenesis by work. The function
   * constructs and solves matrices to determine the new body temperature distribution.
   *
   * @private
   *
   * @param {number} [dtime=60] - Time step in seconds for the simulation.
   * @param {boolean} [passive=false] - If true, the set-point temperature for thermoregulation is set to the current
   * body temperature, simulating a passive model.
   * @param {boolean} [output=true] - Unused, as upstream's: the step's output is always returned.
   *
   * @returns {JOS3Output} The step's output.
   */
  _run(dtime = 60, passive = false, output = true): JOS3Output {
    // Get core and skin temperatures
    const tcr = this.t_core;
    const tsk = this.t_skin;

    // Convective and radiative heat transfer coefficients [W/(m2*K)]
    let hc = fixed_hc(
      conv_coef(this._posture, this._v, this._tdb, tsk),
      this._v,
    );
    let hr = fixed_hr(rad_coef(this._posture));

    // Manually set convective and radiative heat transfer coefficients if necessary
    if (this._hc !== null) {
      hc = this._hc;
    }
    if (this._hr !== null) {
      hr = this._hr;
    }

    // Compute operative temp. [°C], clothing heat and evaporative resistance [m2.K/W], [m2.kPa/W]
    // Operative temp. [°C]
    const to = operative_temp(this._tdb, this._tr, hc, hr);
    // Clothing heat resistance [m2.K/W]
    const r_t = dry_r(hc, hr, this._clo);
    // Clothing evaporative resistance [m2.kPa/W]
    const r_et = wet_r(hc, this._clo, this._iclo, 16.5);

    // ------------------------------------------------------------------
    // Thermoregulation
    // 1) Sweating
    // 2) Vasoconstriction, Vasodilation
    // 3) Shivering and non-shivering thermogenesis
    // ------------------------------------------------------------------

    // set-point temperature for thermoregulation
    const setpt_cr = passive ? tcr.slice() : this.cr_set_point.slice();
    const setpt_sk = passive ? tsk.slice() : this.sk_set_point.slice();

    // Error signal = Difference between set-point and body temperatures
    const err_cr = tcr.map((x, i) => x - setpt_cr[i]);
    const err_sk = tsk.map((x, i) => x - setpt_sk[i]);

    // SWEATING THERMOREGULATION
    // Skin wettedness [-], e_skin, e_max, e_sweat [W]
    const [wet, e_sk, e_max, e_sweat] = evaporation(
      err_cr,
      err_sk,
      tsk,
      this._tdb,
      this._rh,
      r_et,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
    );

    // VASOCONSTRICTION, VASODILATION
    // Calculate skin blood flow and basal skin blood flow [L/h]
    const bf_skin = skin_blood_flow(
      err_cr,
      err_sk,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._ci,
    );

    // Calculate hands and feet's AVA blood flow [L/h]
    let [bf_ava_hand, bf_ava_foot] = ava_blood_flow(
      err_cr,
      err_sk,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._ci,
    );
    // Upstream reads options["ava_zero"] whatever passive is (jos3.py:849
    // at v4.6.2), so a missing key raises its KeyError here, a TypeError
    // (ADR 0012 as amended; wave 2 D6). The option is read for JavaScript's
    // truth value (ADR 0001 as amended): NaN is true in Python and false
    // here, and an empty array or object false in Python and true here.
    const ava_zero = dict_get(this.options, "ava_zero");
    if (ava_zero && passive) {
      bf_ava_hand = 0;
      bf_ava_foot = 0;
    }

    // SHIVERING AND NON-SHIVERING
    // Calculate shivering thermogenesis [W]
    const q_shiv = shivering(
      err_cr,
      err_sk,
      tcr,
      tsk,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._sex,
      dtime,
      this.options,
    );

    // Calculate non-shivering thermogenesis (NST) [W]. Upstream reads
    // nonshivering_thermogenesis, then cold_acclimated and bat_positive only
    // when it is true (jos3.py:870, :877-878 at v4.6.2): a missing key
    // raises its KeyError there, a TypeError here (ADR 0012 as amended;
    // wave 2 D6). Each is read for JavaScript's truth value (ADR 0001 as
    // amended): NaN is true in Python and false here, and an empty array or
    // object false in Python and true here.
    const q_nst = dict_get(this.options, "nonshivering_thermogenesis")
      ? nonshivering(
          err_sk,
          this._height,
          this._weight,
          this._bsa_equation,
          this._age,
          dict_get(this.options, "cold_acclimated") as boolean,
          dict_get(this.options, "bat_positive") as boolean,
        )
      : full(Default.num_body_parts, 0); // not consider NST

    // ------------------------------------------------------------------
    // Thermogenesis
    // ------------------------------------------------------------------

    // Calculate local basal metabolic rate (BMR) [W]
    const q_bmr_local = local_mbase(
      this._height,
      this._weight,
      this._age,
      this._sex,
      this._bmr_equation,
    );
    // Calculate overall basal metabolic rate (BMR) [W]: Python's sum, from
    // 0, of the four numpy sums
    let q_bmr_total = 0;
    for (const m of q_bmr_local) q_bmr_total += np_sum(m);

    // Calculate thermogenesis by work [W]
    const q_work = local_q_work(q_bmr_total, this._par);

    // Calculate the sum of thermogenesis in core, muscle, fat, skin [W]
    const [
      q_thermogenesis_core,
      q_thermogenesis_muscle,
      q_thermogenesis_fat,
      q_thermogenesis_skin,
    ] = sum_m(q_bmr_local, q_work, q_shiv, q_nst);
    const q_thermogenesis_total =
      np_sum(q_thermogenesis_core) +
      np_sum(q_thermogenesis_muscle) +
      np_sum(q_thermogenesis_fat) +
      np_sum(q_thermogenesis_skin);

    // ------------------------------------------------------------------
    // Others
    // ------------------------------------------------------------------
    // Calculate blood flow in core, muscle, fat [L/h]
    const [bf_core, bf_muscle, bf_fat] = cr_ms_fat_blood_flow(
      q_work,
      q_shiv,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
      this._ci,
    );

    // Calculate heat loss by respiratory
    const p_a = antoine(this._tdb).map((a, i) => (a * this._rh[i]) / 100);
    const [res_sh, res_lh] = resp_heat_loss(
      this._tdb[0],
      p_a[0],
      q_thermogenesis_total,
    );

    // Calculate sensible heat loss [W]
    const shl_sk = tsk.map((t, i) => ((t - to[i]) / r_t[i]) * this._bsa[i]);

    // Calculate cardiac output [L/h]
    const co = sum_bf(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );

    // Calculate weight loss rate by evaporation [g/sec]
    const wlesk = e_sweat.map((s, i) => (s + 0.06 * e_max[i]) / 2418);
    const wleres = res_lh / 2418;

    // ------------------------------------------------------------------
    // Matrix
    // This code section is focused on constructing and calculating
    // various matrices required for modeling the thermoregulation
    // of the human body.
    // Since JOS-3 has 85 thermal nodes, the determinant of 85*85 is to be solved.
    // ------------------------------------------------------------------

    // Matrix A = Matrix for heat exchange due to blood flow and conduction occurring between tissues
    // (85, 85,) ndarray
    const [bf_art, bf_vein] = vessel_blood_flow(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );
    const bf_local = local_arr(
      bf_core,
      bf_muscle,
      bf_fat,
      bf_skin,
      bf_ava_hand,
      bf_ava_foot,
    );
    const bf_whole = whole_body(bf_art, bf_vein, bf_ava_hand, bf_ava_foot);

    // arr_bf = zeros + bf_local + bf_whole, divided by the heat capacity
    // ([W/K] to [/sec]) and multiplied by the time step ([/sec] to [-]),
    // and arr_cdt the same, in upstream's order of operations.
    const arr_bf = bf_local.map((row, i) =>
      row.map((x, j) => ((0 + x + bf_whole[i][j]) / this._cap[i]) * dtime),
    );
    const arr_cdt = this._cdt.map((row, i) =>
      row.map((x) => (x / this._cap[i]) * dtime),
    );

    // Matrix B = Matrix for heat transfer between skin and environment
    const arr_b = full(NUM_NODES, 0);
    INDEX.skin.forEach((node, k) => {
      arr_b[node] += (1 / r_t[k]) * this._bsa[k];
    });
    for (let i = 0; i < NUM_NODES; i++) {
      arr_b[i] = (arr_b[i] / this._cap[i]) * dtime; // [W/K] to [/sec] to [-]
    }

    // The off-diagonal and diagonal elements of the matrix A, which
    // represents the heat transfer coefficients between different parts of
    // the body, combined to form the full matrix A, and its inverse.
    const arr_sum = arr_cdt.map((row, i) =>
      row.map((x, j) => x + arr_bf[i][j]),
    );
    const arr_a_dia = arr_sum.map((row, i) => np_sum(row) + arr_b[i]);
    const arr_a = arr_sum.map((row, i) =>
      row.map((x, j) => -x + (i === j ? arr_a_dia[i] + 1 : 0)),
    );
    // np.linalg.inv stays mathjs's inv (ADR 0014). Upstream's LAPACK inverse
    // and its BLAS product below sum in other orders, so the body
    // temperatures differ from upstream's in the last bits: in 568 of the 570
    // simulations of ticket 25's spec-verifier sweep (seed 7351020; the other
    // 2 diverge or are ill-conditioned), by up to 5.4e-11 °C in t_body and
    // 8.3e-10 in w. A rounded output differs where its unrounded value is
    // that close to a rounding tie: in that sweep, 4 of 3,666,954 rounded
    // values, `to` at 12.875 and 18.125, round the other way.
    const arr_a_inv = math.inv(arr_a);

    // Matrix Q = Matrix for heat generation rate from thermogenesis, respiratory, sweating,
    // and extra heat gain processes in different body parts.
    // Matrix Q [W] / [J/K] * [sec] = [-]
    // Thermogensis
    const arr_q = full(NUM_NODES, 0);
    INDEX.core.forEach((node, k) => (arr_q[node] += q_thermogenesis_core[k]));
    INDEX.muscle.forEach(
      (node, k) => (arr_q[node] += q_thermogenesis_muscle[VINDEX.muscle[k]]),
    );
    INDEX.fat.forEach(
      (node, k) => (arr_q[node] += q_thermogenesis_fat[VINDEX.fat[k]]),
    );
    INDEX.skin.forEach((node, k) => (arr_q[node] += q_thermogenesis_skin[k]));

    // Respiratory [W]
    arr_q[INDEX.core[2]] -= res_sh + res_lh; // chest core

    // Sweating [W]
    INDEX.skin.forEach((node, k) => (arr_q[node] -= e_sk[k]));

    // Extra heat gain [W], then [W]/[J/K] to [K/sec] to [K]
    for (let i = 0; i < NUM_NODES; i++) {
      arr_q[i] = ((arr_q[i] + this.ex_q[i]) / this._cap[i]) * dtime;
    }

    // Boundary batrix [°C]
    const arr_to = full(NUM_NODES, 0);
    INDEX.skin.forEach((node, k) => (arr_to[node] += to[k]));

    // Combines the current body temperature, the boundary matrix, and the heat generation matrix
    // to calculate the new body temperature distribution (arr).
    // A t_body of more than NUM_NODES values fails numpy's broadcasting, a
    // ValueError upstream (jos3.py:1061 at v4.6.2), an Error here (ADR 0012).
    const arr = ewa(
      (t, bt) => t + bt,
      this._t_body,
      arr_b.map((b, i) => b * arr_to[i]),
    ).map((x, i) => x + arr_q[i]);

    // ------------------------------------------------------------------
    // New body temp. [°C]
    // ------------------------------------------------------------------
    this._t_body = math.multiply(arr_a_inv, arr) as number[];

    // ------------------------------------------------------------------
    // Output parameters
    // ------------------------------------------------------------------
    // ADR 0014: np.round is the utilities' half-to-even round, and so is
    // Python's round on a numpy float, which numpy 2.5.4 computes as np.round
    // (equal on 500,000 values, roundcheck.py in the ticket 25 scratchpad).
    // t_cb is a Python float, whose builtin round the same round stands in
    // for, as ADR 0014 lets it in sports_heat_stress_risk; no t_cb differed in
    // ticket 25's sweep.
    const muscle_parts = ["head", "pelvis"] as const;
    const vmuscle = (a: readonly number[]) => VINDEX.muscle.map((i) => a[i]);
    const vfat = (a: readonly number[]) => VINDEX.fat.map((i) => a[i]);
    const parts = pass_values_to_jos3_body_parts;
    return {
      simulation_time: total_seconds(this._time_us),
      dt: dtime,
      t_skin_mean: round(this.t_skin_mean, 2),
      t_skin: parts(this.t_skin),
      t_core: parts(this.t_core),
      w_mean: round(np_average(wet, Default.local_bsa), 2),
      w: parts(wet),
      weight_loss_by_evap_and_res: round(np_sum(wlesk) + wleres, 5),
      cardiac_output: round(co, 1),
      q_thermogenesis_total: round(q_thermogenesis_total, 2),
      q_res: round(res_sh + res_lh, 2),
      q_skin2env: parts(shl_sk.map((x, i) => x + e_sk[i])),
      height: this._height,
      weight: this._weight,
      bsa: parts(this._bsa),
      fat: this._fat,
      sex: this._sex,
      age: this._age,
      t_core_set: parts(setpt_cr),
      t_skin_set: parts(setpt_sk),
      t_cb: round(this.t_cb, 2),
      t_artery: parts(this.t_artery),
      t_vein: parts(this.t_vein),
      // ADR 0004 as amended: upstream's labels. The 12 limb values fill the
      // first 12 parts, head to left_thigh, and the last 5 hold null
      // (jos3.py:1096), as upstream's do.
      t_superficial_vein: parts(this.t_superficial_vein),
      t_muscle: parts(this.t_muscle, 2, muscle_parts),
      t_fat: parts(this.t_fat, 2, muscle_parts),
      to: parts(to),
      r_t: parts(r_t, 3),
      r_et: parts(r_et, 3),
      tdb: parts(this._tdb),
      tr: parts(this._tr),
      rh: parts(this._rh),
      v: parts(this._v),
      par: this._par,
      clo: parts(this._clo),
      e_skin: parts(e_sk),
      e_max: parts(e_max),
      e_sweat: parts(e_sweat),
      bf_core: parts(bf_core),
      bf_muscle: parts(vmuscle(bf_muscle), 2, muscle_parts),
      bf_fat: parts(vfat(bf_fat), 2, muscle_parts),
      bf_skin: parts(bf_skin),
      bf_ava_hand: round(bf_ava_hand, 2),
      bf_ava_foot: round(bf_ava_foot, 2),
      q_bmr_core: parts(q_bmr_local[0]),
      q_bmr_muscle: parts(vmuscle(q_bmr_local[1]), 2, muscle_parts),
      q_bmr_fat: parts(vfat(q_bmr_local[2]), 2, muscle_parts),
      q_bmr_skin: parts(q_bmr_local[3]),
      q_work: parts(q_work),
      q_shiv: parts(q_shiv),
      q_nst: parts(q_nst),
      q_thermogenesis_core: parts(q_thermogenesis_core),
      q_thermogenesis_muscle: parts(
        vmuscle(q_thermogenesis_muscle),
        2,
        muscle_parts,
      ),
      q_thermogenesis_fat: parts(vfat(q_thermogenesis_fat), 2, muscle_parts),
      q_thermogenesis_skin: parts(q_thermogenesis_skin),
      q_skin2env_sensible: parts(shl_sk),
      q_skin2env_latent: parts(e_sk),
      q_res_sensible: round(res_sh, 2),
      q_res_latent: round(res_lh, 2),
    };
  }

  // jos3 D2: a method, as upstream's (jos3.py:1158-1203), where this was a
  // getter that returned dict_results().
  /**
   * Consolidate the results into a single object. This makes it very easy
   * to access the time series data for each parameter.
   *
   * @returns {JOS3OutputSeries} each field of the output as the series of
   * its values, one per recorded step; a per-segment field as one series per
   * body part.
   */
  results(): JOS3OutputSeries {
    const merged: Record<string, unknown[] | Record<string, unknown[]>> = {};
    for (const output of this._history) {
      for (const [field, value] of Object.entries(output)) {
        if (typeof value === "object" && value !== null) {
          const series = (merged[field] ??= Object.fromEntries(
            BODY_NAMES.map((name) => [name, []]),
          )) as Record<string, unknown[]>;
          for (const name of BODY_NAMES) {
            series[name].push((value as JOS3BodyParts)[name]);
          }
        } else {
          ((merged[field] ??= []) as unknown[]).push(value);
        }
      }
    }
    return merged as unknown as JOS3OutputSeries;
  }

  /**
   * Get simulation results as an object keyed by column
   * (`pythermalcomfort/models/jos3.py:1205-1311` at v4.6.2).
   *
   * Each key is a parameter name, with the body part name as a suffix for a
   * per-segment parameter, and each value the series of that column. As
   * upstream, `t_muscle`, `t_fat` and the other muscle and fat parameters
   * have head and pelvis columns only, and `t_superficial_vein` has a column
   * for each of the 17 parts, the last 5 null (jos3 D4).
   *
   * @returns {Record<string, (number | string | null)[]> | null} the columns,
   * or null when the model has no data
   */
  dict_results(): Record<string, (number | string | null)[]> | null {
    if (this._history.length === 0) {
      console.log("The model has no data.");
      return null;
    }

    const check_word_contain = (word: string, ...args: string[]) =>
      args.some((arg) => word.includes(arg));

    // Set column titles. key2indices records which body part each column
    // of a key refers to; null means "not per-segment".
    const key2keys: Record<string, string[]> = {}; // Column keys
    const key2indices: Record<string, readonly number[] | null> = {};
    for (const [key, value] of Object.entries(this._history[0])) {
      let keys: string[];
      let indices: readonly number[] | null;
      if (typeof value === "object" && value !== null) {
        if (check_word_contain(key, "sve", "sfv", "superficialvein")) {
          indices = VINDEX.sfvein;
        } else if (check_word_contain(key, "ms", "muscle")) {
          indices = VINDEX.muscle;
        } else if (check_word_contain(key, "fat")) {
          indices = VINDEX.fat;
        } else {
          // data contains 17 values
          indices = BODY_NAMES.map((_, i) => i);
        }
        keys = indices.map((i) => `${key}_${BODY_NAMES[i]}`);
      } else {
        // a number or a string: one column, without suffix
        keys = [key];
        indices = null;
      }
      key2keys[key] = keys;
      key2indices[key] = indices;
    }

    const out_dict: Record<string, (number | string | null)[]> = {};
    for (const keys of Object.values(key2keys)) {
      for (const k of keys) out_dict[k] = [];
    }
    for (const dictout of this._history) {
      for (const [key, value] of Object.entries(dictout)) {
        const keys = key2keys[key];
        const indices = key2indices[key];
        if (indices === null) {
          out_dict[keys[0]].push(value as number | string);
        } else {
          const all_values = BODY_NAMES.map(
            (name) => (value as JOS3BodyParts)[name],
          );
          indices.forEach((i, k) => out_dict[keys[k]].push(all_values[i]));
        }
      }
    }
    return out_dict;
  }

  /**
   * Set extra heat gain by tissue name.
   *
   * @private
   *
   * @param {JOS3LayerName} tissue - Tissue name. "core", "skin", or "artery"....
   * @param {number | number[]} value - Heat gain [W]
   *
   * @return {number[]} Extra heat gain of model.
   *
   * @throws {TypeError} For a name that is not a layer, as upstream raises a
   * KeyError (ADR 0012 as amended).
   */
  _set_ex_q(
    tissue: JOS3LayerName,
    value: number | readonly number[],
  ): number[] {
    const nodes = INDEX[tissue];
    if (nodes === undefined) throw key_error(tissue);
    nodes.forEach((node, k) => {
      this.ex_q[node] = typeof value === "number" ? value : value[k];
    });
    return this.ex_q;
  }

  /**
   * Dry-bulb air temperature [°C] of the 17 body parts. The setter takes a
   * number, 17 numbers, or an object keyed by the body part names.
   *
   * @return {number[]}
   */
  get tdb(): number[] {
    return this._tdb;
  }

  set tdb(inp: JOS3BodyPartsInput) {
    this._tdb = to_17_finite(inp, "tdb");
  }

  /**
   * Mean radiant temperature [°C].
   *
   * @return {number[]}
   */
  get tr(): number[] {
    return this._tr;
  }

  set tr(inp: JOS3BodyPartsInput) {
    this._tr = to_17_finite(inp, "tr");
  }

  /**
   * Operative temperature [°C]. Setting it sets tdb and tr.
   *
   * @return {number[]}
   */
  get to(): number[] {
    const hc = fixed_hc(
      conv_coef(this._posture, this._v, this._tdb, this.t_skin),
      this._v,
    );
    const hr = fixed_hr(rad_coef(this._posture));
    return operative_temp(this._tdb, this._tr, hc, hr);
  }

  set to(inp: JOS3BodyPartsInput) {
    this._tdb = to_17_finite(inp, "to");
    this._tr = to_17_finite(inp, "to");
  }

  /**
   * Relative humidity [%].
   *
   * @return {number[]}
   */
  get rh(): number[] {
    return this._rh;
  }

  set rh(inp: JOS3BodyPartsInput) {
    this._rh = to_17_finite(inp, "rh");
  }

  /**
   * Air velocity [m/s].
   *
   * @return {number[]}
   */
  get v(): number[] {
    return this._v;
  }

  set v(inp: JOS3BodyPartsInput) {
    this._v = to_17_finite(inp, "v");
  }

  /**
   * Current JOS3 posture.
   *
   * @return {string}
   */
  get posture(): string {
    return this._posture;
  }

  // Upstream's setter (jos3.py:1503-1523 at v4.6.2): 0, 1 and 2 (and False
  // and True, which Python compares equal to 0 and 1) pick a posture; a
  // string is compared lower-cased, and one it does not know leaves the
  // posture as it is; anything else sets standing and prints why. This used
  // to throw for a number other than 0, 1 or 2 and set standing for an
  // unknown string.
  /**
   * @param inp {number | string} 0 = "standing", 1 = "sitting", 2 = "lying",
   * or "standing", "sitting", "sedentary", "lying" or "supine" in any case.
   */
  set posture(inp: number | string) {
    const value: unknown = inp;
    if (value === 0 || value === false) {
      this._posture = "standing";
    } else if (value === 1 || value === true) {
      this._posture = "sitting";
    } else if (value === 2) {
      this._posture = "lying";
    } else if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "standing") {
        this._posture = "standing";
      } else if (lower === "sitting" || lower === "sedentary") {
        this._posture = "sitting";
      } else if (lower === "lying" || lower === "supine") {
        this._posture = "lying";
      }
    } else {
      this._posture = "standing";
      console.log("posture must be 0=standing, 1=sitting or 2=lying.");
      console.log("posture was set standing.");
    }
  }

  /**
   * Clothing insulation [clo].
   *
   * @return {number[]}
   */
  get clo(): number[] {
    return this._clo;
  }

  set clo(inp: JOS3BodyPartsInput) {
    this._clo = to_17_finite(inp, "clo");
  }

  /**
   * Physical activity ratio [-]. The ratio of metabolic rate to basal
   * metabolic rate. Sitting quietly is 1.2. A value below 1 throws a
   * RangeError when the model next runs, as upstream raises then.
   *
   * @return {number}
   */
  get par(): number {
    return this._par;
  }

  set par(inp: number) {
    assertNumber(inp, "par");
    this._par = inp;
  }

  // Renamed from body_temp, with no alias (jos3 D2, ADR 0010).
  /**
   * All segment temperatures of JOS-3 [°C], NUM_NODES values. The setter
   * copies the array, of any length, as upstream's; a getter that indexes
   * past the end of a shorter one throws a RangeError, as numpy raises an
   * IndexError (ADR 0012 as amended).
   *
   * @return {number[]}
   */
  get t_body(): number[] {
    return this._t_body;
  }

  set t_body(inp: readonly number[]) {
    // ADR 0012: upstream's inp.copy() raises an AttributeError for a value
    // that has no copy method, a TypeError here, with Python's type name. A
    // dict has one, and upstream raises a TypeError ("unhashable type:
    // 'list'") when a getter indexes it; here the setter throws it, earlier
    // (ADR 0005, ADR 0012).
    if (!Array.isArray(inp)) {
      throw new TypeError(
        typeof inp === "object" && inp !== null
          ? "unhashable type: 'list'"
          : `'${py_type_name(inp)}' object has no attribute 'copy'`,
      );
    }
    for (const value of inp) assertNumber(value, "t_body");
    this._t_body = inp.slice();
  }

  /**
   * Body surface areas by local body segments [m2], a copy.
   *
   * @return {number[]}
   */
  get bsa(): number[] {
    return this._bsa.slice();
  }

  /**
   * Dry heat resistances between the skin and ambience areas by local body segments [(m2*K)/W].
   *
   * @return {number[]}
   */
  get r_t(): number[] {
    const hc = fixed_hc(
      conv_coef(this._posture, this._v, this._tdb, this.t_skin),
      this._v,
    );
    const hr = fixed_hr(rad_coef(this._posture));
    return dry_r(hc, hr, this._clo);
  }

  /**
   * Evaporative heat resistances between the skin and ambience areas by local body segments [(m2*kPa)/W].
   *
   * @return {number[]}
   */
  get r_et(): number[] {
    const hc = fixed_hc(
      conv_coef(this._posture, this._v, this._tdb, this.t_skin),
      this._v,
    );
    return wet_r(hc, this._clo, this._iclo, 16.5);
  }

  // Upstream passes height, weight, bsa_equation and age to evaporation
  // (jos3.py:1596-1613 at v4.6.2); this passed the BSA ratio as the height
  // and the age as the weight, so an age of 60 or more used the sweat
  // factors of the young and an age below 20 threw.
  /**
   * Skin wettedness on local body segments [-].
   *
   * @return {number[]}
   */
  get w(): number[] {
    const err_cr = this.t_core.map((x, i) => x - this.cr_set_point[i]);
    const err_sk = this.t_skin.map((x, i) => x - this.sk_set_point[i]);
    const [wet] = evaporation(
      err_cr,
      err_sk,
      this.t_skin,
      this._tdb,
      this._rh,
      this.r_et,
      this._height,
      this._weight,
      this._bsa_equation,
      this._age,
    );
    return wet;
  }

  /**
   * Mean skin wettedness of the whole body [-].
   *
   * @return {number}
   */
  get w_mean(): number {
    return np_average(this.w, Default.local_bsa);
  }

  /**
   * Mean skin temperature of the whole body [°C].
   *
   * @return {number}
   */
  get t_skin_mean(): number {
    return np_average(this.t_skin, Default.local_bsa);
  }

  /**
   * Skin temperatures by the local body segments [°C], a copy. The setter
   * takes what the tdb setter takes.
   *
   * @returns {number[]}
   */
  get t_skin(): number[] {
    return take(this._t_body, INDEX.skin);
  }

  set t_skin(inp: JOS3BodyPartsInput) {
    const values = to_17_finite(inp, "t_skin");
    take(this._t_body, INDEX.skin); // numpy's IndexError for a short t_body
    INDEX.skin.forEach((node, k) => (this._t_body[node] = values[k]));
  }

  /**
   * Core temperatures by the local body segments [°C], a copy.
   *
   * @returns {number[]}
   */
  get t_core(): number[] {
    return take(this._t_body, INDEX.core);
  }

  /**
   * Temperature at central blood pool [°C].
   *
   * @return {number}
   */
  get t_cb(): number {
    return take(this._t_body, [0])[0];
  }

  /**
   * Arterial temperatures by the local body segments [°C], a copy.
   *
   * @return {number[]}
   */
  get t_artery(): number[] {
    return take(this._t_body, INDEX.artery);
  }

  /**
   * Vein temperatures by the local body segments [°C], a copy.
   *
   * @return {number[]}
   */
  get t_vein(): number[] {
    return take(this._t_body, INDEX.vein);
  }

  /**
   * Superficial vein temperatures of the 12 limb segments [°C], a copy.
   *
   * @return {number[]}
   */
  get t_superficial_vein(): number[] {
    return take(this._t_body, INDEX.sfvein);
  }

  /**
   * Muscle temperatures of head and pelvis [°C], a copy.
   *
   * @return {number[]}
   */
  get t_muscle(): number[] {
    return take(this._t_body, INDEX.muscle);
  }

  /**
   * Fat temperatures of head and pelvis [°C], a copy.
   *
   * @return {number[]}
   */
  get t_fat(): number[] {
    return take(this._t_body, INDEX.fat);
  }

  /**
   * JOS3 body names, in the order of every 17-value array.
   *
   * @return {string[]}
   */
  get body_names(): JOS3BodyPartName[] {
    return BODY_NAMES.slice();
  }

  // The JSDoc gave no unit; it is W/m2, as upstream's docstring says
  // (jos3.py:1678): basal_met's watts divided by the body surface area.
  /**
   * Basal metabolic rate [W/m2].
   * @returns {number}
   */
  get bmr(): number {
    const tcr = basal_met(
      this._height,
      this._weight,
      this._age,
      this._sex,
      this._bmr_equation,
    );
    return tcr / np_sum(this.bsa);
  }
}

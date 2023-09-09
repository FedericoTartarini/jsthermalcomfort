import { p_sat } from "../psychrometrics/p_sat.js";
import { t_o_array } from "../psychrometrics/t_o.js";

/**
 * Rounds a number to the given precision.
 *
 * @param {number} number - the number to round
 * @param {number} precision - the number of decimal places to round to
 * @returns the rounded result
 */
export function round(number, precision) {
  const smudge = 10 ** precision;
  return Math.round(number * smudge) / smudge;
}

/**
 * @typedef {Object} ComplianceKwargs
 * @property {number} [met]
 * @property {number} [clo]
 * @property {number} [tdb]
 * @property {number} [tr]
 * @property {number} [v]
 * @property {number} [vr]
 * @property {number} [v_limited]
 * @property {number} [rh]
 */

/**
 * @typedef {Object} ComplianceKwargsArray
 * @property {number[]} [met]
 * @property {number[]} [clo]
 * @property {number[]} [tdb]
 * @property {number[]} [tr]
 * @property {number[]} [v]
 * @property {number[]} [v_limited]
 * @property {number[]} [rh]
 */

/**
 * @typedef {"ankle_draft" | "ashrae" | "iso" | "ISO7933"} Standard
 */

/**
 * Check that the values comply with the standard provided
 *
 * @param {Standard} standard
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
export function check_standard_compliance(standard, kwargs) {
  switch (standard) {
    case "ankle_draft":
      return _ankle_draft_compliance(kwargs);
    case "ashrae":
      return _ashrae_compliance(kwargs);
    case "iso":
      return _iso_compliance(kwargs);
    case "ISO7933":
      return _iso7933_compliance(kwargs);
    default:
      throw new Error("Unknown standard");
  }
}

/**
 * @typedef {Object.<string, number[]>} CheckStandardComplianceResult
 * @property {number[]} tdb
 * @property {number[]} tr
 * @property {number[]} v
 * @property {number[]} [met]
 * @property {number[]} [clo]
 * @property {number[]} [rh]
 */

/**
 * Check that the values as an array comply with the standard provided and returns arrays where
 * the values that do not comply are NaN
 * @see {@link check_standard_compliance} for scalar variant that returns warnings
 *
 * @param {Standard | "fan_heatwaves"} standard - standard to check compliance with
 * @param {ComplianceKwargsArray & {airspeed_control?: boolean}} kwargs - values to check compliance against
 *
 * @returns {CheckStandardComplianceResult} filtered arrays based on compliance limits
 */
export function check_standard_compliance_array(standard, kwargs) {
  const default_kwargs = { airspeed_control: true };
  kwargs = Object.assign(default_kwargs, kwargs);

  switch (standard) {
    case "ISO7933":
    case "ankle_draft":
      throw new Error(`Unsupported standard ${standard}`);
    case "ashrae": {
      // based on table 7.3.4 ashrae 55 2020
      const tdb = valid_range(kwargs.tdb, [10.0, 40.0]);
      const tr = valid_range(kwargs.tr, [10.0, 40.0]);
      let original_v = kwargs.v || [];
      let v = valid_range(kwargs.v, [0.0, 2.0]);
      if (!kwargs.airspeed_control) {
        const met_aux = kwargs.met || [];
        const clo_aux = kwargs.clo || [];
        v = v.map((_v, index) =>
          original_v[index] > 0.8 &&
          clo_aux[index] < 0.7 &&
          met_aux[index] < 1.3
            ? NaN
            : _v,
        );
        const to = t_o_array(tdb, tr, original_v);
        v = v.map((_v, index) => {
          const limit =
            50.49 - 4.4047 * to[index] + 0.096425 * to[index] * to[index];
          return (23 < to[index] &&
            to[index] < 25.5 &&
            original_v[index] > limit &&
            clo_aux[index] < 0.7 &&
            met_aux[index] < 1.3) ||
            (to[index] <= 23 &&
              original_v[index] > 0.2 &&
              clo_aux[index] < 0.7 &&
              met_aux[index] < 1.3)
            ? NaN
            : _v;
        });
      }
      if (kwargs.met !== undefined) {
        const met = valid_range(kwargs.met, [1.0, 4.0]);
        const clo = valid_range(kwargs.clo, [0.0, 1.5]);
        return { tdb, tr, v, met, clo };
      }
      return { tdb, tr, v };
    }
    case "fan_heatwaves": {
      const tdb = valid_range(kwargs.tdb, [20.0, 50.0]);
      const tr = valid_range(kwargs.tr, [20.0, 50.0]);
      const v = valid_range(kwargs.v, [0.1, 4.5]);
      const rh = valid_range(kwargs.rh, [0, 100]);
      const met = valid_range(kwargs.met, [0.7, 2]);
      const clo = valid_range(kwargs.clo, [0.0, 1]);
      return { tdb, tr, v, rh, met, clo };
    }
    case "iso": {
      // based on ISO 7730:2005 page 3
      const tdb = valid_range(kwargs.tdb, [10.0, 30.0]);
      const tr = valid_range(kwargs.tr, [10.0, 40.0]);
      const v = valid_range(kwargs.v, [0.0, 1.0]);
      const met = valid_range(kwargs.met, [0.8, 4.0]);
      const clo = valid_range(kwargs.clo, [0.0, 2]);
      return { tdb, tr, v, met, clo };
    }
  }
}

/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _ankle_draft_compliance(kwargs) {
  /** @type {string[]} */
  let warnings = [];
  for (const [key, value] of Object.entries(kwargs)) {
    if (value === undefined) continue;
    if (key === "met" && value > 1.3)
      warnings.push("The ankle draft model is only valid for met <= 1.3");
    if (key === "clo" && value > 0.7)
      warnings.push("The ankle draft model is only valid for clo <= 0.7");
  }
  return warnings;
}

/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _ashrae_compliance(kwargs) {
  /** @type {string[]} */
  let warnings = [];
  for (const [key, value] of Object.entries(kwargs)) {
    if (value === undefined) continue;

    switch (key) {
      case "tdb":
      case "tr":
        let parameter = key === "tdb" ? "dry-bulb" : "mean radiant";
        if (value > 40 || value < 10)
          warnings.push(
            `ASHRAE ${parameter} temperature application limits between 10 and 40 ºC`,
          );
        break;
      case "v":
      case "vr":
        if (value > 2 || value < 0)
          warnings.push(
            "ASHRAE air speed applicability limits between 0 and 2 m/s",
          );
        break;
      case "met":
        if (value > 4 || value < 1)
          warnings.push(
            "ASHRAE met applicability limits between 1.0 and 4.0 met",
          );
        break;
      case "clo":
        if (value > 1.5 || value < 0)
          warnings.push(
            "ASHRAE clo applicability limits between 0.0 and 1.5 clo",
          );
        break;
      case "v_limited":
        if (value > 0.2)
          throw new Error(
            "This equation is only applicable for air speed lower than 0.2 m/s",
          );
        break;
    }
  }
  return warnings;
}

/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _iso_compliance(kwargs) {
  /** @type {string[]} */
  let warnings = [];
  for (const [key, value] of Object.entries(kwargs)) {
    if (value === undefined) continue;
    if (key === "tdb" && (value > 30 || value < 10))
      warnings.push(
        "ISO air temperature applicability limits between 10 and 30 ºC",
      );
    if (key === "tr" && (value > 40 || value < 10))
      warnings.push(
        "ISO mean radiant temperature applicability limits between 10 and 40 ºC",
      );
    if (key === "v" || (key === "vr" && (value > 1 || value < 0)))
      warnings.push("ISO air speed applicability limits between 0 and 1 m/s");
    if (key === "met" && (value > 4 || value < 0))
      warnings.push("ISO met applicability limits between 0.8 and 4.0 met");
    if (key === "clo" && (value > 2 || value < 0))
      warnings.push("ISO clo applicability limits between 0.0 and 2 clo");
  }
  return warnings;
}

/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _iso7933_compliance(kwargs) {
  if (
    kwargs.tdb === undefined ||
    kwargs.rh === undefined ||
    kwargs.tr === undefined ||
    kwargs.v === undefined ||
    kwargs.met === undefined ||
    kwargs.clo === undefined
  ) {
    throw new Error(
      `Missing arguments for ISO7933 compliance check, got: ${kwargs} and requires tdb, rh, tr, v, met and clo`,
    );
  }
  /** @type {string[]} */
  let warnings = [];

  if (kwargs.tdb > 50 || kwargs.tdb < 15)
    warnings.push(
      "ISO 7933:2004 air temperature applicability limits between 15 and 50 ºC",
    );

  const p_sat_result = p_sat(kwargs.tdb);
  const p_a = ((p_sat_result / 1000) * kwargs.rh) / 100;
  const rh_max = (4.5 * 100 * 1000) / p_sat_result;

  if (p_a > rh_max || p_a < 0)
    warnings.push(
      `ISO 7933:2004 rh applicability limits between 0 and ${rh_max} %`,
    );
  if (kwargs.tr - kwargs.tdb > 60 || kwargs.tr - kwargs.tdb < 0)
    warnings.push(
      "ISO 7933:2004 t_r - t_db applicability limits between 0 and 60 ºC",
    );
  if (kwargs.v > 3 || kwargs.v < 0)
    warnings.push(
      "ISO 7933:2004 air speed applicability limits between 0 and 3 m/s",
    );
  if (kwargs.met > 450 || kwargs.met < 100)
    warnings.push(
      "ISO 7933:2004 met applicability limits between 100 and 450 met",
    );
  if (kwargs.clo > 1 || kwargs.clo < 0.1)
    warnings.push(
      "ISO 7933:2004 clo applicability limits between 0.1 and 1 clo",
    );
  return warnings;
}

/**
 * Returns the body surface area in square meters
 *
 * @public
 * @memberof utilities
 * @docname Body Surface Area
 *
 * @param {number} weight - body weight, [kg]
 * @param {number} height - height, [m]
 * @param {("dubois" | "takahira" | "fujimoto" | "kurazumi")} [formula="dubois"] - formula used to calculate the body surface area. default="dubois"
 * @returns {number} body surface area, [m2]
 *
 * @category Utilities
 */
export function body_surface_area(weight, height, formula = "dubois") {
  if (formula === "dubois")
    return 0.202 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
  if (formula === "takahira")
    return 0.2042 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
  if (formula === "fujimoto")
    return 0.1882 * Math.pow(weight, 0.444) * Math.pow(height, 0.663);
  if (formula === "kurazumi")
    return 0.244 * Math.pow(weight, 0.383) * Math.pow(height, 0.693);

  throw new Error(
    `This ${formula} to calculate the body_surface_area does not exists.`,
  );
}

/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed
 *
 * @see {@link v_relative_array} for a version that supports array arguments
 *
 * @param {number} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number} relative air speed, [m/s]
 */
export function v_relative(v, met) {
  if (met <= 1) return v;
  return _v_relative_single(v, met);
}

/**
 * Estimates the relative air speed which combines the average air speed of the
 * space plus the relative air speed caused by the body movement. Vag is assumed
 * to be 0 for metabolic rates equal and lower than 1 met and otherwise equal to
 * Vag = 0.3 (M - 1) (m/s)
 *
 * @public
 * @memberof utilities
 * @docname Relative air speed (array version)
 *
 * @see {@link v_relative} for a version that supports scalar arguments
 *
 * @param {number[]} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number[]} relative air speed, [m/s]
 */
export function v_relative_array(v, met) {
  if (met <= 1) return v;
  return v.map((_v) => _v_relative_single(_v, met));
}

/**
 * @param {number} v
 * @param {number} met
 * @returns {number}
 */
function _v_relative_single(v, met) {
  return Math.round((v + 0.3 * (met - 1) + Number.EPSILON) * 1000) / 1000;
}

/**
 * Estimates the dynamic clothing insulation of a moving occupant. The activity as
 * well as the air speed modify the insulation characteristics of the clothing and the
 * adjacent air layer. Consequently, the ISO 7730 states that the clothing insulation
 * shall be corrected [2]_. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing
 *
 * @see {@link clo_dynamic_array} for a version that supports array arguments
 *
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number} dunamic clothing insulation, [clo]
 */
export function clo_dynamic(clo, met, standard = "ASHRAE") {
  if (standard !== "ASHRAE" && standard !== "ISO")
    throw new Error(
      "only the ISO 7730 and ASHRAE 55 2020 models have been implemented",
    );
  if ((standard === "ASHRAE" && met <= 1.2) || (standard === "ISO" && met <= 1))
    return clo;
  return _clo_dynamic_single(clo, met);
}

/**
 * Estimates the dynamic clothing insulation of a moving occupant. The activity as
 * well as the air speed modify the insulation characteristics of the clothing and the
 * adjacent air layer. Consequently, the ISO 7730 states that the clothing insulation
 * shall be corrected [2]_. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing (array version)
 *
 * @see {@link clo_dynamic} for a version that supports scalar arguments
 *
 * @param {number[]} clo - clothing insulation, [clo]
 * @param {number[]} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number[]} dunamic clothing insulation, [clo]
 */
export function clo_dynamic_array(clo, met, standard = "ASHRAE") {
  if (standard === "ASHRAE")
    return met.map((_met, index) =>
      _met > 1.2 ? _clo_dynamic_single(clo[index], _met) : clo[index],
    );
  if (standard === "ISO")
    return met.map((_met, index) =>
      _met > 1 ? _clo_dynamic_single(clo[index], _met) : clo[index],
    );
  throw new Error(
    "only the ISO 7730 and ASHRAE 55 2020 models have been implemented",
  );
}

/**
 * @param {number} clo
 * @param {number} met
 * @returns {number}
 */
function _clo_dynamic_single(clo, met) {
  return Math.round((clo * (0.6 + 0.4 / met) + Number.EPSILON) * 1000) / 1000;
}

/**
 * @typedef {("IP" | "SI")} UnitSystem
 */

/**
 * Converts IP values to SI units
 *
 * @public
 * @memberof utilities
 * @docname Units converter
 *
 * @template {Object.<string, number>} T
 * @param {T} kwargs - [t, v] units to convert
 * @param {UnitSystem} [from_units="IP"] - specify system to convert from
 * @returns {T} converted values in SI units
 */
export function units_converter(kwargs, from_units = "IP") {
  let result = { ...kwargs };
  if (from_units === "IP") {
    for (const [key, value] of Object.entries(result)) {
      if (key.includes("tmp") || key === "tr" || key === "tdb")
        result[key] = ((value - 32) * 5) / 9;
      else if (key === "v" || key === "vr" || key === "vel")
        result[key] = value / 3.281;
      else if (key === "area") result[key] = value / 10.764;
      else if (key === "pressure") result[key] = value * 101325;
    }
  } else if (from_units === "SI") {
    for (const [key, value] of Object.entries(result)) {
      if (key.includes("tmp") || key === "tr" || key === "tdb")
        result[key] = (value * 9) / 5 + 32;
      else if (key === "v" || key === "vr" || key === "vel")
        result[key] = value * 3.281;
      else if (key === "area") result[key] = value * 10.764;
      else if (key === "pressure") result[key] = value / 101325;
    }
  } else {
    throw new Error(`Unknown system ${from_units}`);
  }

  return result;
}

// FIXME: find how to write math notation inside JSDocs
/**
 * Estimates the running mean temperature also known as prevailing mean outdoor temperature
 *
 * @public
 * @memberof utilities
 * @docname Running mean outdoor temperature
 *
 * @param {number[]} temp_array - array containing the mean daily temperature in descending order (i.e. from
 * newest/yestedayr to oldest) :math:`[t_{day-1}, t_{day-2}, ... , t_{day-n}]`,
 * Where :math:`t_{day-1}` is yesterday's daily mean temperature. The EN
 * 16798-1 2019 [3]_ states that n should be equal to 7
 *
 * @param {number} [alpha=0.8] - constant between 0 and 1. The EN 16798-1 2019 [3]_ recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggest that a slow-response running mean (alpha = 0.9)
 * could be more appropriate for climates in which synoptic-scale (day-to-day)
 * temperature dynamics are relatively minor, sich as the humid tropics.
 *
 * @param {UnitSystem} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
 *
 * @returns {number} running mean outdoor temperature
 */
export function running_mean_outdoor_temperature(
  temp_array,
  alpha = 0.8,
  units = "SI",
) {
  if (units === "IP")
    temp_array = temp_array.map((tdb) => units_converter({ tdb }).tdb);

  let coeff = temp_array.map((_tdb, index) => Math.pow(alpha, index));
  let summ_t_rm = temp_array.reduce(
    (acum, curr, index) => acum + curr * coeff[index],
  );
  let summ_coeff = coeff.reduce((acum, curr) => acum + curr);
  let t_rm = summ_t_rm / summ_coeff;
  if (units === "IP") t_rm = units_converter({ tmp: t_rm }, "SI").tmp;

  return Math.round(t_rm * 10 + Number.EPSILON) / 10;
}

/**
 * Calculates the sky-vault view fraction
 *
 * @public
 * @memberof utilities
 * @docname Sky-vault view fraction
 *
 * @param {number} w - width of the window, [m]
 * @param {number} h - height of the window, [m]
 * @param {number} d - distance between the occupant and the window, [m]
 *
 * @returns {number} sky-vault view faction ranges between 0 and 1
 */
export function f_svv(w, h, d) {
  let h_degrees = Math.atan(h / (2 * d)) * (180 / Math.PI);
  let w_degrees = Math.atan(w / (2 * d)) * (180 / Math.PI);
  return (h_degrees * w_degrees) / 16200;
}

/**
 * Filter values based on a valid range (It turns the filtered values to NaNs)
 *
 * @param {number[]} [range] - the range to limit
 * @param {[number, number]} valid - the [min, max] to constrian the range to
 * @returns {number[]} the constrained range with NaNs for values that are outside the min, max range
 */
export function valid_range(range, [min, max]) {
  if (range === undefined) return [];
  return range.map((n) => (n >= min && n <= max ? n : NaN));
}

/**
 * Met values of typical tasks.
 * @public
 * @memberof reference_values
 * @docname Met typical tasks, [met]
 * @constant
 * @type {Object}
 * @property {number} Sleeping - 0.7
 * @property {number} Reclining - 0.8,
 * @property {number} Seated_Cquiet - 1.0
 */
export const met_typical_tasks = {
  Sleeping: 0.7,
  Reclining: 0.8,
  Seated_Cquiet: 1.0,
  "Reading, seated": 1.0,
  Writing: 1.0,
  Typing: 1.1,
  "Standing, relaxed": 1.2,
  "Filing, seated": 1.2,
  "Flying aircraft, routine": 1.2,
  "Filing, standing": 1.4,
  "Driving a car": 1.5,
  "Walking about": 1.7,
  Cooking: 1.8,
  "Table sawing": 1.8,
  "Walking 2mph (3.2kmh)": 2.0,
  "Lifting/packing": 2.1,
  "Seated, heavy limb movement": 2.2,
  "Light machine work": 2.2,
  "Flying aircraft, combat": 2.4,
  "Walking 3mph (4.8kmh)": 2.6,
  "House cleaning": 2.7,
  "Driving, heavy vehicle": 3.2,
  Dancing: 3.4,
  Calisthenics: 3.5,
  "Walking 4mph (6.4kmh)": 3.8,
  Tennis: 3.8,
  "Heavy machine work": 4.0,
  "Handling 100lb (45 kg) bags": 4.0,
  "Pick and shovel work": 4.4,
  Basketball: 6.3,
  Wrestling: 7.8,
};

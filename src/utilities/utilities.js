import { p_sat } from "../psychrometrics/p_sat.js";
import { t_o } from "../psychrometrics/t_o.js";

/**
 * Rounds a number to the given precision.
 *
 * @param {number} number - the number to round
 * @param {number} precision - the number of decimal places to round to
 * @returns {number} the rounded result
 */
export function round(number, precision) {
  const smudge = 10 ** precision;
  return Math.round(number * smudge) / smudge;
}

/**
 * Converts degrees to radians
 *
 * @param {number} degrees
 *
 * @returns {number} - radians
 */
function degrees_to_radians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degree unit
 *
 * @param {number} radians
 *
 * @returns {number} - degrees
 */
function radians_to_degrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Converts sharp and altittude from radians to degree unit
 * @param {number} sharp
 * @param {number} altitude
 * @returns {[number, number]}
 */
export function transpose_sharp_altitude(sharp, altitude) {
  const altitude_new = radians_to_degrees(
    Math.asin(
      Math.sin(degrees_to_radians(Math.abs(sharp - 90))) *
        Math.cos(degrees_to_radians(altitude)),
    ),
  );
  sharp = radians_to_degrees(
    Math.atan(
      Math.sin(degrees_to_radians(sharp)) *
        Math.tan(degrees_to_radians(90 - altitude)),
    ),
  );
  return [round(sharp, 3), round(altitude_new, 3)];
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
 * @property {boolean} [airspeed_control]
 */

/**
 * Standard names accepted by {@link check_standard_compliance}.
 */
/**
 * Canonical identifiers for the comfort standards this library implements.
 *
 * Mirrors `pythermalcomfort.utilities.Models` exactly: the **property name** is
 * the canonical key, shared across both libraries and used to key the limits
 * file in #182; the **value** is the string a caller passes. Keeping both forms
 * means neither library has to translate, and a binding test can assert that
 * the two key sets are identical.
 *
 * @public
 */
export const Standard = Object.freeze({
  ashrae_55_2023: "55-2023",
  iso_7730_2005: "7730-2005",
  iso_7730_2025: "7730-2025",
  iso_7933_2004: "7933-2004",
  iso_7933_2023: "7933-2023",
});

/**
 * Applicability limit sets that are not standards in their own right.
 *
 * These were previously mixed into `Standard`, which conflated two things: a
 * published standard, and the range over which one particular model has been
 * validated. pythermalcomfort keeps them apart and this now matches.
 *
 * The two are deliberately different shapes, because they are different in
 * pythermalcomfort:
 *
 * - `ankle_draft` inherits ASHRAE 55 and narrows it (`met` and `clo`), the same
 *   way `ankle_draft.py` calls `_check_ashrae55_compliance` and then applies
 *   extra checks.
 * - `use_fans_heatwaves` has **no parent**. Its limits are unrelated to ASHRAE
 *   55 -- `tdb` 20-50 against 10-40, `v` 0.1-4.5 against 0-2, `met` 0.7-2
 *   against 1-4 -- and `use_fans_heatwaves.py` uses bare `valid_range` calls
 *   with no standard identifier at all.
 *
 * Flattening these into one pattern would mean inventing a parent for
 * `use_fans_heatwaves` or losing the inheritance for `ankle_draft`.
 *
 * @public
 */
export const LimitSet = Object.freeze({
  ankle_draft: "ankle_draft",
  use_fans_heatwaves: "use_fans_heatwaves",
});

/**
 * @typedef {(typeof Standard)[keyof typeof Standard]} Standard
 */

/**
 * @typedef {(typeof LimitSet)[keyof typeof LimitSet]} LimitSet
 */

/**
 * ISO 7730 compliance limits for all variables.
 * Each variable has `min` and `max` inclusive bounds.
 * Used by `_iso_compliance` and exported for model metadata.
 * The shape matches the output of #182 (limits.json generation).
 *
 * @type {Readonly<Record<string, Readonly<{ min: number, max: number }>>>}
 * @public
 */
export const ISO_7730_LIMITS = Object.freeze({
  tdb: Object.freeze({ min: 10, max: 30 }),
  tr: Object.freeze({ min: 10, max: 40 }),
  vr: Object.freeze({ min: 0, max: 1 }),
  met: Object.freeze({ min: 0.8, max: 4 }),
  clo: Object.freeze({ min: 0, max: 2 }),
  // Partial water vapour pressure [Pa]. Derived from tdb and rh rather than
  // supplied directly, so it is checked in pmv_ppd rather than in
  // `_iso_compliance`, which only iterates over supplied inputs.
  pa: Object.freeze({ min: 0, max: 2700 }),
  // The PMV output gate. Grouped here rather than kept separate because
  // pythermalcomfort applies it in the same `valid_range` block as the input
  // limits above (pmv_ppd_iso.py:181-187), and because #182 will generate the
  // whole object from one place.
  pmv: Object.freeze({ min: -2, max: 2 }),
});

/**
 * ASHRAE 55 compliance limits for the PMV inputs, the numbers
 * `_ashrae_compliance` enforces. Each variable has `min` and `max` inclusive
 * bounds. Read by `pmv_ppd`'s `warnings` rows; `_ashrae_compliance` keeps its
 * own literals so `check_standard_compliance` stays as it was. ASHRAE 55 bounds neither vapour pressure nor the PMV output,
 * so unlike `ISO_7730_LIMITS` there is no `pa` or `pmv` entry.
 *
 * @type {Readonly<Record<string, Readonly<{ min: number, max: number }>>>}
 * @public
 */
export const ASHRAE_55_LIMITS = Object.freeze({
  tdb: Object.freeze({ min: 10, max: 40 }),
  tr: Object.freeze({ min: 10, max: 40 }),
  vr: Object.freeze({ min: 0, max: 2 }),
  met: Object.freeze({ min: 1, max: 4 }),
  clo: Object.freeze({ min: 0, max: 1.5 }),
});

/**
 * The fixed airspeed bounds `_ashrae_airspeed_bounds_broken` applies: `any`
 * at every operative temperature, `cool` when to <= 23 °C.
 */
const ASHRAE_55_AIRSPEED_NO_CONTROL = Object.freeze({
  any: Object.freeze({ max: 0.8 }),
  cool: Object.freeze({ max: 0.2 }),
});

/**
 * ASHRAE 55's airspeed limits when the occupant cannot control the airspeed
 * and wears little (clo < 0.7) while barely active (met < 1.3), from
 * pythermalcomfort's `_check_ashrae55_compliance`:
 *
 * - v above 0.8 m/s, at any operative temperature;
 * - v above 50.49 - 4.4047 to + 0.096425 to² when 23 < to < 25.5 °C;
 * - v above 0.2 m/s when to <= 23 °C.
 *
 * Returns the bound of each rule v breaks, in that order, for `pmv_ppd`'s
 * `warnings` rows, which its `limit_inputs` gate also reads.
 * `_ashrae_compliance` applies the same three rules inline for its string, so a
 * change to one belongs in both. The two fixed bounds are shared frozen objects; the operative-temperature one
 * depends on the call, so it is built and frozen per call.
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} tr - mean radiant temperature, [°C]
 * @param {number} v - air speed, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @param {number} clo - clothing insulation, [clo]
 * @returns {Readonly<{ max: number }>[]} the bounds broken; empty when none
 */
export function _ashrae_airspeed_bounds_broken(tdb, tr, v, met, clo) {
  if (!(clo < 0.7 && met < 1.3)) return [];
  const to = t_o(tdb, tr, v);
  const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;
  /** @type {Readonly<{ max: number }>[]} */
  const broken = [];
  if (v > ASHRAE_55_AIRSPEED_NO_CONTROL.any.max)
    broken.push(ASHRAE_55_AIRSPEED_NO_CONTROL.any);
  if (to > 23 && to < 25.5 && v > v_limit)
    broken.push(Object.freeze({ max: v_limit }));
  if (to <= 23 && v > ASHRAE_55_AIRSPEED_NO_CONTROL.cool.max)
    broken.push(ASHRAE_55_AIRSPEED_NO_CONTROL.cool);
  return broken;
}

/**
 * True when `standard` is one of the ISO 7730 editions.
 *
 * The two editions specify identical equations and limits, so almost every
 * check that used to read `standard === "ISO"` means "either edition". Using a
 * predicate rather than repeating the pair keeps a future third edition to one
 * edit.
 *
 * @param {string} standard
 * @returns {boolean}
 */
export function is_iso_7730(standard) {
  return (
    standard === Standard.iso_7730_2005 || standard === Standard.iso_7730_2025
  );
}

/**
 * Check that the values comply with the standard provided
 *
 * @param {"7730-2005"|"7730-2025"|"55-2023"|"7933-2004"|"7933-2023"|"ankle_draft"|"use_fans_heatwaves"} standard
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
export function check_standard_compliance(standard, kwargs) {
  switch (standard) {
    case LimitSet.ankle_draft:
      return _ankle_draft_compliance(kwargs);
    case Standard.ashrae_55_2023:
      return _ashrae_compliance(kwargs);
    case LimitSet.use_fans_heatwaves:
      return _fan_heatwaves_compliance(kwargs);
    // The two ISO 7730 editions specify identical limits, so both resolve to
    // the same check. They are listed separately rather than collapsed so that
    // a future divergence has an obvious place to go.
    case Standard.iso_7730_2005:
    case Standard.iso_7730_2025:
      return _iso_compliance(kwargs);
    case Standard.iso_7933_2004:
      return _iso7933_2004_compliance(kwargs);
    case Standard.iso_7933_2023:
      return _iso7933_2023_compliance(kwargs);
    default:
      throw new Error(
        `Unknown standard "${standard}". Expected one of: ` +
          `${Object.values(Standard).join(", ")}, ` +
          `${Object.values(LimitSet).join(", ")}. ` +
          `The unversioned "ISO" and "ASHRAE" identifiers were removed in v2 ` +
          `-- use "7730-2025" and "55-2023".`,
      );
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

  // Cross-field check (ASHRAE 55 table 7.3.4): when the occupant cannot
  // control the airspeed, v has additional upper limits that depend on the
  // operative temperature, clo and met.
  if (
    kwargs.airspeed_control === false &&
    kwargs.v !== undefined &&
    kwargs.met !== undefined &&
    kwargs.clo !== undefined &&
    kwargs.tdb !== undefined &&
    kwargs.tr !== undefined
  ) {
    const v = kwargs.v;
    const met = kwargs.met;
    const clo = kwargs.clo;
    const to = t_o(kwargs.tdb, kwargs.tr, v);
    const v_limit = 50.49 - 4.4047 * to + 0.096425 * to * to;
    const violates =
      (v > 0.8 && clo < 0.7 && met < 1.3) ||
      (to > 23 && to < 25.5 && v > v_limit && clo < 0.7 && met < 1.3) ||
      (to <= 23 && v > 0.2 && clo < 0.7 && met < 1.3);
    if (violates)
      warnings.push(
        "ASHRAE air speed applicability limits when the occupant does not control the airspeed",
      );
  }

  return warnings;
}

/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _fan_heatwaves_compliance(kwargs) {
  /** @type {string[]} */
  let warnings = [];
  for (const [key, value] of Object.entries(kwargs)) {
    if (value === undefined) continue;
    switch (key) {
      case "tdb":
      case "tr":
        let parameter = key === "tdb" ? "dry-bulb" : "mean radiant";
        if (value > 50 || value < 20)
          warnings.push(
            `Fan use during heatwaves ${parameter} temperature applicability limits between 20 and 50 ºC`,
          );
        break;
      case "v":
        if (value > 4.5 || value < 0.1)
          warnings.push(
            "Fan use during heatwaves air speed applicability limits between 0.1 and 4.5 m/s",
          );
        break;
      case "rh":
        if (value > 100 || value < 0)
          warnings.push(
            "Fan use during heatwaves rh applicability limits between 0 and 100 %",
          );
        break;
      case "met":
        if (value > 2 || value < 0.7)
          warnings.push(
            "Fan use during heatwaves met applicability limits between 0.7 and 2 met",
          );
        break;
      case "clo":
        if (value > 1 || value < 0)
          warnings.push(
            "Fan use during heatwaves clo applicability limits between 0 and 1 clo",
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
    if (key === "tdb" && ISO_7730_LIMITS.tdb) {
      const { min, max } = ISO_7730_LIMITS.tdb;
      if (value > max || value < min)
        warnings.push(
          `ISO air temperature applicability limits between ${min} and ${max} ºC`,
        );
    }
    if (key === "tr" && ISO_7730_LIMITS.tr) {
      const { min, max } = ISO_7730_LIMITS.tr;
      if (value > max || value < min)
        warnings.push(
          `ISO mean radiant temperature applicability limits between ${min} and ${max} ºC`,
        );
    }
    if ((key === "v" || key === "vr") && ISO_7730_LIMITS.vr) {
      const { min, max } = ISO_7730_LIMITS.vr;
      if (value > max || value < min)
        warnings.push(
          `ISO air speed applicability limits between ${min} and ${max} m/s`,
        );
    }
    if (key === "met" && ISO_7730_LIMITS.met) {
      const { min, max } = ISO_7730_LIMITS.met;
      if (value > max || value < min)
        warnings.push(
          `ISO met applicability limits between ${min} and ${max} met`,
        );
    }
    if (key === "clo" && ISO_7730_LIMITS.clo) {
      const { min, max } = ISO_7730_LIMITS.clo;
      if (value > max || value < min)
        warnings.push(
          `ISO clo applicability limits between ${min} and ${max} clo`,
        );
    }
  }
  return warnings;
}

/**
 * @param {ComplianceKwargs} kwargs
 *
 * @returns {string[]} strings with warnings emitted
 */
function _iso7933_2004_compliance(kwargs) {
  // based on ISO 7933:2004 Annex A
  if (
    kwargs.tdb === undefined ||
    kwargs.p_a === undefined ||
    kwargs.tr === undefined ||
    kwargs.v === undefined ||
    kwargs.met === undefined ||
    kwargs.clo === undefined
  ) {
    throw new Error(
      `Missing arguments for ISO 7933:2004 compliance check, got: ${kwargs} and requires tdb, p_a, tr, v, met and clo`,
    );
  }
  /** @type {string[]} */
  let warnings = [];

  if (kwargs.tdb > 50 || kwargs.tdb < 15)
    warnings.push(
      "ISO 7933:2004 air temperature applicability limits between 15 and 50 ºC",
    );
  if (kwargs.p_a > 4.5 || kwargs.p_a < 0)
    warnings.push(
      "ISO 7933:2004 p_a applicability limits between 0 and 4.5 kPa",
    );
  if (kwargs.tr > 60 || kwargs.tr < 0)
    warnings.push("ISO 7933:2004 tr applicability limits between 0 and 60 ºC");
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

function _iso7933_2023_compliance(kwargs) {
  // based on ISO 7933:2023 Annex A
  if (
    kwargs.tdb === undefined ||
    kwargs.p_a === undefined ||
    kwargs.tr === undefined ||
    kwargs.v === undefined ||
    kwargs.met === undefined ||
    kwargs.clo === undefined
  ) {
    throw new Error(
      `Missing arguments for ISO 7933:2023 compliance check, got: ${kwargs} and requires tdb, p_a, tr, v, met and clo`,
    );
  }
  /** @type {string[]} */
  let warnings = [];

  if (kwargs.tdb > 50 || kwargs.tdb < 15)
    warnings.push(
      "ISO 7933:2023 air temperature applicability limits between 15 and 50 ºC",
    );
  if (kwargs.p_a > 4.5 || kwargs.p_a < 0.5)
    warnings.push(
      "ISO 7933:2023 p_a applicability limits between 0.5 and 4.5 kPa",
    );
  if (kwargs.tr > 60 || kwargs.tr < 0)
    warnings.push("ISO 7933:2023 tr applicability limits between 0 and 60 ºC");
  if (kwargs.v > 3 || kwargs.v < 0)
    warnings.push(
      "ISO 7933:2023 air speed applicability limits between 0 and 3 m/s",
    );
  if (kwargs.met > 450 || kwargs.met < 100)
    warnings.push(
      "ISO 7933:2023 met applicability limits between 100 and 450 met",
    );
  if (kwargs.clo > 1 || kwargs.clo < 0.1)
    warnings.push(
      "ISO 7933:2023 clo applicability limits between 0.1 and 1 clo",
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
 * @param {number} v - air spped measured by the sensor, [m/s]
 * @param {number} met - metabolic rate, [met]
 * @returns {number} relative air speed, [m/s]
 */
export function v_relative(v, met) {
  if (met <= 1) return v;
  return _v_relative_single(v, met);
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
 * shall be corrected {@link #ref_2|[2]}. The ASHRAE 55 Standard corrects for the effect
 * of the body movement for met equal or higher than 1.2 met using the equation
 * clo = Icl × (0.6 + 0.4/met)
 *
 * @public
 * @memberof utilities
 * @docname Dynamic clothing
 *
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} met - metabolic rate, [met]
 * @param {("ASHRAE" | "ISO")} [standard="ASHRAE"] - If "ASHRAE", uses Equation provided in Section 5.2.2.2 of ASHRAE 55 2020
 * @returns {number} dunamic clothing insulation, [clo]
 */
export function clo_dynamic(clo, met, standard = Standard.ashrae_55_2023) {
  if (standard !== Standard.ashrae_55_2023 && !is_iso_7730(standard))
    throw new Error(
      "only the ISO 7730 and ASHRAE 55 2020 models have been implemented",
    );
  if (
    (standard === Standard.ashrae_55_2023 && met <= 1.2) ||
    (is_iso_7730(standard) && met <= 1)
  )
    return clo;
  return _clo_dynamic_single(clo, met);
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
 * Converts IP values to SI units
 *
 * @memberof utilities
 * @docname Units converter
 * @public
 *
 * @template {Object.<string, number>} T
 * @param {T} kwargs - [t, v] units to convert
 * @param {"IP" | "SI"} [from_units="IP"] - specify system to convert from
 * @returns {T} converted values in SI units
 *
 */
export function units_converter(kwargs, from_units = "IP") {
  let result = { ...kwargs };
  if (from_units === "IP") {
    for (const [key, value] of Object.entries(result)) {
      if (key.includes("tmp") || key === "tr" || key === "tdb")
        result[key] = _temp_ip_to_si(value);
      else if (key === "v" || key === "vr" || key === "vel")
        result[key] = _vel_ip_to_si(value);
      else if (key === "area") result[key] = _area_ip_to_si(value);
      else if (key === "pressure") result[key] = _pressure_ip_to_si(value);
    }
  } else if (from_units === "SI") {
    for (const [key, value] of Object.entries(result)) {
      if (key.includes("tmp") || key === "tr" || key === "tdb")
        result[key] = _temp_si_to_ip(value);
      else if (key === "v" || key === "vr" || key === "vel")
        result[key] = _vel_si_to_ip(value);
      else if (key === "area") result[key] = _area_si_to_ip(value);
      else if (key === "pressure") result[key] = _pressure_si_to_ip(value);
    }
  } else {
    throw new Error(`Unknown system ${from_units}`);
  }

  return result;
}

/**
 * @param {number} pressure
 * @returns {number}
 */
function _pressure_ip_to_si(pressure) {
  return pressure * 101325;
}

/**
 * @param {number} pressure
 * @returns {number}
 */
function _pressure_si_to_ip(pressure) {
  return pressure / 101325;
}

/**
 * @param {number} area
 * @returns {number}
 */
function _area_ip_to_si(area) {
  return area / 10.764;
}

/**
 * @param {number} area
 * @returns {number}
 */
function _area_si_to_ip(area) {
  return area * 10.764;
}

/**
 * @param {number} vel
 * @returns {number}
 */
function _vel_ip_to_si(vel) {
  return vel / 3.281;
}

/**
 * @param {number} vel
 * @returns {number}
 */
function _vel_si_to_ip(vel) {
  return vel * 3.281;
}

/**
 * @param {number} temp
 * @returns {number}
 */
function _temp_ip_to_si(temp) {
  return ((temp - 32) * 5) / 9;
}

/**
 * @param {number} temp
 * @returns {number}
 */
function _temp_si_to_ip(temp) {
  return (temp * 9) / 5 + 32;
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
 * 16798-1 2019 {@link #ref_3|[3]} states that n should be equal to 7
 *
 * @param {number} [alpha=0.8] - constant between 0 and 1. The EN 16798-1 2019 {@link #ref_3|[3]} recommends a value of 0.8,
 * while the ASHRAE 55 2020 recommends to choose values between 0.9 and 0.6,
 * corresponding to a slow- and fast- response running mean, respectively.
 * Adaptive comfort theory suggest that a slow-response running mean (alpha = 0.9)
 * could be more appropriate for climates in which synoptic-scale (day-to-day)
 * temperature dynamics are relatively minor, sich as the humid tropics.
 *
 * @param {"IP" | "SI"} [units="SI"] - select the SI (International System of Units) or the IP (Imperial Units) system.
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
 * @param {number[] | undefined} range - the range to limit; `undefined` yields an empty array
 * @param {[number, number]} valid - the [min, max] to constrain the range to
 * @returns {number[]} the constrained range with NaNs for values that are outside the min, max range
 */
export function valid_range(range, [min, max]) {
  if (range === undefined) return [];
  return range.map((n) => (n >= min && n <= max ? n : NaN));
}

/**
 * Met values of typical tasks. Keyed the same way pythermalcomfort keys
 * `met_typical_tasks` in `utilities.py`.
 * @public
 * @memberof reference_values
 * @docname Met typical tasks, [met]
 * @constant
 * @type {Readonly<Record<string, number>>}
 * @example
 * import { met_typical_tasks } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(met_typical_tasks["Seated, quiet"]);
 * // output 1.0
 */
export const met_typical_tasks = Object.freeze({
  Sleeping: 0.7,
  Reclining: 0.8,
  "Seated, quiet": 1.0,
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
});

/**
 * Total clothing insulation of typical ensembles, keyed the same way
 * pythermalcomfort keys `clo_typical_ensembles` in `utilities.py`.
 * @public
 * @memberof reference_values
 * @docname Typical ensembles insulation, [clo]
 * @constant
 * @example
 * import { clo_typical_ensembles } from "jsthermalcomfort/utilities";
 * console.log(clo_typical_ensembles["Trousers, long-sleeve shirt"]);
 * // output 0.61
 */
export const clo_typical_ensembles = Object.freeze({
  "Walking shorts, short-sleeve shirt": 0.36,
  "Typical summer indoor clothing": 0.5,
  "Knee-length skirt, short-sleeve shirt, sandals, underwear": 0.54,
  "Trousers, short-sleeve shirt, socks, shoes, underwear": 0.57,
  "Trousers, long-sleeve shirt": 0.61,
  "Knee-length skirt, long-sleeve shirt, full slip": 0.67,
  "Sweat pants, long-sleeve sweatshirt": 0.74,
  "Jacket, Trousers, long-sleeve shirt": 0.96,
  "Typical winter indoor clothing": 1.0,
});

/**
 * Clo values of individual clothing elements. To calculate the total clothing
 * insulation you need to add these values together. Keyed the same way
 * pythermalcomfort keys `clo_individual_garments` in `utilities.py`.
 * @public
 * @memberof reference_values
 * @docname Insulation of individual garments, [clo]
 * @constant
 * @type {Readonly<Record<string, number>>}
 * @example
 * import { clo_individual_garments } from "jsthermalcomfort/utilities"; //The path to utilities
 * console.log(clo_individual_garments["Metal chair"]);
 * // output 0.0
 */
export const clo_individual_garments = Object.freeze({
  "Metal chair": 0.0,
  Bra: 0.01,
  "Wooden stool": 0.01,
  "Ankle socks": 0.02,
  "Shoes or sandals": 0.02,
  Slippers: 0.03,
  "Panty hose": 0.02,
  "Calf length socks": 0.03,
  "Women's underwear": 0.03,
  "Men's underwear": 0.04,
  "Knee socks (thick)": 0.06,
  "Short shorts": 0.06,
  "Walking shorts": 0.08,
  "T-shirt": 0.08,
  "Standard office chair": 0.1,
  "Executive chair": 0.15,
  Boots: 0.1,
  "Sleeveless scoop-neck blouse": 0.12,
  "Half slip": 0.14,
  "Long underwear bottoms": 0.15,
  "Full slip": 0.16,
  "Short-sleeve knit shirt": 0.17,
  "Sleeveless vest (thin)": 0.1,
  "Sleeveless vest (thick)": 0.17,
  "Sleeveless short gown (thin)": 0.18,
  "Short-sleeve dress shirt": 0.19,
  "Sleeveless long gown (thin)": 0.2,
  "Long underwear top": 0.2,
  "Thick skirt": 0.23,
  "Long-sleeve dress shirt": 0.25,
  "Long-sleeve flannel shirt": 0.34,
  "Long-sleeve sweat shirt": 0.34,
  "Short-sleeve hospital gown": 0.31,
  "Short-sleeve short robe (thin)": 0.34,
  "Short-sleeve pajamas": 0.42,
  "Long-sleeve long gown": 0.46,
  "Long-sleeve short wrap robe (thick)": 0.48,
  "Long-sleeve pajamas (thick)": 0.57,
  "Long-sleeve long wrap robe (thick)": 0.69,
  "Thin trousers": 0.15,
  "Thick trousers": 0.24,
  Sweatpants: 0.28,
  Overalls: 0.3,
  Coveralls: 0.49,
  "Thin skirt": 0.14,
  "Long-sleeve shirt dress (thin)": 0.33,
  "Long-sleeve shirt dress (thick)": 0.47,
  "Short-sleeve shirt dress": 0.29,
  "Sleeveless, scoop-neck shirt (thin)": 0.23,
  "Sleeveless, scoop-neck shirt (thick)": 0.27,
  "Long sleeve shirt (thin)": 0.25,
  "Long sleeve shirt (thick)": 0.36,
  "Single-breasted coat (thin)": 0.36,
  "Single-breasted coat (thick)": 0.44,
  "Double-breasted coat (thin)": 0.42,
  "Double-breasted coat (thick)": 0.48,
});

/**
 * Asserts that a value is a valid number (not NaN).
 * Throws a TypeError if the value is not a number or is NaN.
 *
 * @param {*} value - the value to check
 * @param {string} name - the parameter name, used in the error message
 * @throws {TypeError} if value is not a number or is NaN
 */
export const assertNumber = (value, name) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Parameter "${name}" must be a valid finite number`);
  }
};

/**
 * Validates model input parameters against a schema.
 *
 * @param {object} params - The input parameters as key-value pairs
 * @param {object} schema - Validation rules per parameter:
 *   - `type: "number"`  — calls assertNumber (throws TypeError if invalid)
 *   - `type: "boolean"` — throws TypeError if value is not a boolean
 *   - `enum: [...]`     — throws Error if value not in the list
 *   - `required: false` — skips validation when value is undefined
 * @throws {TypeError} if a numeric or boolean parameter has an invalid type
 * @throws {Error} if an enum parameter has an invalid value
 *
 * @example
 * validateInputs(
 *   { tdb, tr, units },
 *   {
 *     tdb:   { type: "number" },
 *     tr:    { type: "number" },
 *     units: { enum: ["SI", "IP"] },
 *   }
 * );
 */
export const validateInputs = (params, schema) => {
  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];
    if (rules.required === false && value === undefined) continue;
    if (rules.type === "number") {
      assertNumber(value, key);
    }
    if (rules.type === "boolean") {
      if (typeof value !== "boolean") {
        throw new TypeError(`Parameter "${key}" must be a boolean`);
      }
    }
    if (rules.enum !== undefined) {
      if (!rules.enum.includes(value)) {
        throw new Error(
          `"${key}" must be one of: ${rules.enum.map((v) => `'${v}'`).join(", ")}`,
        );
      }
    }
    if (rules.min !== undefined && value < rules.min) {
      throw new RangeError(
        `Parameter "${key}" must be >= ${rules.min}, got ${value}`,
      );
    }
    if (rules.max !== undefined && value > rules.max) {
      throw new RangeError(
        `Parameter "${key}" must be <= ${rules.max}, got ${value}`,
      );
    }
    if (rules.exclusiveMin !== undefined && value <= rules.exclusiveMin) {
      throw new RangeError(
        `Parameter "${key}" must be > ${rules.exclusiveMin}, got ${value}`,
      );
    }
  }
};

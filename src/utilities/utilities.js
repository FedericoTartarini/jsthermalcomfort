import { p_sat } from "../psychrometrics/p_sat.js";

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
 * Check that the values comply with the standard provided
 *
 * @param {"ankle_draft" | "ashrae" | "iso" | "ISO7933"} standard
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
            `ASHRAE ${parameter} temperature application limits between 10 and 40 ºC`
          );
        break;
      case "v":
      case "vr":
        if (value > 2 || value < 0)
          warnings.push(
            "ASHRAE air speed applicability limits between 0 and 2 m/s"
          );
        break;
      case "met":
        if (value > 4 || value < 1)
          warnings.push(
            "ASHRAE met applicability limits between 1.0 and 4.0 met"
          );
        break;
      case "clo":
        if (value > 1.5 || value < 0)
          warnings.push(
            "ASHRAE clo applicability limits between 0.0 and 1.5 clo"
          );
        break;
      case "v_limited":
        if (value > 0.2)
          throw new Error(
            "This equation is only applicable for air speed lower than 0.2 m/s"
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
        "ISO air temperature applicability limits between 10 and 30 ºC"
      );
    if (key === "tr" && (value > 40 || value < 10))
      warnings.push(
        "ISO mean radiant temperature applicability limits between 10 and 40 ºC"
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
      `Missing arguments for ISO7933 compliance check, got: ${kwargs} and requires tdb, rh, tr, v, met and clo`
    );
  }
  /** @type {string[]} */
  let warnings = [];

  if (kwargs.tdb > 50 || kwargs.tdb < 15)
    warnings.push(
      "ISO 7933:2004 air temperature applicability limits between 15 and 50 ºC"
    );

  const p_sat_result = p_sat(kwargs.tdb);
  const p_a = ((p_sat_result / 1000) * kwargs.rh) / 100;
  const rh_max = (4.5 * 100 * 1000) / p_sat_result;

  if (p_a > rh_max || p_a < 0)
    warnings.push(
      `ISO 7933:2004 rh applicability limits between 0 and ${rh_max} %`
    );
  if (kwargs.tr - kwargs.tdb > 60 || kwargs.tr - kwargs.tdb < 0)
    warnings.push(
      "ISO 7933:2004 t_r - t_db applicability limits between 0 and 60 ºC"
    );
  if (kwargs.v > 3 || kwargs.v < 0)
    warnings.push(
      "ISO 7933:2004 air speed applicability limits between 0 and 3 m/s"
    );
  if (kwargs.met > 450 || kwargs.met < 100)
    warnings.push(
      "ISO 7933:2004 met applicability limits between 100 and 450 met"
    );
  if (kwargs.clo > 1 || kwargs.clo < 0.1)
    warnings.push(
      "ISO 7933:2004 clo applicability limits between 0.1 and 1 clo"
    );
  return warnings;
}

/**
 * Returns the body surface area in square meters
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
    `This ${formula} to calculate the body_surface_area does not exists.`
  );
}

import { is_iso_7730, Standard } from "../utilities/utilities.js";

/**
 * Calculates operative temperature in accordance with ISO 7726:1998 {@link #ref_5|[5]}.
 *
 * @public
 * @memberof psychrometrics
 *
 *
 * @param {number} tdb - air temperature [C]
 * @param {number} tr - mean radiant temperature [C]
 * @param {number} v - air speed [m/s]
 * @param {Standard} [standard=Standard.iso_7730_2025] - which convention to use
 *    for the weighting.
 *
 *    The identifiers are the comfort-standard ones from `Standard`, because
 *    that is how callers reach this function: `adaptive_ashrae` and
 *    `adaptive_en` pass their own standard straight through. The weighting
 *    itself comes from ISO 7726:1998, which ISO 7730 references; either ISO
 *    7730 edition therefore selects the ISO weighting, and ASHRAE 55 selects
 *    the ASHRAE one.
 * @returns {number} operative temperature [C]
 */
export function t_o(tdb, tr, v, standard = Standard.iso_7730_2025) {
  if (v < 0) {
    throw new Error("v cannot be negative");
  }

  if (is_iso_7730(standard)) return _t_o_calculation_iso(tdb, tr, v);
  if (standard === Standard.ashrae_55_2023)
    return _t_o_calculation_ashrae(tdb, tr, v);

  throw new Error(
    `Unknown standard "${standard}". Expected one of: ` +
      `${Standard.iso_7730_2005}, ${Standard.iso_7730_2025}, ` +
      `${Standard.ashrae_55_2023}. The unversioned "ISO" and "ASHRAE" ` +
      `identifiers were removed in v2.`,
  );
}

/**
 * Runs the ISO t_o calculation for scalar values
 *
 * @param {number} tdb
 * @param {number} tr
 * @param {number} v
 *
 * @returns {number} t_o calculation using ISO
 */
function _t_o_calculation_iso(tdb, tr, v) {
  return (tdb * Math.sqrt(10 * v) + tr) / (1 + Math.sqrt(10 * v));
}

/**
 * Runs ASHRAE t_o calculation for scalar values
 *
 * @param {number} tdb
 * @param {number} tr
 * @param {number} v
 *
 * @returns {number} t_o calculation using ASHRAE
 */
function _t_o_calculation_ashrae(tdb, tr, v) {
  let adjustment = v < 0.6 ? 0.6 : 0.7;
  adjustment = v < 0.2 ? 0.5 : adjustment;
  return adjustment * tdb + (1 - adjustment) * tr;
}

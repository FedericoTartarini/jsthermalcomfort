/**
 * Calculates operative temperature in accordance with ISO 7726:1998.
 * @see {@link t_o_array} for a version that supports arrays
 *
 * @param {number} tdb - air temperature [C]
 * @param {number} tr - mean radiant temperature [C]
 * @param {number} v - air speed [m/s]
 * @param {("ISO" | "ASHRAE")} standard - the standard to use
 * @returns {number} operative temperature [C]
 */
export function t_o(tdb, tr, v, standard = "ISO") {
  if (v < 0) {
    throw new Error("v cannot be negative");
  }

  switch (standard) {
    case "ISO":
      return _t_o_calculation_iso(tdb, tr, v);
    case "ASHRAE":
      return _t_o_calculation_ashrae(tdb, tr, v);
    default:
      throw new Error("standard must be one of ISO or ASHRAE");
  }
}

/**
 * Calculates operative temperature in accordance with ISO 7726:1998.
 * @see {@link t_o} for a version that supports scalar arguments
 *
 * @param {number[]} tdb - air temperature [C]
 * @param {number[]} tr - mean radiant temperature [C]
 * @param {number[]} v - air speed [m/s]
 * @param {("ISO" | "ASHRAE")} standard - the standard to use
 * @returns {number[]} operative temperature [C]
 */
export function t_o_array(tdb, tr, v, standard = "ISO") {
  if (tdb.length !== tr.length || tr.length !== v.length) {
    throw new Error("Provided arrays are not the same lengths");
  }
  if (standard === "ISO")
    return tdb.map((_tdb, index) =>
      _t_o_calculation_iso(_tdb, tr[index], v[index]),
    );
  if (standard === "ASHRAE")
    return tdb.map((_tdb, index) =>
      _t_o_calculation_ashrae(_tdb, tr[index], v[index]),
    );

  throw new Error("standard must be one of ISO or ASHRAE");
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

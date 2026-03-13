import { pmv_ppd, pmv_ppd_array } from "./pmv_ppd.js";

/**
 * Return PMV and PPD calculated in accordance with the ASHRAE 55 Standard.
 *
 * Thin wrapper around {@link pmv_ppd} with `standard = "ASHRAE"`.
 * Returns `{ pmv, ppd, tsv, compliance }`.
 *
 * @public
 * @memberof models
 * @docname PMV PPD (ASHRAE 55)
 *
 * @param {number} tdb - dry bulb air temperature, [°C] or [°F] if units='IP'
 * @param {number} tr - mean radiant temperature
 * @param {number} vr - relative air speed
 * @param {number} rh - relative humidity, [%]
 * @param {number} met - metabolic rate, [met]
 * @param {number} clo - clothing insulation, [clo]
 * @param {number} [wme=0] - external work, [met]
 * @param {Object} [kwargs] - optional parameters
 * @param {'SI'|'IP'} [kwargs.units='SI']
 * @param {boolean} [kwargs.limit_inputs=true]
 * @param {boolean} [kwargs.airspeed_control=true]
 * @param {boolean} [kwargs.round_output=true]
 * @returns {{ pmv: number, ppd: number, tsv: string, compliance?: boolean|number }}
 */
export function pmv_ppd_ashrae(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme = 0,
  kwargs = {},
) {
  return pmv_ppd(tdb, tr, vr, rh, met, clo, wme, "ASHRAE", kwargs);
}

/**
 * Array version of {@link pmv_ppd_ashrae}.
 *
 * @param {number[]} tdb
 * @param {number[]} tr
 * @param {number[]} vr
 * @param {number[]} rh
 * @param {number[]} met
 * @param {number[]} clo
 * @param {number[]} [wme]
 * @param {Object} [kwargs]
 * @returns {{ pmv: number[], ppd: number[], tsv: string[], compliance?: (boolean|number)[] }}
 */
export function pmv_ppd_ashrae_array(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme,
  kwargs = {},
) {
  return pmv_ppd_array(tdb, tr, vr, rh, met, clo, wme, "ASHRAE", kwargs);
}

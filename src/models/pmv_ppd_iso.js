import { pmv_ppd, pmv_ppd_array } from "./pmv_ppd.js";

/**
 * Return PMV and PPD calculated in accordance with the ISO 7730 Standard.
 *
 * Thin wrapper around {@link pmv_ppd} with `standard = "ISO"`.
 * Returns `{ pmv, ppd, tsv }` (no compliance field — ISO does not define one).
 *
 * @public
 * @memberof models
 * @docname PMV PPD (ISO 7730)
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
 * @param {boolean} [kwargs.round_output=true]
 * @returns {{ pmv: number, ppd: number, tsv: string }}
 */
export function pmv_ppd_iso(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme = 0,
  kwargs = {},
) {
  return pmv_ppd(tdb, tr, vr, rh, met, clo, wme, "ISO", kwargs);
}

/**
 * Array version of {@link pmv_ppd_iso}.
 *
 * @param {number[]} tdb
 * @param {number[]} tr
 * @param {number[]} vr
 * @param {number[]} rh
 * @param {number[]} met
 * @param {number[]} clo
 * @param {number[]} [wme]
 * @param {Object} [kwargs]
 * @returns {{ pmv: number[], ppd: number[], tsv: string[] }}
 */
export function pmv_ppd_iso_array(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme,
  kwargs = {},
) {
  return pmv_ppd_array(tdb, tr, vr, rh, met, clo, wme, "ISO", kwargs);
}

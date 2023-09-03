import { pmv_ppd } from "./pmv_ppd.js";

/**
 * Returns Predicted Mean Vote (`PMV`_) calculated in accordance with main thermal comfort Standards.
 *
 * The PMV is an index that predicts the mean value of the thermal sensation votes (self-reported perceptions)
 * of a large group of people on a sensation scale expressed from –3 to +3 corresponding to the categories: cold, cool,
 * slightly cool, neutral, slightly warm, warm, and hot. [1]_
 *
 * While the PMV equation is the same for both the ISO and ASHRAE standards, in the ASHRAE 55 PMV equation, the SET is
 * used to calculate the cooling effect first, this is then subtracted from both the air and mean radiant temperatures,
 * and the differences are used as input to the PMV model, while the airspeed is set to 0.1m/s. Please read more in the
 * Note below.
 *
 * @param {number|number[]} tdb - dry bulb air temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number|number[]} tr - mean radiant temperature, default in [°C] in [°F] if `units` = 'IP'
 * @param {number|number[]} vr - relative air speed, default in [m/s] in [fps] if `units` = 'IP'
 * @param {number|number[]} rh - relative humidity, [%]
 * @param {number|number[]} met - metabolic rate, [met]
 * @param {number|number[]} clo - clothing insulation, [clo]
 * @param {number|number[]} wme - external work, [met] default 0
 * @param {"ISO"|"ASHRAE"} standard - comfort standard used for calculation
 // * @template {Object.<string, number>} T
 // * @param {T} kwargs - [t, v] units to convert
 * @param kwargs
 *
 * Other Parameters:
 * {"SI"|"IP"} units - select the SI (International System of Units) or the IP (Imperial Units) system.
 * {boolean} limit_inputs - By default, if the inputs are outside the standard applicability limits,
 *                                 the function returns nan. If False, returns pmv and ppd values even if input values are
 *                                 outside the applicability limits of the model.
 * {boolean} airspeed_control - This only applies if standard = "ASHRAE". By default, it is assumed that the
 *                                     occupant has control over the airspeed. In this case, the ASHRAE 55 Standard does
 *                                     not impose any airspeed limits. On the other hand, if the occupant has no control
 *                                     over the airspeed, the ASHRAE 55 imposes an upper limit for v, which varies as a
 *                                     function of the operative temperature, for more information please consult the Standard.
 * @returns {number|number[]} pmv - Predicted Mean Vote
 *
 * @notes You can use this function to calculate the `PMV`_ [1]_ [2]_.
 * @see _PMV: https://en.wikipedia.org/wiki/Thermal_comfort#PMV/PPD_method
 * @see _Addendum C to Standard 55-2020: https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/55_2020_c_20210430.pdf
 *
 * @example
 * ```javascript
 *
 * import {pmv} from "./models.js";
 * import {v_relative} from "./utilities.js";
 *
 * const tdb = 25;
 * const tr = 25;
 * const rh = 50;
 * const v = 0.1;
 * const met = 1.4;
 * const clo = 0.5;
 *
 * // calculate relative air speed
 * const v_r = v_relative(v, met);
 * // calculate dynamic clothing
 * const clo_d = clo_dynamic(clo, met);
 *
 * const results = pmv(tdb, tr, v_r, rh, met, clo_d);
 * console.log(results); // 0.06
 *
 * // you can also pass an array-like of inputs
 * const resultsArray = pmv([22, 25], tr, v_r, rh, met, clo_d);
 * console.log(resultsArray); // [-0.47, 0.06]
 * ```
 */
export function pmv(
  tdb,
  tr,
  vr,
  rh,
  met,
  clo,
  wme = 0,
  standard = "ISO",
  kwargs = {},
) {
  const default_kwargs = {
    units: "SI",
    limit_inputs: true,
    airspeed_control: true,
  };
  kwargs = Object.assign(default_kwargs,kwargs);

  const pmv_ppdValue = pmv_ppd(
    tdb,
    tr,
    vr,
    rh,
    met,
    clo,
    wme,
    standard,
    kwargs,
  );

  if (!pmv_ppdValue.hasOwnProperty("pmv")) {
    throw new Error("pmv property not found in pmv_ppdValue");
  }

  return pmv_ppdValue.pmv;
}

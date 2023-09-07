import { round } from "../utilities/utilities";

/**
 * Calculates the Normal Effective Temperature (NET). Missenard (1933)
 * devised a formula for calculating effective temperature. The index
 * establishes a link between the same condition of the organism's
 * thermoregulatory capability (warm and cold perception) and the surrounding
 * environment's temperature and humidity. The index is calculated as a
 * function of three meteorological factors: air temperature, relative
 * humidity of air, and wind speed. This index allows to calculate the
 * effective temperature felt by a person. Missenard original equation was
 * then used to calculate the Normal Effective Temperature (NET), by
 * considering normal atmospheric pressure and a normal human body temperature
 * (37°C). The NET is still in use in Germany, where medical check-ups for
 * subjects working in the heat are decided on by prevailing levels of ET,
 * depending on metabolic rates. The NET is also constantly monitored by the
 * Hong Kong Observatory [1]. In central Europe the following thresholds are
 * in use: <1°C = very cold; 1–9 = cold; 9–17 = cool; 17–21 = fresh;
 * 21–23 = comfortable; 23–27 = warm; >27°C = hot [1].
 *
 * [1] Blazejczyk, K., Epstein, Y., Jendritzky, G., Staiger, H., Tinz, B., 2012.
 *     Comparison of UTCI to selected thermal indices. Int. J. Biometeorol.
 *     56, 515–535. DOI: doi.org/10.1007/s00484-011-0453-2
 *
 * @public
 * @memberof models
 * @docname Normal Effective Temperature (NET)
 *
 * @param {number} tdb - dry bulb air temperature, [°C]
 * @param {number} rh - relative humidity, [%]
 * @param {number} v - wind speed [m/s] at 1.2 m above the ground
 * @param {object} [options] - configuration options for the function.
 * @param {boolean} [options.round = true] - If true, rounds output value. If
 * false, it does not.
 *
 * @returns {number} Normal Effective Temperature, [°C]
 *
 * @example
 * const result = net(37, 100, 0.1);
 * console.log(result); // -> 37
 */
export function net(tdb, rh, v, options = { round: true }) {
  const frac = 1.0 / (1.76 + 1.4 * v ** 0.75);
  const et =
    37 -
    (37 - tdb) / (0.68 - 0.0014 * rh + frac) -
    0.29 * tdb * (1 - 0.01 * rh);

  if (options.round) {
    return round(et, 1);
  }

  return et;
}

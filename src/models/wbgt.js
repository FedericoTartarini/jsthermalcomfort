import { round } from "../utilities/utilities";

const optionDefaults = {
  round: true,
  tdb: undefined,
  with_solar_load: false,
};

/**
 * Calculates the Wet Bulb Globe Temperature (WBGT) index calculated in
 * compliance with the ISO 7243 {@link /#ref_11|[11]}. The WBGT is a heat stress index that
 * measures the thermal environment to which a person is exposed. In most
 * situations, this index is simple to calculate. It should be used as a
 * screening tool to determine whether heat stress is present. The PHS model
 * allows a more accurate estimation of stress. PHS can be calculated using
 * the function `jsthermalcomfort.models.phs`.
 *
 * The WBGT determines the impact of heat on a person throughout the course of
 * a working day (up to 8 h). It does not apply to very brief heat exposures.
 * It pertains to the evaluation of male and female people who are fit for work
 * in both indoor and outdoor occupational environments, as well as other sorts
 * of surroundings {@link /#ref_11|[11]}.
 *
 * The WBGT is defined as a function of only twb and tg if the person is not
 * exposed to direct radiant heat from the sun. When a person is exposed to
 * direct radiant heat, tdb must also be specified.
 *
 * @public
 * @memberof models
 * @docname Wet Bulb Globe Temperature Index (WBGT)
 *
 * @param {number} twb - natural (no forced air flow) wet bulb temperature, [°C]
 * @param {number} tg - globe temperature, [°C]
 * @param {object} [options] - configuration options for the function.
 * @param {boolean} [options.round = true] - If true rounds output value. If
 * false it does not round it.
 * @param {number} [options.tdb = undefined] - Dry bulb air temperature, [°C].
 * This value is needed as input if the person is exposed to direct solar
 * radiation.
 * @param {boolean} [options.with_solar_load = false] - If the globe sensor is
 * exposed to direct solar radiation. If this is set to true without also
 * setting `options.tdb` then an error will be thrown.
 *
 * @returns {number} Wet Bulb Globe Temperature Index, [°C]
 *
 * @example
 * const result = wbgt(25, 32);
 * console.log(result); // -> 27.1
 *
 * @example
 * const result = wbgt(25, 32, { tdb: 20, with_solar_radiation: true });
 * console.log(result); // -> 25.9
 */
export function wbgt(twb, tg, options) {
  const opt = Object.assign({}, optionDefaults, options);

  let t_wbg;

  if (opt.with_solar_load) {
    if (opt.tdb === undefined) {
      throw new Error("Please enter the dry bulb air temperature");
    }

    t_wbg = 0.7 * twb + 0.2 * tg + 0.1 * opt.tdb;
  } else {
    t_wbg = 0.7 * twb + 0.3 * tg;
  }

  if (opt.round) {
    return round(t_wbg, 1);
  }

  return t_wbg;
}
